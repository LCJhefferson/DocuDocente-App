import { asc, eq } from 'drizzle-orm';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/client';
import { plantillas } from '../database/schema';
import { DefinicionPlantilla, EntradaPlantilla, Plantilla } from '../models/Plantilla';

type Fila = typeof plantillas.$inferSelect;

// Filas antiguas (pantalla de Donald / versión anterior) no tienen definicion: se ignoran
const aPlantilla = (fila: Fila): Plantilla | null =>
  fila.definicion
    ? {
        id: fila.id,
        nombre: fila.nombre ?? fila.nombreInstitucion,
        tipo: fila.tipo,
        definicion: fila.definicion,
        esPredeterminada: fila.esPredeterminada,
        creadoEn: fila.creadoEn,
      }
    : null;

// Las columnas antiguas las sigue leyendo el PDF actual: se llenan desde la definición
const columnasCompatibles = (d: DefinicionPlantilla) => ({
  nombreInstitucion: d.cabecera.textoIzquierdo.join(' ') || 'Institución',
  nombreFacultad: d.cabecera.textoDerecho.join(' ') || null,
  logoUri: d.cabecera.logoIzquierdo,
  tituloAnoEncabezado: d.cabecera.lema ?? '',
});

export const plantillaService = {
  async listar(): Promise<Plantilla[]> {
    const filas = await db.select().from(plantillas).orderBy(asc(plantillas.creadoEn));
    return filas.map(aPlantilla).filter((p): p is Plantilla => p !== null);
  },

  async obtener(id: string): Promise<Plantilla | null> {
    const [fila] = await db.select().from(plantillas).where(eq(plantillas.id, id));
    return fila ? aPlantilla(fila) : null;
  },

  async obtenerPredeterminada(): Promise<Plantilla | null> {
    const [fila] = await db.select().from(plantillas).where(eq(plantillas.esPredeterminada, true)).limit(1);
    return fila ? aPlantilla(fila) : null;
  },

  /** Crea o actualiza (si trae id). Devuelve el id. */
  async guardar(entrada: EntradaPlantilla): Promise<string> {
    const valores = {
      nombre: entrada.nombre.trim(),
      tipo: entrada.tipo,
      definicion: entrada.definicion,
      ...columnasCompatibles(entrada.definicion),
    };

    let id = entrada.id;
    if (id) {
      await db.update(plantillas).set(valores).where(eq(plantillas.id, id));
    } else {
      id = uuidv4();
      await db.insert(plantillas).values({ id, ...valores, esPredeterminada: false, creadoEn: new Date().toISOString() });
    }

    if (entrada.esPredeterminada) await this.marcarPredeterminada(id);
    return id;
  },

  /** Solo una plantilla puede ser la predeterminada */
  async marcarPredeterminada(id: string): Promise<void> {
    await db.update(plantillas).set({ esPredeterminada: false });
    await db.update(plantillas).set({ esPredeterminada: true }).where(eq(plantillas.id, id));
  },

  async eliminar(id: string): Promise<void> {
    await db.delete(plantillas).where(eq(plantillas.id, id));
  },
};
