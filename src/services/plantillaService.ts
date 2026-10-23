import { asc, eq } from 'drizzle-orm';
import * as Crypto from 'expo-crypto';
import { db } from '../database/client';
import { plantillas } from '../database/schema';
import { DefinicionPlantilla, EntradaPlantilla, Plantilla } from '../models/Plantilla';

type Fila = typeof plantillas.$inferSelect;

/**
 * Mapea una fila de SQLite a la interfaz Plantilla omitiendo registros incompletos o antiguos
 */
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

/**
 * Mapea columnas retrocompatibles para la generación en PDF a partir de la definición JSON
 */
const columnasCompatibles = (d: DefinicionPlantilla) => ({
  nombreInstitucion: d.cabecera.textoIzquierdo.join(' ') || 'Institución',
  nombreFacultad: d.cabecera.textoDerecho.join(' ') || null,
  logoUri: d.cabecera.logoIzquierdo,
  tituloAnoEncabezado: d.cabecera.lema ?? '',
});

export const plantillaService = {
  /**
   * Obtiene la lista ordenada de plantillas registradas
   */
  async listar(): Promise<Plantilla[]> {
    try {
      const filas = await db.select().from(plantillas).orderBy(asc(plantillas.creadoEn));
      return filas.map(aPlantilla).filter((p): p is Plantilla => p !== null);
    } catch (error) {
      console.error('[plantillaService.listar Error]:', error);
      throw error;
    }
  },

  /**
   * Obtiene una plantilla específica por su ID
   */
  async obtener(id: string): Promise<Plantilla | null> {
    try {
      if (!id) return null;
      const [fila] = await db.select().from(plantillas).where(eq(plantillas.id, id));
      return fila ? aPlantilla(fila) : null;
    } catch (error) {
      console.error('[plantillaService.obtener Error]:', error);
      throw error;
    }
  },

  /**
   * Obtiene la plantilla predeterminada activa
   */
  async obtenerPredeterminada(): Promise<Plantilla | null> {
    try {
      const [fila] = await db
        .select()
        .from(plantillas)
        .where(eq(plantillas.esPredeterminada, true))
        .limit(1);
      return fila ? aPlantilla(fila) : null;
    } catch (error) {
      console.error('[plantillaService.obtenerPredeterminada Error]:', error);
      throw error;
    }
  },

  /**
   * Crea o actualiza una plantilla. Genera UUID nativo de Expo si es nueva.
   */
  async guardar(entrada: EntradaPlantilla): Promise<string> {
    try {
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
        id = Crypto.randomUUID();
        await db.insert(plantillas).values({
          id,
          ...valores,
          esPredeterminada: false,
          creadoEn: new Date().toISOString(),
        });
      }

      if (entrada.esPredeterminada) {
        await this.marcarPredeterminada(id);
      }
      return id;
    } catch (error) {
      console.error('[plantillaService.guardar Error]:', error);
      throw error;
    }
  },

  /**
   * Establece una única plantilla como la predeterminada del sistema
   */
  async marcarPredeterminada(id: string): Promise<void> {
    try {
      await db.update(plantillas).set({ esPredeterminada: false });
      await db.update(plantillas).set({ esPredeterminada: true }).where(eq(plantillas.id, id));
    } catch (error) {
      console.error('[plantillaService.marcarPredeterminada Error]:', error);
      throw error;
    }
  },

  /**
   * Elimina una plantilla por su ID
   */
  async eliminar(id: string): Promise<void> {
    try {
      await db.delete(plantillas).where(eq(plantillas.id, id));
    } catch (error) {
      console.error('[plantillaService.eliminar Error]:', error);
      throw error;
    }
  },
};

/**
 * Wrapper de clase para mantener compatibilidad con llamados legacy `PlantillaService.listar()`
 */
export class PlantillaService {
  static listar = plantillaService.listar;
  static obtener = plantillaService.obtener;
  static obtenerPredeterminada = plantillaService.obtenerPredeterminada;
  static guardar = plantillaService.guardar;
  static marcarPredeterminada = plantillaService.marcarPredeterminada;
  static eliminar = plantillaService.eliminar;
}