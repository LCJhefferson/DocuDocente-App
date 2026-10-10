import { and, desc, eq, isNotNull } from 'drizzle-orm';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/client';
import { cursos, evidencias, informes, plantillas, resultadosUnidad } from '../database/schema';
import {
  EntradaCrearInforme,
  EntradaResultadoUnidad,
  Informe,
  InformeCompleto,
  PLANTILLA_UNTRM,
  ResultadoUnidad,
} from '../models/Informe';
import { InformeConPlantilla } from '../models/Plantilla';
import { calcularResumenUnidad, generarInterpretacion } from '../utils/estadisticas';
import { DatosInforme } from './informeDatosService';

const sumarPorUnidad = (
  informeId: string,
  resultados: { nombreUnidad: string; aprobados: number; desaprobados: number }[]
): ResultadoUnidad[] => {
  const totales = new Map<string, { aprobados: number; desaprobados: number }>();
  for (const r of resultados) {
    const t = totales.get(r.nombreUnidad) ?? { aprobados: 0, desaprobados: 0 };
    totales.set(r.nombreUnidad, { aprobados: t.aprobados + r.aprobados, desaprobados: t.desaprobados + r.desaprobados });
  }
  return [...totales.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([nombreUnidad, t]) => {
    const resumen = calcularResumenUnidad(t.aprobados, t.desaprobados);
    return {
      id: `${informeId}-${nombreUnidad}`,
      nombreUnidad,
      cantidadAprobados: t.aprobados,
      cantidadDesaprobados: t.desaprobados,
      porcentajeAprobados: resumen.porcentajeAprobados,
      porcentajeDesaprobados: resumen.porcentajeDesaprobados,
      textoInterpretacion: generarInterpretacion(nombreUnidad, t.aprobados, t.desaprobados),
    };
  });
};

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

    const filasUnidades = await db
      .select()
      .from(resultadosUnidad)
      .where(eq(resultadosUnidad.informeId, informeId))
      .orderBy(resultadosUnidad.nombreUnidad);

    // Informes hechos con plantilla: las notas están en su contenido (se suman por unidad si hay varios cursos)
    const unidades: ResultadoUnidad[] = informe.contenido && filasUnidades.length === 0
      ? sumarPorUnidad(informe.id, Object.values(informe.contenido.resultados).flat())
      : filasUnidades;

    const evidenciasCurso = informe.cursoId
      ? await db
          .select()
          .from(evidencias)
          .where(and(eq(evidencias.cursoId, informe.cursoId), eq(evidencias.tipoGeneral, 'ACADEMICA')))
          .orderBy(evidencias.unidad, evidencias.creadoEn)
      : [];

    // Plantilla predeterminada del módulo de plantillas; si no hay, la de la UNTRM
    const [plantilla] = await db.select().from(plantillas).where(eq(plantillas.esPredeterminada, true)).limit(1);

    return {
      informe,
      unidades,
      evidencias: evidenciasCurso,
      plantilla: plantilla ?? PLANTILLA_UNTRM,
      definicion: plantilla?.definicion ?? null,
    };
  }

  /**
   * Guarda un informe hecho con plantilla (uno o varios cursos). Devuelve su id.
   */
  static async crearInformeConPlantilla(entrada: {
    perfilDocenteId: string;
    plantillaId: string | null;
    datos: DatosInforme;
    guardado: InformeConPlantilla;
  }): Promise<string> {
    const { datos, guardado } = entrada;
    const lineas = (clave: string) => (guardado.contenido.campos[clave] ?? '').split('\n').map((l) => l.trim()).filter(Boolean);
    const [aNombre = '', ...aCargo] = lineas('a');
    const informeId = uuidv4();
    const ahora = new Date().toISOString();

    await db.insert(informes).values({
      id: informeId,
      perfilDocenteId: entrada.perfilDocenteId,
      cursoId: datos.cursos[0]?.curso.id ?? null,
      plantillaId: entrada.plantillaId,
      numeroInforme: guardado.contenido.campos.numero ?? datos.numeroSugerido,
      dirigidoANombre: aNombre,
      dirigidoACargo: aCargo.join(' '),
      remitenteNombre: lineas('de')[0] ?? datos.valores.docente,
      asunto: guardado.contenido.campos.asunto ?? '',
      fechaStr: guardado.contenido.campos.fecha ?? datos.fecha,
      nombreCurso: datos.cursos.map((c) => c.curso.nombre).join(' · '),
      ciclo: [...new Set(datos.cursos.map((c) => c.curso.ciclo))].join(', '),
      semestre: datos.valores.semestre,
      totalEstudiantes: Math.max(0, ...datos.cursos.flatMap((c) => c.resultados.map((r) => r.total))),
      estado: 'COMPLETADO',
      contenido: guardado,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
    return informeId;
  }

  /**
   * Lo escrito en el último informe con plantilla del docente (para no volver a escribirlo)
   */
  static async obtenerUltimoContenido(perfilDocenteId: string): Promise<InformeConPlantilla | null> {
    const [fila] = await db
      .select({ contenido: informes.contenido })
      .from(informes)
      .where(and(eq(informes.perfilDocenteId, perfilDocenteId), isNotNull(informes.contenido)))
      .orderBy(desc(informes.creadoEn))
      .limit(1);
    return fila?.contenido ?? null;
  }



  /**
   * Elimina un informe (sus resultados se borran solos por ON DELETE CASCADE)
   */
  static async eliminarInforme(informeId: string): Promise<void> {
    await db.delete(informes).where(eq(informes.id, informeId));
  }
}
