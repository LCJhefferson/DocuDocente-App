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
import { dropAndRecreateDatabaseDev } from '../../src/database/client';
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

  // Estados
  const [unidadSeleccionada, setUnidadSeleccionada] = useState<string>('Unidad 1');
  const [busqueda, setBusqueda] = useState<string>('');
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [cargando, setCargando] = useState<boolean>(true);
  const [evidencias, setEvidencias] = useState<EvidenciaDB[]>([]);

  // Cargar evidencias de la base de datos SQLite
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

  // Manejador para guardar evidencia en SQLite
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
        tipoGeneral: 'ACADEMICA',
        cursoId: id,
        unidad: unidadSeleccionada,
        nombreActividad: datos.nombreActividad,
        descripcion: datos.descripcion,
        tipoActividad: datos.tipoActividad,
        rutaArchivoLocal: datos.archivo?.uri,
      });

      Alert.alert('Éxito', 'Evidencia guardada correctamente en la base de datos.');
      cargarEvidenciasBD();
    } catch (error) {
      Alert.alert('Error', 'Ocurrió un problema al guardar la evidencia.');
    }
  };

  // Eliminar evidencia de SQLite
  const eliminarEvidencia = (evidenciaId: string) => {
    Alert.alert('Eliminar Evidencia', '¿Estás seguro de que deseas eliminar esta evidencia?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await evidenciaService.eliminarEvidencia(evidenciaId);
            cargarEvidenciasBD();
          } catch (error) {
            Alert.alert('Error', 'No se pudo eliminar la evidencia.');
          }
        },
      },
    ]);
  };

  // Botón dev opcional para reiniciar tablas en caso de cambios en el esquema
  const handleResetearDB = () => {
    Alert.alert('Resetear DB', '¿Deseas recrear las tablas de SQLite?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Reiniciar',
        style: 'destructive',
        onPress: async () => {
          await dropAndRecreateDatabaseDev();
          cargarEvidenciasBD();
        },
      },
    ]);
  };

  const evidenciasFiltradas = evidencias.filter((item) =>
    item.nombreActividad.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.contenedorPadre} edges={['top', 'left', 'right']}>
      {/* HEADER SUPERIOR */}
      <View style={styles.headerSuperior}>
        <TouchableOpacity style={styles.botonVolver} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#0F172A" />
        </TouchableOpacity>

        <Text style={styles.tituloHeader} numberOfLines={1}>
          {nombre || 'Nombre del curso'}
        </Text>

        <View style={styles.headerAcciones}>
          <TouchableOpacity style={styles.botonIconoHeader} onPress={handleResetearDB}>
            <Ionicons name="refresh-outline" size={22} color="#0F172A" />
          </TouchableOpacity>
        </View>
      </View>

      {/* PILLS DE UNIDADES */}
      <View style={styles.contenedorUnidades}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollUnidades}>
          {UNIDADES.map((unidad) => {
            const esActivo = unidadSeleccionada === unidad;
            return (
              <TouchableOpacity
                key={unidad}
                style={[styles.pillUnidad, esActivo && styles.pillUnidadActiva]}
                onPress={() => setUnidadSeleccionada(unidad)}
              >
                <Text style={[styles.textoPill, esActivo && styles.textoPillActivo]}>
                  {unidad}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* BUSCADOR */}
      <View style={styles.contenedorBuscador}>
        <Ionicons name="search-outline" size={20} color="#94A3B8" />
        <TextInput
          style={styles.inputBuscador}
          placeholder="Buscar evidencia"
          placeholderTextColor="#94A3B8"
          value={busqueda}
          onChangeText={setBusqueda}
        />
      </View>

      {/* BOTÓN AÑADIR EVIDENCIA */}
      <View style={styles.contenedorBotonAgregar}>
        <TouchableOpacity style={styles.botonAgregar} onPress={() => setModalVisible(true)}>
          <Ionicons name="add-circle-outline" size={22} color="#FFFFFF" />
          <Text style={styles.textoBotonAgregar}>Añadir evidencia</Text>
        </TouchableOpacity>
      </View>

      {/* CONTENIDO LISTA O CARGANDO */}
      {cargando ? (
        <View style={styles.vacioContenedor}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : evidenciasFiltradas.length === 0 ? (
        <View style={styles.vacioContenedor}>
          <Ionicons name="folder-open-outline" size={48} color="#94A3B8" />
          <Text style={styles.textoVacio}>No hay evidencias registradas en esta unidad.</Text>
        </View>
      ) : (
        <FlatList
          data={evidenciasFiltradas}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listaContenido}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.tarjetaEvidencia}>
              <View style={styles.infoEvidencia}>
                <Text style={styles.tituloEvidencia} numberOfLines={2}>
                  {item.nombreActividad}
                </Text>
                <Text style={styles.fechaEvidencia}>
                  {new Date(item.creadoEn).toLocaleDateString('es-ES')} · {item.tipoActividad || 'General'}
                </Text>
              </View>

              <View style={styles.accionesEvidencia}>
                <TouchableOpacity
                  style={styles.botonAccionIcono}
                  onPress={() => eliminarEvidencia(item.id)}
                >
                  <Ionicons name="trash-outline" size={20} color="#0F172A" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* MODAL MODULAR SUBIR EVIDENCIA */}
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
  contenedorPadre: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerSuperior: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  botonVolver: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tituloHeader: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginLeft: 12,
  },
  headerAcciones: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  botonIconoHeader: {
    padding: 4,
  },
  contenedorUnidades: {
    marginTop: 8,
    marginBottom: 16,
  },
  scrollUnidades: {
    paddingHorizontal: 16,
    gap: 12,
  },
  pillUnidad: {
    paddingHorizontal: 22,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  pillUnidadActiva: {
    backgroundColor: '#BAE6FD',
  },
  textoPill: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  textoPillActivo: {
    color: '#0F172A',
  },
  contenedorBuscador: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  inputBuscador: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#0F172A',
  },
  contenedorBotonAgregar: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  botonAgregar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 6,
  },
  textoBotonAgregar: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  listaContenido: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  tarjetaEvidencia: {
    backgroundColor: '#BAE6FD',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoEvidencia: {
    flex: 1,
    marginRight: 12,
  },
  tituloEvidencia: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  fechaEvidencia: {
    fontSize: 12,
    color: '#475569',
  },
  accionesEvidencia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  botonAccionIcono: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  vacioContenedor: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  textoVacio: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 8,
  },
});