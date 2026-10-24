import { decode } from 'base64-arraybuffer';
import { eq, or } from 'drizzle-orm';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import { db } from '../../database/client';
import { cursos, eliminacionesPendientes, evidencias } from '../../database/schema';
import { supabase } from './client';

export interface ResultadoSincronizacion {
  cursosSubidos: number;
  cursosDescargados: number;
  evidenciasSubidas: number;
  evidenciasDescargadas: number;
  eliminacionesProcesadas: number;
}

// Regex estricto para validar UUID v4 de PostgreSQL
const REGEX_UUID_VALIDO = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[0-89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Lee una imagen local en Base64 y la sube al bucket 'evidencias-imagenes' de Supabase Storage
 */
async function subirArchivoStorage(
  bucket: string,
  filePath: string,
  uriLocal: string,
  contentType: string
): Promise<string | null> {
  try {
    const base64Data = await FileSystem.readAsStringAsync(uriLocal, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const arrayBuffer = decode(base64Data);

    const { error: storageError } = await supabase.storage
      .from(bucket)
      .upload(filePath, arrayBuffer, {
        contentType,
        upsert: true,
      });

    if (storageError) {
      console.error(`[Storage Error - ${bucket}]:`, storageError.message);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  } catch (e) {
    console.error(`[subirArchivoStorage Error]:`, e);
    return null;
  }
}

/**
 * Descarga una imagen remota desde Supabase hacia la memoria del dispositivo actual
 */
async function descargarImagenALocal(urlRemota: string, evidenciaId: string): Promise<string | null> {
  try {
    if (!urlRemota) return null;

    const folderPath = `${FileSystem.documentDirectory}evidencias/`;

    const folderInfo = await FileSystem.getInfoAsync(folderPath);
    if (!folderInfo.exists) {
      await FileSystem.makeDirectoryAsync(folderPath, { intermediates: true });
    }

    const localTargetUri = `${folderPath}${evidenciaId}.jpg`;
    const downloadResult = await FileSystem.downloadAsync(urlRemota, localTargetUri);

    if (downloadResult.status === 200) {
      return downloadResult.uri;
    }
    return null;
  } catch (error) {
    console.error('[descargarImagenALocal Error]:', error);
    return null;
  }
}

export const syncService = {
  /**
   * Procesa la cola de eliminaciones pendientes (Cursos y Evidencias) acumuladas durante el modo offline
   */
  async procesarEliminacionesPendientes(): Promise<number> {
    let procesadas = 0;
    try {
      const cola = await db.select().from(eliminacionesPendientes);

      for (const item of cola) {
        // 1. Borrar archivo de Storage si aplica
        if (item.storagePath) {
          await supabase.storage.from('evidencias-imagenes').remove([item.storagePath]);
        }

        // 2. Borrar registro de la tabla en Supabase ('cursos' o 'evidencias')
        const { error } = await supabase
          .from(item.tabla)
          .delete()
          .eq('id', item.registroId);

        // Si se completó o el registro ya no existía en la nube, borramos de la cola local
        if (!error) {
          await db.delete(eliminacionesPendientes).where(eq(eliminacionesPendientes.id, item.id));
          procesadas++;
        }
      }
    } catch (error) {
      console.error('[procesarEliminacionesPendientes Error]:', error);
    }
    return procesadas;
  },

  /**
   * Sincronización Bidireccional de Cursos, Evidencias e Imágenes físicas entre SQLite local y Supabase
   */
  async sincronizarTodo(cuentaId: string, perfilDocenteId?: string): Promise<ResultadoSincronizacion> {
    const res: ResultadoSincronizacion = {
      cursosSubidos: 0,
      cursosDescargados: 0,
      evidenciasSubidas: 0,
      evidenciasDescargadas: 0,
      eliminacionesProcesadas: 0,
    };

    if (!cuentaId) return res;
    const idPerfilLocal = perfilDocenteId || cuentaId;

    // ==========================================
    // 0. PROCESAR COLA DE ELIMINACIONES PENDIENTES
    // ==========================================
    res.eliminacionesProcesadas = await this.procesarEliminacionesPendientes();

    // ==========================================
    // 1. SINCRONIZAR CURSOS (SUBIDA Y EDICIÓN)
    // ==========================================
    const localCursos = await db
      .select()
      .from(cursos)
      .where(
        or(
          eq(cursos.perfilDocenteId, idPerfilLocal),
          eq(cursos.perfilDocenteId, cuentaId)
        )
      );

    for (const c of localCursos) {
      const idCursoValido = REGEX_UUID_VALIDO.test(c.id) ? c.id : Crypto.randomUUID();

      const { error } = await supabase.from('cursos').upsert(
        {
          id: idCursoValido,
          docente_id: cuentaId,
          nombre: c.nombre,
          codigo: c.codigo || null,
          ciclo: c.ciclo,
          semestre: c.semestre,
          local_id: c.id,
          creado_en: c.creadoEn,
          actualizado_en: c.actualizadoEn || new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

      if (!error) {
        res.cursosSubidos++;
      } else {
        console.error('[Sync Cursos Error]:', error.message);
      }
    }

    // DESCARGAR O ACTUALIZAR CURSOS REMOTOS
    const { data: remoteCursos } = await supabase
      .from('cursos')
      .select('*')
      .eq('docente_id', cuentaId);

    if (remoteCursos) {
      for (const rc of remoteCursos) {
        const localExistente = localCursos.find((lc) => lc.id === rc.id);

        if (!localExistente) {
          await db.insert(cursos).values({
            id: rc.id,
            perfilDocenteId: idPerfilLocal,
            nombre: rc.nombre,
            codigo: rc.codigo,
            ciclo: rc.ciclo,
            semestre: rc.semestre,
            creadoEn: rc.creado_en || new Date().toISOString(),
            actualizadoEn: rc.actualizado_en || new Date().toISOString(),
          });
          res.cursosDescargados++;
        } else {
          const fechaRemota = new Date(rc.actualizado_en || 0).getTime();
          const fechaLocal = new Date(localExistente.actualizadoEn || 0).getTime();

          if (fechaRemota > fechaLocal) {
            await db
              .update(cursos)
              .set({
                nombre: rc.nombre,
                codigo: rc.codigo,
                ciclo: rc.ciclo,
                semestre: rc.semestre,
                actualizadoEn: rc.actualizado_en,
              })
              .where(eq(cursos.id, rc.id));
          }
        }
      }
    }

    // ==========================================
    // 2. SINCRONIZAR EVIDENCIAS E IMÁGENES FÍSICAS
    // ==========================================
    const localEvidencias = await db
      .select()
      .from(evidencias)
      .where(
        or(
          eq(evidencias.perfilDocenteId, idPerfilLocal),
          eq(evidencias.perfilDocenteId, cuentaId)
        )
      );

    // SUBIR EVIDENCIAS LOCALES Y SUS FOTOS A SUPABASE STORAGE
    for (const ev of localEvidencias) {
      let urlPublica = ev.urlRemota;
      const idEvidenciaUuid = REGEX_UUID_VALIDO.test(ev.id) ? ev.id : Crypto.randomUUID();

      if (ev.rutaArchivoLocal && !urlPublica) {
        const pathStorage = `evidencias/${cuentaId}/${idEvidenciaUuid}.jpg`;
        const urlSubida = await subirArchivoStorage(
          'evidencias-imagenes',
          pathStorage,
          ev.rutaArchivoLocal,
          'image/jpeg'
        );

        if (urlSubida) {
          urlPublica = urlSubida;
          await db
            .update(evidencias)
            .set({ urlRemota: urlPublica })
            .where(eq(evidencias.id, ev.id));
        }
      }

      const cursoIdUuid = ev.cursoId && REGEX_UUID_VALIDO.test(ev.cursoId) ? ev.cursoId : null;

      const { error } = await supabase.from('evidencias').upsert(
        {
          id: idEvidenciaUuid,
          docente_id: cuentaId,
          curso_id: cursoIdUuid,
          local_id: ev.id,
          nombre_actividad: ev.nombreActividad,
          descripcion: ev.descripcion || null,
          unidad: ev.unidad || null,
          tipo_actividad: ev.tipoActividad || null,
          tipo_general: ev.tipoGeneral || 'ACADEMICA',
          tipo_archivo: ev.tipoArchivo || 'IMAGE',
          leyenda: ev.leyenda || null,
          url_publica: urlPublica || null,
          creado_en: ev.creadoEn,
        },
        { onConflict: 'id' }
      );

      if (!error) {
        res.evidenciasSubidas++;
      } else {
        console.error('[Sync Evidencias Error]:', error.message);
      }
    }

    // DESCARGAR EVIDENCIAS REMOTAS Y SUS IMÁGENES FÍSICAS AL DISPOSITIVO
    const { data: remoteEvidencias } = await supabase
      .from('evidencias')
      .select('*')
      .eq('docente_id', cuentaId);

    if (remoteEvidencias) {
      for (const rev of remoteEvidencias) {
        const existe = localEvidencias.some((lev) => lev.id === rev.id);

        if (!existe) {
          let rutaLocal: string | null = null;

          if (rev.url_publica) {
            rutaLocal = await descargarImagenALocal(rev.url_publica, rev.id);
          }

          await db.insert(evidencias).values({
            id: rev.id,
            perfilDocenteId: idPerfilLocal,
            tipoGeneral: rev.tipo_general || 'ACADEMICA',
            cursoId: rev.curso_id || null,
            actividadId: null,
            nombreActividad: rev.nombre_actividad,
            descripcion: rev.descripcion || null,
            unidad: rev.unidad || null,
            tipoActividad: rev.tipo_actividad || null,
            rutaArchivoLocal: rutaLocal,
            urlRemota: rev.url_publica || null,
            tipoArchivo: rev.tipo_archivo || 'IMAGE',
            leyenda: rev.leyenda || null,
            creadoEn: rev.creado_en || new Date().toISOString(),
            actualizadoEn: new Date().toISOString(),
          });
          res.evidenciasDescargadas++;
        }
      }
    }

    return res;
  },
};