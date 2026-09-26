//tipos para el perfil académico

export interface PerfilDocente {
  id: string;
  cuentaId: string;
  nombreCompleto: string;
  gradoAcademico: string;
  facultad: string;
  departamento?: string | null;
  codigoInstitucional?: string | null;
  avatarUri?: string | null;
}

export interface EntradaPerfilDocente {
  cuentaId: string;
  nombreCompleto: string;
  gradoAcademico: string;
  facultad: string;
  departamento?: string;
  codigoInstitucional?: string;
}