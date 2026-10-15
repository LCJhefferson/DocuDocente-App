//tipos para el perfil académico

export interface PerfilDocente {
  id: string;
  cuentaId: string;
  nombreCompleto: string;
  gradoAcademico: string;
}

export interface EntradaPerfilDocente {
  cuentaId: string;
  nombreCompleto: string;
  gradoAcademico: string;
}