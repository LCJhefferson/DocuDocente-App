// src/services/perfilDocenteService.ts
// Gestión de datos personales y académicos del docente en SQLite

import { eq } from 'drizzle-orm';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/client';
import { perfilesDocente } from '../database/schema';
import { EntradaPerfilDocente, PerfilDocente } from '../models/PerfilDocente';

export class PerfilDocenteService {
  /**
   * Crea la ficha académica del docente asignando valores institucionales por defecto
   */
  static async crearPerfil(entrada: EntradaPerfilDocente): Promise<PerfilDocente> {
    const perfilId = uuidv4();
    const ahora = new Date().toISOString();

    await db.insert(perfilesDocente).values({
      id: perfilId,
      cuentaId: entrada.cuentaId,
      nombreCompleto: entrada.nombreCompleto,
      gradoAcademico: entrada.gradoAcademico || 'Mg.',
      facultad: 'Facultad de Ingeniería de Sistemas y Mecánica Eléctrica', // <-- Satisface la restricción NOT NULL de la BD existente
      departamento: '',
      codigoInstitucional: '',
      creadoEn: ahora,
      actualizadoEn: ahora,
    });

    return {
      id: perfilId,
      cuentaId: entrada.cuentaId,
      nombreCompleto: entrada.nombreCompleto,
      gradoAcademico: entrada.gradoAcademico || 'Mg.',
    };
  }

  /**
   * Consulta el perfil docente por el ID de la cuenta activa
   */
  static async obtenerPorCuentaId(cuentaId: string): Promise<PerfilDocente | null> {
    const resultados = await db
      .select()
      .from(perfilesDocente)
      .where(eq(perfilesDocente.cuentaId, cuentaId));

    if (resultados.length === 0) return null;

    const perfil = resultados[0];
    return {
      id: perfil.id,
      cuentaId: perfil.cuentaId,
      nombreCompleto: perfil.nombreCompleto,
      gradoAcademico: perfil.gradoAcademico,
    };
  }

  /**
   * Actualiza la información del perfil docente ligado a una cuenta
   */
  static async actualizarPerfil(
    cuentaId: string,
    datos: Partial<Omit<PerfilDocente, 'id' | 'cuentaId'>>
  ): Promise<void> {
    const ahora = new Date().toISOString();

    await db
      .update(perfilesDocente)
      .set({
        ...datos,
        actualizadoEn: ahora,
      })
      .where(eq(perfilesDocente.cuentaId, cuentaId));
  }
}