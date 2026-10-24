import { eq } from 'drizzle-orm';
import * as Crypto from 'expo-crypto';
import { db } from '../database/client';
import { perfilesDocente } from '../database/schema';
import { EntradaPerfilDocente, PerfilDocente } from '../models/PerfilDocente';

export const perfilDocenteService = {
  /**
   * Crea la ficha académica inicial del docente asignando UUID nativo y valores por defecto
   */
  async crearPerfil(entrada: EntradaPerfilDocente): Promise<PerfilDocente> {
    try {
      const perfilId = Crypto.randomUUID();
      const ahora = new Date().toISOString();

      const nuevoPerfil = {
        id: perfilId,
        cuentaId: entrada.cuentaId,
        nombreCompleto: entrada.nombreCompleto.trim(),
        gradoAcademico: entrada.gradoAcademico?.trim() || 'Mg.',
        creadoEn: ahora,
        actualizadoEn: ahora,
      };

      await db.insert(perfilesDocente).values(nuevoPerfil);

      return {
        id: nuevoPerfil.id,
        cuentaId: nuevoPerfil.cuentaId,
        nombreCompleto: nuevoPerfil.nombreCompleto,
        gradoAcademico: nuevoPerfil.gradoAcademico,
        creadoEn: nuevoPerfil.creadoEn,
        actualizadoEn: nuevoPerfil.actualizadoEn,
      };
    } catch (error) {
      console.error('[perfilDocenteService.crearPerfil Error]:', error);
      throw error;
    }
  },

  /**
   * Consulta el perfil docente mediante el ID de la cuenta con sesión activa
   */
  async obtenerPorCuentaId(cuentaId: string): Promise<PerfilDocente | null> {
    try {
      if (!cuentaId) return null;

      const [perfil] = await db
        .select()
        .from(perfilesDocente)
        .where(eq(perfilesDocente.cuentaId, cuentaId));

      if (!perfil) return null;

      return {
        id: perfil.id,
        cuentaId: perfil.cuentaId,
        nombreCompleto: perfil.nombreCompleto,
        gradoAcademico: perfil.gradoAcademico,
        creadoEn: perfil.creadoEn,
        actualizadoEn: perfil.actualizadoEn,
      };
    } catch (error) {
      console.error('[perfilDocenteService.obtenerPorCuentaId Error]:', error);
      throw error;
    }
  },

  /**
   * Actualiza la información personal/académica del docente vinculada a su cuenta
   */
  async actualizarPerfil(
    cuentaId: string,
    datos: Partial<Omit<PerfilDocente, 'id' | 'cuentaId'>>
  ): Promise<void> {
    try {
      const ahora = new Date().toISOString();

      await db
        .update(perfilesDocente)
        .set({
          ...(datos.nombreCompleto && { nombreCompleto: datos.nombreCompleto.trim() }),
          ...(datos.gradoAcademico && { gradoAcademico: datos.gradoAcademico.trim() }),
          actualizadoEn: ahora,
        })
        .where(eq(perfilesDocente.cuentaId, cuentaId));
    } catch (error) {
      console.error('[perfilDocenteService.actualizarPerfil Error]:', error);
      throw error;
    }
  },
};

/**
 * Clase estática de compatibilidad para evitar romper importaciones existentes que usen
 * `PerfilDocenteService.obtenerPorCuentaId()`
 */
export class PerfilDocenteService {
  static crearPerfil = perfilDocenteService.crearPerfil;
  static obtenerPorCuentaId = perfilDocenteService.obtenerPorCuentaId;
  static actualizarPerfil = perfilDocenteService.actualizarPerfil;
}