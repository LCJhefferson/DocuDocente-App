// Reglas compartidas por formularios y servicios; no modifican los valores recibidos.
export const MIN_LARGO_CONTRASENA = 8;
export const MAX_LARGO_CONTRASENA = 128;

export const esCorreoValido = (correo: string): boolean => {
  const valor = correo.trim();
  return valor.length <= 254 && /^[^\s@.]+(?:\.[^\s@.]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/.test(valor);
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
  const falta = requisitosContrasena(valor).find(r => !r.cumple);
  if (falta) return `La contraseña debe incluir: ${falta.texto.toLowerCase()}.`;
  return null;
};

export const validarTexto = (valor: string | null | undefined, campo: string, max = 200, obligatorio = true): string | null => {
  if (valor != null && typeof valor !== 'string') return `${campo}: ingresa texto válido.`;
  const texto = valor?.trim() ?? '';
  if (obligatorio && !texto) return `${campo} es obligatorio.`;
  if (texto.length > max) return `${campo} no puede superar ${max} caracteres.`;
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(texto)) return `${campo} contiene caracteres no válidos.`;
  return null;
};

export const exigir = (problema: string | null): void => { if (problema) throw new Error(problema); };

export const validarNombre = (valor: string): string | null =>
  validarTexto(valor, 'Nombre completo', 120) ??
  (/^[\p{L}\p{M} .'’-]+$/u.test(valor.trim()) && /\p{L}/u.test(valor)
    ? null : 'El nombre debe contener letras; puede incluir tildes, espacios, apóstrofos y guiones.');

type PerfilEntrada = { nombreCompleto: string; gradoAcademico: string; facultad: string; departamento?: string | null; codigoInstitucional?: string | null };
export const validarPerfil = (p: PerfilEntrada): string | null =>
  validarNombre(p.nombreCompleto) ?? validarTexto(p.gradoAcademico, 'Grado académico', 40, false) ??
  validarTexto(p.facultad, 'Facultad', 200) ?? validarTexto(p.departamento, 'Departamento', 200, false) ??
  validarTexto(p.codigoInstitucional, 'Código institucional', 30, false) ??
  (p.codigoInstitucional?.trim() && !/^[\p{L}\p{N}_-]+$/u.test(p.codigoInstitucional.trim()) ? 'El código institucional solo admite letras, números, guion y guion bajo.' : null);
