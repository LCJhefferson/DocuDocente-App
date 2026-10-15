import { File } from 'expo-file-system';
import { InformeCompleto } from '../../models/Informe';
import { supabase } from './client';

export const syncService = {
  /**
   * Respalda un informe y su PDF generado en Supabase Storage & Database
   */
  async respaldarInforme(
    userId: string,
    informeCompleto: InformeCompleto,
    pdfLocalUri?: string
  ): Promise<string | null> {
    try {
      let pdfUrlRemota: string | null = null;

      // 1. Subida del archivo PDF a Supabase Storage (Compatible con Expo Go)
      if (pdfLocalUri) {
        const file = new File(pdfLocalUri);
        const base64Data = await file.base64();
        const filePath = `informes/${userId}/${informeCompleto.informe.id}.pdf`;

        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const { error: storageError } = await supabase.storage
          .from('informes-pdf')
          .upload(filePath, bytes.buffer, {
            contentType: 'application/pdf',
            upsert: true,
          });

        if (!storageError) {
          const { data: publicUrlData } = supabase.storage
            .from('informes-pdf')
            .getPublicUrl(filePath);
          pdfUrlRemota = publicUrlData.publicUrl;
        }
      }

      // 2. Registro de datos en la tabla 'informes' de PostgreSQL
      const { error: dbError } = await supabase.from('informes').upsert({
        id: informeCompleto.informe.id,
        user_id: userId,
        numero_informe: informeCompleto.informe.numeroInforme,
        asunto: informeCompleto.informe.asunto,
        nombre_curso: informeCompleto.informe.nombreCurso,
        contenido_json: JSON.stringify(informeCompleto),
        pdf_url: pdfUrlRemota,
        sincronizado_el: new Date().toISOString(),
      });

      if (dbError) throw dbError;

      return pdfUrlRemota;
    } catch (error) {
      console.error('[syncService.respaldarInforme Error]:', error);
      return null;
    }
  },

  /**
   * Restaura los informes del docente al iniciar sesión en un nuevo celular
   */
  async descargarInformes(userId: string) {
    try {
      const { data, error } = await supabase
        .from('informes')
        .select('*')
        .eq('user_id', userId)
        .order('creado_en', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('[syncService.descargarInformes Error]:', error);
      return [];
    }
  },
};