import { and, desc, eq } from 'drizzle-orm';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/client';
import { cursos, evidencias, informes, resultadosUnidad } from '../database/schema';
import {
  EntradaCrearInforme,
  EntradaResultadoUnidad,
  Informe,
  InformeCompleto,
} from '../models/Informe';
import { calcularResumenUnidad, generarInterpretacion } from '../utils/estadisticas';

export class InformeService {
  /**
   * Crea un informe con los resultados de sus unidades.
   * Los porcentajes y el texto de análisis se calculan automáticamente.
   */
  static async crearInforme(
    entrada: EntradaCrearInforme,
    unidades: EntradaResultadoUnidad[]
  ): Promise<string> {
    const informeId = uuidv4();
    const ahora = new Date().toISOString();

    // Total de estudiantes = la unidad con más evaluados
    const totalEstudiantes = Math.max(
      0,
      ...unidades.map((u) => u.cantidadAprobados + u.cantidadDesaprobados)
    );

    await db.insert(informes).values({
      id: informeId,
      perfilDocenteId: entrada.perfilDocenteId,
      cursoId: entrada.cursoId,
      numeroInforme: entrada.numeroInforme.trim(),
      dirigidoANombre: entrada.dirigidoANombre.trim(),
      dirigidoACargo: entrada.dirigidoACargo.trim(),
      remitenteNombre: entrada.remitenteNombre.trim(),
      asunto: entrada.asunto.trim(),
      fechaStr: entrada.fechaStr.trim(),
      nombreCurso: entrada.nombreCurso,
      ciclo: entrada.ciclo,
      semestre: entrada.semestre,
      totalEstudiantes,
      estado: 'COMPLETADO',
      creadoEn: ahora,
      actualizadoEn: ahora,
    });

    for (const u of unidades) {
      const resumen = calcularResumenUnidad(u.cantidadAprobados, u.cantidadDesaprobados);

      await db.insert(resultadosUnidad).values({
        id: uuidv4(),
        informeId,
        nombreUnidad: u.nombreUnidad,
        cantidadAprobados: u.cantidadAprobados,
        cantidadDesaprobados: u.cantidadDesaprobados,
        porcentajeAprobados: resumen.porcentajeAprobados,
        porcentajeDesaprobados: resumen.porcentajeDesaprobados,
        textoInterpretacion: generarInterpretacion(u.nombreUnidad, u.cantidadAprobados, u.cantidadDesaprobados),
      });
    }

    return informeId;
  }

  /**
   * Historial: informes del docente, del más reciente al más antiguo
   */
  static async obtenerInformesPorDocente(perfilDocenteId: string): Promise<Informe[]> {
    return (await db
      .select()
      .from(informes)
      .where(eq(informes.perfilDocenteId, perfilDocenteId))
      .orderBy(desc(informes.creadoEn))) as Informe[];
  }

  /**
   * Informe + resultados por unidad + evidencias académicas del curso.
   * Es lo que usan la vista previa en la app y el PDF.
   */
  static async obtenerInformeCompleto(informeId: string): Promise<InformeCompleto | null> {
    const filas = await db.select().from(informes).where(eq(informes.id, informeId));
    if (filas.length === 0) return null;

    const informe = filas[0] as Informe;

    const unidades = await db
      .select()
      .from(resultadosUnidad)
      .where(eq(resultadosUnidad.informeId, informeId))
      .orderBy(resultadosUnidad.nombreUnidad);

    const evidenciasCurso = informe.cursoId
      ? await db
          .select()
          .from(evidencias)
          .where(and(eq(evidencias.cursoId, informe.cursoId), eq(evidencias.tipoGeneral, 'ACADEMICA')))
          .orderBy(evidencias.unidad, evidencias.creadoEn)
      : [];

    return { informe, unidades, evidencias: evidenciasCurso };
  }

  /**
   * Datos del curso para prellenar el formulario del informe
   */
  static async obtenerCurso(cursoId: string) {
    const filas = await db.select().from(cursos).where(eq(cursos.id, cursoId));
    return filas[0] ?? null;
  }

  /**
   * Elimina un informe (sus resultados se borran solos por ON DELETE CASCADE)
   */
  static async eliminarInforme(informeId: string): Promise<void> {
    await db.delete(informes).where(eq(informes.id, informeId));
  }
}
