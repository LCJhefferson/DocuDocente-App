// Reúne todo lo que una plantilla necesita para generar el informe:
// docente, cursos, resultados de notas por unidad, evidencias y extracurriculares.
import { and, desc, eq, inArray, isNull, like } from 'drizzle-orm';
import { db } from '../database/client';
import { cursos, evidencias, informes, perfilesDocente, resultadosUnidad } from '../database/schema';
import { Curso } from '../models/Curso';
import { EvidenciaInforme } from '../models/Informe';
import { PerfilDocente } from '../models/PerfilDocente';
import { calcularResumenUnidad, ResumenUnidad } from '../utils/estadisticas';
import { fechaOficio, inicialesDocente, numeroInforme, textoUnidades } from '../utils/informeTexto';

export type ResultadoUnidadCurso = ResumenUnidad & {
  nombreUnidad: string;
  aprobados: number;
  desaprobados: number;
};

export type DatosCurso = {
  curso: Curso;
  resultados: ResultadoUnidadCurso[]; // solo las unidades pedidas que tienen notas
  evidencias: EvidenciaInforme[];
};

export type DatosInforme = {
  docente: PerfilDocente;
  cursos: DatosCurso[];
  extracurriculares: EvidenciaInforme[];
  unidades: string[]; // unidades pedidas, en orden: ["Unidad 1", "Unidad 2"]
  valores: Record<string, string>; // para los [marcadores] de la plantilla
  numeroSugerido: string;
  fecha: string;
};

export type PedidoInforme = {
  perfilDocenteId: string;
  cursoIds: string[];
  unidades: string[];
};

const columnasEvidencia = {
  id: evidencias.id,
  nombreActividad: evidencias.nombreActividad,
  descripcion: evidencias.descripcion,
  unidad: evidencias.unidad,
  tipoActividad: evidencias.tipoActividad,
  rutaArchivoLocal: evidencias.rutaArchivoLocal,
  tipoArchivo: evidencias.tipoArchivo,
};

export const informeDatosService = {
  async reunir({ perfilDocenteId, cursoIds, unidades }: PedidoInforme): Promise<DatosInforme> {
    const [docente] = await db.select().from(perfilesDocente).where(eq(perfilesDocente.id, perfilDocenteId));
    if (!docente) throw new Error('No se encontró el perfil del docente.');

    const filasCursos = cursoIds.length
      ? await db
          .select()
          .from(cursos)
          .where(and(eq(cursos.perfilDocenteId, perfilDocenteId), inArray(cursos.id, cursoIds)))
          .orderBy(cursos.ciclo, cursos.nombre)
      : [];

    const datosCursos: DatosCurso[] = [];
    for (const curso of filasCursos) {
      // Notas guardadas en "Añadir notas" (sin informe_id = las del curso, no copias de informes)
      const notas = await db
        .select()
        .from(resultadosUnidad)
        .where(and(eq(resultadosUnidad.cursoId, curso.id), isNull(resultadosUnidad.informeId)));

      const resultados = unidades
        .map((unidad) => notas.find((n) => n.nombreUnidad === unidad))
        .filter((n) => n !== undefined)
        .map((n) => ({
          nombreUnidad: n.nombreUnidad,
          aprobados: n.cantidadAprobados,
          desaprobados: n.cantidadDesaprobados,
          ...calcularResumenUnidad(n.cantidadAprobados, n.cantidadDesaprobados),
        }));

      const evidenciasCurso = await db
        .select(columnasEvidencia)
        .from(evidencias)
        .where(
          and(
            eq(evidencias.cursoId, curso.id),
            eq(evidencias.tipoGeneral, 'ACADEMICA'),
            unidades.length ? inArray(evidencias.unidad, unidades) : undefined
          )
        )
        .orderBy(evidencias.unidad, evidencias.creadoEn);

      datosCursos.push({ curso, resultados, evidencias: evidenciasCurso });
    }

    // ponytail: las extracurriculares no guardan de qué docente son; se toman todas las del teléfono
    const extracurriculares = await db
      .select(columnasEvidencia)
      .from(evidencias)
      .where(eq(evidencias.tipoGeneral, 'EXTRACURRICULAR'))
      .orderBy(desc(evidencias.creadoEn));

    const hoy = new Date();
    const iniciales = inicialesDocente(docente.nombreCompleto);
    const semestre = filasCursos[0]?.semestre ?? String(hoy.getFullYear());

    // Correlativo: informes de este docente con el mismo sufijo en el año + 1
    const anteriores = await db
      .select({ id: informes.id })
      .from(informes)
      .where(and(eq(informes.perfilDocenteId, perfilDocenteId), like(informes.numeroInforme, `%-${hoy.getFullYear()}-%`)));

    return {
      docente,
      cursos: datosCursos,
      extracurriculares,
      unidades,
      valores: {
        unidades: textoUnidades(unidades),
        semestre,
        docente: `${docente.gradoAcademico} ${docente.nombreCompleto}`.trim(),
      },
      numeroSugerido: numeroInforme(anteriores.length + 1, hoy.getFullYear(), iniciales),
      fecha: fechaOficio(hoy),
    };
  },
};
