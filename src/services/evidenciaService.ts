import { and, eq } from 'drizzle-orm';
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
   * Inserta una nueva evidencia en SQLite
   */
  async crearEvidencia(dto: CrearEvidenciaDTO) {
    try {
      const nuevaEvidencia = {
        id: Date.now().toString(),
        tipoGeneral: dto.tipoGeneral,
        cursoId: dto.cursoId ?? null,
        actividadId: dto.actividadId ?? null,
        nombreActividad: dto.nombreActividad,
        descripcion: dto.descripcion ?? null,
        unidad: dto.unidad ?? null,
        tipoActividad: dto.tipoActividad ?? null,
        rutaArchivoLocal: dto.rutaArchivoLocal ?? null,
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