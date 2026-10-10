// Versión de prueba de expo-file-system: lee los archivos del disco de la computadora
import { readFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';

export class File {
  uri: string;
  constructor(...partes: unknown[]) {
    this.uri = partes.map(String).join('/');
  }
  async base64() {
    const ruta = this.uri.replace('file://', '');
    return readFileSync(isAbsolute(ruta) ? ruta : join(__dirname, ruta)).toString('base64');
  }
}

export const Paths = { document: '.', cache: '.' };
