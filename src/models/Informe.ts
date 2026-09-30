// Tipos del módulo de generación de informes

export const UNIDADES_INFORME = ['Unidad 1', 'Unidad 2', 'Unidad 3'] as const;

export type EstadoInforme = 'BORRADOR' | 'COMPLETADO' | 'SINCRONIZADO';

// Datos que el docente llena en el formulario
export interface EntradaCrearInforme {
  perfilDocenteId: string;
  cursoId: string;
  numeroInforme: string;       // Ej: 002-2026-UNTRM-FISME
  dirigidoANombre: string;     // Ej: Dr. Roberto Pérez Astonitas
  dirigidoACargo: string;      // Ej: Director de la Escuela Profesional
  remitenteNombre: string;     // Grado + nombre del docente
  asunto: string;
  fechaStr: string;            // Ej: Bagua, 29 de septiembre de 2026
  nombreCurso: string;
  ciclo: string;
  semestre: string;
}

// Resultados de una unidad (solo cantidades: los % se calculan)
export interface EntradaResultadoUnidad {
  nombreUnidad: string;
  cantidadAprobados: number;
  cantidadDesaprobados: number;
}

export interface Informe extends Omit<EntradaCrearInforme, 'perfilDocenteId' | 'cursoId'> {
  id: string;
  perfilDocenteId: string | null;
  cursoId: string | null;
  totalEstudiantes: number;
  estado: EstadoInforme;
  creadoEn: string;
}

export interface ResultadoUnidad extends EntradaResultadoUnidad {
  id: string;
  porcentajeAprobados: number;
  porcentajeDesaprobados: number;
  textoInterpretacion: string | null;
}

export interface EvidenciaInforme {
  id: string;
  nombreActividad: string;
  descripcion: string | null;
  unidad: string | null;
  tipoActividad: string | null;
  rutaArchivoLocal: string | null;
  tipoArchivo: string | null;
}

// Encabezado del informe (tabla plantillas, se configura en el módulo de plantillas)
export interface PlantillaInforme {
  nombreInstitucion: string;
  nombreFacultad: string | null;
  logoUri: string | null;
  tituloAnoEncabezado: string;
}

// Se usa mientras el docente no haya configurado una plantilla predeterminada
export const PLANTILLA_UNTRM: PlantillaInforme = {
  nombreInstitucion: 'UNIVERSIDAD NACIONAL TORIBIO RODRÍGUEZ DE MENDOZA DE AMAZONAS',
  nombreFacultad: 'Facultad de Ingeniería de Sistemas y Mecánica Eléctrica',
  logoUri: null,
  tituloAnoEncabezado: 'Año de la Esperanza y el Fortalecimiento de la Democracia',
};

// Todo lo necesario para mostrar el informe en la app o exportarlo
export interface InformeCompleto {
  informe: Informe;
  unidades: ResultadoUnidad[];
  evidencias: EvidenciaInforme[];
  plantilla: PlantillaInforme;
}
