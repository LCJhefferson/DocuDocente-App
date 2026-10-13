// src/services/authService.ts
// Gestión de credenciales y SecureStore
import { eq } from 'drizzle-orm';
import * as SecureStore from 'expo-secure-store';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/client';
import { cuentasAutenticacion } from '../database/schema';
import { CredencialesLogin, EntradaRegistro } from '../models/Autenticacion';
import { esHash, generarCodigo, hashContrasena } from '../utils/seguridad';
import { esCorreoValido, validarContrasena, validarPerfil, exigir } from '../utils/validaciones';
import { enviarCodigoRecuperacion } from './correoService';
import { PerfilDocenteService } from './perfilDocenteService';

const CLAVE_SESION_ACTIVA = 'docudocente_cuenta_id_activa';

const MAX_INTENTOS = 5;
const MINUTOS_BLOQUEO = 5;
const MINUTOS_CODIGO = 10;
const MINUTO_MS = 60_000;

// ponytail: se guardan en memoria; si la app se cierra, se reinician. Pasar a SQLite si hace falta que persistan.
const intentosFallidos = new Map<string, { fallos: number; bloqueadoHasta: number }>();
const enviosEnCurso = new Set<string>();
const cambiosEnCurso = new Set<string>();
const ultimoEnvio = new Map<string, number>();
const codigosRecuperacion = new Map<string, { codigoHash: string; expiraEn: number; intentos: number }>();

const normalizar = (correo: string) => correo.trim().toLowerCase();

const buscarCuenta = async (correo: string) => {
  const filas = await db.select().from(cuentasAutenticacion).where(eq(cuentasAutenticacion.correoElectronico, correo));
  return filas[0] ?? null;
};

export class AuthService {
  /**
   * Proceso de alta: valida y registra la cuenta con su perfil docente
   */
  static async registrarse(entrada: EntradaRegistro): Promise<string> {
    const correoFormateado = normalizar(entrada.correoElectronico);

    if (!esCorreoValido(correoFormateado)) {
      throw new Error('El correo electrónico no tiene un formato válido.');
    }
    exigir(validarPerfil(entrada));
    const problema = validarContrasena(entrada.contrasena);
    if (problema) throw new Error(problema);

    if (await buscarCuenta(correoFormateado)) {
      throw new Error('El correo electrónico ya se encuentra registrado.');
    }

    const cuentaId = uuidv4();
    const ahora = new Date().toISOString();

    // 1. Insertar cuenta de autenticación (solo el hash de la contraseña)
    await db.insert(cuentasAutenticacion).values({
      id: cuentaId,
      correoElectronico: correoFormateado,
      contrasenaHash: await hashContrasena(correoFormateado, entrada.contrasena),
      esActivo: true,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });

    // Si falla el perfil, se retira solo la cuenta recién creada para permitir reintentar.
    try {
      await PerfilDocenteService.crearPerfil({
        cuentaId: cuentaId,
        nombreCompleto: entrada.nombreCompleto.trim(),
        gradoAcademico: entrada.gradoAcademico.trim(),
        facultad: entrada.facultad.trim(),
        departamento: entrada.departamento?.trim(),
        codigoInstitucional: entrada.codigoInstitucional?.trim(),
      });
    } catch (error) {
      await db.delete(cuentasAutenticacion).where(eq(cuentasAutenticacion.id, cuentaId));
      throw error;
    }

    // 3. Establecer sesión
    await this.guardarSesionLocal(cuentaId);

    return cuentaId;
  }

  /**
   * Valida credenciales e inicia sesión. Bloquea unos minutos tras varios intentos fallidos.
   */
  static async iniciarSesion(credenciales: CredencialesLogin): Promise<string> {
    const correoFormateado = normalizar(credenciales.correoElectronico);

    const registro = intentosFallidos.get(correoFormateado);
    if (registro && registro.bloqueadoHasta > Date.now()) {
      const minutos = Math.ceil((registro.bloqueadoHasta - Date.now()) / MINUTO_MS);
      throw new Error(`Demasiados intentos fallidos. Inténtalo de nuevo en ${minutos} min.`);
    }

    const cuenta = await buscarCuenta(correoFormateado);
    if (!cuenta) {
      throw new Error('El correo no está registrado.');
    }

    const hashIngresado = await hashContrasena(correoFormateado, credenciales.contrasena);
    // Cuentas antiguas: la contraseña estaba en texto plano
    const correcta = esHash(cuenta.contrasenaHash)
      ? cuenta.contrasenaHash === hashIngresado
      : cuenta.contrasenaHash === credenciales.contrasena;

    if (!correcta) {
      const fallos = (registro?.fallos ?? 0) + 1;
      const bloquear = fallos >= MAX_INTENTOS;
      intentosFallidos.set(correoFormateado, {
        fallos: bloquear ? 0 : fallos,
        bloqueadoHasta: bloquear ? Date.now() + MINUTOS_BLOQUEO * MINUTO_MS : 0,
      });
      throw new Error(
        bloquear
          ? `Demasiados intentos fallidos. Inténtalo de nuevo en ${MINUTOS_BLOQUEO} min.`
          : `Contraseña incorrecta. Te quedan ${MAX_INTENTOS - fallos} intentos.`
      );
    }

    if (!cuenta.esActivo) {
      throw new Error('Esta cuenta se encuentra desactivada.');
    }

    intentosFallidos.delete(correoFormateado);

    // Migra la cuenta antigua a contraseña cifrada
    if (!esHash(cuenta.contrasenaHash)) {
      await db
        .update(cuentasAutenticacion)
        .set({ contrasenaHash: hashIngresado, actualizadoEn: new Date().toISOString() })
        .where(eq(cuentasAutenticacion.id, cuenta.id));
    }

    await this.guardarSesionLocal(cuenta.id);
    return cuenta.id;
  }

  /**
   * Recuperación, paso 1: envía un código de 6 dígitos al correo registrado
   */
  static async solicitarRecuperacion(correo: string): Promise<void> {
    const correoFormateado = normalizar(correo);
    if (!esCorreoValido(correoFormateado)) {
      throw new Error('El correo electrónico no tiene un formato válido.');
    }
    const cuenta = await buscarCuenta(correoFormateado);
    if (!cuenta || !cuenta.esActivo) throw new Error('El correo no está registrado o la cuenta está desactivada.');
    if (enviosEnCurso.has(correoFormateado) || Date.now() - (ultimoEnvio.get(correoFormateado) ?? 0) < MINUTO_MS) {
      throw new Error('Espera un minuto antes de solicitar otro código.');
    }

    enviosEnCurso.add(correoFormateado);
    try {
      const codigo = generarCodigo();
      const codigoHash = await hashContrasena(correoFormateado, codigo);
      await enviarCodigoRecuperacion(correoFormateado, codigo, MINUTOS_CODIGO);
      codigosRecuperacion.set(correoFormateado, { codigoHash, expiraEn: Date.now() + MINUTOS_CODIGO * MINUTO_MS, intentos: 0 });
      ultimoEnvio.set(correoFormateado, Date.now());
    } finally {
      enviosEnCurso.delete(correoFormateado);
    }
  }

  /**
   * Recuperación, paso 2: verifica el código y guarda la nueva contraseña
   */
  static async restablecerContrasena(correo: string, codigo: string, nuevaContrasena: string): Promise<void> {
    const correoFormateado = normalizar(correo);
    if (!esCorreoValido(correoFormateado)) throw new Error('Ingresa un correo válido.');
    if (!/^\d{6}$/.test(codigo.trim())) throw new Error('El código debe tener exactamente 6 dígitos.');
    exigir(validarContrasena(nuevaContrasena));
    const cuenta = await buscarCuenta(correoFormateado);
    if (!cuenta?.esActivo) throw new Error('La cuenta no existe o está desactivada.');
    if (cambiosEnCurso.has(correoFormateado)) throw new Error('Ya se está cambiando la contraseña. Espera un momento.');
    cambiosEnCurso.add(correoFormateado);
    try {
      const pendiente = codigosRecuperacion.get(correoFormateado);

      if (!pendiente || pendiente.expiraEn <= Date.now()) {
        codigosRecuperacion.delete(correoFormateado);
        throw new Error('El código venció. Solicita uno nuevo.');
      }
      if (pendiente.intentos >= MAX_INTENTOS) {
        codigosRecuperacion.delete(correoFormateado);
        throw new Error('Demasiados intentos con este código. Solicita uno nuevo.');
      }
      if (pendiente.codigoHash !== (await hashContrasena(correoFormateado, codigo.trim()))) {
        pendiente.intentos += 1;
        throw new Error('El código no es correcto.');
      }

      await db
        .update(cuentasAutenticacion)
        .set({
          contrasenaHash: await hashContrasena(correoFormateado, nuevaContrasena),
          actualizadoEn: new Date().toISOString(),
        })
        .where(eq(cuentasAutenticacion.correoElectronico, correoFormateado));

      codigosRecuperacion.delete(correoFormateado);
      intentosFallidos.delete(correoFormateado);
    } finally {
      cambiosEnCurso.delete(correoFormateado);
    }
  }

  static async guardarSesionLocal(cuentaId: string): Promise<void> {
    await SecureStore.setItemAsync(CLAVE_SESION_ACTIVA, cuentaId);
  }

  static async obtenerIdCuentaActiva(): Promise<string | null> {
    return await SecureStore.getItemAsync(CLAVE_SESION_ACTIVA);
  }

  static async cerrarSesion(): Promise<void> {
    await SecureStore.deleteItemAsync(CLAVE_SESION_ACTIVA);
  }
}
