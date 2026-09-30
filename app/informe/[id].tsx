// Vista previa del informe (diseño Figma) + descargar o compartir el PDF
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { useInformes } from '../../src/hooks/useInformes';
import { InformeCompleto } from '../../src/models/Informe';
import { InformeService } from '../../src/services/informeService';
import { LIMITE_PLAN_MEJORA } from '../../src/utils/estadisticas';
import { formatearFecha } from '../../src/utils/fechas';

// "1 evaluación adjunta" / "3 evaluaciones adjuntas"
const contar = (cantidad: number, singular: string, plural: string) => `${cantidad} ${cantidad === 1 ? singular : plural}`;

export default function VistaPreviaInformeScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { perfilDocente } = useAuth();
  const { descargarInforme, compartirInforme, eliminarInforme, generandoPdf } = useInformes();
  const [datos, setDatos] = useState<InformeCompleto | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    InformeService.obtenerInformeCompleto(id)
      .then(setDatos)
      .finally(() => setCargando(false));
  }, [id]);

  // Ejecuta descargar/compartir y avisa si algo falla
  const ejecutar = async (accion: (informeId: string) => Promise<void>) => {
    try {
      await accion(id);
    } catch (error) {
      console.error('[VistaPrevia] Error con el PDF:', error);
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
  const nombresUnidades = unidades.map((u) => u.nombreUnidad).join(', ');
  const fotos = evidencias.filter((e) => e.tipoArchivo === 'IMAGE' && e.rutaArchivoLocal);

  // Resumen de evidencias por tipo de actividad
  const sesiones = evidencias.filter((e) => e.tipoActividad === 'Sesión de clase').length;
  const evaluaciones = evidencias.filter((e) => e.tipoActividad === 'Evaluación').length;
  const otras = evidencias.length - sesiones - evaluaciones;

  return (
    <SafeAreaView style={styles.contenedor} edges={['top', 'left', 'right']}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.botonHeader} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.titulo}>Vista previa del informe</Text>
        <TouchableOpacity style={styles.botonHeader} onPress={manejarEliminar}>
          <Ionicons name="trash-outline" size={21} color="#DC2626" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.contenido}>
        {/* TARJETA DE ESTADO */}
        <View style={styles.tarjetaEstado}>
          <View style={styles.filaEstado}>
            <Text style={styles.tituloEstado}>Informe generado</Text>
            <Text style={styles.etiquetaListo}>Listo</Text>
          </View>
          <Text style={styles.cursoEstado}>{informe.nombreCurso}</Text>
          <Text style={styles.detalleEstado}>
            {nombresUnidades} · Generado: {formatearFecha(informe.creadoEn)}
          </Text>
        </View>

        {/* HOJA DEL INFORME */}
        <View style={styles.hoja}>
          <Text style={styles.universidad}>UNIVERSIDAD NACIONAL TORIBIO{'\n'}RODRÍGUEZ DE MENDOZA</Text>
          <Text style={styles.tituloHoja}>INFORME N° {informe.numeroInforme}</Text>
          <View style={styles.divisor} />

          <Text style={styles.textoHoja}>Docente: {perfilDocente?.nombreCompleto ?? informe.remitenteNombre}</Text>
          <Text style={styles.textoHoja}>Curso: {informe.nombreCurso}</Text>
          <Text style={styles.textoHoja}>Unidad: {nombresUnidades}</Text>
          <Text style={styles.textoHoja}>Ciclo: {informe.ciclo} · {informe.semestre}</Text>

          <Text style={styles.seccionHoja}>1. Resumen de evidencias</Text>
          {evidencias.length === 0 ? (
            <Text style={styles.vineta}>• Sin evidencias registradas</Text>
          ) : (
            <>
              {sesiones > 0 && <Text style={styles.vineta}>• {contar(sesiones, 'sesión de clase registrada', 'sesiones de clase registradas')}</Text>}
              {evaluaciones > 0 && <Text style={styles.vineta}>• {contar(evaluaciones, 'evaluación adjunta', 'evaluaciones adjuntas')}</Text>}
              {otras > 0 && <Text style={styles.vineta}>• {contar(otras, 'otra actividad', 'otras actividades')}</Text>}
            </>
          )}

          <Text style={styles.seccionHoja}>2. Estadísticas de notas</Text>
          {unidades.map((u) => (
            <View key={u.id}>
              {unidades.length > 1 && <Text style={styles.subUnidad}>{u.nombreUnidad}</Text>}
              <Text style={styles.vineta}>• {u.cantidadAprobados + u.cantidadDesaprobados} estudiantes evaluados</Text>
              <Text style={styles.vineta}>• {u.porcentajeAprobados}% aprobados · {u.porcentajeDesaprobados}% desaprobados</Text>
              {u.porcentajeDesaprobados >= LIMITE_PLAN_MEJORA && (
                <Text style={styles.alerta}>⚠ Requiere Plan de Mejora Académica</Text>
              )}
            </View>
          ))}

          <Text style={styles.seccionHoja}>3. Evidencias fotográficas</Text>
          {fotos.length === 0 ? (
            <Text style={styles.vineta}>• Sin fotografías</Text>
          ) : (
            <View style={styles.filaFotos}>
              {fotos.map((e) => (
                <Image key={e.id} source={{ uri: e.rutaArchivoLocal! }} style={styles.foto} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* BOTONES */}
      <View style={styles.pie}>
        <TouchableOpacity style={[styles.botonDescargar, generandoPdf && styles.deshabilitado]} onPress={() => ejecutar(descargarInforme)} disabled={generandoPdf}>
          {generandoPdf ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.textoDescargar}>Descargar PDF</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.botonCompartir, generandoPdf && styles.deshabilitado]} onPress={() => ejecutar(compartirInforme)} disabled={generandoPdf}>
          <Text style={styles.textoCompartir}>Compartir</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10 },
  botonHeader: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  titulo: { fontSize: 17, fontWeight: '600', color: '#111827' },
  contenido: { paddingHorizontal: 20, paddingBottom: 110, gap: 16 },
  // Tarjeta "Informe generado"
  tarjetaEstado: { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14, padding: 14, gap: 4 },
  filaEstado: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tituloEstado: { fontSize: 15, fontWeight: '600', color: '#111827' },
  etiquetaListo: { fontSize: 11, fontWeight: '600', color: '#15803D', backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, overflow: 'hidden' },
  cursoEstado: { fontSize: 13, color: '#6B7280' },
  detalleEstado: { fontSize: 11, color: '#9CA3AF' },
  // Hoja del informe
  hoja: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 20, gap: 4 },
  universidad: { fontSize: 9, color: '#6B7280', textAlign: 'center' },
  tituloHoja: { fontSize: 11, fontWeight: '700', color: '#111827', textAlign: 'center', marginTop: 8 },
  divisor: { height: 1, backgroundColor: '#D1D5DB', marginVertical: 10 },
  textoHoja: { fontSize: 11, color: '#374151' },
  seccionHoja: { fontSize: 11, fontWeight: '700', color: '#111827', marginTop: 10 },
  subUnidad: { fontSize: 10, fontWeight: '600', color: '#374151', marginTop: 4 },
  vineta: { fontSize: 10, color: '#6B7280', marginLeft: 8 },
  alerta: { fontSize: 10, color: '#B45309', marginLeft: 8 },
  filaFotos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  foto: { width: 64, height: 48, borderRadius: 4, backgroundColor: '#E5E7EB' },
  textoVacio: { fontSize: 15, color: '#6B7280', textAlign: 'center', marginTop: 40 },
  // Botones inferiores
  pie: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 12, padding: 20, backgroundColor: '#FFFFFF' },
  botonDescargar: { flex: 1, height: 48, borderRadius: 12, backgroundColor: '#333333', justifyContent: 'center', alignItems: 'center' },
  textoDescargar: { color: '#FFFFFF', fontSize: 15, fontWeight: '500' },
  botonCompartir: { flex: 1, height: 48, borderRadius: 12, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' },
  textoCompartir: { color: '#111827', fontSize: 15, fontWeight: '500' },
  deshabilitado: { opacity: 0.6 },
});