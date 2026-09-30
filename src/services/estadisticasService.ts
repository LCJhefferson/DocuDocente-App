import { and, eq } from 'drizzle-orm';
import { db } from '../database/client';
import { resultadosUnidad } from '../database/schema';

export interface GuardarEstadisticaParams {
  cursoId: string;
  unidad: string;
  aprobados: number;
  desaprobados: number;
  pctAprobados: number;
  pctDesaprobados: number;
  tipoGrafico?: string;
  informeId?: string;
}

export const estadisticasService = {
  async guardar(params: GuardarEstadisticaParams) {
    try {
      // Las notas son del curso: se vinculan a un informe solo si se indica
      const informeIdValido = params.informeId ?? null;

      const existentes = await db
        .select()
        .from(resultadosUnidad)
        .where(
          and(
            eq(resultadosUnidad.cursoId, params.cursoId),
            eq(resultadosUnidad.nombreUnidad, params.unidad)
          )
        );

      if (existentes.length > 0) {
        await db
          .update(resultadosUnidad)
          .set({
            cantidadAprobados: params.aprobados,
            cantidadDesaprobados: params.desaprobados,
            porcentajeAprobados: params.pctAprobados,
            porcentajeDesaprobados: params.pctDesaprobados,
            tipoGrafico: params.tipoGrafico || 'pastel',
            informeId: informeIdValido,
          })
          .where(eq(resultadosUnidad.id, existentes[0].id));
      } else {
        await db.insert(resultadosUnidad).values({
          id: `est_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          informeId: informeIdValido,
          cursoId: params.cursoId,
          nombreUnidad: params.unidad,
          cantidadAprobados: params.aprobados,
          cantidadDesaprobados: params.desaprobados,
          porcentajeAprobados: params.pctAprobados,
          porcentajeDesaprobados: params.pctDesaprobados,
          tipoGrafico: params.tipoGrafico || 'pastel',
        });
      }

      return { ok: true };
    } catch (error) {
      console.error('Error al guardar en SQLite:', error);
      throw error;
    }
  },

  async obtenerPorCursoYUnidad(cursoId: string, unidad: string) {
    try {
      const res = await db
        .select()
        .from(resultadosUnidad)
        .where(
          and(
            eq(resultadosUnidad.cursoId, cursoId),
            eq(resultadosUnidad.nombreUnidad, unidad)
          )
        );
      return res[0] || null;
    } catch (error) {
      console.error('Error al consultar SQLite:', error);
      return null;
    }
  },

  async eliminar(cursoId: string, unidad: string) {
    try {
      await db
        .delete(resultadosUnidad)
        .where(
          and(
            eq(resultadosUnidad.cursoId, cursoId),
            eq(resultadosUnidad.nombreUnidad, unidad)
          )
        );
      return { ok: true };
    } catch (error) {
      console.error('Error al eliminar estadística de SQLite:', error);
      throw error;
    }
  },
};