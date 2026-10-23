import { eq } from 'drizzle-orm';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { db } from '../database/client';
import { cuentasAutenticacion, perfilesDocente } from '../database/schema';
import { CredencialesLogin, EntradaRegistro } from '../models/Autenticacion';
import { esHash, generarCodigo, hashContrasena } from '../utils/seguridad';
import { esCorreoValido, exigir, validarContrasena, validarNombre } from '../utils/validaciones';
import { enviarCodigoRecuperacion } from './correoService';
import { PerfilDocenteService } from './perfilDocenteService';
import { supabase } from './supabase/client';

const CLAVE_SESION_ACTIVA = 'docudocente_cuenta_id_activa';
const MAX_INTENTOS = 5;
const MINUTOS_BLOQUEO = 5;
const MINUTOS_CODIGO = 10;
const MINUTO_MS = 60_000;

const intentosFallidos = new Map<string, { fallos: number; bloqueadoHasta: number }>();
const enviosEnCurso = new Set<string>();
const cambiosEnCurso = new Set<string>();
const ultimoEnvio = new Map<string, number>();
const codigosRecuperacion = new Map<string, { codigoHash: string; expiraEn: number; intentos: number }>();

const normalizar = (correo: string) => correo.trim().toLowerCase();

const buscarCuentaLocal = async (correo: string) => {
  const filas = await db
    .select()
    .from(cuentasAutenticacion)
    .where(eq(cuentasAutenticacion.correoElectronico, correo));
  return filas[0] ?? null;
};

export class AuthService {
  /**
   * Registra el usuario en SQLite local y guarda el hash cifrado en Supabase public.docentes
   */
  static async registrarse(entrada: EntradaRegistro): Promise<string> {
    const correoFormateado = normalizar(entrada.correoElectronico);

    if (!esCorreoValido(correoFormateado)) {
      throw new Error('El correo electrónico no tiene un formato válido.');
    }

    exigir(validarNombre(entrada.nombreCompleto));
    const problema = validarContrasena(entrada.contrasena);
    if (problema) throw new Error(problema);

    if (await buscarCuentaLocal(correoFormateado)) {
      throw new Error('El correo electrónico ya se encuentra registrado en este dispositivo.');
    }

    const cuentaId = Crypto.randomUUID();
    const ahora = new Date().toISOString();
    const hash = await hashContrasena(correoFormateado, entrada.contrasena);
    const grado = entrada.gradoAcademico?.trim() || 'Mg.';
    const nombre = entrada.nombreCompleto.trim();

    // 1. Guardar en SQLite local
    await db.insert(cuentasAutenticacion).values({
      id: cuentaId,
      correoElectronico: correoFormateado,
      contrasenaHash: hash,
      esActivo: true,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });

    try {
      await PerfilDocenteService.crearPerfil({
        cuentaId,
        nombreCompleto: nombre,
        gradoAcademico: grado,
      });
    } catch (error) {
      await db.delete(cuentasAutenticacion).where(eq(cuentasAutenticacion.id, cuentaId));
      throw error;
    }

    // 2. Sincronización en Supabase (public.docentes)
    try {
      const { error: errorSupabase } = await supabase.from('docentes').upsert({
        id: cuentaId,
        correo: correoFormateado,
        nombre: nombre,
        grado: grado,
        contrasena_hash: hash,
        creado_en: ahora,
        actualizado_en: ahora,
      });

      if (errorSupabase) {
        console.warn('[AuthService.registrarse Supabase Error]:', errorSupabase.message);
      }
    } catch (err) {
      console.warn('[AuthService.registrarse Error de Red]:', err);
    }

    await this.guardarSesionLocal(cuentaId);
    return cuentaId;
  }

  /**
   * Inicia sesión validando localmente o consultando Supabase si la base de datos local está limpia
   */
  static async iniciarSesion(credenciales: CredencialesLogin): Promise<string> {
    const correoFormateado = normalizar(credenciales.correoElectronico);

    const registro = intentosFallidos.get(correoFormateado);
    if (registro && registro.bloqueadoHasta > Date.now()) {
      const minutos = Math.ceil((registro.bloqueadoHasta - Date.now()) / MINUTO_MS);
      throw new Error(`Demasiados intentos fallidos. Inténtalo de nuevo en ${minutos} min.`);
    }

    const hashIngresado = await hashContrasena(correoFormateado, credenciales.contrasena);
    const cuenta = await buscarCuentaLocal(correoFormateado);

    // ESCENARIO A: Cuenta existente localmente
    if (cuenta) {
      const correcta = esHash(cuenta.contrasenaHash)
        ? cuenta.contrasenaHash === hashIngresado
        : cuenta.contrasenaHash === credenciales.contrasena;

      if (!correcta) {
        this.registrarIntentoFallido(correoFormateado, registro);
      }

      if (!cuenta.esActivo) {
        throw new Error('Esta cuenta se encuentra desactivada.');
      }

      intentosFallidos.delete(correoFormateado);
      await this.guardarSesionLocal(cuenta.id);
      return cuenta.id;
    }

    // ESCENARIO B: Dispositivo nuevo o SQLite limpio -> Consultar Supabase (public.docentes)
    try {
      const { data: docenteRemoto, error } = await supabase
        .from('docentes')
        .select('*')
        .eq('correo', correoFormateado)
        .maybeSingle();

      if (error || !docenteRemoto) {
        throw new Error('El correo no está registrado.');
      }

      const contrasenaRemota = docenteRemoto.contrasena_hash;
      const esCorrectaRemota = esHash(contrasenaRemota)
        ? contrasenaRemota === hashIngresado
        : contrasenaRemota === credenciales.contrasena;

      if (!esCorrectaRemota) {
        this.registrarIntentoFallido(correoFormateado, registro);
      }

      // Hidratar la base de datos local SQLite con los datos recuperados de Supabase
      const ahora = new Date().toISOString();
      await db.insert(cuentasAutenticacion).values({
        id: docenteRemoto.id,
        correoElectronico: docenteRemoto.correo,
        contrasenaHash: hashIngresado,
        esActivo: true,
        creadoEn: docenteRemoto.creado_en || ahora,
        actualizadoEn: ahora,
      });

      const perfilId = Crypto.randomUUID();
      await db.insert(perfilesDocente).values({
        id: perfilId,
        cuentaId: docenteRemoto.id,
        nombreCompleto: docenteRemoto.nombre || 'Docente',
        gradoAcademico: docenteRemoto.grado || 'Mg.',
        creadoEn: ahora,
        actualizadoEn: ahora,
      });

      intentosFallidos.delete(correoFormateado);
      await this.guardarSesionLocal(docenteRemoto.id);
      return docenteRemoto.id;
    } catch (err: any) {
      if (err.message === 'El correo no está registrado.' || err.message?.includes('Contraseña incorrecta')) {
        throw err;
      }
      throw new Error('El correo no está registrado o no hay conexión con el servidor.');
    }
  }

  private static registrarIntentoFallido(
    correo: string,
    registro?: { fallos: number; bloqueadoHasta: number }
  ) {
    const fallos = (registro?.fallos ?? 0) + 1;
    const bloquear = fallos >= MAX_INTENTOS;
    intentosFallidos.set(correo, {
      fallos: bloquear ? 0 : fallos,
      bloqueadoHasta: bloquear ? Date.now() + MINUTOS_BLOQUEO * MINUTO_MS : 0,
    });
    throw new Error(
      bloquear
        ? `Demasiados intentos fallidos. Inténtalo de nuevo en ${MINUTOS_BLOQUEO} min.`
        : `Contraseña incorrecta. Te quedan ${MAX_INTENTOS - fallos} intentos.`
    );
  }

  static async solicitarRecuperacion(correo: string): Promise<void> {
    const correoFormateado = normalizar(correo);
    if (!esCorreoValido(correoFormateado)) {
      throw new Error('El correo electrónico no tiene un formato válido.');
    }
    const cuenta = await buscarCuentaLocal(correoFormateado);
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

  static async verificarCodigoRecuperacion(correo: string, codigo: string): Promise<number> {
    const correoFormateado = normalizar(correo);
    if (!esCorreoValido(correoFormateado)) throw new Error('Ingresa un correo válido.');
    if (!/^\d{6}$/.test(codigo.trim())) throw new Error('El código debe tener exactamente 6 dígitos.');
    const pendiente = codigosRecuperacion.get(correoFormateado);
    if (!pendiente || pendiente.expiraEn <= Date.now()) {
      codigosRecuperacion.delete(correoFormateado);
      throw new Error('El código venció. Solicita uno nuevo.');
    }
    if (pendiente.intentos >= MAX_INTENTOS) {
      codigosRecuperacion.delete(correoFormateado);
      throw new Error('Demasiados intentos con este código. Solicita uno nuevo.');
    }
    const hash = await hashContrasena(correoFormateado, codigo.trim());
    if (pendiente.codigoHash !== hash) {
      pendiente.intentos += 1;
      throw new Error('El código no es correcto.');
    }
    return pendiente.expiraEn;
  }

  static async restablecerContrasena(correo: string, codigo: string, nuevaContrasena: string): Promise<void> {
    const correoFormateado = normalizar(correo);
    exigir(validarContrasena(nuevaContrasena));
    if (cambiosEnCurso.has(correoFormateado)) throw new Error('Ya se está cambiando la contraseña. Espera un momento.');
    cambiosEnCurso.add(correoFormateado);
    try {
      await this.verificarCodigoRecuperacion(correoFormateado, codigo);
      const cuenta = await buscarCuentaLocal(correoFormateado);
      if (!cuenta?.esActivo) throw new Error('La cuenta no existe o está desactivada.');
      const nuevaHash = await hashContrasena(correoFormateado, nuevaContrasena);

      // Actualizar SQLite local
      await db
        .update(cuentasAutenticacion)
        .set({ contrasenaHash: nuevaHash, actualizadoEn: new Date().toISOString() })
        .where(eq(cuentasAutenticacion.id, cuenta.id));

      // Actualizar en Supabase (public.docentes)
      await supabase
        .from('docentes')
        .update({ contrasena_hash: nuevaHash, actualizado_en: new Date().toISOString() })
        .eq('correo', correoFormateado);

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