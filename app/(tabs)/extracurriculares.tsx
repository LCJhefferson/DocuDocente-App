import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MenuDocente } from '../../src/components/MenuDocente';
import { ModalSubirEvidencia } from '../../src/components/modals/ModalSubirEvidencia';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { evidenciaService } from '../../src/services/evidenciaService';

// Tipado estricto para las evidencias extracurriculares
interface EvidenciaExtracurricular {
  id: string;
  nombreActividad: string;
  descripcion?: string | null;
  tipoActividad?: string | null;
  unidad?: string | null;
  rutaArchivoLocal?: string | null;
  urlRemota?: string | null;
  creadoEn: string;
}

const UNIDADES = ['Todas', 'Unidad 1', 'Unidad 2', 'Unidad 3'];

export default function ExtracurricularesScreen() {
  const { perfilDocente, cuentaId } = useAuth();
  const { isDarkMode } = useTheme();

  const [actividades, setActividades] = useState<EvidenciaExtracurricular[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [unidadActiva, setUnidadActiva] = useState<string>('Todas');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMenuVisible, setModalMenuVisible] = useState(false);
  const [cargando, setCargando] = useState(true);

  // Identificador único del docente activo
  const idDocenteActivo = perfilDocente?.id || cuentaId;

  const cargarActividades = useCallback(async () => {
    if (!idDocenteActivo) return;
    try {
      setCargando(true);
      const resultado = await evidenciaService.obtenerExtracurriculares(idDocenteActivo);
      setActividades(resultado as EvidenciaExtracurricular[]);
    } catch (error) {
      console.error('[Extracurriculares] Error al cargar actividades:', error);
    } finally {
      setCargando(false);
    }
  }, [idDocenteActivo]);

  useEffect(() => {
    cargarActividades();
  }, [cargarActividades]);

  const manejarGuardar = async (datos: {
    nombreActividad: string;
    descripcion: string;
    tipoActividad: string;
    archivo: { uri: string; name: string; type?: string } | null;
  }) => {
    if (!idDocenteActivo) {
      Alert.alert('Error', 'No se encontró la sesión del docente activo.');
      return;
    }

    try {
      await evidenciaService.crearEvidencia({
        perfilDocenteId: idDocenteActivo,
        tipoGeneral: 'EXTRACURRICULAR',
        cursoId: undefined,
        nombreActividad: datos.nombreActividad,
        descripcion: datos.descripcion,
        unidad: unidadActiva === 'Todas' ? 'General' : unidadActiva,
        tipoActividad: datos.tipoActividad,
        rutaArchivoLocal: datos.archivo?.uri,
        tipoArchivo: datos.archivo?.type === 'application/pdf' ? 'PDF' : 'IMAGE',
      });

      cargarActividades();
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar la actividad extracurricular.');
    }
  };

  const manejarEliminar = (actividad: EvidenciaExtracurricular) => {
    Alert.alert('Eliminar actividad', `¿Eliminar "${actividad.nombreActividad}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await evidenciaService.eliminarEvidencia(actividad.id, perfilDocente?.id);
            cargarActividades();
          } catch (error) {
            Alert.alert('Error', 'No se pudo eliminar la actividad.');
          }
        },
      },
    ]);
  };

  const actividadesFiltradas = actividades.filter((a) => {
    const coincideBusqueda = a.nombreActividad?.toLowerCase().includes(busqueda.toLowerCase());
    const coincideUnidad =
      unidadActiva === 'Todas' || !a.unidad || a.unidad === unidadActiva;
    return coincideBusqueda && coincideUnidad;
  });

  return (
    <SafeAreaView
      style={[styles.contenedor, { backgroundColor: isDarkMode ? '#0F172A' : '#FFFFFF' }]}
      edges={['top', 'left', 'right']}
    >
      {/* Encabezado Superior con el botón de las tres rayas a la izquierda */}
      <View style={styles.encabezado}>
        <TouchableOpacity
          style={styles.botonIconoHeader}
          onPress={() => setModalMenuVisible(true)}
        >
          <Ionicons name="menu" size={28} color={isDarkMode ? '#F8FAFC' : '#1C252C'} />
        </TouchableOpacity>
        
        <Text style={[styles.titulo, { color: isDarkMode ? '#F8FAFC' : '#0F172A' }]}>
          Extracurriculares
        </Text>

        <View style={{ width: 28 }} />
      </View>

      {/* Selector de Unidades */}
      <View style={styles.contenedorUnidades}>
        {UNIDADES.map((unidad) => {
          const esActiva = unidadActiva === unidad;
          return (
            <TouchableOpacity
              key={unidad}
              style={[
                styles.chipUnidad,
                { backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9' },
                esActiva && { backgroundColor: isDarkMode ? '#0369A1' : '#BAE6FD' },
              ]}
              onPress={() => setUnidadActiva(unidad)}
            >
              <Text
                style={[
                  styles.textoChipUnidad,
                  { color: isDarkMode ? '#94A3B8' : '#64748B' },
                  esActiva && { color: isDarkMode ? '#FFFFFF' : '#0369A1' },
                ]}
              >
                {unidad}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Buscador */}
      <View
        style={[
          styles.contenedorBuscador,
          {
            backgroundColor: isDarkMode ? '#1E293B' : 'transparent',
            borderColor: isDarkMode ? '#334155' : '#38BDF8',
          },
        ]}
      >
        <Ionicons name="search-outline" size={20} color="#94A3B8" />
        <TextInput
          style={[styles.inputBuscador, { color: isDarkMode ? '#F8FAFC' : '#0F172A' }]}
          placeholder="Buscar actividad extracurricular"
          placeholderTextColor="#94A3B8"
          value={busqueda}
          onChangeText={setBusqueda}
        />
      </View>

      {/* Botón Agregar Evidencia */}
      <View style={styles.contenedorBotonAgregar}>
        <TouchableOpacity
          style={[styles.botonAgregar, { backgroundColor: isDarkMode ? '#0284C7' : '#3B82F6' }]}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add-circle-outline" size={22} color="#FFFFFF" />
          <Text style={styles.textoBotonAgregar}>Añadir evidencia</Text>
        </TouchableOpacity>
      </View>

      {/* Lista de Evidencias */}
      {cargando ? (
        <View style={styles.contenedorVacio}>
          <ActivityIndicator size="large" color={isDarkMode ? '#38BDF8' : '#3B82F6'} />
        </View>
      ) : (
        <FlatList
          data={actividadesFiltradas}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.lista}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.contenedorVacio}>
              <Ionicons name="folder-open-outline" size={56} color="#94A3B8" style={{ marginBottom: 12 }} />
              <Text style={styles.textoVacio}>No hay actividades registradas.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.tarjeta,
                { backgroundColor: isDarkMode ? '#1E293B' : '#BAE6FD' },
              ]}
            >
              <View style={styles.info}>
                <Text style={[styles.nombre, { color: isDarkMode ? '#F8FAFC' : '#0F172A' }]}>
                  {item.nombreActividad}
                </Text>
                {item.tipoActividad ? (
                  <Text style={[styles.tipo, { color: isDarkMode ? '#38BDF8' : '#0369A1' }]}>
                    {item.tipoActividad}
                  </Text>
                ) : null}
                <Text style={[styles.fecha, { color: isDarkMode ? '#94A3B8' : '#475569' }]}>
                  {new Date(item.creadoEn).toLocaleDateString('es-ES')} {'·'} {item.unidad || 'General'}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.botonEliminar,
                  { backgroundColor: isDarkMode ? '#334155' : 'rgba(255, 255, 255, 0.4)' },
                ]}
                onPress={() => manejarEliminar(item)}
              >
                <Ionicons name="trash-outline" size={20} color={isDarkMode ? '#F8FAFC' : '#0F172A'} />
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* Modal Subir Evidencia */}
      <ModalSubirEvidencia
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        titulo={`Actividad Extracurricular - ${unidadActiva}`}
        subtitulo="Registra actividades complementarias (charlas, talleres, salidas)"
        tipos={['Charla', 'Campaña', 'Salida', 'Taller', 'Otro']}
        onGuardar={manejarGuardar}
      />

      {/* Menú Lateral (Estilo Facebook) */}
      <MenuDocente
        visible={modalMenuVisible}
        onClose={() => setModalMenuVisible(false)}
        onSincronizacionCompletada={cargarActividades}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1 },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginVertical: 14,
  },
  botonIconoHeader: {
    padding: 4,
  },
  titulo: { fontSize: 20, fontWeight: '700', textAlign: 'center', flex: 1 },
  contenedorUnidades: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 16,
  },
  chipUnidad: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  textoChipUnidad: {
    fontSize: 14,
    fontWeight: '600',
  },
  contenedorBuscador: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1.5,
    borderRadius: 22,
    marginBottom: 16,
  },
  inputBuscador: { flex: 1, marginLeft: 8, fontSize: 14 },
  contenedorBotonAgregar: { alignItems: 'flex-end', paddingHorizontal: 16, marginBottom: 16 },
  botonAgregar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 6,
  },
  textoBotonAgregar: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  lista: { paddingHorizontal: 16, paddingBottom: 20 },
  tarjeta: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  info: { flex: 1, marginRight: 12 },
  botonEliminar: { padding: 6, borderRadius: 8 },
  nombre: { fontSize: 15, fontWeight: '600' },
  tipo: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  fecha: { fontSize: 12, marginTop: 4 },
  contenedorVacio: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  textoVacio: { color: '#94A3B8', textAlign: 'center', fontSize: 14 },
});