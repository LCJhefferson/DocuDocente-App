import { and, desc, eq, like } from 'drizzle-orm';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/client';
import { cursos } from '../database/schema';
import { Curso, EntradaCrearCurso } from '../models/Curso';

export interface EntradaActualizarCurso {
  nombre: string;
  codigo?: string;
  ciclo: string;
  semestre: string;
}

export class CursoService {
  /**
   * Obtiene todos los cursos asignados a un docente
   */
  static async obtenerCursosPorDocente(perfilDocenteId: string, filtroBusqueda: string = ''): Promise<Curso[]> {
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
      codigo: c.codigo,
      ciclo: c.ciclo,
      semestre: c.semestre,
      creadoEn: c.creadoEn,
    }));
  }

  /**
   * Crea un nuevo curso
   */
  static async crearCurso(entrada: EntradaCrearCurso): Promise<Curso> {
    const cursoId = uuidv4();
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
      nombre: entrada.nombre,
      codigo: entrada.codigo,
      ciclo: entrada.ciclo,
      semestre: entrada.semestre,
      creadoEn: ahora,
    };
  }

  /**
   * Actualiza los datos de un curso existente
   */
  static async actualizarCurso(cursoId: string, entrada: EntradaActualizarCurso): Promise<void> {
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
  }

  /**
   * Elimina un curso por su ID
   */
  static async eliminarCurso(cursoId: string): Promise<void> {
    await db
      .delete(cursos)
      .where(eq(cursos.id, cursoId));
  }
}