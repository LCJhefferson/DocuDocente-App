// Genera el HTML del informe recorriendo las secciones de una plantilla (models/Plantilla).
// Cada tipo de sección tiene su función de dibujo; los datos vienen de informeDatosService.
import { Cabecera, DefinicionPlantilla, Pie, Seccion, TipoSeccion } from '../models/Plantilla';
import { generarInterpretacion, LIMITE_PLAN_MEJORA } from '../utils/estadisticas';
import { escapar, imagenEnBase64 } from '../utils/htmlPdf';
import { reemplazarMarcadores, unidadEnRomano } from '../utils/informeTexto';
import { DatosCurso, DatosInforme } from './informeDatosService';

/** Lo que el docente revisa o escribe antes de generar (paso 6 del plan) */
export type ContenidoInforme = {
  campos: Record<string, string>; // valor final por clave: numero, a, de, asunto, ref, fecha
  textos?: Partial<Record<TipoSeccion, string>>; // reemplaza el texto de una sección
  metodologias?: Record<string, string>; // por id de curso, una línea por punto
  documentacion?: string[];
};

const ROMANOS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const LETRAS = 'abcdefghijklmnopqrstuvwxyz';

const DOCUMENTACION_POR_DEFECTO = [
  'Sílabos aprobados de los cursos asignados.',
  'Instrumentos de evaluación por criterios.',
  'Registro de asistencia de los cursos.',
  'Evidencias de aprendizaje.',
];

// ---------- piezas de HTML ----------
const lineas = (texto: string) => texto.split('\n').map((l) => l.trim()).filter(Boolean);
const parrafos = (texto: string) => lineas(texto).map((l) => `<p>${escapar(l)}</p>`).join('');
const item = (marca: string, html: string) => `<div class="item"><span class="marca">${marca}</span><span>${html}</span></div>`;
const listaGuiones = (items: string[]) => items.map((t) => item('-', escapar(t))).join('');
const listaLetras = (items: string[]) => items.map((t, i) => item(`${LETRAS[i]})`, escapar(t))).join('');
const listaNumeros = (items: string[]) => items.map((t, i) => item(`${i + 1}.`, escapar(t))).join('');
const vineta = (html: string) => item('•', html);
const pendiente = (texto: string) => `<p class="pendiente">[${escapar(texto)}]</p>`;
const pct = (n: number) => `${n.toFixed(1)}%`;

// ---------- cabecera, campos y pie ----------
const htmlCabecera = async (c: Cabecera) => {
  const logoIzq = await imagenEnBase64(c.logoIzquierdo);
  const logoDer = await imagenEnBase64(c.logoDerecho);
  // El logo horizontal de la UNTRM ya trae el nombre: no se repite el texto
  const textoIzq = c.logoIzquierdo === 'untrm' ? '' : `<div class="txt-izq">${c.textoIzquierdo.map(escapar).join('<br/>')}</div>`;
  return `
    <table class="cabecera"><tr>
      <td class="cab-izq">${logoIzq ? `<img class="${c.logoIzquierdo === 'untrm' ? 'logo-horizontal' : 'logo'}" src="${logoIzq}"/>` : ''}${textoIzq}</td>
      <td class="cab-der"><div class="txt-der">${c.textoDerecho.map(escapar).join('<br/>')}</div>${logoDer ? `<img class="logo" src="${logoDer}"/>` : ''}</td>
    </tr></table>
    ${c.lema ? `<p class="lema">“${escapar(c.lema)}”</p>` : ''}
    ${c.lineaInferior ? '<div class="linea"></div>' : ''}`;
};

const htmlPie = (p: Pie) =>
  p.lineas.length ? `<div class="pie"><div class="linea-doble"></div>${p.lineas.map((l) => `<div>${escapar(l)}</div>`).join('')}</div>` : '';

const htmlCampos = (definicion: DefinicionPlantilla, contenido: ContenidoInforme) => {
  const valor = (clave: string, porDefecto: string) => contenido.campos[clave] ?? porDefecto;
  const numero = definicion.campos.find((c) => c.clave === 'numero');
  const filas = definicion.campos
    .filter((c) => c.clave !== 'numero')
    .map((c) => {
      const [primera, ...resto] = lineas(valor(c.clave, c.valor));
      return `<tr><td class="etiqueta">${escapar(c.etiqueta)}</td><td>: <b>${escapar(primera ?? '')}</b>${resto
        .map((l) => `<br/><span class="detalle">${escapar(l)}</span>`)
        .join('')}</td></tr>`;
    })
    .join('');
  return `
    ${numero ? `<p class="numero">${escapar(numero.etiqueta)} ${escapar(valor('numero', numero.valor))}</p>` : ''}
    <table class="campos">${filas}</table>
    <div class="linea"></div>`;
};

// ---------- secciones ----------
type SeccionExpandida = Seccion & { unidad?: string };

const tablaCursos = (cursos: DatosCurso[], conItem = false) => `
  <table class="datos">
    <tr>${conItem ? '<th>ÍTEM</th>' : ''}<th>CÓDIGO</th><th>CURSO ASIGNADO</th><th>CICLO</th><th>SEMESTRE</th></tr>
    ${cursos
      .map(
        ({ curso }, i) =>
          `<tr>${conItem ? `<td class="c">${i + 1}</td>` : ''}<td class="c">${escapar(curso.codigo ?? '—')}</td><td>${escapar(curso.nombre)}</td><td class="c">${escapar(curso.ciclo)}</td><td class="c">${escapar(curso.semestre)}</td></tr>`
      )
      .join('')}
  </table>`;

const tablaResultadosUnidad = (cursos: DatosCurso[], unidad: string) => {
  const filas = cursos
    .map(({ curso, resultados }) => ({ curso, r: resultados.find((x) => x.nombreUnidad === unidad) }))
    .filter((f) => f.r);
  if (!filas.length) return pendiente(`No se registraron notas de la ${unidadEnRomano(unidad)}`);
  return `
    <table class="datos">
      <tr><th rowspan="2">Curso</th><th colspan="2">Aprobados</th><th colspan="2">Desaprobados</th><th rowspan="2">Total<br/>Matriculados</th></tr>
      <tr><th>Cant.</th><th>%</th><th>Cant.</th><th>%</th></tr>
      ${filas
        .map(
          ({ curso, r }) =>
            `<tr><td><b>${escapar(curso.nombre)}</b></td><td class="c">${r!.aprobados}</td><td class="c">${pct(r!.porcentajeAprobados)}</td><td class="c">${r!.desaprobados}</td><td class="c">${pct(r!.porcentajeDesaprobados)}</td><td class="c">${r!.total}</td></tr>`
        )
        .join('')}
    </table>`;
};

const resumenEstadistico = (dc: DatosCurso) => {
  // ponytail: el fin de ciclo usa la última unidad con notas; si se registran notas finales, usar esas
  const r = dc.resultados.at(-1);
  if (!r) return pendiente('Sin notas registradas para este curso');
  return `
    <table class="datos angosta">
      <tr><th>CONDICIÓN</th><th>CANTIDAD</th><th>PORCENTAJE</th></tr>
      <tr><td>Aprobados</td><td class="c">${r.aprobados}</td><td class="c">${pct(r.porcentajeAprobados)}</td></tr>
      <tr><td>Desaprobados</td><td class="c">${r.desaprobados}</td><td class="c">${pct(r.porcentajeDesaprobados)}</td></tr>
      <tr><th>TOTAL MATRICULADOS</th><th>${r.total}</th><th>100%</th></tr>
    </table>`;
};

const htmlEvidencias = async (datos: DatosInforme) => {
  let html = '';
  for (const { curso, evidencias } of datos.cursos) {
    if (!evidencias.length) continue;
    html += `<p class="subtitulo">${escapar(curso.nombre)}</p>`;
    html += listaLetras(
      evidencias.map((e) => `${e.nombreActividad}${e.tipoActividad ? ` – ${e.tipoActividad}` : ''}${e.unidad ? ` (${unidadEnRomano(e.unidad)})` : ''}`)
    );
    const fotos = (await Promise.all(evidencias.map((e) => (e.tipoArchivo === 'IMAGE' ? imagenEnBase64(e.rutaArchivoLocal) : null)))).filter(Boolean);
    if (fotos.length) html += `<div class="fotos">${fotos.map((f) => `<img src="${f}"/>`).join('')}</div>`;
  }
  return html || pendiente('No se registraron evidencias para los cursos seleccionados');
};

const htmlAnalisis = (datos: DatosInforme) => {
  const frases = datos.cursos.flatMap(({ curso, resultados }) =>
    resultados.map((r) => `${curso.nombre}: ${generarInterpretacion(unidadEnRomano(r.nombreUnidad), r.aprobados, r.desaprobados)}`)
  );
  if (!frases.length) return pendiente('Sin resultados para analizar');
  const hayPlanMejora = datos.cursos.some((c) => c.resultados.some((r) => r.requierePlanMejora));
  return (
    frases.map((f) => `<p>${escapar(f)}</p>`).join('') +
    (hayPlanMejora
      ? `<p class="alerta">Una o más unidades presentan un porcentaje de desaprobación igual o superior al ${LIMITE_PLAN_MEJORA}%. Corresponde formular un Plan de Mejora Académica (Art. 62° del Reglamento General de Evaluación).</p>`
      : `<p>En todos los cursos <b>el porcentaje de desaprobación se mantiene por debajo del ${LIMITE_PLAN_MEJORA}%</b>.</p>`)
  );
};

const htmlActividadesPorCurso = (datos: DatosInforme, contenido: ContenidoInforme) =>
  tablaCursos(datos.cursos, true) +
  datos.cursos
    .map((dc, i) => {
      const metodologia = lineas(contenido.metodologias?.[dc.curso.id] ?? '');
      return `
        <p class="subtitulo">Ítem ${i + 1}: ${escapar(dc.curso.nombre)}</p>
        ${vineta('<b>Metodología utilizada:</b>')}
        <div class="sangria">${metodologia.length ? listaGuiones(metodologia) : pendiente('Describir la metodología utilizada')}</div>
        ${vineta('<b>Resumen estadístico:</b>')}
        <div class="sangria">${resumenEstadistico(dc)}</div>
        ${vineta('<b>Examen sustitutorio:</b> Ninguno.')}
        ${vineta('<b>Desaprobado por inasistencias (DPI):</b> Ninguno.')}
        ${vineta('<b>Justificación por inasistencias:</b> Ninguna.')}`;
    })
    .join('');

const htmlFirma = (contenido: ContenidoInforme) => {
  const [nombre, ...cargo] = lineas(contenido.campos.de ?? '');
  return `<div class="firma">____________________________________<br/><b>${escapar(nombre ?? '')}</b>${cargo
    .map((c) => `<br/>${escapar(c)}`)
    .join('')}</div>`;
};

const dibujarSeccion = async (s: SeccionExpandida, datos: DatosInforme, contenido: ContenidoInforme): Promise<string> => {
  const texto = (porDefecto = s.texto ?? '') => reemplazarMarcadores(contenido.textos?.[s.tipo] ?? porDefecto, datos.valores);
  const conIntro = (cuerpo: string) => (s.texto ? parrafos(texto()) : '') + cuerpo;

  switch (s.tipo) {
    case 'apertura':
    case 'texto':
      return parrafos(texto());
    case 'datos_generales':
      return `<p><b>Docente:</b> ${escapar(datos.valores.docente)}<br/><b>Facultad:</b> ${escapar(datos.docente.facultad)}<br/><b>Semestre académico:</b> ${escapar(datos.valores.semestre)}</p>`;
    case 'cursos':
      return conIntro(tablaCursos(datos.cursos));
    case 'criterios':
      return conIntro(['Conocimiento: 20%', 'Desempeño: 40%', 'Producto: 40%'].map((c) => vineta(c)).join(''));
    case 'resultados_unidad':
      return conIntro(tablaResultadosUnidad(datos.cursos, s.unidad ?? ''));
    case 'actividades_por_curso':
      return conIntro(htmlActividadesPorCurso(datos, contenido));
    case 'evidencias':
      return conIntro(await htmlEvidencias(datos));
    case 'analisis':
      return contenido.textos?.analisis ? parrafos(texto()) : htmlAnalisis(datos);
    case 'resumen':
    case 'recomendacion': {
      const puntos = lineas(contenido.textos?.[s.tipo] ?? '');
      return puntos.length ? listaGuiones(puntos) : pendiente(s.tipo === 'resumen' ? 'Escribir el resumen' : 'Escribir las recomendaciones');
    }
    case 'otras_actividades':
      return conIntro(
        datos.extracurriculares.length
          ? listaLetras(
              datos.extracurriculares.map(
                (e) => `${e.nombreActividad}${e.tipoActividad ? ` (${e.tipoActividad})` : ''}${e.descripcion ? `: ${e.descripcion}` : ''}.`
              )
            )
          : '<p>Ninguna.</p>'
      );
    case 'documentacion':
      return conIntro(listaNumeros(contenido.documentacion ?? DOCUMENTACION_POR_DEFECTO));
    case 'cierre':
      return `<div class="cierre">${parrafos(texto())}</div>${htmlFirma(contenido)}`;
  }
};

/** La sección "Resultados de la [unidad]" se repite por cada unidad pedida */
const expandirSecciones = (secciones: Seccion[], unidades: string[]): SeccionExpandida[] =>
  secciones.flatMap((s) =>
    s.tipo === 'resultados_unidad'
      ? (unidades.length ? unidades : ['']).map((u) => ({ ...s, unidad: u, titulo: s.titulo.replace('[unidad]', unidadEnRomano(u).toUpperCase()) }))
      : [s]
  );

export const construirHtmlDesdePlantilla = async (
  definicion: DefinicionPlantilla,
  datos: DatosInforme,
  contenido: ContenidoInforme
): Promise<string> => {
  const f = definicion.formato;
  let numero = 0;
  let cuerpo = '';
  for (const s of expandirSecciones(definicion.secciones, datos.unidades)) {
    const marca = definicion.numeracion === 'romanos' ? `${ROMANOS[numero]}.` : `${String.fromCharCode(65 + numero)})`;
    const titulo = s.titulo ? `<h2>${marca} ${escapar(reemplazarMarcadores(s.titulo, datos.valores))}</h2>` : '';
    if (s.titulo) numero += 1;
    cuerpo += `<section>${titulo}${await dibujarSeccion(s, datos, contenido)}</section>`;
  }

  return `
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { size: A4; margin: ${f.margenesCm}cm ${f.margenesCm}cm ${f.margenesCm - 0.5}cm; }
  body { font-family: '${f.fuente}', ${f.norma === 'APA 7' ? "'Times New Roman', serif" : 'Calibri, Arial, sans-serif'}; font-size: ${f.tamano}pt; line-height: ${f.interlineado}; color: #000; }
  .envoltura { width: 100%; border-collapse: collapse; }
  .envoltura > thead td, .envoltura > tfoot td { padding: 0; }
  .cabecera { width: 100%; border-collapse: collapse; }
  .cabecera td { vertical-align: middle; border: none; padding: 0; }
  .cab-izq img.logo-horizontal { height: 52px; }
  .cab-izq img.logo, .cab-der img.logo { height: 52px; vertical-align: middle; }
  .txt-izq { display: inline-block; vertical-align: middle; font-size: 8.5pt; line-height: 1.2; padding-left: 8px; border-left: 1px solid #999; margin-left: 8px; }
  .cab-der { text-align: right; }
  .txt-der { display: inline-block; vertical-align: middle; font-weight: bold; font-size: 9.5pt; line-height: 1.2; text-align: right; padding-right: 6px; }
  .lema { text-align: center; font-style: italic; font-weight: bold; font-size: 9.5pt; margin: 8px 0 4px; }
  .linea { border-top: 1.5px solid #000; margin: 4px 0 12px; }
  .pie { text-align: center; font-size: 8pt; line-height: 1.3; margin-top: 12px; }
  .linea-doble { border-top: 3px double #000; margin-bottom: 4px; }
  .numero { font-weight: bold; text-decoration: underline; font-size: ${f.tamano + 1}pt; margin: 10px 0; }
  .campos td { border: none; padding: 2px 4px; vertical-align: top; }
  .campos td.etiqueta { font-weight: bold; width: 70px; }
  .detalle { font-size: ${f.tamano - 1.5}pt; }
  h2 { font-size: ${f.tamano + 1}pt; margin: 16px 0 6px; }
  p { margin: 4px 0; text-align: justify; }
  .subtitulo { font-weight: bold; margin-top: 10px; }
  .item { display: flex; gap: 6px; margin: 2px 0; }
  .marca { min-width: 18px; }
  .sangria { margin-left: 24px; }
  table.datos { border-collapse: collapse; width: 100%; margin: 6px 0; page-break-inside: avoid; }
  table.datos.angosta { width: 75%; }
  table.datos th, table.datos td { border: 1px solid #000; padding: 3px 6px; font-size: ${f.tamano - 1}pt; }
  table.datos th { background: #f2f2f2; }
  td.c { text-align: center; }
  .fotos { display: flex; flex-wrap: wrap; gap: 8px; margin: 6px 0; }
  .fotos img { width: 48%; max-height: 220px; object-fit: contain; border: 1px solid #999; }
  .alerta { border: 1px solid #000; padding: 6px 10px; }
  .pendiente { color: #777; font-style: italic; }
  .firma { margin-top: 60px; text-align: center; }
  .cierre { margin-top: 18px; }
  section { page-break-inside: auto; }
</style>
</head>
<body>
  <table class="envoltura">
    <thead><tr><td>${await htmlCabecera(definicion.cabecera)}</td></tr></thead>
    <tfoot><tr><td>${htmlPie(definicion.pie)}</td></tr></tfoot>
    <tbody><tr><td>
      ${htmlCampos(definicion, contenido)}
      ${cuerpo}
    </td></tr></tbody>
  </table>
</body>
</html>`;
};
