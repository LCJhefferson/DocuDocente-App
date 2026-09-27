// app/(tabs)/index.tsx
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { Curso } from '../../src/models/Curso';
import { CursoService } from '../../src/services/cursoService';

export default function CursosScreen() {
  const { perfilDocente, cerrarSesion } = useAuth();
  
  const [cursosList, setCursosList] = useState<Curso[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);

  // Estado del Modal de Creación
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
        nombre,
        codigo,
        ciclo,
        semestre,
      });

      setNombre('');
      setCodigo('');
      setModalVisible(false);
      cargarCursos();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo crear el curso.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <View style={styles.contenedorPadre}>
      {/* Barra de Encabezado Superior */}
      <View style={styles.encabezadoSuperior}>
        <TouchableOpacity style={styles.botonIcono}>
          <Ionicons name="menu-outline" size={28} color="rgb(0, 0, 0)" />
        </TouchableOpacity>



       
      </View>

      {/* Buscador */}
      <View style={styles.contenedorBuscador}>
        <Ionicons name="search-outline" size={20} color="#8e8e93" style={styles.iconoBuscador} />
        <TextInput
          style={styles.entradaBuscador}
          placeholder="Buscar curso"
          placeholderTextColor="#8e8e93"
          value={busqueda}
          onChangeText={setBusqueda}
        />
      </View>

      {/* Botón Nuevo Curso */}
      <View style={styles.contenedorAccion}>
        <TouchableOpacity style={styles.botonNuevoCurso} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={18} color="#ffffff" />
          <Text style={styles.textoBotonNuevo}>Nuevo Curso</Text>
        </TouchableOpacity>
      </View>

      {/* Lista de Cursos */}
      {cargando ? (
        <ActivityIndicator size="large" color="#003366" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={cursosList}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listaContenedor}
          ListEmptyComponent={
            <View style={styles.vacioContenedor}>
              <Text style={styles.textoVacio}>No tienes cursos registrados aún.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.tarjetaCurso} activeOpacity={0.7}>
              <View style={styles.infoCurso}>
                <Text style={styles.nombreCurso}>{item.nombre}</Text>
                <Text style={styles.detallesCurso}>
                  {item.ciclo} Ciclo • {item.semestre} {item.codigo ? `• ${item.codigo}` : ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#c7c7cc" />
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
            />

            <View style={styles.filaCampos}>
              <View style={{ flex: 1, marginRight: 6 }}>
                <Text style={styles.etiqueta}>Ciclo *</Text>
                <TextInput
                  style={styles.entradaTextoModal}
                 
                  value={ciclo}
                  onChangeText={setCiclo}
                />
              </View>

              <View style={{ flex: 1, marginLeft: 6 }}>
                <Text style={styles.etiqueta}>Semestre *</Text>
                <TextInput
                  style={styles.entradaTextoModal}
                  
                  value={semestre}
                  onChangeText={setSemestre}
                />
              </View>
            </View>

            <Text style={styles.etiqueta}>Código de Curso (Opcional)</Text>
            <TextInput
              style={styles.entradaTextoModal}

              value={codigo}
              onChangeText={setCodigo}
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
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.textoBotonGuardar}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedorPadre: { flex: 1, backgroundColor: '#ffffff', paddingTop: 50, paddingHorizontal: 20 },
  encabezadoSuperior: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  tituloHeader: { fontSize: 24, fontWeight: '800', color: '#000000' },
  botonIcono: { padding: 4 },
  contenedorBuscador: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef0f2',
    borderRadius: 25,
    paddingHorizontal: 15,
    height: 46,
    marginBottom: 16,
  },
  iconoBuscador: { marginRight: 8 },
  entradaBuscador: { flex: 1, fontSize: 15, color: '#1c1c1e' },
  contenedorAccion: { alignItems: 'flex-end', marginBottom: 16 },
  botonNuevoCurso: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  textoBotonNuevo: { color: '#ffffff', fontWeight: '700', fontSize: 13, marginLeft: 4 },
  listaContenedor: { paddingBottom: 30 },
  tarjetaCurso: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef0f2',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  infoCurso: { flex: 1 },
  nombreCurso: { fontSize: 15, fontWeight: '600', color: '#1c1c1e', marginBottom: 2 },
  detallesCurso: { fontSize: 12, color: '#6e6e73' },
  vacioContenedor: { alignItems: 'center', marginTop: 50 },
  textoVacio: { color: '#8e8e93', fontSize: 15 },
  // Modal Styles
  modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
  modalTarjeta: { backgroundColor: '#ffffff', borderRadius: 20, padding: 20 },
  modalTitulo: { fontSize: 18, fontWeight: '700', color: '#000000', marginBottom: 16 },
  etiqueta: { fontSize: 12, fontWeight: '600', color: '#3c3c43', marginBottom: 4 },
  entradaTextoModal: {
    backgroundColor: '#f2f2f7',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    fontSize: 14,
  },
  filaCampos: { flexDirection: 'row' },
  modalBotones: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, gap: 10 },
  botonModal: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 8 },
  botonCancelar: { backgroundColor: '#e5e5ea' },
  botonGuardar: { backgroundColor: '#003366' },
  textoBotonCancelar: { color: '#1c1c1e', fontWeight: '600' },
  textoBotonGuardar: { color: '#ffffff', fontWeight: '600' },
});