// Validaciones de los formularios de cuenta (funciones puras)

export const MIN_LARGO_CONTRASENA = 8;

const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const esCorreoValido = (correo: string): boolean => FORMATO_CORREO.test(correo.trim());

// Devuelve el problema de la contraseña, o null si es válida
export const validarContrasena = (contrasena: string): string | null => {
  if (contrasena.length < MIN_LARGO_CONTRASENA) {
    return `La contraseña debe tener al menos ${MIN_LARGO_CONTRASENA} caracteres.`;
  }
  if (!/[A-Za-z]/.test(contrasena) || !/\d/.test(contrasena)) {
    return 'La contraseña debe tener letras y números.';
  }
  return null;
};
