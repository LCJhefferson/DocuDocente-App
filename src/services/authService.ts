//Gestión de credenciales y SecureStore

import { eq } from 'drizzle-orm';
import * as SecureStore from 'expo-secure-store';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/client';
import { cuentasAutenticacion } from '../database/schema';
import { CredencialesLogin, EntradaRegistro } from '../models/Autenticacion';
import { PerfilDocenteService } from './perfilDocenteService';

const CLAVE_SESION_ACTIVA = 'docudocente_cuenta_id_activa';

export class AuthService {
  /**
   * Proceso de Alta: Registra la cuenta y crea de manera atómica su perfil docente
   */
  static async registrarse(entrada: EntradaRegistro): Promise<string> {
    const correoFormateado = entrada.correoElectronico.trim().toLowerCase();

    const existente = await db
      .select()
      .from(cuentasAutenticacion)
      .where(eq(cuentasAutenticacion.correoElectronico, correoFormateado));

    if (existente.length > 0) {
      throw new Error('El correo electrónico ya se encuentra registrado.');
    }

    const cuentaId = uuidv4();
    const ahora = new Date().toISOString();

    // 1. Insertar cuenta de autenticación
    await db.insert(cuentasAutenticacion).values({
      id: cuentaId,
      correoElectronico: correoFormateado,
      contrasenaHash: entrada.contrasena,
      esActivo: true,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });

    // 2. Insertar perfil docente asociado
    await PerfilDocenteService.crearPerfil({
      cuentaId: cuentaId,
      nombreCompleto: entrada.nombreCompleto,
      gradoAcademico: entrada.gradoAcademico,
      facultad: entrada.facultad,
      departamento: entrada.departamento,
      codigoInstitucional: entrada.codigoInstitucional,
    });

    // 3. Establecer sesión
    await this.guardarSesionLocal(cuentaId);

    return cuentaId;
  }

  /**
   * Valida credenciales e inicia sesión
   */
  static async iniciarSesion(credenciales: CredencialesLogin): Promise<string> {
    const correoFormateado = credenciales.correoElectronico.trim().toLowerCase();
    
    const resultados = await db
      .select()
      .from(cuentasAutenticacion)
      .where(eq(cuentasAutenticacion.correoElectronico, correoFormateado));

    if (resultados.length === 0) {
      throw new Error('El correo no está registrado.');
    }

    const cuenta = resultados[0];
    if (cuenta.contrasenaHash !== credenciales.contrasena) {
      throw new Error('Contraseña incorrecta.');
    }

    if (!cuenta.esActivo) {
      throw new Error('Esta cuenta se encuentra desactivada.');
    }

    await this.guardarSesionLocal(cuenta.id);
    return cuenta.id;
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