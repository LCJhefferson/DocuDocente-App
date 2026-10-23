import { and, desc, eq } from 'drizzle-orm';
import * as Crypto from 'expo-crypto';
import { db } from '../database/client';
import { evidencias } from '../database/schema';
import { CrearEvidenciaDTO } from '../models/Evidence';

export const evidenciaService = {
  /**
   * Obtiene las evidencias académicas vinculadas a un curso y unidad específica
   */
  async obtenerPorCursoYUnidad(cursoId: string, unidad: string) {
    try {
      return await db
        .select()
        .from(evidencias)
        .where(
          and(
            eq(evidencias.cursoId, cursoId),
            eq(evidencias.unidad, unidad),
            eq(evidencias.tipoGeneral, 'ACADEMICA')
          )
        );
    } catch (error) {
      console.error('[evidenciaService.obtenerPorCursoYUnidad Error]:', error);
      throw error;
    }
  },

  /**
   * Obtiene las evidencias extracurriculares asociadas exclusivamente al docente logueado
   */
  async obtenerExtracurriculares(perfilDocenteId: string) {
    try {
      if (!perfilDocenteId) return [];

      return await db
        .select()
        .from(evidencias)
        .where(
          and(
            eq(evidencias.tipoGeneral, 'EXTRACURRICULAR'),
            eq(evidencias.perfilDocenteId, perfilDocenteId)
          )
        )
        .orderBy(desc(evidencias.creadoEn));
    } catch (error) {
      console.error('[evidenciaService.obtenerExtracurriculares Error]:', error);
      throw error;
    }
  },

  /**
   * Inserta una nueva evidencia en SQLite asociándole un UUID v4 válido
   */
  async crearEvidencia(dto: CrearEvidenciaDTO & { perfilDocenteId?: string }) {
    try {
      const nuevaEvidencia = {
        id: Crypto.randomUUID(), // Genera un UUID v4 legítimo (ej. "3b2b11a8-2c3d-...")
        perfilDocenteId: dto.perfilDocenteId ?? null,
        tipoGeneral: dto.tipoGeneral,
        cursoId: dto.cursoId ?? null,
        actividadId: dto.actividadId ?? null,
        nombreActividad: dto.nombreActividad,
        descripcion: dto.descripcion ?? null,
        unidad: dto.unidad ?? null,
        tipoActividad: dto.tipoActividad ?? null,
        rutaArchivoLocal: dto.rutaArchivoLocal ?? null,
        urlRemota: null,
        tipoArchivo: dto.tipoArchivo ?? 'IMAGE',
        creadoEn: new Date().toISOString(),
        actualizadoEn: new Date().toISOString(),
      };

      await db.insert(evidencias).values(nuevaEvidencia);
      return nuevaEvidencia;
    } catch (error) {
      console.error('[evidenciaService.crearEvidencia Error]:', error);
      throw error;
    }
  },

  /**
   * Elimina una evidencia por su ID
   */
  async eliminarEvidencia(id: string) {
    try {
      await db.delete(evidencias).where(eq(evidencias.id, id));
    } catch (error) {
      console.error('[evidenciaService.eliminarEvidencia Error]:', error);
      throw error;
    }
  },
};