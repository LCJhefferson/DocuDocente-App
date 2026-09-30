import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as XLSX from 'xlsx';
import { estadisticasService } from '../../src/services/estadisticasService';

export default function NotasEstadisticasScreen() {
  const router = useRouter();
  const { id: cursoId, nombre, unidad } = useLocalSearchParams<{ id: string; nombre?: string; unidad?: string }>();

  // Modo: 'analisis' (subir Excel) o 'manual' (ingreso directo)
  const [modo, setModo] = useState<'analisis' | 'manual'>('analisis');

  // Tipo de Gráfico: inicia en null para que NO aparezca ninguno automáticamente
  const [tipoGrafico, setTipoGrafico] = useState<'pastel' | 'barras' | 'segmentada' | null>(null);

  // Configuración de análisis
  const [notaMinima, setNotaMinima] = useState<string>('14');
  const [filaAnalizar, setFilaAnalizar] = useState<string>('F2');
  const [nombreArchivo, setNombreArchivo] = useState<string>('');

  // Estadísticas (inician en 0 hasta cargar de SQLite o procesar Excel)
  const [aprobados, setAprobados] = useState<number>(0);
  const [desaprobados, setDesaprobados] = useState<number>(0);
  const [archivoProcesado, setArchivoProcesado] = useState<boolean>(false);

  // Cálculos dinámicos
  const totalAlumnos = aprobados + desaprobados;
  const pctAprobados = totalAlumnos > 0 ? ((aprobados / totalAlumnos) * 100).toFixed(1) : '0.0';
  const pctDesaprobados = totalAlumnos > 0 ? ((desaprobados / totalAlumnos) * 100).toFixed(1) : '0.0';

  // 1. CARGA AUTOMÁTICA DESDE SQLITE AL ENTRAR
  useEffect(() => {
    async function cargarEstadisticasGuardadas() {
      if (!cursoId) return;
      try {
        const data = await estadisticasService.obtenerPorCursoYUnidad(cursoId, unidad || 'Unidad 1');
        if (data) {
          setAprobados(data.cantidadAprobados);
          setDesaprobados(data.cantidadDesaprobados);
          setArchivoProcesado(true);
          // Mantenemos tipoGrafico en null para que no aparezca de golpe al entrar
        }
      } catch (err) {
        console.error('Error al cargar estadísticas previas:', err);
      }
    }
    cargarEstadisticasGuardadas();
  }, [cursoId, unidad]);

  // Alternar selección de gráfico (si tocas el mismo, se oculta)
  const toggleTipoGrafico = (tipo: 'pastel' | 'barras' | 'segmentada') => {
    setTipoGrafico((prev) => (prev === tipo ? null : tipo));
  };

  // Convierte letras como 'A' -> 0, 'F' -> 5
  const colLetraAIndice = (letra: string): number => {
    let index = 0;
    const clean = letra.toUpperCase().trim();
    for (let i = 0; i < clean.length; i++) {
      index = index * 26 + (clean.charCodeAt(i) - 64);
    }
    return index - 1;
  };

  // Lector de Excel (.xlsx / .csv)
  const handleSeleccionarArchivo = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv',
          '*/*',
        ],
        copyToCacheDirectory: true,
      });

      if (res.canceled || !res.assets || res.assets.length === 0) {
        return;
      }

      const file = res.assets[0];
      setNombreArchivo(file.name);

      const b64 = await FileSystem.readAsStringAsync(file.uri, {
        encoding: 'base64' as any,
      });

      const workbook = XLSX.read(b64, { type: 'base64' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      const corte = parseFloat(notaMinima) || 14;

      const match = filaAnalizar.match(/^([a-zA-Z]+)/);
      let colIdx = -1;

      if (match) {
        colIdx = colLetraAIndice(match[1]);
      }

      let countAprob = 0;
      let countDesap = 0;

      // Extraer notas de la columna especificada (omite encabezados de texto)
      if (colIdx >= 0) {
        for (let r = 0; r < jsonData.length; r++) {
          const row = jsonData[r];
          if (row && row[colIdx] !== undefined) {
            const val = parseFloat(row[colIdx]);
            if (!isNaN(val) && val >= 0 && val <= 20) {
              if (val >= corte) {
                countAprob++;
              } else {
                countDesap++;
              }
            }
          }
        }
      }

      // Si no encontró en esa columna, escanear toda la hoja
      if (countAprob + countDesap === 0) {
        jsonData.forEach((row, rIdx) => {
          if (rIdx === 0) return;
          if (Array.isArray(row)) {
            row.forEach((cell) => {
              const val = parseFloat(cell);
              if (!isNaN(val) && val >= 0 && val <= 20) {
                if (val >= corte) {
                  countAprob++;
                } else {
                  countDesap++;
                }
              }
            });
          }
        });
      }

      if (countAprob + countDesap === 0) {
        Alert.alert('Aviso', 'No se encontraron notas válidas (0-20) en el archivo.');
        return;
      }

      setAprobados(countAprob);
      setDesaprobados(countDesap);
      setArchivoProcesado(true);
      setTipoGrafico(null); // No muestra gráfico automáticamente al procesar

      Alert.alert(
        'Archivo procesado con éxito',
        `Evaluados: ${countAprob + countDesap}\n• Aprobados: ${countAprob}\n• Desaprobados: ${countDesap}`
      );
    } catch (error: any) {
      console.error('Error al procesar archivo:', error);
      Alert.alert('Error', `Detalle: ${error?.message || 'No se pudo leer el archivo'}`);
    }
  };

  // 2. GUARDAR EN LA BASE DE DATOS SQLITE
  const handleGuardar = async () => {
    if (totalAlumnos === 0) {
      Alert.alert('Atención', 'No hay datos de alumnos para guardar. Sube un archivo o ingresa los números manualmente.');
      return;
    }

    try {
      await estadisticasService.guardar({
        cursoId: cursoId || 'default',
        unidad: unidad || 'Unidad 1',
        aprobados,
        desaprobados,
        pctAprobados: parseFloat(pctAprobados),
        pctDesaprobados: parseFloat(pctDesaprobados),
        tipoGrafico: tipoGrafico || 'pastel',
      });

      Alert.alert(
        'Guardado en Base de Datos',
        `Estadísticas guardadas exitosamente en SQLite:\n• Curso: ${nombre || 'Curso'}\n• ${unidad || 'Unidad 1'}\n• Evaluados: ${totalAlumnos} (Aprobados: ${aprobados}, Desaprobados: ${desaprobados})`,
        [{ text: 'Aceptar', onPress: () => router.back() }]
      );
    } catch (error: any) {
      console.error('Error al guardar estadísticas:', error);
      Alert.alert('Error', 'No se pudo guardar la información en la base de datos SQLite.');
    }
  };

  // 3. LIMPIAR Y RESTABLECER DATOS
  const handleLimpiarDatos = () => {
    Alert.alert(
      'Limpiar estadísticas',
      '¿Deseas restablecer los datos de esta unidad para subir un nuevo archivo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpiar',
          style: 'destructive',
          onPress: async () => {
            try {
              if (cursoId) {
                await estadisticasService.eliminar(cursoId, unidad || 'Unidad 1');
              }
              setAprobados(0);
              setDesaprobados(0);
              setNombreArchivo('');
              setArchivoProcesado(false);
              setTipoGrafico(null);
              Alert.alert('Restablecido', 'Los datos han sido eliminados. Ya puedes subir un nuevo archivo.');
            } catch (err) {
              Alert.alert('Error', 'No se pudieron restablecer los datos.');
            }
          },
        },
      ]
    );
  };

  // Componente que renderiza el gráfico SOLO si el usuario ha presionado un botón
  const renderGraficoSeleccionado = () => {
    if (!tipoGrafico || totalAlumnos === 0) {
      return null;
    }

    return (
      <View style={styles.boxGraficoActivo}>
        <View style={styles.leyendaGrafico}>
          <View style={styles.itemLeyenda}>
            <View style={[styles.puntoColor, { backgroundColor: '#F43F5E' }]} />
            <Text style={styles.textoLeyenda}>Desaprobados ({desaprobados})</Text>
          </View>
          <View style={styles.itemLeyenda}>
            <View style={[styles.puntoColor, { backgroundColor: '#2DD4BF' }]} />
            <Text style={styles.textoLeyenda}>Aprobados ({aprobados})</Text>
          </View>
        </View>

        {tipoGrafico === 'pastel' && (
          <View style={styles.pastelContenedor}>
            <View style={styles.pastelCirculo}>
              <View style={[styles.pastelSemicirculoIzquierdo, { flex: aprobados || 1 }]} />
              <View style={[styles.pastelSemicirculoDerecho, { flex: desaprobados || 1 }]} />
              <View style={styles.pastelBadgeAprob}>
                <Text style={styles.pastelBadgeTexto}>Aprobados{"\n"}{pctAprobados}%</Text>
              </View>
              <View style={styles.pastelBadgeDesap}>
                <Text style={styles.pastelBadgeTexto}>Desaprobados{"\n"}{pctDesaprobados}%</Text>
              </View>
            </View>
          </View>
        )}

        {tipoGrafico === 'barras' && (
          <View style={styles.barrasGraficoContenedor}>
            <View style={styles.areaBarras}>
              <View style={styles.columnaBarra}>
                <Text style={styles.labelValorBarra}>{desaprobados}</Text>
                <View
                  style={[
                    styles.barraFisica,
                    {
                      height: Math.min(Math.max((desaprobados / (totalAlumnos || 1)) * 140, 20), 130),
                      backgroundColor: '#F43F5E',
                    },
                  ]}
                />
                <Text style={styles.nombreBarra}>Desaprobados</Text>
              </View>

              <View style={styles.columnaBarra}>
                <Text style={styles.labelValorBarra}>{aprobados}</Text>
                <View
                  style={[
                    styles.barraFisica,
                    {
                      height: Math.min(Math.max((aprobados / (totalAlumnos || 1)) * 140, 20), 130),
                      backgroundColor: '#4ADE80',
                    },
                  ]}
                />
                <Text style={styles.nombreBarra}>Aprobados</Text>
              </View>
            </View>
          </View>
        )}

        {tipoGrafico === 'segmentada' && (
          <View style={styles.graficoSegmentadoBox}>
            <View style={styles.barraProporcionalContenedorGrande}>
              <View style={[styles.barraSegmentoRojo, { flex: desaprobados || 1 }]} />
              <View style={[styles.barraSegmentoVerde, { flex: aprobados || 1 }]} />
            </View>
            <View style={styles.filaConteos}>
              <Text style={styles.textoConteo}>Desaprobados: {pctDesaprobados}%</Text>
              <Text style={styles.textoConteo}>Aprobados: {pctAprobados}%</Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.botonAtras} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.headerTitulos}>
          <Text style={styles.tituloGrande}>
            <Text style={styles.tituloVerde}>Notas </Text>
            <Text style={styles.tituloNegro}>y estadísticas</Text>
          </Text>
          <Text style={styles.subtitulo} numberOfLines={1}>
            Curso: {nombre || 'Curso'} - {unidad || 'Unidad 1'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContenido} showsVerticalScrollIndicator={false}>
        {/* SELECTOR ENTRE ANÁLISIS Y MANUAL */}
        <View style={styles.contenedorTabs}>
          <TouchableOpacity
            style={[styles.tabBoton, modo === 'analisis' && styles.tabBotonActivo]}
            onPress={() => setModo('analisis')}
          >
            <Text style={[styles.textoTab, modo === 'analisis' && styles.textoTabActivo]}>Analisis</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBoton, modo === 'manual' && styles.tabBotonActivo]}
            onPress={() => setModo('manual')}
          >
            <Text style={[styles.textoTab, modo === 'manual' && styles.textoTabActivo]}>manual</Text>
          </TouchableOpacity>
        </View>

        {/* MODO ANÁLISIS */}
        {modo === 'analisis' && (
          <View style={styles.seccion}>
            <Text style={styles.textoNotaMinima}>Nota minima aprobatoria: {notaMinima}</Text>

            {/* CARD RESUMEN ESTADÍSTICO */}
            <View style={styles.cardResumen}>
              <Text style={styles.tituloCard}>Resumen estadístico del archivo</Text>

              {archivoProcesado && totalAlumnos > 0 ? (
                <>
                  <View style={styles.filaPorcentajes}>
                    <View style={styles.pillAprobados}>
                      <Text style={styles.etiquetaPillBlanca}>Aprobados</Text>
                      <Text style={styles.valorPillBlanca}>{pctAprobados}%</Text>
                    </View>

                    <View style={styles.pillDesaprobados}>
                      <Text style={styles.etiquetaPillRoja}>Desaprobados</Text>
                      <Text style={styles.valorPillRoja}>{pctDesaprobados}%</Text>
                    </View>
                  </View>

                  <View style={styles.barraProporcionalContenedor}>
                    <View style={[styles.barraSegmentoVerde, { flex: aprobados || 1 }]} />
                    <View style={[styles.barraSegmentoRojo, { flex: desaprobados || 1 }]} />
                  </View>

                  <View style={styles.filaConteos}>
                    <Text style={styles.textoConteo}>{aprobados} aprobados</Text>
                    <Text style={styles.textoConteo}>{desaprobados} desaprobados</Text>
                  </View>
                </>
              ) : (
                <View style={styles.contenedorSinDatos}>
                  <Ionicons name="cloud-upload-outline" size={32} color="#94A3B8" />
                  <Text style={styles.textoSinDatos}>
                    Sube un archivo Excel o CSV para calcular el porcentaje de aprobados y desaprobados.
                  </Text>
                </View>
              )}
            </View>

            {/* BOTÓN PARA LIMPIAR DATOS */}
            {archivoProcesado && (
              <TouchableOpacity style={styles.botonReiniciar} onPress={handleLimpiarDatos}>
                <Ionicons name="trash-outline" size={16} color="#EF4444" />
                <Text style={styles.textoBotonReiniciar}>Borrar datos y subir nuevo archivo</Text>
              </TouchableOpacity>
            )}

            {/* GRÁFICO DINÁMICO (SOLO VISIBLE SI SE PRESIONÓ UN BOTÓN DE TIPO DE GRÁFICO) */}
            {archivoProcesado && tipoGrafico !== null && (
              <View style={styles.areaGraficoContenedor}>
                {renderGraficoSeleccionado()}
              </View>
            )}

            {/* DROPZONE ARCHIVO */}
            <TouchableOpacity style={styles.dropzone} onPress={handleSeleccionarArchivo}>
              <Ionicons name="document-text-outline" size={26} color="#0F172A" />
              <Text style={styles.tituloDropzone}>
                {nombreArchivo ? nombreArchivo : 'Subir archivo de notas'}
              </Text>
              <Text style={styles.subtituloDropzone}>Excel (.xlsx) o CSV</Text>
            </TouchableOpacity>

            <View style={styles.filaInput}>
              <Text style={styles.labelInput}>Eleccion de fila a analizar</Text>
              <TextInput
                style={styles.inputChico}
                value={filaAnalizar}
                onChangeText={setFilaAnalizar}
                placeholder="F2"
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.filaInput}>
              <Text style={styles.labelInput}>Nota minima aprobatoria</Text>
              <TextInput
                style={styles.inputChico}
                value={notaMinima}
                keyboardType="numeric"
                onChangeText={setNotaMinima}
                placeholder="14"
              />
            </View>
          </View>
        )}

        {/* MODO MANUAL */}
        {modo === 'manual' && (
          <View style={styles.seccion}>
            {totalAlumnos > 0 && (
              <TouchableOpacity style={styles.botonReiniciar} onPress={handleLimpiarDatos}>
                <Ionicons name="trash-outline" size={16} color="#EF4444" />
                <Text style={styles.textoBotonReiniciar}>Restablecer campos a cero</Text>
              </TouchableOpacity>
            )}

            {/* GRÁFICO EN MANUAL (SOLO VISIBLE SI SE SELECCIONÓ UN BOTÓN) */}
            {tipoGrafico !== null && (
              <View style={styles.areaGraficoContenedor}>
                {renderGraficoSeleccionado()}
              </View>
            )}

            <View style={styles.filaInput}>
              <Text style={styles.labelInput}>Numero de aprobados</Text>
              <TextInput
                style={styles.inputChico}
                keyboardType="numeric"
                value={aprobados === 0 ? '' : String(aprobados)}
                placeholder="0"
                onChangeText={(t) => setAprobados(parseInt(t, 10) || 0)}
              />
            </View>

            <View style={styles.filaInput}>
              <Text style={styles.labelInput}>Numero de desaprobados</Text>
              <TextInput
                style={styles.inputChico}
                keyboardType="numeric"
                value={desaprobados === 0 ? '' : String(desaprobados)}
                placeholder="0"
                onChangeText={(t) => setDesaprobados(parseInt(t, 10) || 0)}
              />
            </View>

            <View style={styles.filaInput}>
              <Text style={styles.labelInput}>Nota minima aprobatoria</Text>
              <TextInput
                style={styles.inputChico}
                keyboardType="numeric"
                value={notaMinima}
                onChangeText={setNotaMinima}
              />
            </View>
          </View>
        )}

        {/* SELECTOR DE TIPO DE GRÁFICO */}
        <View style={styles.contenedorTipoGrafico}>
          <Text style={styles.tituloTipoGrafico}>Tipo de grafico</Text>
          <View style={styles.filaBotonesGrafico}>
            <TouchableOpacity
              style={[styles.botonGraficoPill, tipoGrafico === 'pastel' && styles.botonGraficoPillActivo]}
              onPress={() => toggleTipoGrafico('pastel')}
            >
              <Ionicons name="pie-chart" size={16} color="#0F172A" />
              <Text style={styles.textoBotonGrafico}>Pastel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.botonGraficoPill, tipoGrafico === 'barras' && styles.botonGraficoPillActivo]}
              onPress={() => toggleTipoGrafico('barras')}
            >
              <Ionicons name="bar-chart" size={16} color="#0F172A" />
              <Text style={styles.textoBotonGrafico}>Barras</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.botonGraficoPill, tipoGrafico === 'segmentada' && styles.botonGraficoPillActivo]}
              onPress={() => toggleTipoGrafico('segmentada')}
            >
              <Ionicons name="stats-chart" size={16} color="#0F172A" />
              <Text style={styles.textoBotonGrafico}>barra segmentada</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* BOTÓN CONFIRMAR Y GUARDAR */}
        <TouchableOpacity style={styles.botonConfirmar} onPress={handleGuardar}>
          <Text style={styles.textoBotonConfirmar}>Confirmar y guardar</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  botonAtras: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitulos: {
    flex: 1,
    alignItems: 'center',
    marginRight: 38,
  },
  tituloGrande: {
    fontSize: 20,
    fontWeight: '800',
  },
  tituloVerde: {
    color: '#22C55E',
  },
  tituloNegro: {
    color: '#0F172A',
  },
  subtitulo: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  scrollContenido: {
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  contenedorTabs: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginVertical: 14,
  },
  tabBoton: {
    paddingHorizontal: 28,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  tabBotonActivo: {
    backgroundColor: '#BAE6FD',
  },
  textoTab: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  textoTabActivo: {
    color: '#0F172A',
  },
  seccion: {
    width: '100%',
  },
  textoNotaMinima: {
    textAlign: 'center',
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 8,
  },
  cardResumen: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#F8FAFC',
    marginBottom: 12,
    minHeight: 110,
    justifyContent: 'center',
  },
  botonReiniciar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    marginBottom: 14,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  textoBotonReiniciar: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  contenedorSinDatos: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  textoSinDatos: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 12,
  },
  tituloCard: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
  },
  filaPorcentajes: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  pillAprobados: {
    flex: 1,
    backgroundColor: '#22C55E',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  etiquetaPillBlanca: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  valorPillBlanca: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  pillDesaprobados: {
    flex: 1,
    backgroundColor: '#FFE4E6',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  etiquetaPillRoja: {
    color: '#E11D48',
    fontSize: 11,
    fontWeight: '600',
  },
  valorPillRoja: {
    color: '#E11D48',
    fontSize: 14,
    fontWeight: '800',
  },
  barraProporcionalContenedor: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 6,
  },
  barraSegmentoVerde: {
    backgroundColor: '#22C55E',
  },
  barraSegmentoRojo: {
    backgroundColor: '#E11D48',
  },
  filaConteos: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  textoConteo: {
    fontSize: 11,
    color: '#94A3B8',
  },
  dropzone: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    marginBottom: 16,
    backgroundColor: '#FAFAFA',
  },
  tituloDropzone: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 6,
  },
  subtituloDropzone: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  filaInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  labelInput: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  inputChico: {
    width: 90,
    height: 36,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    textAlign: 'center',
    fontWeight: '600',
    color: '#0F172A',
    fontSize: 13,
  },
  areaGraficoContenedor: {
    marginVertical: 10,
  },
  boxGraficoActivo: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  leyendaGrafico: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 10,
  },
  itemLeyenda: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  puntoColor: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  textoLeyenda: {
    fontSize: 11,
    color: '#64748B',
  },
  pastelContenedor: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 160,
  },
  pastelCirculo: {
    width: 140,
    height: 140,
    borderRadius: 70,
    overflow: 'hidden',
    flexDirection: 'row',
    position: 'relative',
  },
  pastelSemicirculoIzquierdo: {
    backgroundColor: '#2DD4BF',
  },
  pastelSemicirculoDerecho: {
    backgroundColor: '#F43F5E',
  },
  pastelBadgeAprob: {
    position: 'absolute',
    left: 8,
    top: 50,
  },
  pastelBadgeDesap: {
    position: 'absolute',
    right: 8,
    top: 50,
  },
  pastelBadgeTexto: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  barrasGraficoContenedor: {
    flexDirection: 'row',
    height: 160,
    width: '100%',
    paddingHorizontal: 20,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  areaBarras: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    width: '80%',
    height: 140,
  },
  columnaBarra: {
    alignItems: 'center',
  },
  labelValorBarra: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  barraFisica: {
    width: 50,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  nombreBarra: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    marginTop: 6,
  },
  graficoSegmentadoBox: {
    width: '100%',
    paddingHorizontal: 10,
  },
  barraProporcionalContenedorGrande: {
    flexDirection: 'row',
    height: 24,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  contenedorTipoGrafico: {
    marginTop: 10,
    marginBottom: 24,
  },
  tituloTipoGrafico: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
  },
  filaBotonesGrafico: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  botonGraficoPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    gap: 5,
  },
  botonGraficoPillActivo: {
    backgroundColor: '#BAE6FD',
  },
  textoBotonGrafico: {
    fontSize: 11,
    color: '#0F172A',
    fontWeight: '600',
  },
  botonConfirmar: {
    width: '100%',
    height: 50,
    backgroundColor: '#0EA5E9',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoBotonConfirmar: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});