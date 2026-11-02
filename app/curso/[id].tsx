// app/curso/[id].tsx
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ModalSubirEvidencia } from '../../src/components/modals/ModalSubirEvidencia';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { evidenciaService } from '../../src/services/evidenciaService';

interface EvidenciaDB {
  id: string;
  nombreActividad: string;
  descripcion?: string | null;
  tipoActividad?: string | null;
  unidad?: string | null;
  rutaArchivoLocal?: string | null;
  creadoEn: string;
}

const UNIDADES = ['Unidad 1', 'Unidad 2', 'Unidad 3'];

export default function EvidenciasCursoScreen() {
  const router = useRouter();
  const { id, nombre } = useLocalSearchParams<{ id: string; nombre?: string }>();
  const { perfilDocente, cuentaId } = useAuth();
  const { isDarkMode } = useTheme();

  const [unidadSeleccionada, setUnidadSeleccionada] = useState<string>('Unidad 1');
  const [busqueda, setBusqueda] = useState<string>('');
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [cargando, setCargando] = useState<boolean>(true);
  const [evidencias, setEvidencias] = useState<EvidenciaDB[]>([]);

  const cargarEvidenciasBD = useCallback(async () => {
    if (!id) return;
    try {
      setCargando(true);
      const resultado = await evidenciaService.obtenerPorCursoYUnidad(id, unidadSeleccionada);
      setEvidencias(resultado);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar las evidencias de la base de datos.');
    } finally {
      setCargando(false);
    }
  }, [id, unidadSeleccionada]);

  useEffect(() => {
    cargarEvidenciasBD();
  }, [cargarEvidenciasBD]);

  const handleGuardarEvidencia = async (datos: {
    nombreActividad: string;
    descripcion: string;
    tipoActividad: string;
    archivo: { uri: string; name: string } | null;
  }) => {
    if (!id) {
      Alert.alert('Error', 'No se encontró el ID del curso.');
      return;
    }

    try {
      await evidenciaService.crearEvidencia({
        perfilDocenteId: perfilDocente?.id || cuentaId || undefined,
        tipoGeneral: 'ACADEMICA',
        cursoId: id,
        unidad: unidadSeleccionada,
        nombreActividad: datos.nombreActividad,
        descripcion: datos.descripcion,
        tipoActividad: datos.tipoActividad,
        rutaArchivoLocal: datos.archivo?.uri,
      });

      Alert.alert('Éxito', 'Evidencia guardada correctamente.');
      cargarEvidenciasBD();
    } catch (error) {
      Alert.alert('Error', 'Ocurrió un problema al guardar la evidencia.');
    }
  };

  const eliminarEvidencia = (evidenciaId: string) => {
    Alert.alert('Eliminar Evidencia', '¿Estás seguro de que deseas eliminar esta evidencia?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await evidenciaService.eliminarEvidencia(evidenciaId, perfilDocente?.id);
            cargarEvidenciasBD();
          } catch (error) {
            Alert.alert('Error', 'No se pudo eliminar la evidencia.');
          }
        },
      },
    ]);
  };

  const evidenciasFiltradas = evidencias.filter((item) =>
    item.nombreActividad.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <SafeAreaView
      style={[styles.contenedorPadre, { backgroundColor: isDarkMode ? '#0F172A' : '#FFFFFF' }]}
      edges={['top', 'left', 'right']}
    >
      {/* ENCABEZADO SUPERIOR LIMPIO */}
      <View style={styles.headerSuperior}>
        <TouchableOpacity
          style={[
            styles.botonVolver,
            { backgroundColor: isDarkMode ? '#1E293B' : 'transparent', borderColor: isDarkMode ? '#334155' : '#38BDF8' },
          ]}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={isDarkMode ? '#F8FAFC' : '#0F172A'} />
        </TouchableOpacity>

        <Text style={[styles.tituloHeader, { color: isDarkMode ? '#F8FAFC' : '#0F172A' }]} numberOfLines={1}>
          {nombre || 'Nombre del curso'}
        </Text>
      </View>

      {/* SECTOR DE UNIDADES */}
      <View style={styles.contenedorUnidades}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollUnidades}>
          {UNIDADES.map((unidad) => {
            const esActivo = unidadSeleccionada === unidad;
            return (
              <TouchableOpacity
                key={unidad}
                style={[
                  styles.pillUnidad,
                  { backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9' },
                  esActivo && { backgroundColor: isDarkMode ? '#0369A1' : '#BAE6FD' },
                ]}
                onPress={() => setUnidadSeleccionada(unidad)}
              >
                <Text
                  style={[
                    styles.textoPill,
                    { color: isDarkMode ? '#94A3B8' : '#64748B' },
                    esActivo && { color: isDarkMode ? '#FFFFFF' : '#0F172A' },
                  ]}
                >
                  {unidad}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* BUSCADOR */}
      <View
        style={[
          styles.contenedorBuscador,
          {
            backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
            borderColor: isDarkMode ? '#334155' : '#38BDF8',
          },
        ]}
      >
        <Ionicons name="search-outline" size={20} color="#94A3B8" />
        <TextInput
          style={[styles.inputBuscador, { color: isDarkMode ? '#F8FAFC' : '#0F172A' }]}
          placeholder="Buscar evidencia"
          placeholderTextColor="#94A3B8"
          value={busqueda}
          onChangeText={setBusqueda}
        />
      </View>

      {/* BOTONES DE ACCIÓN */}
      <View style={styles.contenedorBotonesAccion}>
        <TouchableOpacity
          style={[styles.botonNotas, { backgroundColor: isDarkMode ? '#15803D' : '#4ADE80' }]}
          onPress={() =>
            router.push({
              pathname: '/curso/notas-estadisticas' as any,
              params: { id, nombre: nombre || 'Curso', unidad: unidadSeleccionada },
            })
          }
        >
          <Ionicons name="add-circle-outline" size={20} color={isDarkMode ? '#FFFFFF' : '#0F172A'} />
          <Text style={[styles.textoBotonNotas, { color: isDarkMode ? '#FFFFFF' : '#0F172A' }]}>Añadir Notas</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.botonAgregar, { backgroundColor: isDarkMode ? '#0284C7' : '#3B82F6' }]}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
          <Text style={styles.textoBotonAgregar}>Añadir evidencia</Text>
        </TouchableOpacity>
      </View>

      {/* LISTADO DE EVIDENCIAS */}
      {cargando ? (
        <View style={styles.vacioContenedor}>
          <ActivityIndicator size="large" color={isDarkMode ? '#38BDF8' : '#3B82F6'} />
        </View>
      ) : evidenciasFiltradas.length === 0 ? (
        <View style={styles.vacioContenedor}>
          <Ionicons name="folder-open-outline" size={48} color="#94A3B8" />
          <Text style={[styles.textoVacio, { color: isDarkMode ? '#94A3B8' : '#94A3B8' }]}>
            No hay evidencias registradas en esta unidad.
          </Text>
        </View>
      ) : (
        <FlatList
          data={evidenciasFiltradas}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listaContenido}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View
              style={[
                styles.tarjetaEvidencia,
                { backgroundColor: isDarkMode ? '#1E293B' : '#BAE6FD' },
              ]}
            >
              <View style={styles.infoEvidencia}>
                <Text
                  style={[styles.tituloEvidencia, { color: isDarkMode ? '#F8FAFC' : '#0F172A' }]}
                  numberOfLines={2}
                >
                  {item.nombreActividad}
                </Text>
                <Text style={[styles.fechaEvidencia, { color: isDarkMode ? '#94A3B8' : '#475569' }]}>
                  {new Date(item.creadoEn).toLocaleDateString('es-ES')} · {item.tipoActividad || 'General'}
                </Text>
              </View>

              <View style={styles.accionesEvidencia}>
                <TouchableOpacity
                  style={[
                    styles.botonAccionIcono,
                    { backgroundColor: isDarkMode ? '#334155' : 'rgba(255, 255, 255, 0.4)' },
                  ]}
                  onPress={() => eliminarEvidencia(item.id)}
                >
                  <Ionicons name="trash-outline" size={20} color={isDarkMode ? '#F8FAFC' : '#0F172A'} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      <ModalSubirEvidencia
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        nombreCurso={nombre || 'Curso'}
        unidadActual={unidadSeleccionada}
        onGuardar={handleGuardarEvidencia}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedorPadre: { flex: 1 },
  headerSuperior: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  botonVolver: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  tituloHeader: { flex: 1, fontSize: 20, fontWeight: '700', marginLeft: 12 },
  contenedorUnidades: { marginTop: 8, marginBottom: 16 },
  scrollUnidades: { paddingHorizontal: 16, gap: 12 },
  pillUnidad: { paddingHorizontal: 22, paddingVertical: 8, borderRadius: 20 },
  textoPill: { fontSize: 13, fontWeight: '600' },
  contenedorBuscador: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, paddingHorizontal: 14, height: 44, borderWidth: 1.5, borderRadius: 22, marginBottom: 16 },
  inputBuscador: { flex: 1, marginLeft: 8, fontSize: 14 },
  contenedorBotonesAccion: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 16, gap: 10 },
  botonNotas: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 14, gap: 6 },
  textoBotonNotas: { fontWeight: '700', fontSize: 13 },
  botonAgregar: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 14, gap: 6 },
  textoBotonAgregar: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  listaContenido: { paddingHorizontal: 16, paddingBottom: 20 },
  tarjetaEvidencia: { borderRadius: 20, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  infoEvidencia: { flex: 1, marginRight: 12 },
  tituloEvidencia: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  fechaEvidencia: { fontSize: 12 },
  accionesEvidencia: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  botonAccionIcono: { padding: 6, borderRadius: 8 },
  vacioContenedor: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  textoVacio: { fontSize: 14, marginTop: 8 },
});