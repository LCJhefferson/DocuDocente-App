import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  ImageRun,
  LineRuleType,
  PageNumber,
  Paragraph,
  ShadingType,
  Tab,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TabStopType,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import { marcaSeccion } from '../data/catalogoPlantillas';
import { Cabecera, ContenidoInforme, DefinicionPlantilla, Pie, Seccion } from '../models/Plantilla';
import { ajustarImagen, leerImagenWord } from '../utils/docxImagenes';
import { generarInterpretacion, LIMITE_PLAN_MEJORA } from '../utils/estadisticas';
import { reemplazarMarcadores, unidadEnRomano } from '../utils/informeTexto';
import { DatosCurso, DatosInforme } from './informeDatosService';

const LETRAS = 'abcdefghijklmnopqrstuvwxyz';
const FACULTAD = 'Ingeniería de Sistemas y Mecánica Eléctrica';
const DOCUMENTACION_POR_DEFECTO = [
  'Sílabos aprobados de los cursos asignados.',
  'Instrumentos de evaluación por criterios.',
  'Registro de asistencia de los cursos.',
  'Evidencias de aprendizaje.',
];

// ---------- Piezas básicas ----------
type Trozo = string | { t: string; b?: boolean; i?: boolean; u?: boolean };
type Bloque = Paragraph | Table;
type OpcionesTexto = { size?: number; color?: string; negrita?: boolean };

const lineas = (texto: string) => texto.split('\n').map((l) => l.trim()).filter(Boolean);
const pct = (n: number) => `${n.toFixed(1)}%`;
const cmATwips = (cm: number) => Math.round(cm * 567);

const trozos = (contenido: Trozo | Trozo[], o: OpcionesTexto = {}) =>
  (Array.isArray(contenido) ? contenido : [contenido]).map((x) => {
    const p = typeof x === 'string' ? { t: x } : x;
    return new TextRun({
      text: p.t,
      bold: p.b ?? o.negrita,
      italics: p.i,
      underline: p.u ? {} : undefined,
      size: o.size,
      color: o.color,
    });
  });

const BORDE = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
const SIN_BORDE = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const BORDES = { top: BORDE, bottom: BORDE, left: BORDE, right: BORDE };
const SIN_BORDES = { top: SIN_BORDE, bottom: SIN_BORDE, left: SIN_BORDE, right: SIN_BORDE };

const celdaConParrafos = (
  hijos: Paragraph[],
  o: { columnas?: number; filas?: number; ancho?: number; borde?: boolean; encabezado?: boolean; arriba?: boolean } = {}
) =>
  new TableCell({
    children: hijos,
    columnSpan: o.columnas,
    rowSpan: o.filas,
    width: o.ancho ? { size: o.ancho, type: WidthType.DXA } : undefined,
    borders: o.borde === false ? SIN_BORDES : BORDES,
    shading: o.encabezado ? { type: ShadingType.CLEAR, fill: 'F2F2F2', color: 'auto' } : undefined,
    verticalAlign: o.arriba ? VerticalAlign.TOP : VerticalAlign.CENTER,
  });

const tabla = (filas: TableRow[], columnas: number[]) =>
  new Table({
    rows: filas,
    width: { size: columnas.reduce((suma, x) => suma + x, 0), type: WidthType.DXA },
    columnWidths: columnas,
    layout: TableLayoutType.FIXED,
  });

const espacio = (despues = 120) => new Paragraph({ spacing: { after: despues } });

const lineaHorizontal = (doble = false) =>
  new Paragraph({
    border: {
      bottom: { style: doble ? BorderStyle.DOUBLE : BorderStyle.SINGLE, size: doble ? 12 : 8, color: '000000', space: 1 },
    },
    spacing: { before: 40, after: 160 },
  });

export const construirDocumentoDesdePlantilla = async (
  definicion: DefinicionPlantilla,
  datos: DatosInforme,
  contenido: ContenidoInforme
): Promise<Document> => {
  const f = definicion.formato;
  const tam = f.tamano * 2;
  const chico = (f.tamano - 1) * 2;
  const margen = cmATwips(f.margenesCm);
  const anchoUtil = 11906 - 2 * margen; // Corregido: multiplicación por 2
  const columnas = (porcentajes: number[], escala = 1) =>
    porcentajes.map((p) => Math.round((anchoUtil * escala * p) / 100));

  // ---------- Párrafos y listas ----------
  const parrafo = (
    contenidoTexto: Trozo | Trozo[],
    o: OpcionesTexto & {
      alineacion?: (typeof AlignmentType)[keyof typeof AlignmentType];
      antes?: number;
      despues?: number;
      sangria?: number;
      juntar?: boolean;
    } = {}
  ) =>
    new Paragraph({
      keepNext: o.juntar,
      children: trozos(contenidoTexto, o),
      alignment: o.alineacion ?? AlignmentType.JUSTIFIED,
      spacing: { before: o.antes ?? 40, after: o.despues ?? 40 },
      indent: o.sangria ? { left: o.sangria } : undefined,
    });

  const parrafos = (texto: string, juntar = false) => lineas(texto).map((l) => parrafo(l, { juntar }));

  const item = (marca: string, contenidoItem: Trozo | Trozo[], sangria = 0, juntarConSiguiente = false) =>
    new Paragraph({
      keepNext: juntarConSiguiente,
      children: [new TextRun({ children: [marca, new Tab()] }), ...trozos(contenidoItem)],
      indent: { left: sangria + 360, hanging: 360 },
      tabStops: [{ type: TabStopType.LEFT, position: sangria + 360 }],
      spacing: { before: 20, after: 20 },
    });

  const listaGuiones = (items: string[], sangria = 0) => items.map((t) => item('-', t, sangria));
  const listaLetras = (items: string[]) => items.map((t, i) => item(`${LETRAS[i]})`, t));
  const listaNumeros = (items: string[]) => items.map((t, i) => item(`${i + 1}.`, t));
  const vineta = (contenidoItem: Trozo | Trozo[], juntarConSiguiente = false) =>
    item('•', contenidoItem, 0, juntarConSiguiente);

  const pendiente = (texto: string) => parrafo({ t: `[${texto}]`, i: true }, { color: '777777' });
  const subtitulo = (texto: string) => parrafo({ t: texto, b: true }, { antes: 160, alineacion: AlignmentType.LEFT });
  const alerta = (texto: string) =>
    new Paragraph({
      children: trozos(texto),
      border: { top: BORDE, bottom: BORDE, left: BORDE, right: BORDE },
      spacing: { before: 80, after: 80 },
    });

  // ---------- Tablas ----------
  const celda = (
    contenidoCelda: Trozo | Trozo[],
    o: { encabezado?: boolean; centrado?: boolean; columnas?: number; filas?: number; ancho?: number } = {}
  ) =>
    celdaConParrafos(
      [
        new Paragraph({
          children: trozos(contenidoCelda, { size: chico, negrita: o.encabezado }),
          alignment: o.encabezado || o.centrado ? AlignmentType.CENTER : AlignmentType.LEFT,
          spacing: { before: 40, after: 40 },
          keepNext: true,
        }),
      ],
      o
    );

  const tablaCursos = (cursos: DatosCurso[], conItem = false) => {
    const w = columnas(conItem ? [8, 17, 45, 15, 15] : [18, 42, 20, 20]);
    const fila = (valores: string[], encabezado: boolean) =>
      new TableRow({
        tableHeader: encabezado,
        cantSplit: true,
        children: valores.map((v, i) =>
          celda(v, { encabezado, centrado: !encabezado && (conItem ? i !== 2 : i !== 1), ancho: w[i] })
        ),
      });

    return tabla(
      [
        fila([...(conItem ? ['ÍTEM'] : []), 'CÓDIGO', 'CURSO ASIGNADO', 'CICLO', 'SEMESTRE'], true),
        ...cursos.map(({ curso }, i) =>
          fila([...(conItem ? [String(i + 1)] : []), curso.codigo ?? '—', curso.nombre, curso.ciclo, curso.semestre], false)
        ),
      ],
      w
    );
  };

  const tablaResultadosUnidad = (cursos: DatosCurso[], unidad: string): Bloque[] => {
    const filas = cursos
      .map(({ curso, resultados }) => ({ curso, r: resultados.find((x) => x.nombreUnidad === unidad) }))
      .filter((fila) => fila.r);

    if (!filas.length) return [pendiente(`No se registraron notas de la ${unidadEnRomano(unidad)}`)];

    const w = columnas([34, 11, 13, 11, 13, 18]);
    const dato = (v: string, i: number) => celda(v, { centrado: true, ancho: w[i] });

    return [
      tabla(
        [
          new TableRow({
            tableHeader: true,
            cantSplit: true,
            children: [
              celda('Curso', { encabezado: true, filas: 2, ancho: w[0] }),
              celda('Aprobados', { encabezado: true, columnas: 2, ancho: w[1] + w[2] }),
              celda('Desaprobados', { encabezado: true, columnas: 2, ancho: w[3] + w[4] }),
              celda('Total Matriculados', { encabezado: true, filas: 2, ancho: w[5] }),
            ],
          }),
          new TableRow({
            tableHeader: true,
            cantSplit: true,
            children: [
              celda('Cant.', { encabezado: true, ancho: w[1] }),
              celda('%', { encabezado: true, ancho: w[2] }),
              celda('Cant.', { encabezado: true, ancho: w[3] }),
              celda('%', { encabezado: true, ancho: w[4] }),
            ],
          }),
          ...filas.map(
            ({ curso, r }) =>
              new TableRow({
                cantSplit: true,
                children: [
                  celda({ t: curso.nombre, b: true }, { ancho: w[0] }),
                  dato(String(r!.aprobados), 1),
                  dato(pct(r!.porcentajeAprobados), 2),
                  dato(String(r!.desaprobados), 3),
                  dato(pct(r!.porcentajeDesaprobados), 4),
                  dato(String(r!.total), 5),
                ],
              })
          ),
        ],
        w
      ),
    ];
  };

  const resumenEstadistico = (dc: DatosCurso): Bloque[] => {
    const r = dc.resultados.at(-1);
    if (!r) return [pendiente('Sin notas registradas para este curso')];

    const w = columnas([40, 30, 30], 0.75);
    const fila = (valores: string[], encabezado: boolean) =>
      new TableRow({
        cantSplit: true,
        children: valores.map((v, i) => celda(v, { encabezado, centrado: i > 0, ancho: w[i] })),
      });

    return [
      tabla(
        [
          fila(['CONDICIÓN', 'CANTIDAD', 'PORCENTAJE'], true),
          fila(['Aprobados', String(r.aprobados), pct(r.porcentajeAprobados)], false),
          fila(['Desaprobados', String(r.desaprobados), pct(r.porcentajeDesaprobados)], false),
          fila(['TOTAL MATRICULADOS', String(r.total), '100%'], true),
        ],
        w
      ),
    ];
  };

  const cuadriculaFotos = (fotos: { data: Uint8Array; tipo: 'png' | 'jpg'; ancho: number; alto: number }[]): Bloque[] => {
    if (!fotos.length) return [];
    const mitad = Math.round(anchoUtil / 2);
    const filas: TableRow[] = [];

    for (let i = 0; i < fotos.length; i += 2) {
      const celdas = fotos.slice(i, i + 2).map((foto) =>
        celdaConParrafos(
          [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 60, after: 60 },
              children: [new ImageRun({ type: foto.tipo, data: foto.data, transformation: ajustarImagen(foto, 250, 190) })],
            }),
          ],
          { borde: false, ancho: mitad }
        )
      );
      if (celdas.length === 1) celdas.push(celdaConParrafos([new Paragraph({})], { borde: false, ancho: mitad }));
      filas.push(new TableRow({ cantSplit: true, children: celdas }));
    }
    return [tabla(filas, [mitad, mitad]), espacio(60)];
  };

  const bloqueEvidencias = async (): Promise<Bloque[]> => {
    const salida: Bloque[] = [];
    for (const { curso, evidencias } of datos.cursos) {
      if (!evidencias.length) continue;
      salida.push(subtitulo(curso.nombre));
      salida.push(
        ...listaLetras(
          evidencias.map(
            (e) =>
              `${e.nombreActividad}${e.tipoActividad ? ` – ${e.tipoActividad}` : ''}${
                e.unidad ? ` (${unidadEnRomano(e.unidad)})` : ''
              }`
          )
        )
      );
      const fotos = (
        await Promise.all(evidencias.map((e) => (e.tipoArchivo === 'IMAGE' ? leerImagenWord(e.rutaArchivoLocal) : null)))
      ).filter((x) => x !== null);
      salida.push(...cuadriculaFotos(fotos));
    }
    return salida.length ? salida : [pendiente('No se registraron evidencias para los cursos seleccionados')];
  };

  const bloqueAnalisis = (): Bloque[] => {
    const frases = datos.cursos.flatMap(({ curso, resultados }) =>
      resultados.map((r) => `${curso.nombre}: ${generarInterpretacion(unidadEnRomano(r.nombreUnidad), r.aprobados, r.desaprobados)}`)
    );
    if (!frases.length) return [pendiente('Sin resultados para analizar')];
    const hayPlanMejora = datos.cursos.some((c) => c.resultados.some((r) => r.requierePlanMejora));

    return [
      ...frases.map((fr) => parrafo(fr)),
      hayPlanMejora
        ? alerta(
            `Una o más unidades presentan un porcentaje de desaprobación igual o superior al ${LIMITE_PLAN_MEJORA}%. Corresponde formular un Plan de Mejora Académica (Art. 62° del Reglamento General de Evaluación).`
          )
        : parrafo(['En todos los cursos ', { t: `el porcentaje de desaprobación se mantiene por debajo del ${LIMITE_PLAN_MEJORA}%`, b: true }, '.']),
    ];
  };

  const bloqueActividadesPorCurso = (): Bloque[] => [
    tablaCursos(datos.cursos, true),
    ...datos.cursos.flatMap((dc, i): Bloque[] => {
      const metodologia = lineas(contenido.metodologias?.[dc.curso.id] ?? '');
      return [
        subtitulo(`Ítem ${i + 1}: ${dc.curso.nombre}`),
        vineta({ t: 'Metodología utilizada:', b: true }, true),
        ...(metodologia.length ? listaGuiones(metodologia, 360) : [pendiente('Describir la metodología utilizada')]),
        vineta({ t: 'Resumen estadístico:', b: true }, true),
        ...resumenEstadistico(dc),
        vineta([{ t: 'Examen sustitutorio:', b: true }, ' Ninguno.']),
        vineta([{ t: 'Desaprobado por inasistencias (DPI):', b: true }, ' Ninguno.']),
        vineta([{ t: 'Justificación por inasistencias:', b: true }, ' Ninguna.']),
      ];
    }),
  ];

  const bloqueFirma = (): Bloque[] => {
    const [nombre, ...cargo] = lineas(contenido.campos.de ?? '');
    return [
      new Paragraph({ keepNext: true, spacing: { before: 900 }, alignment: AlignmentType.CENTER, children: [new TextRun('____________________________________')] }),
      new Paragraph({ keepNext: cargo.length > 0, alignment: AlignmentType.CENTER, children: [new TextRun({ text: nombre ?? '', bold: true })] }),
      ...cargo.map((c) => new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun(c)] })),
    ];
  };

  type SeccionExpandida = Seccion & { unidad?: string };

  const dibujarSeccion = async (s: SeccionExpandida): Promise<Bloque[]> => {
    const texto = (porDefecto = s.texto ?? '') => reemplazarMarcadores(contenido.textos?.[s.tipo] ?? porDefecto, datos.valores);
    const conIntro = (cuerpo: Bloque[]): Bloque[] => [...(s.texto ? parrafos(texto()) : []), ...cuerpo];

    switch (s.tipo) {
      case 'apertura':
      case 'texto':
        return parrafos(texto());
      case 'datos_generales':
        return [
          parrafo([{ t: 'Docente: ', b: true }, datos.valores.docente]),
          parrafo([{ t: 'Facultad: ', b: true }, FACULTAD]),
          parrafo([{ t: 'Semestre académico: ', b: true }, datos.valores.semestre]),
        ];
      case 'cursos':
        return conIntro([tablaCursos(datos.cursos), espacio(60)]);
      case 'criterios':
        return conIntro(['Conocimiento: 20%', 'Desempeño: 40%', 'Producto: 40%'].map((c) => vineta(c)));
      case 'resultados_unidad':
        return conIntro([...tablaResultadosUnidad(datos.cursos, s.unidad ?? ''), espacio(60)]);
      case 'actividades_por_curso':
        return conIntro(bloqueActividadesPorCurso());
      case 'evidencias':
        return conIntro(await bloqueEvidencias());
      case 'analisis':
        return contenido.textos?.analisis ? parrafos(texto()) : bloqueAnalisis();
      case 'resumen':
      case 'recomendacion': {
        const puntos = lineas(contenido.textos?.[s.tipo] ?? '');
        return puntos.length ? listaGuiones(puntos) : [pendiente(s.tipo === 'resumen' ? 'Escribir el resumen' : 'Escribir las recomendaciones')];
      }
      case 'otras_actividades':
        return conIntro(
          datos.extracurriculares.length
            ? listaLetras(
                datos.extracurriculares.map(
                  (e) => `${e.nombreActividad}${e.tipoActividad ? ` (${e.tipoActividad})` : ''}${e.descripcion ? `: ${e.descripcion}` : ''}.`
                )
              )
            : [parrafo('Ninguna.')]
        );
      case 'documentacion':
        return conIntro(listaNumeros(contenido.documentacion ?? DOCUMENTACION_POR_DEFECTO));
      case 'cierre':
        return [...parrafos(texto(), true), ...bloqueFirma()];
    }
  };

  const expandirSecciones = (secciones: Seccion[], unidades: string[]): SeccionExpandida[] =>
    secciones.flatMap((s) =>
      s.tipo === 'resultados_unidad'
        ? (unidades.length ? unidades : ['']).map((u) => ({
            ...s,
            unidad: u,
            titulo: s.titulo.replace('[unidad]', unidadEnRomano(u).toUpperCase()),
          }))
        : [s]
    );

  const bloqueCampos = (): Bloque[] => {
    if (!definicion.campos.length) return [];
    const wCampos = columnas([14, 86]);
    const valor = (clave: string, porDefecto: string) => contenido.campos[clave] ?? porDefecto;
    const numero = definicion.campos.find((c) => c.clave === 'numero');

    const filas = definicion.campos
      .filter((c) => c.clave !== 'numero')
      .map((c) => {
        const [primera, ...resto] = lineas(valor(c.clave, c.valor));
        return new TableRow({
          children: [
            celdaConParrafos([new Paragraph({ children: [new TextRun({ text: c.etiqueta, bold: true })] })], {
              borde: false,
              arriba: true,
              ancho: wCampos[0],
            }),
            celdaConParrafos(
              [
                new Paragraph({
                  children: [
                    new TextRun(': '),
                    new TextRun({ text: primera ?? '', bold: true }),
                    ...resto.map((l) => new TextRun({ text: l, break: 1, size: tam - 3 })),
                  ],
                }),
              ],
              { borde: false, arriba: true, ancho: wCampos[1] }
            ),
          ],
        });
      });

    return [
      ...(numero
        ? [
            new Paragraph({
              spacing: { before: 160, after: 120 },
              children: [new TextRun({ text: `${numero.etiqueta} ${valor('numero', numero.valor)}`, bold: true, underline: {}, size: tam + 2 })],
            }),
          ]
        : []),
      tabla(filas, wCampos),
      lineaHorizontal(),
    ];
  };

  // ---------- Armado del documento ----------
  const cuerpo: Bloque[] = [...bloqueCampos()];
  let numeroSeccion = 0;

  for (const s of expandirSecciones(definicion.secciones, datos.unidades)) {
    if (s.titulo) {
      const marca = marcaSeccion(definicion.numeracion, numeroSeccion);
      numeroSeccion += 1;
      cuerpo.push(
        new Paragraph({
          keepNext: true,
          spacing: { before: 260, after: 100 },
          children: [new TextRun({ text: `${marca} ${reemplazarMarcadores(s.titulo, datos.valores)}`, bold: true, size: tam + 2 })],
        })
      );
    }
    cuerpo.push(...(await dibujarSeccion(s)));
  }

  if (!cuerpo.length) cuerpo.push(new Paragraph({}));

  return new Document({
    creator: 'DocuDocente',
    title: definicion.campos.find((c) => c.clave === 'numero')?.etiqueta ?? 'Informe',
    styles: {
      default: {
        document: {
          run: { font: f.fuente, size: tam },
          paragraph: { spacing: { line: Math.round(240 * f.interlineado), lineRule: LineRuleType.AUTO } }, // Corregido: multiplicación por f.interlineado
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 }, // Formato A4
            margin: { top: margen, bottom: margen, left: margen, right: margen, header: 500, footer: 500 },
          },
        },
        headers: { default: await construirCabecera(definicion.cabecera, anchoUtil) },
        footers: { default: construirPie(definicion.pie) },
        children: cuerpo,
      },
    ],
  });
};

const construirCabecera = async (c: Cabecera, anchoUtil: number): Promise<Header> => {
  const logoIzq = await leerImagenWord(c.logoIzquierdo);
  const logoDer = await leerImagenWord(c.logoDerecho);
  const celdas: { peso: number; hijos: Paragraph[] }[] = [];

  const logo = (imagen: NonNullable<typeof logoIzq>, derecha: boolean) =>
    new Paragraph({
      alignment: derecha ? AlignmentType.RIGHT : AlignmentType.LEFT,
      children: [new ImageRun({ type: imagen.tipo, data: imagen.data, transformation: ajustarImagen(imagen, 210, 52) })],
    });

  const textos = (lineasTexto: string[], derecha: boolean, negrita: boolean, size: number) =>
    new Paragraph({
      alignment: derecha ? AlignmentType.RIGHT : AlignmentType.LEFT,
      children: lineasTexto.map((l, i) => new TextRun({ text: l, bold: negrita, size, break: i === 0 ? undefined : 1 })),
    });

  if (logoIzq) celdas.push({ peso: c.logoIzquierdo === 'untrm' ? 4 : 2, hijos: [logo(logoIzq, false)] });
  if (c.logoIzquierdo !== 'untrm' && c.textoIzquierdo.length) celdas.push({ peso: 3, hijos: [textos(c.textoIzquierdo, false, false, 17)] });
  if (c.textoDerecho.length) celdas.push({ peso: 4, hijos: [textos(c.textoDerecho, true, true, 19)] });
  if (logoDer) celdas.push({ peso: 2, hijos: [logo(logoDer, true)] });

  const hijos: (Paragraph | Table)[] = [];
  if (celdas.length) {
    const total = celdas.reduce((suma, x) => suma + x.peso, 0);
    const anchos = celdas.map((x) => Math.round((x.peso / total) * anchoUtil));
    hijos.push(tabla([new TableRow({ children: celdas.map((x, i) => celdaConParrafos(x.hijos, { borde: false, ancho: anchos[i] })) })], anchos));
  }

  if (c.lema) {
    hijos.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 40 },
        children: [new TextRun({ text: `“${c.lema}”`, bold: true, italics: true, size: 19 })],
      })
    );
  }

  hijos.push(c.lineaInferior ? lineaHorizontal() : new Paragraph({}));
  return new Header({ children: hijos });
};

const construirPie = (p: Pie): Footer => {
  const hijos: Paragraph[] = [];
  if (p.lineas.length) {
    hijos.push(lineaHorizontal(true));
    hijos.push(...p.lineas.map((l) => new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: l, size: 16 })] })));
  }

  if (p.numeroPagina) {
    hijos.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: 'Página ', size: 16 }),
          new TextRun({ children: [PageNumber.CURRENT], size: 16 }),
          new TextRun({ text: ' de ', size: 16 }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16 }),
        ],
      })
    );
  }

  if (!hijos.length) hijos.push(new Paragraph({}));
  return new Footer({ children: hijos });
};