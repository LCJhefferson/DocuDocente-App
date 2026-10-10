// Analiza un .docx (zip con XML) y lo convierte en una plantilla reutilizable:
// cabecera (textos, logos, lema), pie, campos del oficio, secciones, marcadores y formato.
// Función pura: recibe un lector del zip, así se puede probar fuera del celular.
import { CampoOficio, DefinicionPlantilla, NormaFormato, Numeracion, Seccion, TipoSeccion } from '../models/Plantilla';
import { FORMATOS } from './plantillaBase';

export type LectorZip = {
  texto: (ruta: string) => Promise<string | null>;
  base64: (ruta: string) => Promise<string | null>;
};

export type ImagenExtraida = { base64: string; extension: string };

export type AnalisisDocx = {
  definicion: DefinicionPlantilla; // sin logos: el servicio los guarda y completa las rutas
  imagenes: { izquierda: ImagenExtraida | null; derecha: ImagenExtraida | null };
  hallazgos: { norma: NormaFormato; motivoNorma: string; marcadores: string[]; avisos: string[] };
};

// ---------- lectura de WordprocessingML ----------
type Parrafo = { tipo: 'p'; texto: string; crudo: string; centrado: boolean; derecha: boolean; cursiva: boolean; estilo: string; numerado: boolean; imagenes: string[] };
type Tabla = { tipo: 'tbl'; filas: Parrafo[][][] }; // filas -> celdas -> párrafos
type Bloque = Parrafo | Tabla;

const ENTIDADES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const decodificar = (s: string) =>
  s.replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e: string) =>
    e[0] === '#' ? String.fromCodePoint(parseInt(e.slice(e[1] === 'x' ? 2 : 1), e[1] === 'x' ? 16 : 10)) : ENTIDADES[e] ?? m
  );

const leerParrafo = (xml: string): Parrafo => {
  let crudo = '';
  for (const m of xml.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:tab\/>|<w:br\/>/g)) {
    crudo += m[1] !== undefined ? decodificar(m[1]) : m[0] === '<w:tab/>' ? '\t' : '\n';
  }
  const jc = xml.match(/<w:jc w:val="(\w+)"/)?.[1];
  return {
    tipo: 'p',
    crudo,
    texto: crudo.replace(/\s+/g, ' ').trim(),
    centrado: jc === 'center',
    derecha: jc === 'right' || jc === 'end',
    cursiva: /<w:i(?:\s+w:val="(?:1|true)")?\s*\/>/.test(xml),
    estilo: xml.match(/<w:pStyle w:val="([^"]+)"/)?.[1] ?? '',
    numerado: /<w:numPr>/.test(xml),
    imagenes: [...xml.matchAll(/r:(?:embed|id)="(rId\d+)"/g)].map((m) => m[1]),
  };
};

const leerBloques = (xml: string): Bloque[] =>
  [...xml.matchAll(/<w:tbl>[\s\S]*?<\/w:tbl>|<w:p[ >][\s\S]*?<\/w:p>/g)].map(([b]) =>
    b.startsWith('<w:tbl>')
      ? {
          tipo: 'tbl',
          filas: [...b.matchAll(/<w:tr[ >][\s\S]*?<\/w:tr>/g)].map(([fila]) =>
            [...fila.matchAll(/<w:tc>[\s\S]*?<\/w:tc>/g)].map(([celda]) =>
              [...celda.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)].map(([p]) => leerParrafo(p))
            )
          ),
        }
      : leerParrafo(b)
  );

const relaciones = async (lector: LectorZip, ruta: string): Promise<Record<string, string>> => {
  const carpeta = ruta.slice(0, ruta.lastIndexOf('/'));
  const nombre = ruta.slice(ruta.lastIndexOf('/') + 1);
  const xml = (await lector.texto(`${carpeta}/_rels/${nombre}.rels`)) ?? '';
  return Object.fromEntries(
    [...xml.matchAll(/<Relationship [^>]*Id="(rId\d+)"[^>]*Target="([^"]+)"/g)].map(([, id, destino]) => [id, `${carpeta}/${destino}`])
  );
};

const leerImagen = async (lector: LectorZip, rels: Record<string, string>, ids: string[]): Promise<ImagenExtraida | null> => {
  for (const id of ids) {
    const ruta = rels[id];
    if (!ruta || !/\.(png|jpe?g|gif|bmp)$/i.test(ruta)) continue;
    const base64 = await lector.base64(ruta);
    if (base64) return { base64, extension: ruta.split('.').pop()!.toLowerCase().replace('jpeg', 'jpg') };
  }
  return null;
};

// ---------- reglas ----------
const ETIQUETAS: [RegExp, string, string][] = [
  [/^(A|PARA)$/i, 'a', 'A'],
  [/^DE$/i, 'de', 'DE'],
  [/^ASUNTO$/i, 'asunto', 'ASUNTO'],
  [/^REF(\.|ERENCIA)?$/i, 'ref', 'REF.'],
  [/^(LUGAR Y )?FECHA$/i, 'fecha', 'FECHA'],
];
const RE_CAMPO = /^(A|PARA|DE|ASUNTO|REF\.?|REFERENCIA|(?:LUGAR Y )?FECHA)\s*:\s*(.*)$/i;
const RE_NUMERO = /^((?:INFORME|OFICIO|CARTA|MEMOR[AÁ]NDUM)\s*N[°ºo]?\.?)\s*(.+)$/i;
const RE_ROMANO = /^([IVX]{1,4})[.)]\s+(.+)$/;
const RE_LETRA = /^([A-H])\)\s+(.+)$/;
const RE_NUMERO_SECCION = /^(\d{1,2})\.\s+(\S.+)$/;
const RE_CIERRE = /^(Es todo cuanto|Sin otro particular|Aprovecho la oportunidad|Atentamente)/i;
const RE_LEMA = /a[ñn]o de(l| la)\b/i;

const TIPOS: [RegExp, TipoSeccion][] = [
  [/AN[AÁ]LISIS DE RESULTADOS/i, 'analisis'],
  [/DATOS GENERALES/i, 'datos_generales'],
  [/CURSOS?\s+(EVALUADOS|ASIGNADOS)/i, 'cursos'],
  [/CRITERIOS/i, 'criterios'],
  [/ACTIVIDADES ACAD[EÉ]MICAS/i, 'actividades_por_curso'],
  [/EVIDENCIAS/i, 'evidencias'],
  [/AN[AÁ]LISIS|INTERPRETACI[OÓ]N/i, 'analisis'],
  [/RESULTADOS/i, 'resultados_unidad'],
  [/RESUMEN|CONCLUSI[OÓ]N/i, 'resumen'],
  [/RECOMENDACI[OÓ]N/i, 'recomendacion'],
  [/OTRAS ACTIVIDADES/i, 'otras_actividades'],
  [/DOCUMENTACI[OÓ]N|ANEXOS/i, 'documentacion'],
];
const tipoPorTitulo = (titulo: string): TipoSeccion => TIPOS.find(([re]) => re.test(titulo))?.[1] ?? 'texto';

const esTitulo = (p: Parrafo) =>
  RE_ROMANO.test(p.texto) || RE_LETRA.test(p.texto) || (/^(Heading|Ttulo|T[ií]tulo)1$/i.test(p.estilo) && p.texto.length < 90);

const limpiarTitulo = (p: Parrafo) =>
  (p.texto.match(RE_ROMANO)?.[2] ?? p.texto.match(RE_LETRA)?.[2] ?? p.texto.match(RE_NUMERO_SECCION)?.[2] ?? p.texto).replace(/:\s*$/, '').trim();

const numeracionDe = (p: Parrafo): Numeracion | null =>
  RE_ROMANO.test(p.texto) ? 'romanos' : RE_LETRA.test(p.texto) ? 'letras' : RE_NUMERO_SECCION.test(p.texto) || p.numerado ? 'numeros' : null;

// El valor con más "peso" (por defecto, 1 por aparición)
const masFrecuente = (valores: string[], pesos?: number[]) => {
  const conteo = new Map<string, number>();
  valores.forEach((v, i) => conteo.set(v, (conteo.get(v) ?? 0) + (pesos?.[i] ?? 1)));
  return [...conteo.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
};

// Cantidad de letras de un fragmento XML: el texto largo pesa más que títulos y rótulos
const largoTexto = (xml: string) => [...xml.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)].reduce((n, m) => n + m[1].length, 0);

// ---------- formato ----------
const analizarFormato = (documento: string, estilos: string) => {
  const normal = estilos.match(/<w:style [^>]*w:styleId="Normal"[\s\S]*?<\/w:style>/)?.[0] ?? '';
  const defecto = estilos.match(/<w:docDefaults>[\s\S]*?<\/w:docDefaults>/)?.[0] ?? '';
  // Solo el texto corrido: las tablas suelen ir en letra más chica y a espacio simple
  const cuerpo = (documento.match(/<w:body>([\s\S]*)<\/w:body>/)?.[1] ?? documento).replace(/<w:tbl>[\s\S]*?<\/w:tbl>/g, '');

  // Cada texto cuenta con su propio valor o, si no trae, con el del estilo base
  const fuenteBase = normal.match(/w:ascii="([^"]+)"/)?.[1] ?? defecto.match(/w:ascii="([^"]+)"/)?.[1] ?? (/asciiTheme/.test(defecto) ? 'Calibri' : 'Arial');
  const tamanoBase = normal.match(/<w:sz w:val="(\d+)"/)?.[1] ?? defecto.match(/<w:sz w:val="(\d+)"/)?.[1] ?? '22';
  const lineaBase = (normal + defecto).match(/w:line="(\d+)"/)?.[1] ?? '240';

  const textos = [...cuerpo.matchAll(/<w:r[ >][\s\S]*?<\/w:r>/g)].map((m) => m[0]).filter((r) => /<w:t[ >]/.test(r));
  const pesosTexto = textos.map(largoTexto);
  const fuente = masFrecuente(textos.map((r) => r.match(/<w:rFonts [^>]*w:ascii="([^"]+)"/)?.[1] ?? fuenteBase), pesosTexto) ?? fuenteBase;
  const tamano = Number(masFrecuente(textos.map((r) => r.match(/<w:sz w:val="(\d+)"/)?.[1] ?? tamanoBase), pesosTexto) ?? tamanoBase) / 2;

  const parrafosConTexto = [...cuerpo.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)].map((m) => m[0]).filter((x) => /<w:t[ >]/.test(x));
  const lineas = parrafosConTexto.map((x) => {
    const espaciado = x.match(/<w:spacing [^>]*>/)?.[0] ?? '';
    return /w:lineRule="(exact|atLeast)"/.test(espaciado) ? lineaBase : espaciado.match(/w:line="(\d+)"/)?.[1] ?? lineaBase;
  });
  const interlineado = Math.round((Number(masFrecuente(lineas, parrafosConTexto.map(largoTexto)) ?? lineaBase) / 240) * 100) / 100;

  const margenTwips = Number(documento.match(/<w:pgMar [^>]*w:left="(\d+)"/)?.[1] ?? 1440);
  const margenesCm = Math.round((margenTwips / 567) * 100) / 100;

  const parrafosCuerpo = parrafosConTexto.length || 1;
  const conSangria = [...cuerpo.matchAll(/<w:ind [^>]*w:firstLine="(\d+)"/g)].filter((m) => Number(m[1]) >= 600).length;

  return { fuente, tamano, interlineado, margenesCm, sangria: conSangria / parrafosCuerpo };
};

// ---------- análisis principal ----------
export const analizarDocx = async (lector: LectorZip): Promise<AnalisisDocx> => {
  const avisos: string[] = [];
  const documento = await lector.texto('word/document.xml');
  if (!documento) throw new Error('El archivo no es un Word (.docx) válido.');
  const estilos = (await lector.texto('word/styles.xml')) ?? '';
  const relsDoc = await relaciones(lector, 'word/document.xml');

  // Cabecera y pie: los de la sección por defecto
  const refCabecera = documento.match(/<w:headerReference [^>]*w:type="default"[^>]*r:id="(rId\d+)"/)?.[1] ?? documento.match(/<w:headerReference [^>]*r:id="(rId\d+)"/)?.[1];
  const refPie = documento.match(/<w:footerReference [^>]*w:type="default"[^>]*r:id="(rId\d+)"/)?.[1] ?? documento.match(/<w:footerReference [^>]*r:id="(rId\d+)"/)?.[1];
  const rutaCabecera = refCabecera ? relsDoc[refCabecera] : undefined;
  const rutaPie = refPie ? relsDoc[refPie] : undefined;

  const cabecera = { logoIzquierdo: null, textoIzquierdo: [] as string[], logoDerecho: null, textoDerecho: [] as string[], lema: null as string | null, lineaInferior: false };
  const imagenes = { izquierda: null as ImagenExtraida | null, derecha: null as ImagenExtraida | null };

  if (rutaCabecera) {
    const xml = (await lector.texto(rutaCabecera)) ?? '';
    const rels = await relaciones(lector, rutaCabecera);
    cabecera.lineaInferior = /<w:pBdr>[\s\S]*?<w:bottom /.test(xml) || /<w:bottom w:val="single"/.test(xml);
    const sueltos: Parrafo[] = [];
    for (const b of leerBloques(xml)) {
      if (b.tipo === 'tbl' && b.filas[0]?.length) {
        const celdas = b.filas[0];
        const izq = celdas[0];
        const der = celdas.length > 1 ? celdas[celdas.length - 1] : [];
        cabecera.textoIzquierdo.push(...izq.map((p) => p.texto).filter(Boolean));
        cabecera.textoDerecho.push(...der.map((p) => p.texto).filter(Boolean));
        imagenes.izquierda ??= await leerImagen(lector, rels, izq.flatMap((p) => p.imagenes));
        imagenes.derecha ??= await leerImagen(lector, rels, der.flatMap((p) => p.imagenes));
      } else if (b.tipo === 'p') {
        sueltos.push(b);
      }
    }
    for (const p of sueltos) {
      if (p.texto && RE_LEMA.test(p.texto)) cabecera.lema = p.texto.replace(/^["“”']+|["“”']+$/g, '').trim();
      else if (p.texto) (p.derecha ? cabecera.textoDerecho : cabecera.textoIzquierdo).push(p.texto);
      if (p.imagenes.length) {
        const img = await leerImagen(lector, rels, p.imagenes);
        if (p.derecha) imagenes.derecha ??= img;
        else imagenes.izquierda ??= img;
      }
    }
  } else {
    avisos.push('El documento no tiene cabecera de Word: se usará una sin logos.');
  }

  const pie = { lineas: [] as string[], numeroPagina: false };
  if (rutaPie) {
    const xml = (await lector.texto(rutaPie)) ?? '';
    pie.numeroPagina = /PAGE/.test(xml);
    pie.lineas = leerBloques(xml).flatMap((b) => (b.tipo === 'p' ? [b] : b.filas.flat(2))).map((p) => p.texto).filter((t) => t && !/^\d+$/.test(t));
  }

  // Cuerpo: campos, apertura, secciones y cierre
  const bloques = leerBloques(documento.match(/<w:body>([\s\S]*)<\/w:body>/)?.[1] ?? documento);
  const campos: CampoOficio[] = [];
  const secciones: Seccion[] = [];
  const apertura: string[] = [];
  const cierre: string[] = [];
  let numeracion: Numeracion | null = null;
  let campoActual: CampoOficio | null = null;
  let seccionActual: Seccion | null = null;
  let enCierre = false;

  for (const b of bloques) {
    if (b.tipo === 'tbl') {
      campoActual = null;
      continue;
    }
    const p = b;
    if (!p.texto) continue;

    if (!cabecera.lema && !campos.length && !secciones.length && RE_LEMA.test(p.texto) && p.texto.length < 120) {
      cabecera.lema = p.texto.replace(/^["“”']+|["“”']+$/g, '').trim();
      continue;
    }
    if (enCierre) {
      if (cierre.length && !/[.,:]$/.test(p.texto)) break; // la firma: nombre y cargo
      cierre.push(p.texto);
      if (/^Atentamente/i.test(p.texto)) break;
      continue;
    }
    if (RE_CIERRE.test(p.texto)) {
      enCierre = true;
      cierre.push(p.texto);
      if (/^Atentamente/i.test(p.texto)) break;
      continue;
    }

    const numero = p.texto.match(RE_NUMERO);
    if (numero && !secciones.length) {
      campos.push({ clave: 'numero', etiqueta: numero[1].replace(/\s+/g, ' ').toUpperCase(), valor: numero[2].trim() });
      continue;
    }
    const campo = p.texto.replace(/\s*:\s*/, ': ').match(RE_CAMPO);
    if (campo && !secciones.length) {
      const [, etiqueta, valor] = campo;
      const regla = ETIQUETAS.find(([re]) => re.test(etiqueta.trim()));
      campoActual = { clave: regla?.[1] ?? etiqueta.toLowerCase(), etiqueta: regla?.[2] ?? etiqueta.toUpperCase(), valor: valor.trim() };
      campos.push(campoActual);
      continue;
    }
    if (campoActual && /^[\t ]/.test(p.crudo) && !esTitulo(p)) {
      campoActual.valor += `\n${p.texto}`; // cargo o segunda línea de la referencia
      continue;
    }
    campoActual = null;

    if (esTitulo(p)) {
      numeracion ??= numeracionDe(p);
      const titulo = limpiarTitulo(p);
      const tipo = tipoPorTitulo(titulo);
      if (tipo === 'resultados_unidad' && seccionActual?.tipo === 'resultados_unidad') continue; // III y IV: una sola sección que se repite
      seccionActual = { tipo, titulo: tipo === 'resultados_unidad' ? titulo.replace(/UNIDAD\s+([IVX]+|\d+)/i, '[unidad]') : titulo };
      secciones.push(seccionActual);
      continue;
    }

    if (!secciones.length) apertura.push(p.texto);
    else if (seccionActual && !seccionActual.texto) seccionActual.texto = p.texto.length > 400 ? `${p.texto.slice(0, 400)}…` : p.texto;
  }

  if (!campos.length) avisos.push('No se encontraron campos de oficio (A:, DE:, ASUNTO:).');
  if (!secciones.length) avisos.push('No se encontraron secciones numeradas (I., II. o A), B)) ni títulos.');

  const esOficio = campos.length >= 2;
  const cierrePorDefecto = 'Es todo cuanto informo a usted, para su conocimiento y fines.\nAtentamente,';
  const seccionesFinales: Seccion[] = [
    ...(esOficio && apertura.length ? [{ tipo: 'apertura' as const, titulo: '', texto: apertura.join('\n') }] : []),
    ...secciones,
    ...(esOficio || cierre.length ? [{ tipo: 'cierre' as const, titulo: '', texto: cierre.length ? cierre.join('\n') : cierrePorDefecto }] : []),
  ];

  // Formato y norma
  const f = analizarFormato(documento, estilos);
  const esTimes = /times/i.test(f.fuente);
  const esApa = esTimes && f.tamano === 12 && f.interlineado >= 1.9 && Math.abs(f.margenesCm - 2.54) < 0.15;
  const norma: NormaFormato = esApa ? 'APA 7' : esOficio ? 'Oficio' : 'Otro';
  const motivoNorma = esApa
    ? `Times New Roman 12, doble espacio, márgenes de ${f.margenesCm} cm${f.sangria > 0.3 ? ' y sangría de primera línea' : ''}.`
    : `${f.fuente} ${f.tamano}, interlineado ${f.interlineado}, márgenes de ${f.margenesCm} cm.`;

  const texto = bloques.flatMap((b) => (b.tipo === 'p' ? [b.texto] : b.filas.flat(2).map((p) => p.texto))).join('\n');
  const marcadores = [...new Set([...texto.matchAll(/\[[^\]\n]{1,40}\]|\{\{\s*[^}\n]{1,40}\s*\}\}/g)].map((m) => m[0]))];

  return {
    definicion: {
      version: 1,
      cabecera,
      pie,
      campos,
      numeracion: numeracion ?? 'romanos',
      secciones: seccionesFinales,
      formato: { ...FORMATOS[norma], fuente: f.fuente, tamano: f.tamano, interlineado: f.interlineado, margenesCm: f.margenesCm, norma },
    },
    imagenes,
    hallazgos: { norma, motivoNorma, marcadores, avisos },
  };
};
