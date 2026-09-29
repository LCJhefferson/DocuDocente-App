import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
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

interface EvidenciaLocal {
  id: string;
  nombreActividad: string;
  descripcion?: string;
  tipoActividad: string;
  fecha: string;
  unidad: string;
  archivoUri?: string;
}

const UNIDADES = ['Unidad 1', 'Unidad 2', 'Unidad 3'];

export default function EvidenciasCursoScreen() {
  const router = useRouter();
  const { id, nombre } = useLocalSearchParams<{ id: string; nombre?: string }>();

  // Estados principales
  const [unidadSeleccionada, setUnidadSeleccionada] = useState<string>('Unidad 1');
  const [busqueda, setBusqueda] = useState<string>('');
  const [modalVisible, setModalVisible] = useState<boolean>(false);

  // Lista de evidencias cargadas
  const [evidencias, setEvidencias] = useState<EvidenciaLocal[]>([
    {
      id: '1',
      nombreActividad: 'Desarrollo de aplicaciones Moviles',
      descripcion: 'Clase sobre React Navigation',
      tipoActividad: 'Sesión de clase',
      fecha: '10/08/2026',
      unidad: 'Unidad 1',
    },
  ]);

  // Manejador para guardar desde el nuevo Modal
  const handleGuardarEvidencia = (datos: {
    nombreActividad: string;
    descripcion: string;
    tipoActividad: string;
    archivo: { uri: string; name: string } | null;
  }) => {
    const nueva: EvidenciaLocal = {
      id: Date.now().toString(),
      nombreActividad: datos.nombreActividad,
      descripcion: datos.descripcion,
      tipoActividad: datos.tipoActividad,
      fecha: new Date().toLocaleDateString('es-ES'),
      unidad: unidadSeleccionada,
      archivoUri: datos.archivo?.uri,
    };

    setEvidencias((prev) => [nueva, ...prev]);
    Alert.alert('Éxito', 'Evidencia guardada correctamente.');
  };

  const eliminarEvidencia = (evidenciaId: string) => {
    Alert.alert('Eliminar Evidencia', '¿Estás seguro de que deseas eliminar esta evidencia?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          setEvidencias((prev) => prev.filter((item) => item.id !== evidenciaId));
        },
      },
    ]);
  };

  const evidenciasFiltradas = evidencias.filter((item) => {
    const coincideUnidad = item.unidad === unidadSeleccionada;
    const coincideTexto = item.nombreActividad.toLowerCase().includes(busqueda.toLowerCase());
    return coincideUnidad && coincideTexto;
  });

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
          <TouchableOpacity style={styles.botonIconoHeader}>
            <Ionicons name="person-outline" size={22} color="#0F172A" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.botonIconoHeader}>
            <Ionicons name="log-out-outline" size={24} color="#0F172A" />
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
          placeholder="Buscar curso"
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

      {/* LISTA DE EVIDENCIAS */}
      {evidenciasFiltradas.length === 0 ? (
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
                <Text style={styles.fechaEvidencia}>{item.fecha}</Text>
              </View>

              <View style={styles.accionesEvidencia}>
                <TouchableOpacity style={styles.botonAccionIcono}>
                  <Ionicons name="pencil" size={18} color="#0F172A" />
                </TouchableOpacity>

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
        nombreCurso={nombre || 'Desarrollo de aplicaciones Móviles'}
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