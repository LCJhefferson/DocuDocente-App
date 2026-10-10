import { Ionicons } from '@expo/vector-icons'; // Importamos los íconos
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Image, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { NormaFormato, Plantilla } from '../../src/models/Plantilla';
import { plantillaService } from '../../src/services/plantillaService';
import { esLogoIncluido, fuenteLogo, guardarLogoPermanente } from '../../src/utils/logos';
import { definicionDesdeEncabezado } from '../../src/utils/plantillaBase';
import { ResultadoAnalisis } from '../../src/components/plantillas/ResultadoAnalisis';
import { DefinicionPlantilla } from '../../src/models/Plantilla';
import { importarWordService } from '../../src/services/importarWordService';
import { AnalisisDocx } from '../../src/utils/analizarDocx';
import {
  CATALOGO,
  TipoCatalogo,
  VarianteCabecera,
  definicionDelCatalogo,
  nombreDelCatalogo,
  titulosNumerados,
} from '../../src/data/catalogoPlantillas';

export default function PlantillasScreen() {
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

  // Cabecera elegida en cada plantilla del catálogo (A: sin logo FISME, B: con logo FISME)
  const [variantes, setVariantes] = useState<Record<TipoCatalogo, VarianteCabecera>>({ unidad: 'B', fin_ciclo: 'B' });

  // Lee las plantillas guardadas cada vez que se entra a la pestaña
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

  // Guarda una copia del catálogo como plantilla propia del docente y la deja predeterminada
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
    <View style={[styles.cardList, item.esPredeterminada && styles.cardListActive]}>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle}>{item.nombre}</Text>
        <Text style={styles.cardSubtitle}>{item.definicion.cabecera.textoIzquierdo.join(' ')}</Text>
        <Text style={styles.cardFormatText}>Formato: {item.definicion.formato.norma}</Text>
        {item.esPredeterminada && (
          <View style={styles.badge}><Text style={styles.badgeText}>Predeterminada</Text></View>
        )}
      </View>
      
      <View style={styles.actionButtonsRow}>
        <TouchableOpacity style={styles.btnVer} onPress={() => abrirPrevisualizacion(item)}>
          <Text style={styles.btnVerText}>Ver</Text>
        </TouchableOpacity>
        
        {!item.esPredeterminada && (
          <TouchableOpacity style={styles.btnActionList} onPress={() => hacerPredeterminada(item.id)}>
            <Text style={styles.btnActionListText}>Usar</Text>
          </TouchableOpacity>
        )}

        {!item.esPredeterminada && (
          <TouchableOpacity style={styles.btnVer} onPress={() => eliminarPlantilla(item)} accessibilityLabel="Eliminar plantilla">
            <Ionicons name="trash-outline" size={16} color="#B91C1C" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>Configuración de Plantillas</Text>
        <Text style={styles.subtitle}>Define los datos del encabezado y el formato que leerá el PDF.</Text>
      </View>

      {!mostrarFormulario ? (
        <View style={styles.listContainer}>
          <TouchableOpacity style={styles.btnPrimary} onPress={() => setMostrarFormulario(true)}>
            <Text style={styles.btnPrimaryText}>+ Crear Nueva Plantilla</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btnWord, importando && { opacity: 0.6 }]} onPress={subirWord} disabled={importando}>
            <Ionicons name="document-text-outline" size={18} color="#2563EB" />
            <Text style={styles.btnWordText}>{importando ? 'Analizando documento…' : 'Subir plantilla en Word'}</Text>
          </TouchableOpacity>
          <FlatList data={plantillas} keyExtractor={(item) => item.id} renderItem={renderItem} ListHeaderComponent={
            <View>
              <Text style={styles.seccionTitulo}>Catálogo</Text>
              {CATALOGO.map((c) => (
                <View key={c.tipo} style={styles.cardCatalogo}>
                  <Text style={styles.cardTitle}>{c.nombre}</Text>
                  <Text style={styles.cardSubtitle}>{c.descripcion}</Text>
                  <View style={styles.formatRow}>
                    {(['A', 'B'] as VarianteCabecera[]).map((v) => (
                      <TouchableOpacity
                        key={v}
                        style={[styles.formatBtn, variantes[c.tipo] === v && styles.formatBtnActive]}
                        onPress={() => setVariantes((actual) => ({ ...actual, [c.tipo]: v }))}
                      >
                        <Text style={[styles.formatBtnText, variantes[c.tipo] === v && styles.formatBtnTextActive]}>
                          {v === 'A' ? 'Sin logo FISME' : 'Con logo FISME'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={[styles.actionButtonsRow, { marginTop: 10, justifyContent: 'flex-end' }]}>
                    <TouchableOpacity style={styles.btnVer} onPress={() => abrirPrevisualizacion(plantillaDelCatalogo(c.tipo))}>
                      <Text style={styles.btnVerText}>Ver</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btnActionList} onPress={() => usarDelCatalogo(c.tipo)}>
                      <Text style={styles.btnActionListText}>Usar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              <Text style={styles.seccionTitulo}>Mis plantillas</Text>
            </View>
          } ListEmptyComponent={<Text style={styles.subtitle}>Aún no hay plantillas. Crea la primera con el botón de arriba.</Text>} contentContainerStyle={{ paddingBottom: 20, marginTop: 15 }} showsVerticalScrollIndicator={false} />
        </View>
      ) : (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <TouchableOpacity style={styles.btnBack} onPress={() => setMostrarFormulario(false)}>
            <Text style={styles.btnBackText}>← Cancelar y volver</Text>
          </TouchableOpacity>

          <View style={styles.formCard}>
            
            {/* SELECTOR DE FORMATO (NUEVO) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Formato del Documento:</Text>
              <View style={styles.formatRow}>
                {formatosDisponibles.map((fmt) => (
                  <TouchableOpacity 
                    key={fmt} 
                    style={[styles.formatBtn, formatoSeleccionado === fmt && styles.formatBtnActive]}
                    onPress={() => setFormatoSeleccionado(fmt)}
                  >
                    <Text style={[styles.formatBtnText, formatoSeleccionado === fmt && styles.formatBtnTextActive]}>
                      {fmt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nombre de la Institución:</Text>
              <TextInput style={styles.input} value={nombreInstitucion} onChangeText={setNombreInstitucion} multiline />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nombre de la Facultad:</Text>
              <TextInput style={styles.input} value={nombreFacultad} onChangeText={setNombreFacultad} multiline />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Título o Año del Encabezado:</Text>
              <TextInput style={styles.input} value={tituloAnoEncabezado} onChangeText={setTituloAnoEncabezado} multiline />
            </View>

            {/* CAJA DE SUBIDA DE LOGO (NUEVO DISEÑO) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Logo de la Institución:</Text>
              <TouchableOpacity style={styles.uploadBox} onPress={seleccionarLogo}>
                {logoUri ? (
                  <Image source={{ uri: logoUri }} style={styles.uploadedLogo} resizeMode="contain" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={32} color="#9CA3AF" />
                    <Text style={styles.uploadText}>Subir Logo</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

          </View>
          <TouchableOpacity style={styles.btnGuardar} onPress={guardarNuevaPlantilla}>
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
          <View style={styles.modalContent}>
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
                    {/* El logo horizontal de la UNTRM ya trae el nombre: no se repite el texto */}
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

                {/* PIE DE PÁGINA OFICIAL POR DEFECTO */}
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
  safeArea: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { padding: 16, backgroundColor: '#F3F4F6', zIndex: 10 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  listContainer: { flex: 1, paddingHorizontal: 16 },
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  
  // Lista
  seccionTitulo: { fontSize: 13, fontWeight: 'bold', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 8, marginBottom: 8 },
  cardCatalogo: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 1, gap: 6 },
  seccionPreview: { fontFamily: 'serif', fontSize: 10, fontWeight: 'bold', color: '#111827', alignSelf: 'flex-start', marginBottom: 6 },
  cardList: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderLeftWidth: 4, borderLeftColor: '#D1D5DB' },
  cardListActive: { borderLeftColor: '#2563EB', backgroundColor: '#EFF6FF' },
  cardInfo: { flex: 1, paddingRight: 10 },
  cardTitle: { fontSize: 13, fontWeight: 'bold', color: '#111827', marginBottom: 2 },
  cardSubtitle: { fontSize: 12, color: '#4B5563', marginBottom: 2 },
  cardFormatText: { fontSize: 11, color: '#9CA3AF', fontStyle: 'italic', marginBottom: 6 },
  badge: { backgroundColor: '#DBEAFE', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 10, color: '#1D4ED8', fontWeight: 'bold' },
  
  actionButtonsRow: { flexDirection: 'row', gap: 6 },
  btnVer: { backgroundColor: '#E5E7EB', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  btnVerText: { fontSize: 12, fontWeight: 'bold', color: '#374151' },
  btnActionList: { backgroundColor: '#2563EB', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  btnActionListText: { fontSize: 12, fontWeight: 'bold', color: '#FFFFFF' },
  
  // Formulario
  formCard: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, elevation: 2, marginBottom: 20 },
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, fontSize: 13, backgroundColor: '#F9FAFB' },
  
  // Selector de Formato
  formatRow: { flexDirection: 'row', gap: 8 },
  formatBtn: { flex: 1, paddingVertical: 10, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, alignItems: 'center', backgroundColor: '#F9FAFB' },
  formatBtnActive: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  formatBtnText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  formatBtnTextActive: { color: '#2563EB', fontWeight: 'bold' },

  // Caja de Subida de Logo
  uploadBox: { height: 120, borderWidth: 2, borderColor: '#D1D5DB', borderStyle: 'dashed', borderRadius: 8, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center' },
  uploadText: { marginTop: 8, fontSize: 13, color: '#6B7280', fontWeight: '500' },
  uploadedLogo: { width: 100, height: 100, borderRadius: 8 },
  
  // Botones Generales
  btnPrimary: { backgroundColor: '#2563EB', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  btnPrimaryText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
  btnWord: { flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#2563EB', paddingVertical: 12, borderRadius: 8, marginTop: 10 },
  btnWordText: { color: '#2563EB', fontWeight: 'bold', fontSize: 14 },
  btnGuardar: { backgroundColor: '#2563EB', paddingVertical: 16, borderRadius: 8, alignItems: 'center', elevation: 3 },
  btnBack: { alignSelf: 'flex-start', marginBottom: 15, padding: 5 },
  btnBackText: { color: '#4B5563', fontWeight: 'bold', fontSize: 14 },

  // Modal (Previsualización)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 500, backgroundColor: '#F3F4F6', borderRadius: 12, overflow: 'hidden', maxHeight: '85%' },
  btnCerrarModal: { backgroundColor: '#111827', padding: 15, alignItems: 'center' },
  btnCerrarModalText: { color: '#FFFFFF', fontWeight: 'bold' },
  
  // Hoja A4 dentro del Modal
  paperScroll: { backgroundColor: '#FFFFFF' },
  paperContainer: { padding: 24, minHeight: 450, justifyContent: 'space-between' },
  
  // Encabezado Preview
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
  
  // Cuerpo Preview
  bodyApa: { flex: 1, justifyContent: 'flex-start', alignItems: 'flex-start', marginVertical: 24 },
  apaPlaceholderText: { fontFamily: 'serif', color: '#9CA3AF', fontSize: 12, textAlign: 'center' },

  // Pie de Página Preview (NUEVO)
  footerOficialContainer: { width: '100%', alignItems: 'center', marginTop: 'auto' },
  lineaGruesaFooter: { height: 3, backgroundColor: '#111827', width: '100%', marginBottom: 2 },
  lineaDelgadaFooter: { height: 1, backgroundColor: '#111827', width: '100%', marginBottom: 8 },
  footerInfoText: { fontSize: 9, color: '#111827', fontFamily: 'serif' },
  footerInfoTextBold: { fontSize: 9, fontWeight: 'bold', color: '#111827', fontFamily: 'serif' },
});