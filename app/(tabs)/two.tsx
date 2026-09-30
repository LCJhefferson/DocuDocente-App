// Pestaña "Informes": historial de informes y formulario para crear uno nuevo
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FormularioInforme } from '../../src/components/informes/FormularioInforme';
import { useInformes } from '../../src/hooks/useInformes';
import { Informe } from '../../src/models/Informe';
import { InformeService } from '../../src/services/informeService';
import { formatearFecha } from '../../src/utils/fechas';

interface CursoInforme {
  id: string;
  nombre: string;
  ciclo: string;
  semestre: string;
}

export default function InformesScreen() {
  const router = useRouter();
  // cursoId llega cuando se toca "Generar Reporte" en las opciones de un curso
  const { cursoId } = useLocalSearchParams<{ cursoId?: string }>();
  const { informes, cargando, cargarInformes, crearInforme, descargarInforme, generandoPdf } = useInformes();
  const [curso, setCurso] = useState<CursoInforme | null>(null);
  const [busqueda, setBusqueda] = useState('');

  // Filtra por nombre del curso o por número de informe
  const texto = busqueda.trim().toLowerCase();
  const informesFiltrados = informes.filter(
    (i) => i.nombreCurso.toLowerCase().includes(texto) || i.numeroInforme.toLowerCase().includes(texto)
  );

  const manejarDescargar = async (informeId: string) => {
    try {
      await descargarInforme(informeId);
    } catch (error) {
      console.error('[Historial] Error al descargar:', error);
      Alert.alert('Error', 'No se pudo generar el PDF.');
    }
  };

  // Recarga el historial cada vez que se entra a la pestaña
  useFocusEffect(
    useCallback(() => {
      cargarInformes();
    }, [cargarInformes])
  );

  // Si viene un curso, lo busca para prellenar el formulario
  useEffect(() => {
    if (!cursoId) {
      setCurso(null);
      return;
    }
    InformeService.obtenerCurso(cursoId).then(setCurso);
  }, [cursoId]);

  const cerrarFormulario = () => {
    setCurso(null);
    router.setParams({ cursoId: undefined });
  };

  // ---- Modo formulario ----
  if (curso) {
    return (
      <SafeAreaView style={styles.contenedor} edges={['top', 'left', 'right']}>
        <FormularioInforme
          curso={curso}
          onCancelar={cerrarFormulario}
          onGuardar={async (datos, unidades) => {
            const id = await crearInforme(datos, unidades);
            cerrarFormulario();
            router.push({ pathname: '/informe/[id]', params: { id } }); // abre la vista previa
          }}
        />
      </SafeAreaView>
    );
  }

  // ---- Modo historial (diseño Figma: "Historial") ----
  return (
    <SafeAreaView style={styles.contenedor} edges={['top', 'left', 'right']}>
      {/* HEADER: título centrado + perfil */}
      <View style={styles.header}>
        <View style={styles.espacioIcono} />
        <Text style={styles.titulo}>Historial</Text>
        <TouchableOpacity style={styles.espacioIcono} onPress={() => router.push('/modal')}>
          <Ionicons name="person-outline" size={24} color="#0F172A" />
        </TouchableOpacity>
      </View>

      {/* BUSCADOR */}
      <View style={styles.buscador}>
        <Ionicons name="search-outline" size={20} color="#475569" />
        <TextInput
          style={styles.inputBuscador}
          placeholder="buscar en el historial"
          placeholderTextColor="#6B7280"
          value={busqueda}
          onChangeText={setBusqueda}
        />
      </View>

      {cargando ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#38BDF8" />
      ) : (
        <FlatList
          data={informesFiltrados}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.lista}
          renderItem={({ item }) => (
            <TarjetaInforme
              informe={item}
              deshabilitado={generandoPdf}
              onPress={() => router.push({ pathname: '/informe/[id]', params: { id: item.id } })}
              onDescargar={() => manejarDescargar(item.id)}
            />
          )}
          ListEmptyComponent={
            // Estado vacío: distingue "no hay informes" de "la búsqueda no encontró nada"
            <View style={styles.vacio}>
              <Ionicons name={busqueda ? 'search-outline' : 'document-text-outline'} size={48} color="#94A3B8" />
              <Text style={styles.textoVacio}>{busqueda ? 'Sin resultados' : 'Aún no tienes informes'}</Text>
              <Text style={styles.ayudaVacio}>
                {busqueda
                  ? `No hay informes que coincidan con "${busqueda}".`
                  : 'Ve a la pestaña Curso, toca los tres puntos de un curso y elige "Generar Reporte".'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

interface PropsTarjeta {
  informe: Informe;
  deshabilitado: boolean;
  onPress: () => void;
  onDescargar: () => void;
}

const TarjetaInforme = ({ informe, deshabilitado, onPress, onDescargar }: PropsTarjeta) => (
  <TouchableOpacity style={styles.tarjeta} onPress={onPress}>
    <View style={{ flex: 1 }}>
      <Text style={styles.curso} numberOfLines={1}>{informe.nombreCurso}</Text>
      <Text style={styles.fecha}>{formatearFecha(informe.creadoEn)}</Text>
    </View>
    {/* Botón de descarga directa (sin abrir la vista previa) */}
    <TouchableOpacity style={styles.botonDescargar} onPress={onDescargar} disabled={deshabilitado}>
      <Ionicons name="arrow-down" size={22} color={deshabilitado ? '#9CA3AF' : '#111827'} />
    </TouchableOpacity>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  espacioIcono: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  titulo: { fontSize: 22, fontWeight: '700', color: '#111827' },
  buscador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E5E7EB',
  },
  inputBuscador: { flex: 1, fontSize: 15, color: '#111827' },
  lista: { padding: 16, paddingTop: 24, gap: 10, flexGrow: 1 },
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D9D9D9',
    borderRadius: 22,
    paddingVertical: 8,
    paddingLeft: 16,
    paddingRight: 8,
  },
  curso: { fontSize: 15, color: '#111827' },
  fecha: { fontSize: 12, color: '#374151', marginTop: 4 },
  botonDescargar: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  vacio: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 8 },
  textoVacio: { fontSize: 16, fontWeight: '600', color: '#111827' },
  ayudaVacio: { fontSize: 13, color: '#6B7280', textAlign: 'center' },
});
