// Reglas compartidas por formularios y servicios; no modifican los valores recibidos.
export const MIN_LARGO_CONTRASENA = 8;
export const MAX_LARGO_CONTRASENA = 128;
export const DOMINIO_INSTITUCIONAL_REQUERIDO = '.edu.pe';

/**
 * Sintaxis básica de correo electrónico RFC 5322.
 */
export const esCorreoValido = (correo: string): boolean => {
  const valor = correo.trim();
  return (
    valor.length <= 254 &&
    /^[^\s@.]+(?:\.[^\s@.]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/.test(valor)
  );
};

/**
 * Valida si el dominio del correo termina en `.edu.pe`.
 */
export const esDominioInstitucional = (correo: string): boolean => {
  const valor = correo.trim().toLowerCase();
  const partes = valor.split('@');
  if (partes.length !== 2) return false;
  const dominio = partes[1];
  return dominio === 'edu.pe' || dominio.endsWith('.edu.pe');
};

/**
 * Detecta si el usuario local del correo es exclusivamente numérico (formato estudiante).
 */
export const esCorreoEstudiante = (correo: string): boolean => {
  const valor = correo.trim();
  const partes = valor.split('@');
  if (partes.length !== 2) return false;
  const usuario = partes[0];
  return /^\d+$/.test(usuario);
};

/**
 * Valida que la parte local contenga letras y números (formato docente).
 */
export const esCorreoDocenteValido = (correo: string): boolean => {
  const valor = correo.trim();
  const partes = valor.split('@');
  if (partes.length !== 2) return false;
  const usuario = partes[0];

  const tieneLetra = /\p{L}/u.test(usuario);
  const tieneNumero = /\d/.test(usuario);
  const caracteresPermitidos = /^[\p{L}\d._-]+$/u.test(usuario);

  return tieneLetra && tieneNumero && caracteresPermitidos;
};

/**
 * Evalúa las reglas de correo exclusivo para docentes en el registro.
 * Retorna null si cumple todas las condiciones o un mensaje explícito si falla.
 */
export const validarCorreoDocente = (correo: string): string | null => {
  const valor = correo.trim();
  if (!valor) return 'El correo electrónico es obligatorio.';
  if (!esCorreoValido(valor)) return 'Ingresa un formato de correo electrónico válido.';

  // 1. Filtro de Dominio Institucional
  if (!esDominioInstitucional(valor)) {
    return `Debes utilizar un correo institucional finalizado en ${DOMINIO_INSTITUCIONAL_REQUERIDO} (ej. usuario@untrm.edu.pe). No se permiten correos personales (Gmail, Hotmail, Outlook).`;
  }

  // 2. Filtro de Estudiantes (solo números)
  if (esCorreoEstudiante(valor)) {
    return 'El correo ingresado corresponde a una cuenta de estudiante. DocuDocente-App es de uso exclusivo para docentes.';
  }

  // 3. Filtro de Docentes (combinación alfa-numérica)
  const partes = valor.split('@');
  const usuario = partes[0];
  const tieneLetra = /\p{L}/u.test(usuario);
  const tieneNumero = /\d/.test(usuario);

  if (!tieneLetra || !tieneNumero) {
    return 'El correo de docente debe incluir letras y números antes del @ (ej. efigueroa12@untrm.edu.pe).';
  }

  return null;
};

export const requisitosContrasena = (valor: string) => [
  { texto: 'Al menos 8 caracteres', cumple: valor.length >= MIN_LARGO_CONTRASENA },
  { texto: 'Una letra minúscula', cumple: /\p{Ll}/u.test(valor) },
  { texto: 'Una letra mayúscula', cumple: /\p{Lu}/u.test(valor) },
  { texto: 'Un número', cumple: /\d/.test(valor) },
  { texto: 'Sin espacios', cumple: valor.length > 0 && !/\s/.test(valor) },
];

export const validarContrasena = (valor: string): string | null => {
  if (valor.length < MIN_LARGO_CONTRASENA) return 'La contraseña debe tener al menos 8 caracteres.';
  if (valor.length > MAX_LARGO_CONTRASENA) return 'La contraseña no puede superar 128 caracteres.';
  if (/\s/.test(valor)) return 'La contraseña no debe contener espacios.';
  const falta = requisitosContrasena(valor).find((r) => !r.cumple);
  if (falta) return `La contraseña debe incluir: ${falta.texto.toLowerCase()}.`;
  return null;
};

export const validarTexto = (
  valor: string | null | undefined,
  campo: string,
  max = 200,
  obligatorio = true
): string | null => {
  if (valor != null && typeof valor !== 'string') return `${campo}: ingresa texto válido.`;
  const texto = valor?.trim() ?? '';
  if (obligatorio && !texto) return `${campo} es obligatorio.`;
  if (texto.length > max) return `${campo} no puede superar ${max} caracteres.`;
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(texto)) return `${campo} contiene caracteres no válidos.`;
  return null;
};

export const exigir = (problema: string | null): void => {
  if (problema) throw new Error(problema);
};

export const validarNombre = (valor: string): string | null =>
  validarTexto(valor, 'Nombre completo', 120) ??
  (/^[\p{L}\p{M} .'’-]+$/u.test(valor.trim()) && /\p{L}/u.test(valor)
    ? null
    : 'El nombre debe contener letras; puede incluir tildes, espacios, apóstrofos y guiones.');

export type PerfilEntrada = { nombreCompleto: string; gradoAcademico?: string };

export const validarPerfil = (p: Partial<PerfilEntrada>): string | null =>
  validarNombre(p.nombreCompleto ?? '') ?? validarTexto(p.gradoAcademico, 'Grado académico', 40, false);

export type DatosRegistroDocente = {
  correo: string;
  contrasena: string;
  nombreCompleto: string;
  gradoAcademico?: string;
};

/**
 * Valida de forma integral los datos recibidos en la pantalla app/registro.tsx.
 */
export const validarRegistroDocente = (datos: DatosRegistroDocente): string | null => {
  const errorCorreo = validarCorreoDocente(datos.correo);
  if (errorCorreo) return errorCorreo;

  const errorNombre = validarNombre(datos.nombreCompleto);
  if (errorNombre) return errorNombre;

  const errorPerfil = validarTexto(datos.gradoAcademico, 'Grado académico', 40, false);
  if (errorPerfil) return errorPerfil;

  const errorContrasena = validarContrasena(datos.contrasena);
  if (errorContrasena) return errorContrasena;

  return null;
};