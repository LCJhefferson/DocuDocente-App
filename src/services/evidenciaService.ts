import { and, desc, eq } from 'drizzle-orm';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import { db } from '../database/client';
import { eliminacionesPendientes, evidencias } from '../database/schema';
import { CrearEvidenciaDTO } from '../models/Evidence';
import { supabase } from './supabase/client';

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
        id: Crypto.randomUUID(),
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
   * Elimina una evidencia (Académica o Extracurricular) local y remotamente.
   * Maneja borrado de archivos de imagen y cola de eliminaciones offline.
   */
  async eliminarEvidencia(id: string, docenteId?: string): Promise<void> {
    try {
      // 1. Obtener la evidencia local para consultar rutas e identificadores
      const [evidenciaLocal] = await db
        .select()
        .from(evidencias)
        .where(eq(evidencias.id, id));

      if (!evidenciaLocal) return;

      // 2. Eliminar la imagen del almacenamiento físico del dispositivo si existe
      if (evidenciaLocal.rutaArchivoLocal) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(evidenciaLocal.rutaArchivoLocal);
          if (fileInfo.exists) {
            await FileSystem.deleteAsync(evidenciaLocal.rutaArchivoLocal, { idempotent: true });
          }
        } catch (e) {
          console.warn('[eliminarEvidencia] No se pudo eliminar el archivo físico local:', e);
        }
      }

      // 3. Eliminar registro de la base de datos local SQLite
      await db.delete(evidencias).where(eq(evidencias.id, id));

      // 4. Determinar ruta en Supabase Storage si la imagen fue subida
      const idDocente = docenteId || evidenciaLocal.perfilDocenteId;
      const storagePath = idDocente ? `evidencias/${idDocente}/${id}.jpg` : null;

      // 5. Intentar eliminar inmediatamente en Supabase Cloud
      try {
        if (storagePath) {
          await supabase.storage.from('evidencias-imagenes').remove([storagePath]);
        }

        const { error } = await supabase.from('evidencias').delete().eq('id', id);
        if (error) throw error;
      } catch (cloudError) {
        console.warn('[eliminarEvidencia] Sin conexión remota. Registrando en cola offline.');

        // Guardar acción en la cola de eliminaciones pendientes
        await db.insert(eliminacionesPendientes).values({
          id: Crypto.randomUUID(),
          tabla: 'evidencias',
          registroId: id,
          storagePath: storagePath,
          creadoEn: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('[evidenciaService.eliminarEvidencia Error]:', error);
      throw error;
    }
  },
};