//Gestión de datos personales del docente

import { eq } from 'drizzle-orm';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/client';
import { perfilesDocente } from '../database/schema';
import { EntradaPerfilDocente, PerfilDocente } from '../models/PerfilDocente';

export class PerfilDocenteService {
  /**
   * Crea la ficha académica del docente enlazada a la cuenta de autenticación
   */
  static async crearPerfil(entrada: EntradaPerfilDocente): Promise<PerfilDocente> {
    const perfilId = uuidv4();
    const ahora = new Date().toISOString();

    await db.insert(perfilesDocente).values({
      id: perfilId,
      cuentaId: entrada.cuentaId,
      nombreCompleto: entrada.nombreCompleto,
      gradoAcademico: entrada.gradoAcademico || 'Mg.',
      facultad: entrada.facultad,
      departamento: entrada.departamento || '',
      codigoInstitucional: entrada.codigoInstitucional || '',
      creadoEn: ahora,
      actualizadoEn: ahora,
    });

    return {
      id: perfilId,
      cuentaId: entrada.cuentaId,
      nombreCompleto: entrada.nombreCompleto,
      gradoAcademico: entrada.gradoAcademico || 'Mg.',
      facultad: entrada.facultad,
      departamento: entrada.departamento,
      codigoInstitucional: entrada.codigoInstitucional,
    };
  }

  /**
   * Consulta el perfil docente por el ID de la cuenta activa
   */
  static async obtenerPorCuentaId(cuentaId: string): Promise<PerfilDocente | null> {
    const resultados = await db.select().from(perfilesDocente).where(eq(perfilesDocente.cuentaId, cuentaId));
    if (resultados.length === 0) return null;

    const perfil = resultados[0];
    return {
      id: perfil.id,
      cuentaId: perfil.cuentaId,
      nombreCompleto: perfil.nombreCompleto,
      gradoAcademico: perfil.gradoAcademico,
      facultad: perfil.facultad,
      departamento: perfil.departamento,
      codigoInstitucional: perfil.codigoInstitucional,
      avatarUri: perfil.avatarUri,
    };
  }
}