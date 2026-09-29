import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ModalSubirEvidencia } from '../../src/components/modals/ModalSubirEvidencia';
import { useAuth } from '../../src/context/AuthContext';
import { evidenciaService } from '../../src/services/evidenciaService';

export default function ExtracurricularesScreen() {
  const { perfilDocente, cerrarSesion } = useAuth();
  const [actividades, setActividades] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const cargarActividades = async () => {
    const resultado = await evidenciaService.obtenerExtracurriculares();
    setActividades(resultado);
  };

  useEffect(() => {
    cargarActividades();
  }, []);

  const manejarGuardar = async (datos: {
    nombreActividad: string;
    descripcion: string;
    tipoActividad: string;
    archivo: { uri: string; name: string; type?: string } | null;
  }) => {
    try {
      await evidenciaService.crearEvidencia({
        tipoGeneral: 'EXTRACURRICULAR',
        nombreActividad: datos.nombreActividad,
        descripcion: datos.descripcion,
        tipoActividad: datos.tipoActividad,
        rutaArchivoLocal: datos.archivo?.uri,
        tipoArchivo: datos.archivo?.type === 'application/pdf' ? 'PDF' : 'IMAGE',
      });
      cargarActividades();
       } catch (error) {
      Alert.alert('Error', 'No se pudo guardar la actividad.');
    }
  };

  const manejarCerrarSesion = () => {
    Alert.alert('Cerrar Sesión', '¿Está seguro de que desea salir de la aplicación?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => cerrarSesion() },
    ]);
  };
    const manejarEliminar = (actividad: any) => {
    Alert.alert('Eliminar actividad', `¿Eliminar "${actividad.nombreActividad}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await evidenciaService.eliminarEvidencia(actividad.id);
            cargarActividades();
          } catch (error) {
            Alert.alert('Error', 'No se pudo eliminar la actividad.');
          }
        },
      },
    ]);
  };
    const actividadesFiltradas = actividades.filter((a) =>
    a.nombreActividad.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.contenedor} edges={['top', 'left', 'right']}>
            <View style={styles.encabezado}>
        <Text style={styles.titulo}>Extracurriculares</Text>
        <View style={styles.iconosEncabezado}>
          <TouchableOpacity
            onPress={() =>
              Alert.alert('Perfil', `Docente: ${perfilDocente?.nombreCompleto || 'Docente General'}`)
            }
          >
            <Ionicons name="person-outline" size={24} color="#1C252C" />
          </TouchableOpacity>
          <TouchableOpacity onPress={manejarCerrarSesion}>
            <Ionicons name="log-out-outline" size={26} color="#1C252C" />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.contenedorBuscador}>
        <Ionicons name="search-outline" size={20} color="#94A3B8" />
        <TextInput
          style={styles.inputBuscador}
          placeholder="Buscar en el historial"
          placeholderTextColor="#94A3B8"
          value={busqueda}
          onChangeText={setBusqueda}
        />
      </View>
        <View style={styles.contenedorBotonAgregar}>
        <TouchableOpacity style={styles.botonAgregar} onPress={() => setModalVisible(true)}>
          <Ionicons name="add-circle-outline" size={22} color="#FFFFFF" />
          <Text style={styles.textoBotonAgregar}>Añadir evidencia</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={actividadesFiltradas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          <Text style={styles.textoVacio}>No hay actividades extracurriculares registradas.</Text>
        }
        renderItem={({ item }) => (
        <View style={styles.tarjeta}>
          <View style={styles.info}>
            <Text style={styles.nombre}>{item.nombreActividad}</Text>
              <Text style={styles.fecha}>{new Date(item.creadoEn).toLocaleDateString('es-ES')}</Text>
            </View>
            <TouchableOpacity style={styles.botonEliminar} onPress={() => manejarEliminar(item)}>
              <Ionicons name="trash-outline" size={20} color="#0F172A" />
            </TouchableOpacity>
          </View>
        )}
      />
      
      <ModalSubirEvidencia
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        titulo="Actividades Extracurriculares"
        subtitulo="Registra actividades que no son clases"
        tipos={['Charla', 'Campaña', 'Salida', 'Otro']}
        onGuardar={manejarGuardar}
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
  lista: { paddingHorizontal: 16 },
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
  fecha: { fontSize: 12, color: '#475569', marginTop: 4 },
  textoVacio: { color: '#94A3B8', textAlign: 'center', marginTop: 40 },
});