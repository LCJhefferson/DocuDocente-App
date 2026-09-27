export interface Curso {
  id: string;
  perfilDocenteId: string;
  nombre: string;
  codigo?: string | null;
  ciclo: string;
  semestre: string;
  creadoEn: string;
}

export interface EntradaCrearCurso {
  perfilDocenteId: string;
  nombre: string;
  codigo?: string;
  ciclo: string;
  semestre: string;
}