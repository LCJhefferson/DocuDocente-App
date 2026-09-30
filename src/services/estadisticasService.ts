import { and, eq, sql } from 'drizzle-orm';
import { db } from '../database/client';
import { cursos, informes, resultadosUnidad } from '../database/schema';

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

let tablaActualizada = false;

async function asegurarEstructura() {
  if (tablaActualizada) return;

  try {
    await db.run(sql`PRAGMA foreign_keys = OFF;`);
  } catch (e) {}

  try {
    await db.run(sql`ALTER TABLE resultados_unidad ADD COLUMN curso_id TEXT;`);
  } catch (e) {}

  try {
    await db.run(sql`ALTER TABLE resultados_unidad ADD COLUMN tipo_grafico TEXT DEFAULT 'pastel';`);
  } catch (e) {}

  tablaActualizada = true;
}

async function obtenerOCrearInformeId(cursoId: string, totalAlumnos: number): Promise<string> {
  try {
    const informesExistentes = await db
      .select()
      .from(informes)
      .where(eq(informes.cursoId, cursoId));

    if (informesExistentes.length > 0) {
      return informesExistentes[0].id;
    }

    const cursoData = await db
      .select()
      .from(cursos)
      .where(eq(cursos.id, cursoId));

    const infoCurso = cursoData[0];
    const nuevoInformeId = `inf_${Date.now()}`;
    const ahoraStr = new Date().toISOString();

    await db.insert(informes).values({
      id: nuevoInformeId,
      perfilDocenteId: infoCurso?.perfilDocenteId || null,
      cursoId: cursoId,
      numeroInforme: 'INF-001',
      dirigidoANombre: 'Director de Departamento Académico',
      dirigidoACargo: 'Director de Escuela',
      remitenteNombre: 'Docente Titular',
      asunto: `Informe Académico - ${infoCurso?.nombre || 'Curso'}`,
      fechaStr: new Date().toLocaleDateString('es-PE'),
      nombreCurso: infoCurso?.nombre || 'Curso',
      ciclo: infoCurso?.ciclo || 'I',
      semestre: infoCurso?.semestre || '2026-I',
      totalEstudiantes: totalAlumnos,
      estado: 'BORRADOR',
      creadoEn: ahoraStr,
      actualizadoEn: ahoraStr,
    });

    return nuevoInformeId;
  } catch (err) {
    console.warn('No se pudo crear borrador de informe, usando identificador directo:', err);
    return `inf_auto_${cursoId}`;
  }
}

export const estadisticasService = {
  async guardar(params: GuardarEstadisticaParams) {
    try {
      await asegurarEstructura();

      const total = params.aprobados + params.desaprobados;
      const informeIdValido = params.informeId || (await obtenerOCrearInformeId(params.cursoId, total));

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
      await asegurarEstructura();

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
      await asegurarEstructura();

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