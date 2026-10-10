// Una plantilla es una "receta" del informe: cabecera, pie, campos del oficio,
// secciones en orden y formato. Se guarda como JSON en plantillas.definicion.

export type TipoPlantilla = 'unidad' | 'fin_ciclo' | 'importada' | 'personalizada';

// 'untrm' y 'fisme' son los logos incluidos en assets/images; cualquier otro valor es la ruta de una imagen
export type Logo = 'untrm' | 'fisme' | string;

export type Cabecera = {
  logoIzquierdo: Logo | null;
  textoIzquierdo: string[];
  logoDerecho: Logo | null;
  textoDerecho: string[];
  lema: string | null; // "Año de la Esperanza y el Fortalecimiento de la Democracia"
  lineaInferior: boolean;
};

export type Pie = {
  lineas: string[];
  numeroPagina: boolean;
};

// Campos del oficio: A, DE, ASUNTO, REF., FECHA… El valor sirve de autocompletado editable
export type CampoOficio = {
  clave: string; // 'numero' | 'a' | 'de' | 'asunto' | 'ref' | 'fecha' | otra
  etiqueta: string; // como se imprime: "ASUNTO"
  valor: string;
};

export type TipoSeccion =
  | 'apertura' // párrafo de saludo
  | 'datos_generales'
  | 'cursos' // tabla de cursos evaluados
  | 'criterios' // Conocimiento / Desempeño / Producto
  | 'resultados_unidad' // tabla de aprobados y desaprobados por unidad
  | 'actividades_por_curso' // por curso: metodología, resumen estadístico, sustitutorio, DPI…
  | 'evidencias'
  | 'analisis' // interpretación y alerta de Plan de Mejora
  | 'resumen'
  | 'recomendacion'
  | 'otras_actividades' // extracurriculares, con letras a), b)…
  | 'documentacion' // anexos 1, 2, 3…
  | 'cierre' // "Es todo cuanto informo…" + firma
  | 'texto'; // texto libre

export type Seccion = {
  tipo: TipoSeccion;
  titulo: string; // "RESULTADOS DE LA UNIDAD I"; vacío en apertura y cierre
  texto?: string; // texto estándar o por defecto, editable
};

export type Numeracion = 'romanos' | 'letras'; // I., II. … o A), B) …

export type NormaFormato = 'APA 7' | 'Oficio' | 'Otro';

export type Formato = {
  fuente: string;
  tamano: number; // pt
  interlineado: number; // 1, 1.15, 1.5, 2
  margenesCm: number;
  norma: NormaFormato;
};

export type DefinicionPlantilla = {
  version: 1;
  cabecera: Cabecera;
  pie: Pie;
  campos: CampoOficio[];
  numeracion: Numeracion;
  secciones: Seccion[];
  formato: Formato;
};

export type Plantilla = {
  id: string;
  nombre: string;
  tipo: TipoPlantilla;
  definicion: DefinicionPlantilla;
  esPredeterminada: boolean;
  creadoEn: string;
};

export type EntradaPlantilla = Omit<Plantilla, 'id' | 'creadoEn' | 'esPredeterminada'> & {
  id?: string;
  esPredeterminada?: boolean;
};

/** Lo que el docente revisa o escribe antes de generar */
export type ContenidoInforme = {
  campos: Record<string, string>; // valor final por clave: numero, a, de, asunto, ref, fecha
  textos?: Partial<Record<TipoSeccion, string>>; // reemplaza el texto de una sección
  metodologias?: Record<string, string>; // por id de curso, una línea por punto
  documentacion?: string[];
};

/** Copia que guarda cada informe: no cambia aunque luego se edite la plantilla o las notas */
export type InformeConPlantilla = {
  plantillaNombre: string;
  definicion: DefinicionPlantilla;
  cursoIds: string[];
  unidades: string[];
  contenido: ContenidoInforme;
  resultados: Record<string, { nombreUnidad: string; aprobados: number; desaprobados: number }[]>; // por id de curso
};
