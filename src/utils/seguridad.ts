import * as Crypto from 'expo-crypto';

// Nunca se guarda la contraseña: se guarda su hash SHA-256 (el correo actúa como sal)
export const hashContrasena = (correo: string, contrasena: string): Promise<string> =>
  Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${correo.trim().toLowerCase()}:${contrasena}`);

// Las cuentas creadas antes de este cambio guardaban la contraseña en texto plano
export const esHash = (valor: string): boolean => /^[0-9a-f]{64}$/.test(valor);

// Código aleatorio de 6 dígitos para recuperar la contraseña
export const generarCodigo = (): string => {
  const [a, b, c] = Crypto.getRandomBytes(3);
  return String(((a << 16) | (b << 8) | c) % 1_000_000).padStart(6, '0');
};
