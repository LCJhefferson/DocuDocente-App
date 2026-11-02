import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
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
import { MenuDocente } from '../../src/components/MenuDocente';
import { ModalCrearCurso } from '../../src/components/modals/ModalCrearCurso';
import { ModalOpcionesCurso } from '../../src/components/modals/ModalOpcionesCurso';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { Curso } from '../../src/models/Curso';
import { CursoService } from '../../src/services/cursoService';

export default function CursosScreen() {
  const router = useRouter();
  const { perfilDocente } = useAuth(); // Ya no necesitamos cerrarSesion suelto aquí
  const { isDarkMode } = useTheme();

  const [cursosList, setCursosList] = useState<Curso[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);

  // Modales
  const [modalCrearVisible, setModalCrearVisible] = useState(false);
  const [modalOpcionesVisible, setModalOpcionesVisible] = useState(false);
  const [modalMenuVisible, setModalMenuVisible] = useState(false); // Estado para el menú lateral
  const [cursoSeleccionado, setCursoSeleccionado] = useState<Curso | null>(null);

  const cargarCursos = useCallback(async () => {
    try {
      setCargando(true);
      const docenteId = perfilDocente?.id || 'perfil_default';
      const data = await CursoService.obtenerCursosPorDocente(docenteId, busqueda);
      setCursosList(data);
    } catch (error) {
      console.error('Error al cargar cursos:', error);
    } finally {
      setCargando(false);
    }
  }, [busqueda, perfilDocente]);

  useEffect(() => {
    cargarCursos();
  }, [cargarCursos]);

  useFocusEffect(
    useCallback(() => {
      cargarCursos();
    }, [cargarCursos])
  );

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
              await CursoService.eliminarCurso(curso.id, perfilDocente?.id);
              setModalOpcionesVisible(false);
              setCursoSeleccionado(null);
              cargarCursos();
              Alert.alert('Eliminado', 'El curso y sus evidencias se han eliminado correctamente.');
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

  return (
    <SafeAreaView
      style={[
        styles.contenedorPadre,
        { backgroundColor: isDarkMode ? '#0F172A' : '#FFFFFF' },
      ]}
      edges={['top', 'left', 'right', 'bottom']}
    >
      {/* ENCABEZADO SUPERIOR: SOLO EL BOTÓN DE LAS 3 RAYAS */}
      <View style={styles.encabezadoSuperior}>
        <TouchableOpacity
          style={styles.botonIconoHeader}
          onPress={() => setModalMenuVisible(true)}
        >
          <Ionicons
            name="menu"
            size={28}
            color={isDarkMode ? '#F8FAFC' : '#1C252C'}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.seccionHeaderLogo}>
        <View style={styles.contenedorLogoCursos}>
          <Image
            source={require('../../assets/images/arrendajo_curso.png')}
            style={styles.imagenLogoCursos}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* BUSCADOR */}
      <View
        style={[
          styles.contenedorBuscador,
          {
            backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
            borderColor: isDarkMode ? '#334155' : '#388EB2',
          },
        ]}
      >
        <Ionicons name="search-outline" size={20} color="#7A8B93" style={styles.iconoBuscador} />
        <TextInput
          style={[
            styles.entradaBuscador,
            { color: isDarkMode ? '#F8FAFC' : '#1C252C' },
          ]}
          placeholder="Buscar curso"
          placeholderTextColor="#8E9AA0"
          value={busqueda}
          onChangeText={setBusqueda}
        />
      </View>

      {/* LISTADO DE CURSOS */}
      {cargando ? (
        <ActivityIndicator
          size="large"
          color={isDarkMode ? '#38BDF8' : '#1E88E5'}
          style={{ marginTop: 40 }}
        />
      ) : (
        <FlatList
          data={cursosList}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listaContenedor}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.vacioContenedor}>
              <Text style={[styles.textoVacio, { color: isDarkMode ? '#94A3B8' : '#8E9AA0' }]}>
                No tienes cursos registrados aún.
              </Text>
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

      {/* BOTÓN FLOTANTE NUEVO CURSO */}
      <TouchableOpacity
        style={[
          styles.botonNuevoCursoFlotante,
          { backgroundColor: isDarkMode ? '#0284C7' : '#2679A8' },
        ]}
        onPress={() => setModalCrearVisible(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={22} color="#FFFFFF" />
        <Text style={styles.textoBotonNuevo}>Nuevo Curso</Text>
      </TouchableOpacity>

      {/* MENÚ LATERAL DERECHO (ESTILO FACEBOOK) */}
      <MenuDocente
        visible={modalMenuVisible}
        onClose={() => setModalMenuVisible(false)}
        onSincronizacionCompletada={cargarCursos}
      />

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
    paddingHorizontal: 20,
  },
  encabezadoSuperior: {
    flexDirection: 'row',
    justifyContent: 'flex-start', // Alineado a la izquierda para el menú de 3 rayas
    alignItems: 'center',
    marginTop: 6,
  },
  botonIconoHeader: {
    padding: 6,
  },
  seccionHeaderLogo: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 10,
  },
  botonNuevoCursoFlotante: {
    position: 'absolute',
    bottom: 25,
    right: 20,
    zIndex: 99,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 15,
    borderRadius: 30,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  textoBotonNuevo: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
    marginLeft: 8,
  },
  contenedorLogoCursos: {
    width: '100%',
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  imagenLogoCursos: {
    width: '80%',
    height: '100%',
  },
  contenedorBuscador: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderRadius: 25,
    paddingHorizontal: 16,
    height: 46,
    marginBottom: 16,
  },
  iconoBuscador: {
    marginRight: 10,
  },
  entradaBuscador: {
    flex: 1,
    fontSize: 15,
  },
  listaContenedor: {
    paddingBottom: 90,
  },
  vacioContenedor: {
    alignItems: 'center',
    marginTop: 50,
  },
  textoVacio: {
    fontSize: 15,
  },
});