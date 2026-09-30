import { Ionicons } from '@expo/vector-icons'; // Importamos los íconos
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, FlatList, Image, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface Plantilla {
  id: string; 
  nombreInstitucion: string;
  nombreFacultad: string;
  tituloAnoEncabezado: string;
  logoUri: string;
  formato: string; // Agregamos el formato a la base de datos
  esPredeterminada: boolean;
}

export default function PlantillasScreen() {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([
    {
      id: '1',
      nombreInstitucion: 'UNIVERSIDAD NACIONAL TORIBIO RODRÍGUEZ DE MENDOZA DE AMAZONAS',
      nombreFacultad: 'Facultad de Ingeniería de Sistemas y Mecánica Eléctrica',
      tituloAnoEncabezado: '"Año de la Esperanza y el Fortalecimiento de la Democracia"',
      logoUri: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/95/Logo-2016-solo-ok.png/960px-Logo-2016-solo-ok.png',
      formato: 'APA 7',
      esPredeterminada: true,
    }
  ]);

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [plantillaPreview, setPlantillaPreview] = useState<Plantilla | null>(null);

  // Estados del Formulario
  const [nombreInstitucion, setNombreInstitucion] = useState('');
  const [nombreFacultad, setNombreFacultad] = useState('');
  const [tituloAnoEncabezado, setTituloAnoEncabezado] = useState('');
  const [logoUri, setLogoUri] = useState('');
  const [formatoSeleccionado, setFormatoSeleccionado] = useState('APA 7'); // Estado para el formato

  const formatosDisponibles = ['APA 7', 'IEEE', 'Vancouver'];

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

    const nuevaPlantilla = {
      id: Date.now().toString(),
      nombreInstitucion,
      nombreFacultad,
      tituloAnoEncabezado,
      logoUri,
      formato: formatoSeleccionado,
      esPredeterminada: true 
    };

    const listaActualizada = plantillas.map(p => ({ ...p, esPredeterminada: false }));
    setPlantillas([nuevaPlantilla, ...listaActualizada]);
    
    setNombreInstitucion(''); setNombreFacultad(''); setTituloAnoEncabezado(''); setLogoUri(''); setFormatoSeleccionado('APA 7');
    setMostrarFormulario(false);
    Alert.alert('Éxito', 'Plantilla guardada y asignada como predeterminada.');
  };

  const hacerPredeterminada = (id: string) => {
    const listaActualizada = plantillas.map(p => ({
      ...p, esPredeterminada: p.id === id
    }));
    setPlantillas(listaActualizada);
  };

  const abrirPrevisualizacion = (item: Plantilla) => {
    setPlantillaPreview(item);
    setModalVisible(true);
  };

  const renderItem = ({ item }: { item: Plantilla }) => (
    <View style={[styles.cardList, item.esPredeterminada && styles.cardListActive]}>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle}>{item.nombreInstitucion}</Text>
        <Text style={styles.cardSubtitle}>{item.nombreFacultad}</Text>
        <Text style={styles.cardFormatText}>Formato: {item.formato}</Text>
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
          <FlatList data={plantillas} keyExtractor={(item) => item.id} renderItem={renderItem} contentContainerStyle={{ paddingBottom: 20, marginTop: 15 }} showsVerticalScrollIndicator={false} />
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
                    {plantillaPreview.logoUri ? (
                      <Image source={{ uri: plantillaPreview.logoUri }} style={styles.logoOficial} resizeMode="contain" />
                    ) : (
                      <View style={styles.logoPlaceholder}><Text style={{fontSize:8, color:'#9CA3AF'}}>LOGO</Text></View>
                    )}
                    <View style={styles.separatorVertical}></View>
                    <View style={styles.universidadCol}>
                      <Text style={styles.univTextBold}>{plantillaPreview.nombreInstitucion.toUpperCase()}</Text>
                    </View>
                    <View style={styles.facultadCol}>
                      <Text style={styles.facultadText}>{plantillaPreview.nombreFacultad}</Text>
                    </View>
                  </View>
                  <Text style={styles.anioText}>{plantillaPreview.tituloAnoEncabezado}</Text>
                  <View style={styles.lineaDelgada} />
                </View>

                {/* CUERPO SIMULADO */}
                <View style={styles.bodyApa}>
                   <Text style={styles.apaPlaceholderText}>[Cuerpo del documento en formato {plantillaPreview.formato}]</Text>
                </View>

                {/* PIE DE PÁGINA OFICIAL POR DEFECTO */}
                <View style={styles.footerOficialContainer}>
                  <View style={styles.lineaGruesaFooter} />
                  <View style={styles.lineaDelgadaFooter} />
                  <Text style={styles.footerInfoText}>
                    Jr. Libertad N° 1300, Teléfono 041-310116, Bagua-Amazonas-Perú
                  </Text>
                  <Text style={styles.footerInfoTextBold}>
                    E-mail: fisme@untrm.edu.pe / www.untrm.edu.pe
                  </Text>
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
  logoPlaceholder: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#E5E7EB', marginRight: 10, justifyContent: 'center', alignItems: 'center' },
  separatorVertical: { width: 1, height: 45, backgroundColor: '#D1D5DB', marginRight: 10 },
  universidadCol: { flex: 1 },
  univTextBold: { fontSize: 8, fontWeight: 'bold', color: '#111827', fontFamily: 'serif' },
  facultadCol: { alignItems: 'flex-end', flex: 1.2 },
  facultadText: { fontSize: 8, fontWeight: 'bold', color: '#111827', fontFamily: 'serif', textAlign: 'right' },
  anioText: { fontSize: 9, fontStyle: 'italic', fontWeight: 'bold', textAlign: 'center', marginBottom: 10, fontFamily: 'serif' },
  lineaDelgada: { height: 1, backgroundColor: '#9CA3AF', width: '100%' },
  
  // Cuerpo Preview
  bodyApa: { flex: 1, justifyContent: 'center', alignItems: 'center', marginVertical: 40 },
  apaPlaceholderText: { fontFamily: 'serif', color: '#9CA3AF', fontSize: 12, textAlign: 'center' },

  // Pie de Página Preview (NUEVO)
  footerOficialContainer: { width: '100%', alignItems: 'center', marginTop: 'auto' },
  lineaGruesaFooter: { height: 3, backgroundColor: '#111827', width: '100%', marginBottom: 2 },
  lineaDelgadaFooter: { height: 1, backgroundColor: '#111827', width: '100%', marginBottom: 8 },
  footerInfoText: { fontSize: 9, color: '#111827', fontFamily: 'serif' },
  footerInfoTextBold: { fontSize: 9, fontWeight: 'bold', color: '#111827', fontFamily: 'serif' },
});