export type TipoGeneralEvidencia = 'ACADEMICA' | 'EXTRACURRICULAR';
export type TipoArchivoEvidencia = 'IMAGE' | 'PDF' | 'DOCUMENT';

export interface Evidencia {
  id: string;
  tipoGeneral: TipoGeneralEvidencia;
  cursoId?: string | null;
  actividadId?: string | null;
  nombreActividad: string;
  descripcion?: string | null;
  unidad?: string | null;
  tipoActividad?: string | null;
  rutaArchivoLocal?: string | null;
  urlRemota?: string | null;
  tipoArchivo?: TipoArchivoEvidencia;
  leyenda?: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface CrearEvidenciaDTO {
  tipoGeneral: TipoGeneralEvidencia;
  cursoId?: string;
  actividadId?: string;
  nombreActividad: string;
  descripcion?: string;
  unidad?: string;
  tipoActividad?: string;
  rutaArchivoLocal?: string;
  tipoArchivo?: TipoArchivoEvidencia;
}