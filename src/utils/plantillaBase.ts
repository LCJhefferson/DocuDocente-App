// Valores estándar de las plantillas UNTRM – FISME (tomados de los informes reales)
import { CampoOficio, DefinicionPlantilla, Formato, Logo, NormaFormato, Seccion } from '../models/Plantilla';

export const LEMA_2026 = 'Año de la Esperanza y el Fortalecimiento de la Democracia';

export const UNTRM_LINEAS = ['UNIVERSIDAD NACIONAL', 'TORIBIO RODRÍGUEZ DE', 'MENDOZA DE AMAZONAS'];

export const PIE_FISME = [
  'Jr. Libertad N° 1300, Teléfono 041-310116, Bagua-Amazonas-Perú',
  'E-mail: fisme@untrm.edu.pe / www.untrm.edu.pe',
];

export const FORMATOS: Record<NormaFormato, Formato> = {
  Oficio: { fuente: 'Calibri', tamano: 11, interlineado: 1.15, margenesCm: 2.5, norma: 'Oficio' },
  'APA 7': { fuente: 'Times New Roman', tamano: 12, interlineado: 2, margenesCm: 2.54, norma: 'APA 7' },
  Otro: { fuente: 'Arial', tamano: 11, interlineado: 1.15, margenesCm: 2.5, norma: 'Otro' },
};

export const CAMPOS_OFICIO: CampoOficio[] = [
  { clave: 'numero', etiqueta: 'INFORME N°', valor: '' },
  { clave: 'a', etiqueta: 'A', valor: '' },
  { clave: 'de', etiqueta: 'DE', valor: '' },
  { clave: 'asunto', etiqueta: 'ASUNTO', valor: '' },
  { clave: 'fecha', etiqueta: 'FECHA', valor: '' },
];

const SECCIONES_BASICAS: Seccion[] = [
  { tipo: 'apertura', titulo: '' },
  { tipo: 'cursos', titulo: 'CURSOS EVALUADOS' },
  { tipo: 'resultados_unidad', titulo: 'RESULTADOS DE EVALUACIÓN' },
  { tipo: 'evidencias', titulo: 'EVIDENCIAS REMITIDAS' },
  { tipo: 'analisis', titulo: 'ANÁLISIS DE RESULTADOS' },
  { tipo: 'cierre', titulo: '' },
];

const sinComillas = (texto: string) => texto.trim().replace(/^["“”']+|["“”']+$/g, '').trim();

/** Plantilla personalizada a partir del formulario de encabezado */
export const definicionDesdeEncabezado = (datos: {
  institucion: string;
  facultad: string;
  lema: string;
  logo: Logo | null;
  norma: NormaFormato;
}): DefinicionPlantilla => ({
  version: 1,
  cabecera: {
    logoIzquierdo: datos.logo ?? 'untrm',
    textoIzquierdo: datos.institucion.trim() ? [datos.institucion.trim()] : UNTRM_LINEAS,
    logoDerecho: null,
    textoDerecho: datos.facultad.trim() ? [datos.facultad.trim()] : [],
    lema: sinComillas(datos.lema) || null,
    lineaInferior: true,
  },
  pie: { lineas: PIE_FISME, numeroPagina: true },
  campos: CAMPOS_OFICIO,
  numeracion: 'romanos',
  secciones: SECCIONES_BASICAS,
  formato: FORMATOS[datos.norma],
});
