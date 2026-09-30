// Vista del informe dentro de la app + exportar a PDF
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInformes } from '../../src/hooks/useInformes';
import { InformeCompleto, UNIDADES_INFORME } from '../../src/models/Informe';
import { InformeService } from '../../src/services/informeService';
import { LIMITE_PLAN_MEJORA } from '../../src/utils/estadisticas';

export default function VistaInformeScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { exportarPdf, eliminarInforme, generandoPdf } = useInformes();
  const [datos, setDatos] = useState<InformeCompleto | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    InformeService.obtenerInformeCompleto(id)
      .then(setDatos)
      .finally(() => setCargando(false));
  }, [id]);

  const manejarExportar = async () => {
    try {
      await exportarPdf(id);
    } catch (error) {
      console.error('[VistaInforme] Error al exportar PDF:', error);
      Alert.alert('Error', 'No se pudo generar el PDF.');
    }
  };

  const manejarEliminar = () => {
    Alert.alert('Eliminar informe', '¿Seguro que deseas eliminar este informe?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await eliminarInforme(id);
          router.back();
        },
      },
    ]);
  };

  if (cargando) {
    return <ActivityIndicator style={{ flex: 1 }} color="#38BDF8" />;
  }

  if (!datos) {
    return (
      <SafeAreaView style={styles.contenedor}>
        <Text style={styles.textoVacio}>No se encontró el informe.</Text>
      </SafeAreaView>
    );
  }

  const { informe, unidades, evidencias } = datos;

  return (
    <SafeAreaView style={styles.contenedor} edges={['top', 'left', 'right']}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.botonVolver} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.tituloHeader} numberOfLines={1}>Informe N° {informe.numeroInforme}</Text>
        <TouchableOpacity onPress={manejarEliminar}>
          <Ionicons name="trash-outline" size={22} color="#DC2626" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.contenido}>
        {/* CABECERA DEL OFICIO */}
        <View style={styles.hoja}>
          <Fila etiqueta="A" valor={`${informe.dirigidoANombre}\n${informe.dirigidoACargo}`} />
          <Fila etiqueta="DE" valor={informe.remitenteNombre} />
          <Fila etiqueta="ASUNTO" valor={informe.asunto} />
          <Fila etiqueta="FECHA" valor={informe.fechaStr} />
        </View>

        {/* DATOS GENERALES */}
        <Text style={styles.seccion}>I. Datos generales</Text>
        <Text style={styles.texto}>
          {informe.nombreCurso} · Ciclo {informe.ciclo} · {informe.semestre}{'\n'}
          Estudiantes evaluados: {informe.totalEstudiantes}
        </Text>

        {/* RESULTADOS POR UNIDAD */}
        <Text style={styles.seccion}>II. Resultados de la evaluación</Text>
        {unidades.map((u) => (
          <View key={u.id} style={styles.tarjetaUnidad}>
            <Text style={styles.nombreUnidad}>{u.nombreUnidad}</Text>

            {/* Barra: parte celeste = aprobados */}
            <View style={styles.barra}>
              <View style={[styles.barraAprobados, { flex: u.porcentajeAprobados || 0.0001 }]} />
              <View style={[styles.barraDesaprobados, { flex: u.porcentajeDesaprobados || 0.0001 }]} />
            </View>
            <Text style={styles.texto}>
              Aprobados: {u.cantidadAprobados} ({u.porcentajeAprobados} %) · Desaprobados: {u.cantidadDesaprobados} ({u.porcentajeDesaprobados} %)
            </Text>

            {u.porcentajeDesaprobados >= LIMITE_PLAN_MEJORA && (
              <View style={styles.alerta}>
                <Ionicons name="warning-outline" size={16} color="#B45309" />
                <Text style={styles.textoAlerta}>Requiere Plan de Mejora Académica.</Text>
              </View>
            )}
            <Text style={styles.interpretacion}>{u.textoInterpretacion}</Text>
          </View>
        ))}

        {/* EVIDENCIAS */}
        <Text style={styles.seccion}>III. Evidencias de aprendizaje</Text>
        {evidencias.length === 0 && <Text style={styles.texto}>No hay evidencias registradas para este curso.</Text>}
        {UNIDADES_INFORME.map((unidad) => {
          const deLaUnidad = evidencias.filter((e) => e.unidad === unidad);
          if (deLaUnidad.length === 0) return null;
          return (
            <View key={unidad}>
              <Text style={styles.nombreUnidad}>{unidad}</Text>
              <View style={styles.grillaEvidencias}>
                {deLaUnidad.map((e) => (
                  <View key={e.id} style={styles.evidencia}>
                    {e.tipoArchivo === 'IMAGE' && e.rutaArchivoLocal ? (
                      <Image source={{ uri: e.rutaArchivoLocal }} style={styles.foto} />
                    ) : (
                      <View style={[styles.foto, styles.sinFoto]}>
                        <Ionicons name="document-outline" size={28} color="#64748B" />
                      </View>
                    )}
                    <Text style={styles.nombreEvidencia} numberOfLines={2}>{e.nombreActividad}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* ACCIÓN PRINCIPAL */}
      <View style={styles.pie}>
        <TouchableOpacity style={[styles.botonPdf, generandoPdf && { opacity: 0.6 }]} onPress={manejarExportar} disabled={generandoPdf}>
          {generandoPdf ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="download-outline" size={20} color="#FFFFFF" />
              <Text style={styles.textoBotonPdf}>Exportar PDF</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const Fila = ({ etiqueta, valor }: { etiqueta: string; valor: string }) => (
  <View style={styles.fila}>
    <Text style={styles.etiquetaFila}>{etiqueta}</Text>
    <Text style={styles.valorFila}>{valor}</Text>
  </View>
);

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  botonVolver: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: '#38BDF8', justifyContent: 'center', alignItems: 'center' },
  tituloHeader: { flex: 1, fontSize: 18, fontWeight: '700', color: '#0F172A' },
  contenido: { padding: 16, paddingBottom: 110 },
  hoja: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 14, gap: 8 },
  fila: { flexDirection: 'row', gap: 8 },
  etiquetaFila: { width: 64, fontSize: 12, fontWeight: '700', color: '#64748B' },
  valorFila: { flex: 1, fontSize: 13, color: '#0F172A' },
  seccion: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginTop: 22, marginBottom: 8 },
  texto: { fontSize: 13, color: '#0F172A', lineHeight: 19 },
  tarjetaUnidad: { backgroundColor: '#F1F5F9', borderRadius: 16, padding: 12, marginBottom: 12, gap: 6 },
  nombreUnidad: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 6 },
  barra: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: '#E2E8F0' },
  barraAprobados: { backgroundColor: '#38BDF8' },
  barraDesaprobados: { backgroundColor: '#FCA5A5' },
  alerta: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF3C7', borderRadius: 10, padding: 8 },
  textoAlerta: { fontSize: 12, color: '#B45309' },
  interpretacion: { fontSize: 12, color: '#475569', fontStyle: 'italic' },
  grillaEvidencias: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  evidencia: { width: '31%' },
  foto: { width: '100%', aspectRatio: 1, borderRadius: 12, backgroundColor: '#E2E8F0' },
  sinFoto: { justifyContent: 'center', alignItems: 'center' },
  nombreEvidencia: { fontSize: 11, color: '#0F172A', marginTop: 4 },
  textoVacio: { fontSize: 15, color: '#64748B', textAlign: 'center', marginTop: 40 },
  pie: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  botonPdf: { flexDirection: 'row', gap: 8, backgroundColor: '#38BDF8', borderRadius: 14, paddingVertical: 14, justifyContent: 'center', alignItems: 'center' },
  textoBotonPdf: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
