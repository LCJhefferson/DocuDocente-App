import { and, desc, eq, isNotNull } from 'drizzle-orm';
import * as Crypto from 'expo-crypto';
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

/**
 * Agrupa y consolida los resultados por unidad de múltiples cursos para informes generados con plantilla
 */
const sumarPorUnidad = (
  informeId: string,
  resultados: { nombreUnidad: string; aprobados: number; desaprobados: number }[]
): ResultadoUnidad[] => {
  const totales = new Map<string, { aprobados: number; desaprobados: number }>();
  for (const r of resultados) {
    const t = totales.get(r.nombreUnidad) ?? { aprobados: 0, desaprobados: 0 };
    totales.set(r.nombreUnidad, {
      aprobados: t.aprobados + r.aprobados,
      desaprobados: t.desaprobados + r.desaprobados,
    });
  }

  return [...totales.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([nombreUnidad, t]) => {
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

export const informeService = {
  /**
   * Crea un informe tradicional calculando métricas de aprobados/desaprobados e insertando unidades
   */
  async crearInforme(
    entrada: EntradaCrearInforme,
    unidades: EntradaResultadoUnidad[]
  ): Promise<string> {
    try {
      const informeId = Crypto.randomUUID();
      const ahora = new Date().toISOString();

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
          id: Crypto.randomUUID(),
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
    } catch (error) {
      console.error('[informeService.crearInforme Error]:', error);
      throw error;
    }
  },

  /**
   * Obtiene el historial de informes del docente ordenados de más reciente a más antiguo
   */
  async obtenerInformesPorDocente(perfilDocenteId: string): Promise<Informe[]> {
    try {
      if (!perfilDocenteId) return [];

      return (await db
        .select()
        .from(informes)
        .where(eq(informes.perfilDocenteId, perfilDocenteId))
        .orderBy(desc(informes.creadoEn))) as Informe[];
    } catch (error) {
      console.error('[informeService.obtenerInformesPorDocente Error]:', error);
      throw error;
    }
  },

  /**
   * Obtiene la estructura completa de un informe (datos, unidades, evidencias y plantilla asociada)
   */
  async obtenerInformeCompleto(informeId: string): Promise<InformeCompleto | null> {
    try {
      const filas = await db.select().from(informes).where(eq(informes.id, informeId));
      if (filas.length === 0) return null;

      const informe = filas[0] as Informe;

      const filasUnidades = await db
        .select()
        .from(resultadosUnidad)
        .where(eq(resultadosUnidad.informeId, informeId))
        .orderBy(resultadosUnidad.nombreUnidad);

      const unidades: ResultadoUnidad[] =
        informe.contenido && filasUnidades.length === 0
          ? sumarPorUnidad(informe.id, Object.values(informe.contenido.resultados).flat())
          : (filasUnidades as ResultadoUnidad[]);

      const evidenciasCurso = informe.cursoId
        ? await db
            .select()
            .from(evidencias)
            .where(and(eq(evidencias.cursoId, informe.cursoId), eq(evidencias.tipoGeneral, 'ACADEMICA')))
            .orderBy(evidencias.unidad, evidencias.creadoEn)
        : [];

      const [plantilla] = await db
        .select()
        .from(plantillas)
        .where(eq(plantillas.esPredeterminada, true))
        .limit(1);

      return {
        informe,
        unidades,
        evidencias: evidenciasCurso as any,
        plantilla: plantilla ?? PLANTILLA_UNTRM,
        definicion: plantilla?.definicion ?? null,
      };
    } catch (error) {
      console.error('[informeService.obtenerInformeCompleto Error]:', error);
      throw error;
    }
  },

  /**
   * Almacena un informe estructurado a partir de una plantilla dinámica (multicurso)
   */
  async crearInformeConPlantilla(entrada: {
    perfilDocenteId: string;
    plantillaId: string | null;
    datos: DatosInforme;
    guardado: InformeConPlantilla;
  }): Promise<string> {
    try {
      const { datos, guardado } = entrada;
      const lineas = (clave: string) =>
        (guardado.contenido.campos[clave] ?? '')
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean);

      const [aNombre = '', ...aCargo] = lineas('a');
      const informeId = Crypto.randomUUID();
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
    } catch (error) {
      console.error('[informeService.crearInformeConPlantilla Error]:', error);
      throw error;
    }
  },

  /**
   * Recupera el contenido dinámico del último informe generado por el docente
   */
  async obtenerUltimoContenido(perfilDocenteId: string): Promise<InformeConPlantilla | null> {
    try {
      if (!perfilDocenteId) return null;

      const [fila] = await db
        .select({ contenido: informes.contenido })
        .from(informes)
        .where(and(eq(informes.perfilDocenteId, perfilDocenteId), isNotNull(informes.contenido)))
        .orderBy(desc(informes.creadoEn))
        .limit(1);

      return fila?.contenido ?? null;
    } catch (error) {
      console.error('[informeService.obtenerUltimoContenido Error]:', error);
      throw error;
    }
  },

  /**
   * Elimina un informe registrado en SQLite
   */
  async eliminarInforme(informeId: string): Promise<void> {
    try {
      await db.delete(informes).where(eq(informes.id, informeId));
    } catch (error) {
      console.error('[informeService.eliminarInforme Error]:', error);
      throw error;
    }
  },
};

/**
 * Wrapper estático para preservar la compatibilidad con el hook `useInformes`
 */
export class InformeService {
  static crearInforme = informeService.crearInforme;
  static obtenerInformesPorDocente = informeService.obtenerInformesPorDocente;
  static obtenerInformeCompleto = informeService.obtenerInformeCompleto;
  static crearInformeConPlantilla = informeService.crearInformeConPlantilla;
  static obtenerUltimoContenido = informeService.obtenerUltimoContenido;
  static eliminarInforme = informeService.eliminarInforme;
}