import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { Curso } from '../../src/models/Curso';
import { CursoService } from '../../src/services/cursoService';

export default function CursosScreen() {
  const { perfilDocente, cerrarSesion } = useAuth();

  const [cursosList, setCursosList] = useState<Curso[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);

  // Estados Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [ciclo, setCiclo] = useState('');
  const [semestre, setSemestre] = useState('');

  useEffect(() => {
    cargarCursos();
  }, [busqueda, perfilDocente]);

  const cargarCursos = async () => {
    if (!perfilDocente) return;
    try {
      const data = await CursoService.obtenerCursosPorDocente(perfilDocente.id, busqueda);
      setCursosList(data);
    } catch (error) {
      console.error('Error al cargar cursos:', error);
    } finally {
      setCargando(false);
    }
  };

  const manejarCrearCurso = async () => {
    if (!nombre.trim() || !ciclo.trim() || !semestre.trim()) {
      Alert.alert('Atención', 'Por favor complete el nombre, ciclo y semestre.');
      return;
    }
    if (!perfilDocente) return;

    setGuardando(true);
    try {
      await CursoService.crearCurso({
        perfilDocenteId: perfilDocente.id,
        nombre: nombre.trim(),
        codigo: codigo.trim(),
        ciclo: ciclo.trim(),
        semestre: semestre.trim(),
      });

      setNombre('');
      setCodigo('');
      setCiclo('');
      setSemestre('');
      setModalVisible(false);
      cargarCursos();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo crear el curso.');
    } finally {
      setGuardando(false);
    }
  };

  const manejarCerrarSesion = () => {
    Alert.alert('Cerrar Sesión', '¿Está seguro de que desea salir de la aplicación?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => cerrarSesion() },
    ]);
  };

  return (
    <SafeAreaView style={styles.contenedorPadre} edges={['top', 'left', 'right']}>
      {/* Botones de Acción Superiores (Perfil y Cerrar Sesión) */}
      <View style={styles.encabezadoSuperior}>
        <TouchableOpacity
          style={styles.botonIconoHeader}
          onPress={() => Alert.alert('Perfil', `Docente: ${perfilDocente?.nombreCompleto || ''}`)}
        >
          <Ionicons name="person-outline" size={24} color="#1C252C" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.botonIconoHeader} onPress={manejarCerrarSesion}>
          <Ionicons name="log-out-outline" size={26} color="#1C252C" />
        </TouchableOpacity>
      </View>

      {/* Botón Flotante + New Curso y Logo Central */}
      <View style={styles.seccionHeaderLogo}>
        <TouchableOpacity
          style={styles.botonNuevoCurso}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.textoBotonNuevo}>New Curso</Text>
        </TouchableOpacity>

        <View style={styles.contenedorLogoCursos}>
          <Image
            source={require('../../assets/images/arrendajo_curso.png')}
            style={styles.imagenLogoCursos}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* Buscador de Cursos */}
      <View style={styles.contenedorBuscador}>
        <Ionicons name="search-outline" size={20} color="#7A8B93" style={styles.iconoBuscador} />
        <TextInput
          style={styles.entradaBuscador}
          placeholder="Buscar curso"
          placeholderTextColor="#8E9AA0"
          value={busqueda}
          onChangeText={setBusqueda}
        />
      </View>

      {/* Lista de Cursos */}
      {cargando ? (
        <ActivityIndicator size="large" color="#1E88E5" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={cursosList}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listaContenedor}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.vacioContenedor}>
              <Text style={styles.textoVacio}>No tienes cursos registrados aún.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.tarjetaCurso} activeOpacity={0.8}>
              <Text style={styles.nombreCurso}>{item.nombre}</Text>
              {(item.ciclo || item.semestre || item.codigo) && (
                <Text style={styles.detallesCurso}>
                  {item.ciclo ? `${item.ciclo} Ciclo` : ''}{' '}
                  {item.semestre ? `• ${item.semestre}` : ''}{' '}
                  {item.codigo ? `• ${item.codigo}` : ''}
                </Text>
              )}
            </TouchableOpacity>
          )}
        />
      )}

      {/* Modal Crear Curso */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalFondo}>
          <View style={styles.modalTarjeta}>
            <Text style={styles.modalTitulo}>Crear Nuevo Curso</Text>

            <Text style={styles.etiqueta}>Nombre de la Asignatura *</Text>
            <TextInput
              style={styles.entradaTextoModal}
              value={nombre}
              onChangeText={setNombre}
              placeholder="Ej. Desarrollo de aplicaciones Móviles"
            />

            <View style={styles.filaCampos}>
              <View style={{ flex: 1, marginRight: 6 }}>
                <Text style={styles.etiqueta}>Ciclo *</Text>
                <TextInput
                  style={styles.entradaTextoModal}
                  value={ciclo}
                  onChangeText={setCiclo}
                  placeholder="Ej. VIII"
                />
              </View>

              <View style={{ flex: 1, marginLeft: 6 }}>
                <Text style={styles.etiqueta}>Semestre *</Text>
                <TextInput
                  style={styles.entradaTextoModal}
                  value={semestre}
                  onChangeText={setSemestre}
                  placeholder="Ej. 2026-I"
                />
              </View>
            </View>

            <Text style={styles.etiqueta}>Código de Curso (Opcional)</Text>
            <TextInput
              style={styles.entradaTextoModal}
              value={codigo}
              onChangeText={setCodigo}
              placeholder="Ej. INF-302"
            />

            <View style={styles.modalBotones}>
              <TouchableOpacity
                style={[styles.botonModal, styles.botonCancelar]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.textoBotonCancelar}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.botonModal, styles.botonGuardar]}
                onPress={manejarCrearCurso}
                disabled={guardando}
              >
                {guardando ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.textoBotonGuardar}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedorPadre: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
  },
  encabezadoSuperior: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
  },
  botonIconoHeader: {
    padding: 6,
  },
  seccionHeaderLogo: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 10,
  },
  botonNuevoCurso: {
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2679A8',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  textoBotonNuevo: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 4,
  },
  contenedorLogoCursos: {
    width: '100%',
    height: 130,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  imagenLogoCursos: {
    width: '85%',
    height: '100%',
  },
  contenedorBuscador: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: '#388EB2',
    borderRadius: 25,
    paddingHorizontal: 16,
    height: 46,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  iconoBuscador: {
    marginRight: 10,
  },
  entradaBuscador: {
    flex: 1,
    fontSize: 15,
    color: '#1C252C',
  },
  listaContenedor: {
    paddingBottom: 20,
  },
  tarjetaCurso: {
    backgroundColor: '#9DE0FF',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 14,
    alignItems: 'center',
  },
  nombreCurso: {
    fontSize: 16,
    fontWeight: '600',
    color: '#002840',
    textAlign: 'center',
  },
  detallesCurso: {
    fontSize: 12,
    color: '#1B5270',
    marginTop: 4,
  },
  vacioContenedor: {
    alignItems: 'center',
    marginTop: 50,
  },
  textoVacio: {
    color: '#8E9AA0',
    fontSize: 15,
  },
  modalFondo: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalTarjeta: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
  },
  modalTitulo: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C252C',
    marginBottom: 16,
  },
  etiqueta: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5B63',
    marginBottom: 4,
  },
  entradaTextoModal: {
    backgroundColor: '#F2F5F7',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    fontSize: 14,
    color: '#1C252C',
  },
  filaCampos: {
    flexDirection: 'row',
  },
  modalBotones: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    gap: 10,
  },
  botonModal: {
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  botonCancelar: {
    backgroundColor: '#E5E9EB',
  },
  botonGuardar: {
    backgroundColor: '#1E88E5',
  },
  textoBotonCancelar: {
    color: '#334148',
    fontWeight: '600',
  },
  textoBotonGuardar: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});