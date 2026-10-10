// Pruebas del módulo de plantillas: npm run test:plantillas
// Cubre el generador del PDF, el catálogo, los textos automáticos y el analizador de Word.
import * as D from 'docx';
import JSZip from 'jszip';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { definicionDelCatalogo, titulosNumerados } from '../src/data/catalogoPlantillas';
import { DefinicionPlantilla } from '../src/models/Plantilla';
import { DatosCurso, DatosInforme } from '../src/services/informeDatosService';
import { construirHtmlDesdePlantilla } from '../src/services/plantillaPdfService';
import { analizarDocx } from '../src/utils/analizarDocx';
import { calcularResumenUnidad } from '../src/utils/estadisticas';
import { reemplazarMarcadores, textoUnidades } from '../src/utils/informeTexto';

// ---------- mini corredor ----------
// assert.match imprime el HTML entero al fallar: estas versiones muestran solo qué se buscaba
const contiene = (texto: string, re: RegExp) => assert.ok(re.test(texto), `no aparece ${re}`);
const noContiene = (texto: string, re: RegExp) => assert.ok(!re.test(texto), `no debería aparecer ${re}`);
const pruebas: [string, () => Promise<void> | void][] = [];
const prueba = (nombre: string, fn: () => Promise<void> | void) => pruebas.push([nombre, fn]);

// ---------- datos de ejemplo ----------
const resultado = (unidad: string, aprobados: number, desaprobados: number) => ({
  nombreUnidad: unidad,
  aprobados,
  desaprobados,
  ...calcularResumenUnidad(aprobados, desaprobados),
});
const curso = (id: string, nombre: string, resultados: DatosCurso['resultados'] = []): DatosCurso => ({
  curso: { id, perfilDocenteId: 'p', nombre, codigo: `051SB${id}`, ciclo: 'VI', semestre: '2026-II', creadoEn: '' },
  resultados,
  evidencias: [],
});
const datos = (cursos: DatosCurso[], extra: Partial<DatosInforme> = {}): DatosInforme => {
  const unidades = extra.unidades ?? ['Unidad 1', 'Unidad 2'];
  return {
    docente: { id: 'p', cuentaId: 'c', nombreCompleto: 'Jhosmel Villa', gradoAcademico: 'Mg.', facultad: 'Ingeniería de Sistemas' },
    cursos,
    extracurriculares: [],
    unidades,
    valores: { unidades: textoUnidades(unidades), semestre: '2026-II', docente: 'Mg. Jhosmel Villa' },
    numeroSugerido: '001-2026-UNTRM-FISME/JV',
    fecha: 'BAGUA, 9 DE OCTUBRE DEL 2026',
    ...extra,
  };
};
const generar = (definicion: DefinicionPlantilla, d: DatosInforme) =>
  construirHtmlDesdePlantilla(definicion, d, { campos: { a: 'Dr. Destinatario\nDirector', de: 'Mg. Jhosmel Villa\nDocente', asunto: 'Prueba' } });
const unidad = definicionDelCatalogo('unidad', 'B');
const finCiclo = definicionDelCatalogo('fin_ciclo', 'A');
const vecesQue = (texto: string, buscado: string) => texto.split(buscado).length - 1;

// ---------- generador del PDF ----------
prueba('Informe con 3 cursos: cada curso aparece en la tabla de cada unidad', async () => {
  const html = await generar(unidad, datos([
    curso('601', 'Curso Uno', [resultado('Unidad 1', 10, 2), resultado('Unidad 2', 11, 1)]),
    curso('602', 'Curso Dos', [resultado('Unidad 1', 8, 4), resultado('Unidad 2', 9, 3)]),
    curso('603', 'Curso Tres', [resultado('Unidad 1', 15, 0), resultado('Unidad 2', 14, 1)]),
  ]));
  contiene(html, /III\. RESULTADOS DE LA UNIDAD I</);
  contiene(html, /IV\. RESULTADOS DE LA UNIDAD II</);
  assert.equal(vecesQue(html, '<b>Curso Tres</b>'), 2);
});

prueba('Curso sin notas: avisa en vez de dibujar una tabla vacía', async () => {
  const html = await generar(unidad, datos([curso('601', 'Sin Notas')]));
  contiene(html, /No se registraron notas de la Unidad I/);
  contiene(html, /Sin resultados para analizar/);
});

prueba('Unidad con 0 estudiantes: no divide entre cero', async () => {
  const html = await generar(unidad, datos([curso('601', 'Vacío', [resultado('Unidad 1', 0, 0)])], { unidades: ['Unidad 1'] }));
  const sinImagenes = html.replace(/data:image\/\w+;base64,[A-Za-z0-9+/=]+/g, ''); // el base64 de los logos puede contener "NaN" por azar
  noContiene(sinImagenes, /NaN|Infinity/);
  contiene(sinImagenes, /<td class="c">0<\/td><td class="c">0\.0%<\/td>/);
});

prueba('Desaprobación del 20 %: aparece la alerta de Plan de Mejora', async () => {
  const html = await generar(unidad, datos([curso('601', 'Límite', [resultado('Unidad 1', 8, 2)])], { unidades: ['Unidad 1'] }));
  contiene(html, /Corresponde formular un Plan de Mejora/);
});

prueba('Docente sin extracurriculares: "Ninguna." en otras actividades', async () => {
  const html = await generar(finCiclo, datos([curso('601', 'Curso', [resultado('Unidad 1', 9, 1)])]));
  contiene(html, /D\) OTRAS ACTIVIDADES<\/h2><p>Además, participé en las siguientes actividades:<\/p><p>Ninguna\.<\/p>/);
});

prueba('Plantilla sin sección de evidencias: la numeración sigue seguida', async () => {
  const sinEvidencias = { ...unidad, secciones: unidad.secciones.filter((s) => s.tipo !== 'evidencias') };
  const html = await generar(sinEvidencias, datos([curso('601', 'Curso', [resultado('Unidad 1', 9, 1)])], { unidades: ['Unidad 1'] }));
  noContiene(html, /EVIDENCIAS REMITIDAS/);
  contiene(html, /IV\. ANÁLISIS DE RESULTADOS/);
});

prueba('Texto escrito por el docente no rompe el HTML', async () => {
  const html = await generar(unidad, datos([curso('601', '<script>alert(1)</script>', [resultado('Unidad 1', 9, 1)])], { unidades: ['Unidad 1'] }));
  noContiene(html, /<script>/);
  contiene(html, /&lt;script&gt;/);
});

prueba('Cabecera B lleva los dos logos; la A solo el de la UNTRM y el pie de la FISME', async () => {
  const d = datos([curso('601', 'Curso', [resultado('Unidad 1', 9, 1)])], { unidades: ['Unidad 1'] });
  assert.equal(vecesQue(await generar(unidad, d), 'data:image/png;base64'), 2);
  const conPieA = await generar(definicionDelCatalogo('unidad', 'A'), d);
  assert.equal(vecesQue(conPieA, 'data:image/png;base64'), 1);
  contiene(conPieA, /Jr\. Libertad N° 1300/);
});

// ---------- catálogo y textos ----------
prueba('Catálogo: numeración romana (unidad) y por letras (fin de ciclo)', () => {
  assert.equal(titulosNumerados(unidad)[0], 'I. CURSOS EVALUADOS');
  assert.equal(titulosNumerados(finCiclo).at(-1), 'E) DOCUMENTACIÓN ADJUNTA');
});

prueba('Marcadores: se reemplazan los conocidos y quedan a la vista los desconocidos', () => {
  assert.equal(reemplazarMarcadores('[semestre] y [nadie]', { semestre: '2026-II' }), '2026-II y [nadie]');
});

// ---------- analizador de Word ----------
const imagen = (archivo: string) =>
  new D.ImageRun({ type: 'png', data: readFileSync(join(process.cwd(), 'assets', 'images', archivo)), transformation: { width: 60, height: 30 } });
const p = (texto: string, negrita = false) => new D.Paragraph({ children: [new D.TextRun({ text: texto, bold: negrita })] });
const crearWord = async (opciones: { cabecera: boolean; cuerpo: D.Paragraph[]; apa?: boolean }) => {
  const sinBorde = { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const bordes = { top: sinBorde, bottom: sinBorde, left: sinBorde, right: sinBorde };
  const header = new D.Header({
    children: [
      new D.Table({
        rows: [new D.TableRow({ children: [
          new D.TableCell({ borders: bordes, children: [new D.Paragraph({ children: [imagen('untrm-horizontal.png')] })] }),
          new D.TableCell({ borders: bordes, children: [p('FACULTAD DE INGENIERÍA'), new D.Paragraph({ children: [imagen('fisme.png')] })] }),
        ] })],
      }),
      p('“Año de la Esperanza y el Fortalecimiento de la Democracia”'),
    ],
  });
  const estilo = opciones.apa
    ? { default: { document: { run: { font: 'Times New Roman', size: 24 }, paragraph: { spacing: { line: 480 } } } } }
    : undefined;
  const doc = new D.Document({
    styles: estilo,
    sections: [{ properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } }, headers: opciones.cabecera ? { default: header } : undefined, children: opciones.cuerpo }],
  });
  const zip = await JSZip.loadAsync(await D.Packer.toBuffer(doc));
  return analizarDocx({
    texto: async (r) => (await zip.file(r)?.async('string')) ?? null,
    base64: async (r) => (await zip.file(r)?.async('base64')) ?? null,
  });
};

prueba('Word tipo oficio: cabecera, dos logos, campos con cargo y secciones', async () => {
  const a = await crearWord({
    cabecera: true,
    cuerpo: [
      p('INFORME N° 002-2026-UNTRM-FISME/ENFP'),
      p('A\t: Dr. ROBERTO PÉREZ ASTONITAS'),
      p('\t  Director de la Escuela Profesional'),
      p('DE\t: Mg. EDER FIGUEROA'),
      p('ASUNTO\t: Resultados de evaluación'),
      p('FECHA\t: BAGUA, 25 DE JUNIO DEL 2026'),
      p('Tengo el agrado de dirigirme a usted.'),
      p('I. CURSOS EVALUADOS'),
      p('II. RESULTADOS DE LA UNIDAD I'),
      p('III. RESULTADOS DE LA UNIDAD II'),
      p('IV. ANÁLISIS DE RESULTADOS'),
      p('Es todo cuanto informo a usted.'),
      p('Atentamente,'),
    ],
  });
  assert.equal(a.hallazgos.norma, 'Oficio');
  assert.ok(a.imagenes.izquierda && a.imagenes.derecha, 'debe encontrar los dos logos');
  assert.equal(a.definicion.cabecera.lema, 'Año de la Esperanza y el Fortalecimiento de la Democracia');
  assert.equal(a.definicion.campos.find((c) => c.clave === 'a')?.valor, 'Dr. ROBERTO PÉREZ ASTONITAS\nDirector de la Escuela Profesional');
  assert.deepEqual(
    a.definicion.secciones.map((s) => s.tipo),
    ['apertura', 'cursos', 'resultados_unidad', 'analisis', 'cierre']
  );
  assert.equal(a.definicion.secciones[2].titulo, 'RESULTADOS DE LA [unidad]');
});

prueba('Word sin cabecera y en APA 7: lo reconoce y no inventa campos ni apertura', async () => {
  const a = await crearWord({
    cabecera: false,
    apa: true,
    cuerpo: [p('Portada del trabajo'), p('1. Introducción', true), p('Texto largo del trabajo de investigación del estudiante.'), p('1. Un ítem de lista que no es título.'), p('2. Conclusiones', true)],
  });
  assert.equal(a.hallazgos.norma, 'APA 7');
  assert.equal(a.definicion.numeracion, 'numeros');
  assert.equal(a.definicion.campos.length, 0);
  assert.deepEqual(a.definicion.secciones.map((s) => s.tipo), ['texto', 'resumen']);
  assert.ok(a.hallazgos.avisos.some((x) => x.includes('no tiene cabecera')));
});

prueba('Archivo que no es Word: error claro', async () => {
  await assert.rejects(analizarDocx({ texto: async () => null, base64: async () => null }), /no es un Word/);
});

// ---------- correr ----------
(async () => {
  let fallas = 0;
  for (const [nombre, fn] of pruebas) {
    try {
      await fn();
      console.log(`  ✓ ${nombre}`);
    } catch (error) {
      fallas += 1;
      console.log(`  ✗ ${nombre}\n    ${(error as Error).message.split('\n').join('\n    ')}`);
    }
  }
  console.log(`\n${pruebas.length - fallas}/${pruebas.length} pruebas correctas`);
  process.exit(fallas ? 1 : 0);
})();
