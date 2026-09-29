import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CursoCard } from '../../src/components/cursos/CursoCard';
import { ModalCrearCurso } from '../../src/components/modals/ModalCrearCurso';
import { ModalOpcionesCurso } from '../../src/components/modals/ModalOpcionesCurso';
import { useAuth } from '../../src/context/AuthContext';
import { Curso } from '../../src/models/Curso';
import { CursoService } from '../../src/services/cursoService';

export default function CursosScreen() {
  const router = useRouter();
  const { perfilDocente, cerrarSesion } = useAuth();

  const [cursosList, setCursosList] = useState<Curso[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);

  // Modales
  const [modalCrearVisible, setModalCrearVisible] = useState(false);
  const [modalOpcionesVisible, setModalOpcionesVisible] = useState(false);
  const [cursoSeleccionado, setCursoSeleccionado] = useState<Curso | null>(null);

  const cargarCursos = useCallback(async () => {
    try {
      setCargando(true);
      // Usar perfilDocente?.id o recurrir al id sembrado si no hay sesión
      const docenteId = perfilDocente?.id || 'perfil_default';
      const data = await CursoService.obtenerCursosPorDocente(docenteId, busqueda);
      setCursosList(data);
    } catch (error) {
      console.error('Error al cargar cursos:', error);
    } finally {
      // Garantiza que la pantalla deje de cargar siempre
      setCargando(false);
    }
  }, [busqueda, perfilDocente]);

  useEffect(() => {
    cargarCursos();
  }, [cargarCursos]);

  const manejarCrearCurso = async (datos: {
    nombre: string;
    codigo: string;
    ciclo: string;
    semestre: string;
  }) => {
    const docenteId = perfilDocente?.id || 'perfil_default';
    try {
      await CursoService.crearCurso({
        perfilDocenteId: docenteId,
        ...datos,
      });
      cargarCursos();
    } catch (error) {
      Alert.alert('Error', 'No se pudo crear el curso en la base de datos.');
    }
  };

  const manejarActualizarCurso = async (
    cursoId: string,
    datos: { nombre: string; codigo: string; ciclo: string; semestre: string }
  ) => {
    await CursoService.actualizarCurso(cursoId, datos);
    if (cursoSeleccionado) {
      setCursoSeleccionado({ ...cursoSeleccionado, ...datos });
    }
    cargarCursos();
  };

  const manejarEliminarCurso = (curso: Curso) => {
    Alert.alert(
      'Eliminar Curso',
      `¿Está seguro de que desea eliminar "${curso.nombre}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await CursoService.eliminarCurso(curso.id);
              setModalOpcionesVisible(false);
              setCursoSeleccionado(null);
              cargarCursos();
              Alert.alert('Eliminado', 'El curso se ha eliminado correctamente.');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'No se pudo eliminar el curso.');
            }
          },
        },
      ]
    );
  };

  const irAEvidenciasCurso = (curso: Curso) => {
    router.push({
      pathname: '/curso/[id]',
      params: { id: curso.id, nombre: curso.nombre },
    });
  };

  const manejarIrAGenerarReporte = (cursoId: string) => {
    setModalOpcionesVisible(false);
    setCursoSeleccionado(null);
    router.push({
      pathname: '/(tabs)/two',
      params: { cursoId },
    });
  };

  const manejarCerrarSesion = () => {
    Alert.alert('Cerrar Sesión', '¿Está seguro de que desea salir de la aplicación?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => cerrarSesion() },
    ]);
  };

  return (
    <SafeAreaView style={styles.contenedorPadre} edges={['top', 'left', 'right']}>
      {/* ENCABEZADO PRINCIPAL */}
      <View style={styles.encabezadoSuperior}>
        <TouchableOpacity
          style={styles.botonIconoHeader}
          onPress={() => Alert.alert('Perfil', `Docente: ${perfilDocente?.nombreCompleto || 'Docente General'}`)}
        >
          <Ionicons name="person-outline" size={24} color="#1C252C" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.botonIconoHeader} onPress={manejarCerrarSesion}>
          <Ionicons name="log-out-outline" size={26} color="#1C252C" />
        </TouchableOpacity>
      </View>

      <View style={styles.seccionHeaderLogo}>
        <TouchableOpacity
          style={styles.botonNuevoCurso}
          onPress={() => setModalCrearVisible(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.textoBotonNuevo}>Nuevo Curso</Text>
        </TouchableOpacity>

        <View style={styles.contenedorLogoCursos}>
          <Image
            source={require('../../assets/images/arrendajo_curso.png')}
            style={styles.imagenLogoCursos}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* BUSCADOR */}
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

      {/* LISTADO DE CURSOS */}
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
            <CursoCard
              curso={item}
              onPress={() => irAEvidenciasCurso(item)}
              onOpenOptions={() => {
                setCursoSeleccionado(item);
                setModalOpcionesVisible(true);
              }}
            />
          )}
        />
      )}

      {/* MODAL CREAR CURSO */}
      <ModalCrearCurso
        visible={modalCrearVisible}
        onClose={() => setModalCrearVisible(false)}
        onSubmit={manejarCrearCurso}
      />

      {/* MODAL OPCIONES Y EDICIÓN DE CURSO */}
      <ModalOpcionesCurso
        visible={modalOpcionesVisible}
        curso={cursoSeleccionado}
        onClose={() => {
          setModalOpcionesVisible(false);
          setCursoSeleccionado(null);
        }}
        onUpdate={manejarActualizarCurso}
        onDelete={manejarEliminarCurso}
        onGenerarReporte={manejarIrAGenerarReporte}
      />
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
  vacioContenedor: {
    alignItems: 'center',
    marginTop: 50,
  },
  textoVacio: {
    color: '#8E9AA0',
    fontSize: 15,
  },
});