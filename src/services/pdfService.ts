import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { EvidenciaInforme, InformeCompleto, UNIDADES_INFORME } from '../models/Informe';
import { LIMITE_PLAN_MEJORA } from '../utils/estadisticas';

// Evita que un texto escrito por el docente (ej: "<b>") rompa el HTML del PDF
const escapar = (texto: string | null | undefined) =>
  (texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// expo-print no puede leer fotos del celular por su ruta: hay que incrustarlas en base64
const imagenEnBase64 = async (uri: string | null): Promise<string | null> => {
  if (!uri) return null;
  try {
    const base64 = await new File(uri).base64();
    return `data:image/${uri.toLowerCase().endsWith('.png') ? 'png' : 'jpeg'};base64,${base64}`;
  } catch {
    return null; // la imagen se borró del celular -> se omite sin romper el informe
  }
};

const fotoEnBase64 = (evidencia: EvidenciaInforme) =>
  evidencia.tipoArchivo === 'IMAGE' ? imagenEnBase64(evidencia.rutaArchivoLocal) : Promise.resolve(null);

const tablaUnidad = (u: InformeCompleto['unidades'][number]) => `
  <h3>Resultados de la ${escapar(u.nombreUnidad)}</h3>
  <table>
    <tr><th>Condición</th><th>Cantidad</th><th>Porcentaje</th></tr>
    <tr><td>Aprobados</td><td>${u.cantidadAprobados}</td><td>${u.porcentajeAprobados} %</td></tr>
    <tr><td>Desaprobados</td><td>${u.cantidadDesaprobados}</td><td>${u.porcentajeDesaprobados} %</td></tr>
    <tr><th>Total</th><th>${u.cantidadAprobados + u.cantidadDesaprobados}</th><th>100 %</th></tr>
  </table>
  <p>${escapar(u.textoInterpretacion)}</p>`;

/**
 * Construye el HTML del informe con el formato de oficio de la UNTRM
 */
export const construirHtmlInforme = async ({ informe, unidades, evidencias, plantilla }: InformeCompleto): Promise<string> => {
  const logo = await imagenEnBase64(plantilla.logoUri);
  const hayPlanMejora = unidades.some((u) => u.porcentajeDesaprobados >= LIMITE_PLAN_MEJORA);

  // Evidencias agrupadas por unidad, cada una con su foto (si tiene)
  let htmlEvidencias = '';
  for (const unidad of UNIDADES_INFORME) {
    const deLaUnidad = evidencias.filter((e) => e.unidad === unidad);
    if (deLaUnidad.length === 0) continue;

    htmlEvidencias += `<h3>${unidad}</h3>`;
    for (const e of deLaUnidad) {
      const foto = await fotoEnBase64(e);
      htmlEvidencias += `
        <div class="evidencia">
          ${foto ? `<img src="${foto}" />` : ''}
          <p><b>${escapar(e.nombreActividad)}</b>${e.tipoActividad ? ` · ${escapar(e.tipoActividad)}` : ''}</p>
          ${e.descripcion ? `<p>${escapar(e.descripcion)}</p>` : ''}
        </div>`;
    }
  }

  return `
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { margin: 22mm 20mm; }
  body { font-family: 'Times New Roman', serif; font-size: 12pt; color: #000; }
  .centro { text-align: center; }
  .encabezado { text-align: center; margin-bottom: 8px; }
  .encabezado img { max-height: 70px; margin-bottom: 4px; }
  .institucion { font-weight: bold; font-size: 12pt; }
  .facultad { font-size: 11pt; }
  .ano { font-style: italic; text-align: center; margin-bottom: 18px; }
  h1 { font-size: 13pt; text-decoration: underline; margin: 12px 0; }
  h2 { font-size: 12pt; margin: 18px 0 6px; }
  h3 { font-size: 12pt; margin: 12px 0 4px; }
  .cabecera td { padding: 3px 6px; vertical-align: top; border: none; }
  .cabecera td:first-child { font-weight: bold; width: 70px; }
  hr { border: 0; border-top: 1px solid #000; margin: 10px 0 16px; }
  table { border-collapse: collapse; margin: 6px 0; }
  th, td { border: 1px solid #000; padding: 4px 12px; text-align: left; }
  th { background: #f0f0f0; }
  .evidencia { page-break-inside: avoid; margin: 8px 0 14px; }
  .evidencia img { max-width: 100%; max-height: 260px; border: 1px solid #999; }
  .alerta { border: 1px solid #000; padding: 6px 10px; margin: 10px 0; }
  .firma { margin-top: 70px; text-align: center; }
</style>
</head>
<body>
  <div class="encabezado">
    ${logo ? `<img src="${logo}" /><br/>` : ''}
    <div class="institucion">${escapar(plantilla.nombreInstitucion)}</div>
    ${plantilla.nombreFacultad ? `<div class="facultad">${escapar(plantilla.nombreFacultad)}</div>` : ''}
  </div>
  <p class="ano">"${escapar(plantilla.tituloAnoEncabezado)}"</p>

  <h1>INFORME N° ${escapar(informe.numeroInforme)}</h1>

  <table class="cabecera">
    <tr><td>A</td><td>: ${escapar(informe.dirigidoANombre)}<br/>${escapar(informe.dirigidoACargo)}</td></tr>
    <tr><td>DE</td><td>: ${escapar(informe.remitenteNombre)}</td></tr>
    <tr><td>ASUNTO</td><td>: ${escapar(informe.asunto)}</td></tr>
    <tr><td>FECHA</td><td>: ${escapar(informe.fechaStr)}</td></tr>
  </table>
  <hr />

  <p>Me dirijo a usted para saludarlo cordialmente y, a la vez, remitir el informe de resultados de
  evaluación de la asignatura <b>"${escapar(informe.nombreCurso)}"</b>, correspondiente al semestre
  académico ${escapar(informe.semestre)}.</p>

  <h2>I. DATOS GENERALES</h2>
  <p><b>Asignatura:</b> ${escapar(informe.nombreCurso)}<br/>
     <b>Ciclo:</b> ${escapar(informe.ciclo)}<br/>
     <b>Semestre académico:</b> ${escapar(informe.semestre)}<br/>
     <b>Estudiantes evaluados:</b> ${informe.totalEstudiantes}</p>

  <h2>II. RESULTADOS DE LA EVALUACIÓN</h2>
  ${unidades.length ? unidades.map(tablaUnidad).join('') : '<p>No se registraron resultados.</p>'}
  ${hayPlanMejora ? `<p class="alerta">Una o más unidades presentan un porcentaje de desaprobación igual o superior al ${LIMITE_PLAN_MEJORA} %. Corresponde formular un Plan de Mejora Académica (Art. 62° del Reglamento General de Evaluación).</p>` : ''}

  <h2>III. EVIDENCIAS DE APRENDIZAJE</h2>
  ${htmlEvidencias || '<p>No se registraron evidencias para este curso.</p>'}

  <p>Es todo cuanto informo a usted, para su conocimiento y fines.</p>
  <p>Atentamente,</p>

  <div class="firma">
    ____________________________________<br/>
    <b>${escapar(informe.remitenteNombre)}</b><br/>
    Docente
  </div>
</body>
</html>`;
};

/**
 * Genera el PDF en el celular y devuelve su ruta (file://...)
 */
export const generarPdfInforme = async (datos: InformeCompleto): Promise<string> => {
  const html = await construirHtmlInforme(datos);
  // En Expo Go, compartir no puede leer la carpeta donde expo-print deja el PDF
  // ("Not allowed to read file"): se reescribe en la caché de la app
  const { base64 } = await Print.printToFileAsync({ html, base64: true });
  const nombre = `Informe-${datos.informe.numeroInforme.replace(/[^\w-]+/g, '_')}.pdf`;
  const pdf = new File(Paths.cache, nombre);
  pdf.write(base64!, { encoding: 'base64' });
  return pdf.uri;
};

/**
 * Abre la vista de impresión del sistema: en Android trae "Guardar como PDF"
 * para descargarlo en la carpeta que elija el docente
 */
export const descargarPdfInforme = async (datos: InformeCompleto): Promise<void> => {
  const html = await construirHtmlInforme(datos);
  await Print.printAsync({ html });
};

/**
 * Abre el menú de compartir (WhatsApp, Drive, correo...) con el PDF
 */
export const compartirPdf = async (uri: string): Promise<void> => {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Compartir no está disponible en este dispositivo.');
  }
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Compartir informe' });
};
