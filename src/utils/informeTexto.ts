// Textos automáticos del informe (funciones puras: sin base de datos ni pantalla)

const ROMANOS: Record<string, string> = { '1': 'I', '2': 'II', '3': 'III', '4': 'IV' };
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** "Unidad 1" -> "Unidad I" */
export const unidadEnRomano = (unidad: string): string => unidad.replace(/\d+/, (n) => ROMANOS[n] ?? n);

/** ["Unidad 1", "Unidad 2"] -> "Unidad I y Unidad II" */
export const textoUnidades = (unidades: string[]): string => {
  const romanas = unidades.map(unidadEnRomano);
  return romanas.length <= 1 ? romanas.join('') : `${romanas.slice(0, -1).join(', ')} y ${romanas.at(-1)}`;
};

/** "Eder Nicanor Figueroa Piscoya" -> "ENFP" */
export const inicialesDocente = (nombreCompleto: string): string =>
  nombreCompleto
    .split(/\s+/)
    .filter(Boolean)
    .map((parte) => parte[0].toUpperCase())
    .join('');

/** 2, 2026, "ENFP" -> "002-2026-UNTRM-FISME/ENFP" (formato de los informes de la FISME) */
export const numeroInforme = (correlativo: number, anio: number, iniciales: string): string =>
  `${String(correlativo).padStart(3, '0')}-${anio}-UNTRM-FISME/${iniciales}`;

/** "BAGUA, 9 DE OCTUBRE DEL 2026" */
export const fechaOficio = (fecha: Date, lugar = 'Bagua'): string =>
  `${lugar}, ${fecha.getDate()} de ${MESES[fecha.getMonth()]} del ${fecha.getFullYear()}`.toUpperCase();

/** Reemplaza [marcadores] por sus valores; los que no tienen valor quedan como están para que el docente los vea */
export const reemplazarMarcadores = (texto: string, valores: Record<string, string>): string =>
  texto.replace(/\[([a-z_]+)\]/gi, (marca, clave: string) => valores[clave.toLowerCase()] ?? marca);
