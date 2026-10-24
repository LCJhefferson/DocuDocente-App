import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
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
import { useInformes } from '../../src/hooks/useInformes';
import { Informe } from '../../src/models/Informe';
import { formatearFecha } from '../../src/utils/fechas';

export default function InformesScreen() {
  const router = useRouter();
  const { cursoId } = useLocalSearchParams<{ cursoId?: string }>();
  const { informes, cargando, cargarInformes, descargarInforme, generandoPdf } = useInformes();
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

  useFocusEffect(
    useCallback(() => {
      cargarInformes();
    }, [cargarInformes])
  );

  useEffect(() => {
    if (!cursoId) return;
    router.setParams({ cursoId: undefined });
    router.push({ pathname: '/informe/nuevo', params: { cursoId } });
  }, [cursoId, router]);

  return (
    <SafeAreaView style={styles.contenedorPadre} edges={['top', 'left', 'right']}>
      {/* ENCABEZADO PRINCIPAL */}
      <View style={styles.encabezado}>
        <View style={styles.titulosContenedor}>
          <Text style={styles.tituloPagina}>Historial de Informes</Text>
          <Text style={styles.subtituloPagina}>
            {informes.length === 1 ? '1 informe generado' : `${informes.length} informes generados`}
          </Text>
        </View>


      </View>

      {/* BUSCADOR */}
      <View style={styles.contenedorBuscador}>
        <Ionicons name="search-outline" size={20} color="#64748B" style={styles.iconoBuscador} />
        <TextInput
          style={styles.inputBuscador}
          placeholder="Buscar por curso o N° informe..."
          placeholderTextColor="#94A3B8"
          value={busqueda}
          onChangeText={setBusqueda}
        />
        {busqueda.length > 0 && (
          <TouchableOpacity onPress={() => setBusqueda('')}>
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {/* LISTADO DE INFORMES */}
      {cargando ? (
        <View style={styles.cargandoContenedor}>
          <ActivityIndicator size="large" color="#0284C7" />
          <Text style={styles.textoCargando}>Cargando historial...</Text>
        </View>
      ) : (
        <FlatList
          data={informesFiltrados}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listaContenido}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TarjetaInforme
              informe={item}
              deshabilitado={generandoPdf}
              onPress={() => router.push({ pathname: '/informe/[id]', params: { id: item.id } })}
              onDescargar={() => manejarDescargar(item.id)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.vacioContenedor}>
              <View style={styles.vacioIconoCirculo}>
                <Ionicons
                  name={busqueda ? 'search-outline' : 'document-text-outline'}
                  size={36}
                  color="#0284C7"
                />
              </View>
              <Text style={styles.textoVacio}>
                {busqueda ? 'Sin resultados encontrados' : 'No hay informes registrados'}
              </Text>
              <Text style={styles.ayudaVacio}>
                {busqueda
                  ? `No se encontraron coincidencias para "${busqueda}".`
                  : 'Ve a la pestaña de Cursos, presiona los tres puntos de un curso y selecciona "Generar Reporte".'}
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
  <TouchableOpacity style={styles.tarjetaCard} onPress={onPress} activeOpacity={0.88}>
    {/* Icono decorativo de documento */}
    <View style={styles.iconoDocumentoBadge}>
      <Ionicons name="document-text" size={22} color="#0284C7" />
    </View>

    {/* Detalle del informe */}
    <View style={styles.infoContenedor}>
      <View style={styles.filaEncabezadoCard}>
        <Text style={styles.numeroInformeText} numberOfLines={1}>
          {informe.numeroInforme ? `Informe N° ${informe.numeroInforme}` : 'Informe Académico'}
        </Text>
        <View style={styles.pillBadge}>
          <Text style={styles.pillBadgeTexto}>PDF</Text>
        </View>
      </View>

      <Text style={styles.cursoNombreText} numberOfLines={1}>
        {informe.nombreCurso}
      </Text>

      <View style={styles.filaFechaText}>
        <Ionicons name="calendar-outline" size={13} color="#64748B" />
        <Text style={styles.fechaText}>{formatearFecha(informe.creadoEn)}</Text>
      </View>
    </View>

    {/* Botón de acción para descarga directa */}
    <TouchableOpacity
      style={[styles.botonAccionDescargar, deshabilitado && styles.botonAccionDeshabilitado]}
      onPress={onDescargar}
      disabled={deshabilitado}
      activeOpacity={0.7}
    >
      <Ionicons
        name="cloud-download-outline"
        size={20}
        color={deshabilitado ? '#94A3B8' : '#0284C7'}
      />
    </TouchableOpacity>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  contenedorPadre: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  titulosContenedor: {
    flex: 1,
  },
  tituloPagina: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  subtituloPagina: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },

  contenedorBuscador: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 16,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#CBD5E1',
  },
  iconoBuscador: {
    marginRight: 8,
  },
  inputBuscador: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  listaContenido: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 12,
  },
  tarjetaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  iconoDocumentoBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContenedor: {
    flex: 1,
  },
  filaEncabezadoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
    paddingRight: 8,
  },
  numeroInformeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
    textTransform: 'uppercase',
  },
  pillBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  pillBadgeTexto: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  cursoNombreText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  filaFechaText: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fechaText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  botonAccionDescargar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  botonAccionDeshabilitado: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  cargandoContenedor: {
    marginTop: 60,
    alignItems: 'center',
    gap: 12,
  },
  textoCargando: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  vacioContenedor: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 24,
  },
  vacioIconoCirculo: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  textoVacio: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  ayudaVacio: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
});