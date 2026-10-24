import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
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
import { ModalPerfilDocente } from '../../src/components/modals/ModalPerfilDocente';
import { ModalSubirEvidencia } from '../../src/components/modals/ModalSubirEvidencia';
import { useAuth } from '../../src/context/AuthContext';
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
  const { perfilDocente, cuentaId, cerrarSesion } = useAuth();

  const [actividades, setActividades] = useState<EvidenciaExtracurricular[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [unidadActiva, setUnidadActiva] = useState<string>('Todas');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalPerfilVisible, setModalPerfilVisible] = useState(false);
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
        cursoId: undefined, // Explícitamente no asignado a curso
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

  const manejarCerrarSesion = () => {
    Alert.alert('Cerrar Sesión', '¿Está seguro de que desea salir de la aplicación?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => cerrarSesion() },
    ]);
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

  // Filtrado optimizado por búsqueda y unidad activa
  const actividadesFiltradas = actividades.filter((a) => {
    const coincideBusqueda = a.nombreActividad?.toLowerCase().includes(busqueda.toLowerCase());
    const coincideUnidad =
      unidadActiva === 'Todas' || !a.unidad || a.unidad === unidadActiva;
    return coincideBusqueda && coincideUnidad;
  });

  return (
    <SafeAreaView style={styles.contenedor} edges={['top', 'left', 'right']}>
      {/* Encabezado Superior */}
      <View style={styles.encabezado}>
        <Text style={styles.titulo}>Extracurriculares</Text>
        <View style={styles.iconosEncabezado}>
          <TouchableOpacity onPress={() => setModalPerfilVisible(true)}>
            <Ionicons name="person-outline" size={24} color="#1C252C" />
          </TouchableOpacity>
          <TouchableOpacity onPress={manejarCerrarSesion}>
            <Ionicons name="log-out-outline" size={26} color="#1C252C" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Selector de Unidades */}
      <View style={styles.contenedorUnidades}>
        {UNIDADES.map((unidad) => {
          const esActiva = unidadActiva === unidad;
          return (
            <TouchableOpacity
              key={unidad}
              style={[styles.chipUnidad, esActiva && styles.chipUnidadActivo]}
              onPress={() => setUnidadActiva(unidad)}
            >
              <Text style={[styles.textoChipUnidad, esActiva && styles.textoChipUnidadActivo]}>
                {unidad}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Buscador */}
      <View style={styles.contenedorBuscador}>
        <Ionicons name="search-outline" size={20} color="#94A3B8" />
        <TextInput
          style={styles.inputBuscador}
          placeholder="Buscar actividad extracurricular"
          placeholderTextColor="#94A3B8"
          value={busqueda}
          onChangeText={setBusqueda}
        />
      </View>

      {/* Botón Agregar Evidencia */}
      <View style={styles.contenedorBotonAgregar}>
        <TouchableOpacity style={styles.botonAgregar} onPress={() => setModalVisible(true)}>
          <Ionicons name="add-circle-outline" size={22} color="#FFFFFF" />
          <Text style={styles.textoBotonAgregar}>Añadir evidencia</Text>
        </TouchableOpacity>
      </View>

      {/* Lista de Evidencias */}
      {cargando ? (
        <View style={styles.contenedorVacio}>
          <ActivityIndicator size="large" color="#3B82F6" />
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
            <View style={styles.tarjeta}>
              <View style={styles.info}>
                <Text style={styles.nombre}>{item.nombreActividad}</Text>
                {item.tipoActividad ? <Text style={styles.tipo}>{item.tipoActividad}</Text> : null}
                <Text style={styles.fecha}>
                  {new Date(item.creadoEn).toLocaleDateString('es-ES')} · {item.unidad || 'General'}
                </Text>
              </View>
              <TouchableOpacity style={styles.botonEliminar} onPress={() => manejarEliminar(item)}>
                <Ionicons name="trash-outline" size={20} color="#0F172A" />
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

      {/* Modal Perfil Docente y Configuración */}
      <ModalPerfilDocente
        visible={modalPerfilVisible}
        onClose={() => setModalPerfilVisible(false)}
        onSincronizacionCompletada={cargarActividades}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#FFFFFF' },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginVertical: 14,
  },
  titulo: { fontSize: 22, fontWeight: '700', color: '#0F172A' },
  iconosEncabezado: { flexDirection: 'row', alignItems: 'center', gap: 16 },
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
    backgroundColor: '#F1F5F9',
  },
  chipUnidadActivo: {
    backgroundColor: '#BAE6FD',
  },
  textoChipUnidad: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  textoChipUnidadActivo: {
    color: '#0369A1',
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
    marginBottom: 16,
  },
  inputBuscador: { flex: 1, marginLeft: 8, fontSize: 14, color: '#0F172A' },
  contenedorBotonAgregar: { alignItems: 'flex-end', paddingHorizontal: 16, marginBottom: 16 },
  botonAgregar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 6,
  },
  textoBotonAgregar: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  lista: { paddingHorizontal: 16, paddingBottom: 20 },
  tarjeta: {
    backgroundColor: '#BAE6FD',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  info: { flex: 1, marginRight: 12 },
  botonEliminar: { padding: 6, borderRadius: 8, backgroundColor: 'rgba(255, 255, 255, 0.4)' },
  nombre: { fontSize: 15, fontWeight: '600', color: '#0F172A' },
  tipo: { fontSize: 13, color: '#0369A1', fontWeight: '500', marginTop: 2 },
  fecha: { fontSize: 12, color: '#475569', marginTop: 4 },
  contenedorVacio: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  textoVacio: { color: '#94A3B8', textAlign: 'center', fontSize: 14 },
});