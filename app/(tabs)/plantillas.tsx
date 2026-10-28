import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Image, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ResultadoAnalisis } from '../../src/components/plantillas/ResultadoAnalisis';
import { useTheme } from '../../src/context/ThemeContext';
import {
  CATALOGO,
  TipoCatalogo,
  VarianteCabecera,
  definicionDelCatalogo,
  nombreDelCatalogo,
  titulosNumerados,
} from '../../src/data/catalogoPlantillas';
import { DefinicionPlantilla, NormaFormato, Plantilla } from '../../src/models/Plantilla';
import { importarWordService } from '../../src/services/importarWordService';
import { plantillaService } from '../../src/services/plantillaService';
import { AnalisisDocx } from '../../src/utils/analizarDocx';
import { esLogoIncluido, fuenteLogo, guardarLogoPermanente } from '../../src/utils/logos';
import { definicionDesdeEncabezado } from '../../src/utils/plantillaBase';

export default function PlantillasScreen() {
  const { isDarkMode } = useTheme();
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [plantillaPreview, setPlantillaPreview] = useState<Plantilla | null>(null);

  // Estados del Formulario
  const [nombreInstitucion, setNombreInstitucion] = useState('');
  const [nombreFacultad, setNombreFacultad] = useState('');
  const [tituloAnoEncabezado, setTituloAnoEncabezado] = useState('');
  const [logoUri, setLogoUri] = useState('');
  const [formatoSeleccionado, setFormatoSeleccionado] = useState<NormaFormato>('Oficio');

  const formatosDisponibles: NormaFormato[] = ['Oficio', 'APA 7'];

  // Subir una plantilla en Word
  const [analisisWord, setAnalisisWord] = useState<AnalisisDocx | null>(null);
  const [nombreWord, setNombreWord] = useState('');
  const [importando, setImportando] = useState(false);

  // Cabecera elegida en cada plantilla del catálogo
  const [variantes, setVariantes] = useState<Record<TipoCatalogo, VarianteCabecera>>({ unidad: 'B', fin_ciclo: 'B' });

  const cargarPlantillas = useCallback(async () => {
    try {
      setPlantillas(await plantillaService.listar());
    } catch (error) {
      console.error('[Plantillas] Error al cargar:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargarPlantillas();
    }, [cargarPlantillas])
  );

  const seleccionarLogo = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setLogoUri(result.assets[0].uri);
    }
  };

  const guardarNuevaPlantilla = async () => {
    if (!nombreInstitucion || !nombreFacultad || !tituloAnoEncabezado) {
      Alert.alert('Error', 'Completa los campos de texto obligatorios.');
      return;
    }

    try {
      await plantillaService.guardar({
        nombre: nombreFacultad.trim(),
        tipo: 'personalizada',
        definicion: definicionDesdeEncabezado({
          institucion: nombreInstitucion,
          facultad: nombreFacultad,
          lema: tituloAnoEncabezado,
          logo: logoUri ? guardarLogoPermanente(logoUri) : null,
          norma: formatoSeleccionado,
        }),
        esPredeterminada: true,
      });
      await cargarPlantillas();

      setNombreInstitucion(''); setNombreFacultad(''); setTituloAnoEncabezado(''); setLogoUri(''); setFormatoSeleccionado('Oficio');
      setMostrarFormulario(false);
      Alert.alert('Éxito', 'Plantilla guardada y asignada como predeterminada.');
    } catch (error) {
      console.error('[Plantillas] Error al guardar:', error);
      Alert.alert('Error', 'No se pudo guardar la plantilla.');
    }
  };

  const hacerPredeterminada = async (id: string) => {
    await plantillaService.marcarPredeterminada(id);
    await cargarPlantillas();
  };

  const eliminarPlantilla = (item: Plantilla) => {
    Alert.alert('Eliminar plantilla', `¿Eliminar "${item.nombre}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await plantillaService.eliminar(item.id);
          await cargarPlantillas();
        },
      },
    ]);
  };

  const plantillaDelCatalogo = (tipo: TipoCatalogo): Plantilla => ({
    id: `catalogo-${tipo}`,
    nombre: nombreDelCatalogo(tipo, variantes[tipo]),
    tipo,
    definicion: definicionDelCatalogo(tipo, variantes[tipo]),
    esPredeterminada: false,
    creadoEn: '',
  });

  const usarDelCatalogo = async (tipo: TipoCatalogo) => {
    const { nombre, definicion } = plantillaDelCatalogo(tipo);
    try {
      await plantillaService.guardar({ nombre, tipo, definicion, esPredeterminada: true });
      await cargarPlantillas();
      Alert.alert('Plantilla lista', `"${nombre}" quedó como tu plantilla predeterminada.`);
    } catch (error) {
      console.error('[Plantillas] Error al usar del catálogo:', error);
      Alert.alert('Error', 'No se pudo guardar la plantilla.');
    }
  };

  const subirWord = async () => {
    setImportando(true);
    try {
      const resultado = await importarWordService.elegirYAnalizar();
      if (resultado) {
        setNombreWord(resultado.nombre);
        setAnalisisWord(resultado.analisis);
      }
    } catch (error: any) {
      console.error('[Plantillas] Error al analizar Word:', error);
      Alert.alert('No se pudo analizar', error?.message || 'Revisa que el archivo sea un Word (.docx).');
    } finally {
      setImportando(false);
    }
  };

  const guardarImportada = async (nombre: string, definicion: DefinicionPlantilla) => {
    try {
      await plantillaService.guardar({ nombre, tipo: 'importada', definicion, esPredeterminada: true });
      setAnalisisWord(null);
      await cargarPlantillas();
      Alert.alert('Plantilla guardada', `"${nombre}" quedó como tu plantilla predeterminada.`);
    } catch (error) {
      console.error('[Plantillas] Error al guardar importada:', error);
      Alert.alert('Error', 'No se pudo guardar la plantilla.');
    }
  };

  const abrirPrevisualizacion = (item: Plantilla) => {
    setPlantillaPreview(item);
    setModalVisible(true);
  };

  const renderItem = ({ item }: { item: Plantilla }) => (
    <View style={[
      styles.cardList,
      { backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF', borderLeftColor: item.esPredeterminada ? '#38BDF8' : '#334155' },
      item.esPredeterminada && { backgroundColor: isDarkMode ? '#172554' : '#EFF6FF' }
    ]}>
      <View style={styles.cardInfo}>
        <Text style={[styles.cardTitle, { color: isDarkMode ? '#F8FAFC' : '#111827' }]}>{item.nombre}</Text>
        <Text style={[styles.cardSubtitle, { color: isDarkMode ? '#94A3B8' : '#4B5563' }]}>
          {item.definicion.cabecera.textoIzquierdo.join(' ')}
        </Text>
        <Text style={[styles.cardFormatText, { color: isDarkMode ? '#64748B' : '#9CA3AF' }]}>
          Formato: {item.definicion.formato.norma}
        </Text>
        {item.esPredeterminada && (
          <View style={[styles.badge, { backgroundColor: isDarkMode ? '#1E3A8A' : '#DBEAFE' }]}>
            <Text style={[styles.badgeText, { color: isDarkMode ? '#38BDF8' : '#1D4ED8' }]}>Predeterminada</Text>
          </View>
        )}
      </View>
      
      <View style={styles.actionButtonsRow}>
        <TouchableOpacity 
          style={[styles.btnVer, { backgroundColor: isDarkMode ? '#334155' : '#E5E7EB' }]} 
          onPress={() => abrirPrevisualizacion(item)}
        >
          <Text style={[styles.btnVerText, { color: isDarkMode ? '#F8FAFC' : '#374151' }]}>Ver</Text>
        </TouchableOpacity>
        
        {!item.esPredeterminada && (
          <TouchableOpacity 
            style={[styles.btnActionList, { backgroundColor: isDarkMode ? '#0284C7' : '#2563EB' }]} 
            onPress={() => hacerPredeterminada(item.id)}
          >
            <Text style={styles.btnActionListText}>Usar</Text>
          </TouchableOpacity>
        )}

        {!item.esPredeterminada && (
          <TouchableOpacity 
            style={[styles.btnVer, { backgroundColor: isDarkMode ? '#334155' : '#E5E7EB' }]} 
            onPress={() => eliminarPlantilla(item)} 
            accessibilityLabel="Eliminar plantilla"
          >
            <Ionicons name="trash-outline" size={16} color={isDarkMode ? '#F87171' : '#B91C1C'} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDarkMode ? '#0F172A' : '#F3F4F6' }]}>
      <View style={[styles.header, { backgroundColor: isDarkMode ? '#0F172A' : '#F3F4F6' }]}>
        <Text style={[styles.title, { color: isDarkMode ? '#F8FAFC' : '#111827' }]}>Configuración de Plantillas</Text>
        <Text style={[styles.subtitle, { color: isDarkMode ? '#94A3B8' : '#6B7280' }]}>
          Define los datos del encabezado y el formato que leerá el PDF.
        </Text>
      </View>

      {!mostrarFormulario ? (
        <View style={styles.listContainer}>
          <TouchableOpacity 
            style={[styles.btnPrimary, { backgroundColor: isDarkMode ? '#0284C7' : '#2563EB' }]} 
            onPress={() => setMostrarFormulario(true)}
          >
            <Text style={styles.btnPrimaryText}>+ Crear Nueva Plantilla</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.btnWord, 
              { backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF', borderColor: isDarkMode ? '#334155' : '#2563EB' },
              importando && { opacity: 0.6 }
            ]} 
            onPress={subirWord} 
            disabled={importando}
          >
            <Ionicons name="document-text-outline" size={18} color={isDarkMode ? '#38BDF8' : '#2563EB'} />
            <Text style={[styles.btnWordText, { color: isDarkMode ? '#38BDF8' : '#2563EB' }]}>
              {importando ? 'Analizando documento…' : 'Subir plantilla en Word'}
            </Text>
          </TouchableOpacity>
          <FlatList 
            data={plantillas} 
            keyExtractor={(item) => item.id} 
            renderItem={renderItem} 
            ListHeaderComponent={
              <View>
                <Text style={[styles.seccionTitulo, { color: isDarkMode ? '#94A3B8' : '#6B7280' }]}>Catálogo</Text>
                {CATALOGO.map((c) => (
                  <View key={c.tipo} style={[styles.cardCatalogo, { backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF' }]}>
                    <Text style={[styles.cardTitle, { color: isDarkMode ? '#F8FAFC' : '#111827' }]}>{c.nombre}</Text>
                    <Text style={[styles.cardSubtitle, { color: isDarkMode ? '#94A3B8' : '#4B5563' }]}>{c.descripcion}</Text>
                    <View style={styles.formatRow}>
                      {(['A', 'B'] as VarianteCabecera[]).map((v) => (
                        <TouchableOpacity
                          key={v}
                          style={[
                            styles.formatBtn, 
                            { backgroundColor: isDarkMode ? '#0F172A' : '#F9FAFB', borderColor: isDarkMode ? '#334155' : '#D1D5DB' },
                            variantes[c.tipo] === v && [styles.formatBtnActive, { backgroundColor: isDarkMode ? '#172554' : '#EFF6FF', borderColor: '#38BDF8' }]
                          ]}
                          onPress={() => setVariantes((actual) => ({ ...actual, [c.tipo]: v }))}
                        >
                          <Text style={[
                            styles.formatBtnText, 
                            { color: isDarkMode ? '#94A3B8' : '#6B7280' },
                            variantes[c.tipo] === v && [styles.formatBtnTextActive, { color: isDarkMode ? '#38BDF8' : '#2563EB' }]
                          ]}>
                            {v === 'A' ? 'Sin logo FISME' : 'Con logo FISME'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <View style={[styles.actionButtonsRow, { marginTop: 10, justifyContent: 'flex-end' }]}>
                      <TouchableOpacity 
                        style={[styles.btnVer, { backgroundColor: isDarkMode ? '#334155' : '#E5E7EB' }]} 
                        onPress={() => abrirPrevisualizacion(plantillaDelCatalogo(c.tipo))}
                      >
                        <Text style={[styles.btnVerText, { color: isDarkMode ? '#F8FAFC' : '#374151' }]}>Ver</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.btnActionList, { backgroundColor: isDarkMode ? '#0284C7' : '#2563EB' }]} 
                        onPress={() => usarDelCatalogo(c.tipo)}
                      >
                        <Text style={styles.btnActionListText}>Usar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
                <Text style={[styles.seccionTitulo, { color: isDarkMode ? '#94A3B8' : '#6B7280' }]}>Mis plantillas</Text>
              </View>
            } 
            ListEmptyComponent={
              <Text style={[styles.subtitle, { color: isDarkMode ? '#94A3B8' : '#6B7280', textAlign: 'center', marginTop: 20 }]}>
                Aún no hay plantillas. Crea la primera con el botón de arriba.
              </Text>
            } 
            contentContainerStyle={{ paddingBottom: 20, marginTop: 15 }} 
            showsVerticalScrollIndicator={false} 
          />
        </View>
      ) : (
        <ScrollView style={[styles.container, { backgroundColor: isDarkMode ? '#0F172A' : '#F3F4F6' }]} contentContainerStyle={styles.content}>
          <TouchableOpacity style={styles.btnBack} onPress={() => setMostrarFormulario(false)}>
            <Text style={[styles.btnBackText, { color: isDarkMode ? '#94A3B8' : '#4B5563' }]}>← Cancelar y volver</Text>
          </TouchableOpacity>

          <View style={[styles.formCard, { backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF' }]}>
            
            {/* SELECTOR DE FORMATO */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: isDarkMode ? '#E2E8F0' : '#374151' }]}>Formato del Documento:</Text>
              <View style={styles.formatRow}>
                {formatosDisponibles.map((fmt) => (
                  <TouchableOpacity 
                    key={fmt} 
                    style={[
                      styles.formatBtn, 
                      { backgroundColor: isDarkMode ? '#0F172A' : '#F9FAFB', borderColor: isDarkMode ? '#334155' : '#D1D5DB' },
                      formatoSeleccionado === fmt && [styles.formatBtnActive, { backgroundColor: isDarkMode ? '#172554' : '#EFF6FF', borderColor: '#38BDF8' }]
                    ]} 
                    onPress={() => setFormatoSeleccionado(fmt)}
                  >
                    <Text style={[
                      styles.formatBtnText, 
                      { color: isDarkMode ? '#94A3B8' : '#6B7280' },
                      formatoSeleccionado === fmt && [styles.formatBtnTextActive, { color: isDarkMode ? '#38BDF8' : '#2563EB' }]
                    ]}>
                      {fmt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: isDarkMode ? '#E2E8F0' : '#374151' }]}>Nombre de la Institución:</Text>
              <TextInput 
                style={[styles.input, { backgroundColor: isDarkMode ? '#0F172A' : '#F9FAFB', borderColor: isDarkMode ? '#334155' : '#D1D5DB', color: isDarkMode ? '#F8FAFC' : '#111827' }]} 
                value={nombreInstitucion} 
                onChangeText={setNombreInstitucion} 
                placeholderTextColor={isDarkMode ? '#64748B' : '#9CA3AF'}
                multiline 
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: isDarkMode ? '#E2E8F0' : '#374151' }]}>Nombre de la Facultad:</Text>
              <TextInput 
                style={[styles.input, { backgroundColor: isDarkMode ? '#0F172A' : '#F9FAFB', borderColor: isDarkMode ? '#334155' : '#D1D5DB', color: isDarkMode ? '#F8FAFC' : '#111827' }]} 
                value={nombreFacultad} 
                onChangeText={setNombreFacultad} 
                placeholderTextColor={isDarkMode ? '#64748B' : '#9CA3AF'}
                multiline 
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: isDarkMode ? '#E2E8F0' : '#374151' }]}>Título o Año del Encabezado:</Text>
              <TextInput 
                style={[styles.input, { backgroundColor: isDarkMode ? '#0F172A' : '#F9FAFB', borderColor: isDarkMode ? '#334155' : '#D1D5DB', color: isDarkMode ? '#F8FAFC' : '#111827' }]} 
                value={tituloAnoEncabezado} 
                onChangeText={setTituloAnoEncabezado} 
                placeholderTextColor={isDarkMode ? '#64748B' : '#9CA3AF'}
                multiline 
              />
            </View>

            {/* CAJA DE SUBIDA DE LOGO */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: isDarkMode ? '#E2E8F0' : '#374151' }]}>Logo de la Institución:</Text>
              <TouchableOpacity 
                style={[styles.uploadBox, { backgroundColor: isDarkMode ? '#0F172A' : '#F9FAFB', borderColor: isDarkMode ? '#334155' : '#D1D5DB' }]} 
                onPress={seleccionarLogo}
              >
                {logoUri ? (
                  <Image source={{ uri: logoUri }} style={styles.uploadedLogo} resizeMode="contain" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={32} color={isDarkMode ? '#94A3B8' : '#9CA3AF'} />
                    <Text style={[styles.uploadText, { color: isDarkMode ? '#94A3B8' : '#6B7280' }]}>Subir Logo</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

          </View>
          <TouchableOpacity 
            style={[styles.btnGuardar, { backgroundColor: isDarkMode ? '#0284C7' : '#2563EB' }]} 
            onPress={guardarNuevaPlantilla}
          >
            <Text style={styles.btnPrimaryText}>Guardar Plantilla Predeterminada</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <ResultadoAnalisis
        visible={!!analisisWord}
        nombreInicial={nombreWord}
        analisis={analisisWord}
        onCancelar={() => setAnalisisWord(null)}
        onGuardar={guardarImportada}
      />

      {/* --- MODAL DE PREVISUALIZACIÓN --- */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDarkMode ? '#1E293B' : '#F3F4F6' }]}>
            <TouchableOpacity style={styles.btnCerrarModal} onPress={() => setModalVisible(false)}>
              <Text style={styles.btnCerrarModalText}>Cerrar Previsualización</Text>
            </TouchableOpacity>

            {plantillaPreview && (
              <ScrollView style={styles.paperScroll} contentContainerStyle={styles.paperContainer}>
                
                {/* ENCABEZADO SIMULADO */}
                <View style={styles.headerOficialContainer}>
                  <View style={styles.headerTopRow}>
                    {plantillaPreview.definicion.cabecera.logoIzquierdo ? (
                      <Image
                        source={fuenteLogo(plantillaPreview.definicion.cabecera.logoIzquierdo)}
                        style={plantillaPreview.definicion.cabecera.logoIzquierdo === 'untrm' ? styles.logoHorizontal : styles.logoOficial}
                        resizeMode="contain"
                      />
                    ) : (
                      <View style={styles.logoPlaceholder}><Text style={{fontSize:8, color:'#9CA3AF'}}>LOGO</Text></View>
                    )}
                    {!esLogoIncluido(plantillaPreview.definicion.cabecera.logoIzquierdo ?? '') && (
                      <>
                        <View style={styles.separatorVertical}></View>
                        <View style={styles.universidadCol}>
                          <Text style={styles.univTextBold}>{plantillaPreview.definicion.cabecera.textoIzquierdo.join('\n').toUpperCase()}</Text>
                        </View>
                      </>
                    )}
                    <View style={styles.facultadCol}>
                      <Text style={styles.facultadText}>{plantillaPreview.definicion.cabecera.textoDerecho.join('\n')}</Text>
                    </View>
                    {plantillaPreview.definicion.cabecera.logoDerecho && (
                      <Image source={fuenteLogo(plantillaPreview.definicion.cabecera.logoDerecho)} style={styles.logoOficial} resizeMode="contain" />
                    )}
                  </View>
                  {plantillaPreview.definicion.cabecera.lema && (
                    <Text style={styles.anioText}>"{plantillaPreview.definicion.cabecera.lema}"</Text>
                  )}
                  <View style={styles.lineaDelgada} />
                </View>

                {/* CUERPO SIMULADO */}
                <View style={styles.bodyApa}>
                   {titulosNumerados(plantillaPreview.definicion).map((titulo) => (
                     <Text key={titulo} style={styles.seccionPreview}>{titulo}</Text>
                   ))}
                   <Text style={styles.apaPlaceholderText}>Formato: {plantillaPreview.definicion.formato.norma}</Text>
                </View>

                {/* PIE DE PÁGINA OFICIAL */}
                <View style={styles.footerOficialContainer}>
                  <View style={styles.lineaGruesaFooter} />
                  <View style={styles.lineaDelgadaFooter} />
                  {plantillaPreview.definicion.pie.lineas.map((linea, i) => (
                    <Text key={i} style={i === 0 ? styles.footerInfoText : styles.footerInfoTextBold}>{linea}</Text>
                  ))}
                </View>

              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { padding: 16, zIndex: 10 },
  title: { fontSize: 22, fontWeight: 'bold' },
  subtitle: { fontSize: 13, marginTop: 4 },
  listContainer: { flex: 1, paddingHorizontal: 16 },
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  
  seccionTitulo: { fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 8, marginBottom: 8 },
  cardCatalogo: { padding: 16, borderRadius: 12, marginBottom: 12, elevation: 1, gap: 6 },
  seccionPreview: { fontFamily: 'serif', fontSize: 10, fontWeight: 'bold', color: '#111827', alignSelf: 'flex-start', marginBottom: 6 },
  cardList: { padding: 16, borderRadius: 12, marginBottom: 12, elevation: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderLeftWidth: 4 },
  cardInfo: { flex: 1, paddingRight: 10 },
  cardTitle: { fontSize: 13, fontWeight: 'bold', marginBottom: 2 },
  cardSubtitle: { fontSize: 12, marginBottom: 2 },
  cardFormatText: { fontSize: 11, fontStyle: 'italic', marginBottom: 6 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 10, fontWeight: 'bold' },
  
  actionButtonsRow: { flexDirection: 'row', gap: 6 },
  btnVer: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  btnVerText: { fontSize: 12, fontWeight: 'bold' },
  btnActionList: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  btnActionListText: { fontSize: 12, fontWeight: 'bold', color: '#FFFFFF' },
  
  formCard: { padding: 16, borderRadius: 12, elevation: 2, marginBottom: 20 },
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 13 },
  
  formatRow: { flexDirection: 'row', gap: 8 },
  formatBtn: { flex: 1, paddingVertical: 10, borderWidth: 1, borderRadius: 8, alignItems: 'center' },
  formatBtnActive: { borderWidth: 1.5 },
  formatBtnText: { fontSize: 12, fontWeight: '500' },
  formatBtnTextActive: { fontWeight: 'bold' },

  uploadBox: { height: 120, borderWidth: 2, borderStyle: 'dashed', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  uploadText: { marginTop: 8, fontSize: 13, fontWeight: '500' },
  uploadedLogo: { width: 100, height: 100, borderRadius: 8 },
  
  btnPrimary: { paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  btnPrimaryText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
  btnWord: { flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, paddingVertical: 12, borderRadius: 8, marginTop: 10 },
  btnWordText: { fontWeight: 'bold', fontSize: 14 },
  btnGuardar: { paddingVertical: 16, borderRadius: 8, alignItems: 'center', elevation: 3 },
  btnBack: { alignSelf: 'flex-start', marginBottom: 15, padding: 5 },
  btnBackText: { fontWeight: 'bold', fontSize: 14 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 500, borderRadius: 12, overflow: 'hidden', maxHeight: '85%' },
  btnCerrarModal: { backgroundColor: '#111827', padding: 15, alignItems: 'center' },
  btnCerrarModalText: { color: '#FFFFFF', fontWeight: 'bold' },
  
  paperScroll: { backgroundColor: '#FFFFFF' },
  paperContainer: { padding: 24, minHeight: 450, justifyContent: 'space-between' },
  
  headerOficialContainer: { width: '100%' },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  logoOficial: { width: 45, height: 45, marginRight: 10 },
  logoHorizontal: { width: 130, height: 38, marginRight: 10 },
  logoPlaceholder: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#E5E7EB', marginRight: 10, justifyContent: 'center', alignItems: 'center' },
  separatorVertical: { width: 1, height: 45, backgroundColor: '#D1D5DB', marginRight: 10 },
  universidadCol: { flex: 1 },
  univTextBold: { fontSize: 8, fontWeight: 'bold', color: '#111827', fontFamily: 'serif' },
  facultadCol: { alignItems: 'flex-end', flex: 1.2 },
  facultadText: { fontSize: 8, fontWeight: 'bold', color: '#111827', fontFamily: 'serif', textAlign: 'right' },
  anioText: { fontSize: 9, fontStyle: 'italic', fontWeight: 'bold', textAlign: 'center', marginBottom: 10, fontFamily: 'serif' },
  lineaDelgada: { height: 1, backgroundColor: '#9CA3AF', width: '100%' },
  
  bodyApa: { flex: 1, justifyContent: 'flex-start', alignItems: 'flex-start', marginVertical: 24 },
  apaPlaceholderText: { fontFamily: 'serif', color: '#9CA3AF', fontSize: 12, textAlign: 'center' },

  footerOficialContainer: { width: '100%', alignItems: 'center', marginTop: 'auto' },
  lineaGruesaFooter: { height: 3, backgroundColor: '#111827', width: '100%', marginBottom: 2 },
  lineaDelgadaFooter: { height: 1, backgroundColor: '#111827', width: '100%', marginBottom: 8 },
  footerInfoText: { fontSize: 9, color: '#111827', fontFamily: 'serif' },
  footerInfoTextBold: { fontSize: 9, fontWeight: 'bold', color: '#111827', fontFamily: 'serif' },
});