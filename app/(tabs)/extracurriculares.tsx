import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { evidenciaService } from '../../src/services/evidenciaService';

export default function ExtracurricularesScreen() {
  const [actividades, setActividades] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    evidenciaService.obtenerExtracurriculares().then(setActividades);
  }, []);
    const actividadesFiltradas = actividades.filter((a) =>
    a.nombreActividad.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.contenedor} edges={['top', 'left', 'right']}>
      <Text style={styles.titulo}>Extracurriculares</Text>
      
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

      <FlatList
        data={actividadesFiltradas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          <Text style={styles.textoVacio}>No hay actividades extracurriculares registradas.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.tarjeta}>
            <Text style={styles.nombre}>{item.nombreActividad}</Text>
            <Text style={styles.fecha}>{new Date(item.creadoEn).toLocaleDateString('es-ES')}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#FFFFFF' },
  titulo: { fontSize: 22, fontWeight: '700', color: '#0F172A', textAlign: 'center', marginVertical: 14 },
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
  lista: { paddingHorizontal: 16 },
  tarjeta: { backgroundColor: '#BAE6FD', borderRadius: 20, padding: 16, marginBottom: 12 },
  nombre: { fontSize: 15, fontWeight: '600', color: '#0F172A' },
  fecha: { fontSize: 12, color: '#475569', marginTop: 4 },
  textoVacio: { color: '#94A3B8', textAlign: 'center', marginTop: 40 },
});