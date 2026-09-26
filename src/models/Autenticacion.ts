//Tipos para la cuenta de usuario

export interface CuentaAutenticacion {
  id: string;
  correoElectronico: string;
  esActivo: boolean;
  creadoEn: string;
}

export interface CredencialesLogin {
  correoElectronico: string;
  contrasena: string;
}

export interface EntradaRegistro {
  correoElectronico: string;
  contrasena: string;
  nombreCompleto: string;
  gradoAcademico: string;
  facultad: string;
  departamento?: string;
  codigoInstitucional?: string;
}