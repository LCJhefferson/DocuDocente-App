import { and, desc, eq, like } from 'drizzle-orm';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import { db } from '../database/client';
import { cursos, eliminacionesPendientes, evidencias } from '../database/schema';
import { Curso, EntradaCrearCurso } from '../models/Curso';
import { supabase } from './supabase/client';

export interface EntradaActualizarCurso {
  nombre: string;
  codigo?: string;
  ciclo: string;
  semestre: string;
}

export const cursoService = {
  /**
   * Obtiene todos los cursos asignados a un docente con opción de búsqueda por nombre
   */
  async obtenerCursosPorDocente(perfilDocenteId: string, filtroBusqueda: string = ''): Promise<Curso[]> {
    try {
      if (!perfilDocenteId) return [];

      const consulta = filtroBusqueda.trim()
        ? and(
            eq(cursos.perfilDocenteId, perfilDocenteId),
            like(cursos.nombre, `%${filtroBusqueda.trim()}%`)
          )
        : eq(cursos.perfilDocenteId, perfilDocenteId);

      const resultados = await db
        .select()
        .from(cursos)
        .where(consulta)
        .orderBy(desc(cursos.creadoEn));

      return resultados.map((c) => ({
        id: c.id,
        perfilDocenteId: c.perfilDocenteId,
        nombre: c.nombre,
        codigo: c.codigo ?? undefined,
        ciclo: c.ciclo,
        semestre: c.semestre,
        creadoEn: c.creadoEn,
      }));
    } catch (error) {
      console.error('[cursoService.obtenerCursosPorDocente Error]:', error);
      throw error;
    }
  },

  /**
   * Obtiene un curso específico por su ID
   */
  async obtenerPorId(cursoId: string): Promise<Curso | null> {
    try {
      const [resultado] = await db
        .select()
        .from(cursos)
        .where(eq(cursos.id, cursoId));

      if (!resultado) return null;

      return {
        id: resultado.id,
        perfilDocenteId: resultado.perfilDocenteId,
        nombre: resultado.nombre,
        codigo: resultado.codigo ?? undefined,
        ciclo: resultado.ciclo,
        semestre: resultado.semestre,
        creadoEn: resultado.creadoEn,
      };
    } catch (error) {
      console.error('[cursoService.obtenerPorId Error]:', error);
      throw error;
    }
  },

  /**
   * Crea un nuevo curso en SQLite utilizando la API Crypto de Expo
   */
  async crearCurso(entrada: EntradaCrearCurso): Promise<Curso> {
    try {
      const cursoId = Crypto.randomUUID();
      const ahora = new Date().toISOString();

      await db.insert(cursos).values({
        id: cursoId,
        perfilDocenteId: entrada.perfilDocenteId,
        nombre: entrada.nombre.trim(),
        codigo: entrada.codigo?.trim() || null,
        ciclo: entrada.ciclo.trim(),
        semestre: entrada.semestre.trim(),
        creadoEn: ahora,
        actualizadoEn: ahora,
      });

      return {
        id: cursoId,
        perfilDocenteId: entrada.perfilDocenteId,
        nombre: entrada.nombre.trim(),
        codigo: entrada.codigo?.trim(),
        ciclo: entrada.ciclo.trim(),
        semestre: entrada.semestre.trim(),
        creadoEn: ahora,
      };
    } catch (error) {
      console.error('[cursoService.crearCurso Error]:', error);
      throw error;
    }
  },

  /**
   * Actualiza los datos de un curso existente y renueva el timestamp actualizadoEn
   */
  async actualizarCurso(cursoId: string, entrada: EntradaActualizarCurso): Promise<void> {
    try {
      const ahora = new Date().toISOString();

      await db
        .update(cursos)
        .set({
          nombre: entrada.nombre.trim(),
          codigo: entrada.codigo?.trim() || null,
          ciclo: entrada.ciclo.trim(),
          semestre: entrada.semestre.trim(),
          actualizadoEn: ahora,
        })
        .where(eq(cursos.id, cursoId));
    } catch (error) {
      console.error('[cursoService.actualizarCurso Error]:', error);
      throw error;
    }
  },

  /**
   * ELIMINACIÓN EN CASCADA (Curso + Evidencias asociadas + Archivos locales + Supabase Cloud)
   */
  async eliminarCurso(cursoId: string, docenteId?: string): Promise<void> {
    try {
      // 1. Obtener todas las evidencias vinculadas a este curso
      const evidenciasDelCurso = await db
        .select()
        .from(evidencias)
        .where(eq(evidencias.cursoId, cursoId));

      const pathsStorageABorrar: string[] = [];

      // 2. Borrar las imágenes físicas guardadas localmente en el dispositivo
      for (const ev of evidenciasDelCurso) {
        if (ev.rutaArchivoLocal) {
          try {
            const fileInfo = await FileSystem.getInfoAsync(ev.rutaArchivoLocal);
            if (fileInfo.exists) {
              await FileSystem.deleteAsync(ev.rutaArchivoLocal, { idempotent: true });
            }
          } catch (e) {
            console.warn('[eliminarCurso] No se pudo borrar el archivo físico local:', e);
          }
        }

        const idDocente = docenteId || ev.perfilDocenteId;
        if (idDocente) {
          pathsStorageABorrar.push(`evidencias/${idDocente}/${ev.id}.jpg`);
        }
      }

      // 3. Borrar evidencias vinculadas de SQLite local
      await db.delete(evidencias).where(eq(evidencias.cursoId, cursoId));

      // 4. Borrar el curso de SQLite local
      await db.delete(cursos).where(eq(cursos.id, cursoId));

      // 5. Intentar eliminar en Supabase Cloud
      try {
        // Borrar imágenes de Supabase Storage en lote
        if (pathsStorageABorrar.length > 0) {
          await supabase.storage.from('evidencias-imagenes').remove(pathsStorageABorrar);
        }

        // Borrar evidencias de Supabase DB
        await supabase.from('evidencias').delete().eq('curso_id', cursoId);

        // Borrar curso de Supabase DB
        const { error } = await supabase.from('cursos').delete().eq('id', cursoId);
        if (error) throw error;
      } catch (cloudError) {
        console.warn('[eliminarCurso] Sin conexión remota. Guardando tareas en cola offline.');

        const ahora = new Date().toISOString();

        // Encolar borrado del curso para la sincronización
        await db.insert(eliminacionesPendientes).values({
          id: Crypto.randomUUID(),
          tabla: 'cursos',
          registroId: cursoId,
          storagePath: null,
          creadoEn: ahora,
        });

        // Encolar borrado de cada evidencia del curso
        for (const ev of evidenciasDelCurso) {
          const idDocente = docenteId || ev.perfilDocenteId;
          const path = idDocente ? `evidencias/${idDocente}/${ev.id}.jpg` : null;

          await db.insert(eliminacionesPendientes).values({
            id: Crypto.randomUUID(),
            tabla: 'evidencias',
            registroId: ev.id,
            storagePath: path,
            creadoEn: ahora,
          });
        }
      }
    } catch (error) {
      console.error('[cursoService.eliminarCurso Error]:', error);
      throw error;
    }
  },
};

export class CursoService {
  static obtenerCursosPorDocente = cursoService.obtenerCursosPorDocente;
  static obtenerPorId = cursoService.obtenerPorId;
  static crearCurso = cursoService.crearCurso;
  static actualizarCurso = cursoService.actualizarCurso;
  static eliminarCurso = cursoService.eliminarCurso;
}