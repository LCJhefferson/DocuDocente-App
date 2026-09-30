// Pestaña "Informes": historial de informes y formulario para crear uno nuevo
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FormularioInforme } from '../../src/components/informes/FormularioInforme';
import { useInformes } from '../../src/hooks/useInformes';
import { Informe } from '../../src/models/Informe';
import { InformeService } from '../../src/services/informeService';

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
  const { informes, cargando, cargarInformes, crearInforme } = useInformes();
  const [curso, setCurso] = useState<CursoInforme | null>(null);

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

  // ---- Modo historial ----
  return (
    <SafeAreaView style={styles.contenedor} edges={['top', 'left', 'right']}>
      <Text style={styles.titulo}>Informes</Text>
      <Text style={styles.subtitulo}>Tus informes generados</Text>

      {cargando ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#38BDF8" />
      ) : (
        <FlatList
          data={informes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.lista}
          renderItem={({ item }) => <TarjetaInforme informe={item} onPress={() => router.push({ pathname: '/informe/[id]', params: { id: item.id } })} />}
          ListEmptyComponent={
            // Estado vacío: explica cómo crear el primer informe
            <View style={styles.vacio}>
              <Ionicons name="document-text-outline" size={48} color="#94A3B8" />
              <Text style={styles.textoVacio}>Aún no tienes informes.</Text>
              <Text style={styles.ayudaVacio}>
                Ve a la pestaña Curso, toca los tres puntos de un curso y elige "Generar Reporte".
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const TarjetaInforme = ({ informe, onPress }: { informe: Informe; onPress: () => void }) => (
  <TouchableOpacity style={styles.tarjeta} onPress={onPress}>
    <View style={styles.iconoTarjeta}>
      <Ionicons name="document-text" size={22} color="#0F172A" />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.numero}>Informe N° {informe.numeroInforme}</Text>
      <Text style={styles.curso} numberOfLines={1}>{informe.nombreCurso}</Text>
      <Text style={styles.fecha}>{informe.fechaStr}</Text>
    </View>
    <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#FFFFFF' },
  titulo: { fontSize: 24, fontWeight: '700', color: '#0F172A', paddingHorizontal: 16, paddingTop: 12 },
  subtitulo: { fontSize: 13, color: '#64748B', paddingHorizontal: 16, marginTop: 2 },
  lista: { padding: 16, gap: 12, flexGrow: 1 },
  tarjeta: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F1F5F9', borderRadius: 16, padding: 14 },
  iconoTarjeta: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#BAE6FD', justifyContent: 'center', alignItems: 'center' },
  numero: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  curso: { fontSize: 13, color: '#0F172A', marginTop: 2 },
  fecha: { fontSize: 12, color: '#64748B', marginTop: 2 },
  vacio: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 8 },
  textoVacio: { fontSize: 16, fontWeight: '600', color: '#0F172A' },
  ayudaVacio: { fontSize: 13, color: '#64748B', textAlign: 'center' },
});
