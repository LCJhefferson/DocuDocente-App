// Catálogo de plantillas basado en informes reales de la FISME – UNTRM:
//  - Informe de unidad: Informe N° 002-2026-UNTRM-FISME/ENFP (Mg. Figueroa)
//  - Informe fin de ciclo: Informe N° 005-2026-UNTRM-FISME/ENFP (Mg. Figueroa)
// Los textos entre [corchetes] se reemplazan al generar el informe.
import { Cabecera, CampoOficio, DefinicionPlantilla, Pie, Seccion } from '../models/Plantilla';
import { FORMATOS, LEMA_2026, PIE_FISME, UNTRM_LINEAS } from '../utils/plantillaBase';

export type VarianteCabecera = 'A' | 'B';
export type TipoCatalogo = 'unidad' | 'fin_ciclo';

// A: sin logo FISME (formato Masgo) · B: con logo FISME (formato Figueroa)
const CABECERAS: Record<VarianteCabecera, { cabecera: Cabecera; pie: Pie }> = {
  A: {
    cabecera: {
      logoIzquierdo: 'untrm',
      textoIzquierdo: UNTRM_LINEAS,
      logoDerecho: null,
      textoDerecho: ['Facultad de Ingeniería de Sistemas y', 'Mecánica Eléctrica'],
      lema: LEMA_2026,
      lineaInferior: true,
    },
    pie: { lineas: PIE_FISME, numeroPagina: false },
  },
  B: {
    cabecera: {
      logoIzquierdo: 'untrm',
      textoIzquierdo: UNTRM_LINEAS,
      logoDerecho: 'fisme',
      textoDerecho: ['FACULTAD DE INGENIERÍA', 'DE SISTEMAS Y MECÁNICA', 'ELÉCTRICA'],
      lema: LEMA_2026,
      lineaInferior: true,
    },
    pie: { lineas: [], numeroPagina: true },
  },
};

const campo = (clave: string, etiqueta: string, valor = ''): CampoOficio => ({ clave, etiqueta, valor });

const UNIDAD = {
  nombre: 'Informe de unidad',
  descripcion: 'Resultados de evaluación por unidad, con criterios, evidencias y análisis (Art. 62°).',
  campos: [
    campo('numero', 'INFORME N°'),
    campo('a', 'A'),
    campo('de', 'DE'),
    campo('asunto', 'ASUNTO', 'Informe de resultados de evaluación de la [unidades] y evidencias de aprendizaje de mis cursos regulares [semestre].'),
    campo('ref', 'REF.', '(a) Reglamento General de Evaluación para Estudiantes de Pregrado – V.01, aprobado por Resol. de Consejo Universitario N° 0222-2026-UNTRM/CU.'),
    campo('fecha', 'FECHA'),
  ],
  numeracion: 'romanos' as const,
  secciones: [
    {
      tipo: 'apertura',
      titulo: '',
      texto:
        'Tengo el agrado de dirigirme a usted para saludarlo cordialmente y, en cumplimiento de lo establecido en el Artículo 62° del Reglamento General de Evaluación para Estudiantes de Pregrado – V.01, remito el informe consolidado de resultados de evaluación correspondientes a la [unidades] de los cursos a mi cargo durante el semestre académico [semestre]:',
    },
    { tipo: 'cursos', titulo: 'CURSOS EVALUADOS' },
    {
      tipo: 'criterios',
      titulo: 'CRITERIOS DE EVALUACIÓN EMPLEADOS',
      texto: 'Los cursos fueron evaluados conforme a lo establecido en la Tabla 3 del Art. 24° del documento (a) de la Referencia:',
    },
    { tipo: 'resultados_unidad', titulo: 'RESULTADOS DE LA [unidad]' },
    { tipo: 'evidencias', titulo: 'EVIDENCIAS REMITIDAS', texto: 'Por cada curso se adjunta en Anexos:' },
    { tipo: 'analisis', titulo: 'ANÁLISIS DE RESULTADOS' },
    { tipo: 'cierre', titulo: '', texto: 'Es todo cuanto informo a usted, para su conocimiento y fines.\nAtentamente,' },
  ] satisfies Seccion[],
};

const FIN_CICLO = {
  nombre: 'Informe fin de ciclo',
  descripcion: 'Informe académico final: actividades por curso, resumen, recomendaciones, otras actividades y anexos.',
  campos: [
    campo('numero', 'INFORME N°'),
    campo('a', 'A'),
    campo('de', 'DE'),
    campo('asunto', 'ASUNTO', 'Informe académico del trabajo lectivo [semestre].'),
    campo('fecha', 'FECHA'),
  ],
  numeracion: 'letras' as const,
  secciones: [
    {
      tipo: 'apertura',
      titulo: '',
      texto:
        'De mi consideración:\nMediante el presente lo saludo afectuosamente y, a la vez, hago llegar el Informe Académico Final de Trabajo Lectivo [semestre], como docente de la Facultad de Ingeniería de Sistemas y Mecánica Eléctrica – UNTRM – Filial Bagua, de acuerdo a la carga lectiva asignada para este periodo, como se detalla a continuación:',
    },
    { tipo: 'actividades_por_curso', titulo: 'ACTIVIDADES ACADÉMICAS' },
    { tipo: 'resumen', titulo: 'RESUMEN' },
    { tipo: 'recomendacion', titulo: 'RECOMENDACIÓN' },
    { tipo: 'otras_actividades', titulo: 'OTRAS ACTIVIDADES', texto: 'Además, participé en las siguientes actividades:' },
    {
      tipo: 'documentacion',
      titulo: 'DOCUMENTACIÓN ADJUNTA',
      texto: 'Como evidencia de todo lo descrito en el presente informe, adjunto los siguientes documentos:',
    },
    {
      tipo: 'cierre',
      titulo: '',
      texto:
        'Es todo cuanto informo a usted, para su conocimiento y fines. Aprovecho la oportunidad para expresar mi especial consideración y estima.\nAtentamente,',
    },
  ] satisfies Seccion[],
};

const BASES = { unidad: UNIDAD, fin_ciclo: FIN_CICLO };

export const CATALOGO: { tipo: TipoCatalogo; nombre: string; descripcion: string }[] = [
  { tipo: 'unidad', nombre: UNIDAD.nombre, descripcion: UNIDAD.descripcion },
  { tipo: 'fin_ciclo', nombre: FIN_CICLO.nombre, descripcion: FIN_CICLO.descripcion },
];

export const definicionDelCatalogo = (tipo: TipoCatalogo, variante: VarianteCabecera): DefinicionPlantilla => {
  const base = BASES[tipo];
  return {
    version: 1,
    ...CABECERAS[variante],
    campos: base.campos,
    numeracion: base.numeracion,
    secciones: base.secciones,
    formato: FORMATOS.Oficio,
  };
};

export const nombreDelCatalogo = (tipo: TipoCatalogo, variante: VarianteCabecera) =>
  `${BASES[tipo].nombre} · ${variante === 'A' ? 'sin logo FISME' : 'con logo FISME'}`;

// I, II, III… o A, B, C… para las secciones con título (apertura y cierre no se numeran)
const ROMANOS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

export const titulosNumerados = (definicion: DefinicionPlantilla): string[] =>
  definicion.secciones
    .filter((s) => s.titulo)
    .map((s, i) =>
      definicion.numeracion === 'romanos' ? `${ROMANOS[i]}. ${s.titulo}` : `${String.fromCharCode(65 + i)}) ${s.titulo}`
    );
