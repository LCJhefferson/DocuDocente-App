import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { comprimirImagen } from '../../utils/imagenes';

interface ArchivoAdjunto {
  uri: string;
  name: string;
  type?: string;
}

interface ModalSubirEvidenciaProps {
  visible: boolean;
  onClose: () => void;
  nombreCurso?: string;
  unidadActual?: string;
  titulo?: string;
  subtitulo?: string;
  tipos?: string[];
  onGuardar: (evidencia: {
    nombreActividad: string;
    descripcion: string;
    tipoActividad: string;
    archivo: ArchivoAdjunto | null;
  }) => void;
}

const TIPOS_ACTIVIDAD = ['Sesión de clase', 'Evaluación', 'Otro'];

export const ModalSubirEvidencia: React.FC<ModalSubirEvidenciaProps> = ({
  visible,
  onClose,
  nombreCurso,
  unidadActual,
  titulo = 'Subir evidencia',
  subtitulo,
  tipos = TIPOS_ACTIVIDAD,
  onGuardar,
}) => {
  const { isDarkMode } = useTheme();

  const [nombreActividad, setNombreActividad] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [tipoSeleccionado, setTipoSeleccionado] = useState(tipos[0]);
  const [archivo, setArchivo] = useState<ArchivoAdjunto | null>(null);

  // Tomar Foto con Cámara
  const capturarFoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Se requiere acceso a la cámara.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setArchivo({
        uri: await comprimirImagen(asset.uri, asset.width),
        name: asset.fileName || `Evidencia_${Date.now()}.jpg`,
        type: 'image',
      });
    }
  };

  // Seleccionar de Galería
  const seleccionarGaleria = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Se requiere acceso a la galería.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setArchivo({
        uri: await comprimirImagen(asset.uri, asset.width),
        name: asset.fileName || `Imagen_${Date.now()}.jpg`,
        type: 'image',
      });
    }
  };

  // Seleccionar Documento o Archivo
  const seleccionarArchivo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const doc = result.assets[0];
        const esImagen = doc.mimeType?.startsWith('image/');
        setArchivo({
          uri: esImagen ? await comprimirImagen(doc.uri) : doc.uri,
          name: doc.name,
          type: doc.mimeType || 'file',
        });
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo seleccionar el archivo.');
    }
  };

  const handleGuardar = () => {
    if (!nombreActividad.trim()) {
      Alert.alert('Campo obligatorio', 'Por favor ingrese el nombre de la actividad.');
      return;
    }

    onGuardar({
      nombreActividad: nombreActividad.trim(),
      descripcion: descripcion.trim(),
      tipoActividad: tipoSeleccionado,
      archivo,
    });

    // Limpieza de campos al cerrar
    setNombreActividad('');
    setDescripcion('');
    setTipoSeleccionado(tipos[0]);
    setArchivo(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[
          styles.pantallaCompleta,
          { backgroundColor: isDarkMode ? '#0F172A' : '#FFFFFF' },
        ]}
        edges={['top', 'left', 'right', 'bottom']}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* CABECERA */}
          <Text style={[styles.tituloModal, { color: isDarkMode ? '#F8FAFC' : '#0F172A' }]}>
            {titulo}
          </Text>
          {(subtitulo || nombreCurso) && (
            <Text style={[styles.subtituloModal, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
              {subtitulo ?? `Curso: ${nombreCurso} · ${unidadActual}`}
            </Text>
          )}

          {/* ILUSTRACIÓN DE LA MASCOTA */}
          <View style={styles.contenedorMascota}>
            <Image
              source={require('../../../assets/images/arrendajo_evidencias.png')}
              style={styles.imagenMascota}
              resizeMode="contain"
            />
          </View>

          {/* BOTÓN VOLVER CIRCULAR */}
          <TouchableOpacity
            style={[
              styles.botonVolver,
              {
                backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
                borderColor: isDarkMode ? '#334155' : '#BAE6FD',
              },
            ]}
            onPress={onClose}
          >
            <Ionicons name="chevron-back" size={24} color={isDarkMode ? '#F8FAFC' : '#0F172A'} />
          </TouchableOpacity>

          {/* FORMULARIO */}
          <View style={styles.grupoCampo}>
            <Text style={[styles.label, { color: isDarkMode ? '#E2E8F0' : '#0F172A' }]}>
              Nombre de la Actividad
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC',
                  borderColor: isDarkMode ? '#334155' : '#E2E8F0',
                  color: isDarkMode ? '#F8FAFC' : '#0F172A',
                },
              ]}
              placeholder=""
              placeholderTextColor={isDarkMode ? '#64748B' : '#94A3B8'}
              value={nombreActividad}
              onChangeText={setNombreActividad}
            />
          </View>

          <View style={styles.grupoCampo}>
            <Text style={[styles.label, { color: isDarkMode ? '#E2E8F0' : '#0F172A' }]}>
              Descripción (opcional)
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC',
                  borderColor: isDarkMode ? '#334155' : '#E2E8F0',
                  color: isDarkMode ? '#F8FAFC' : '#0F172A',
                },
              ]}
              placeholder="Ej: Clase sobre React Navigation"
              placeholderTextColor="#94A3B8"
              value={descripcion}
              onChangeText={setDescripcion}
            />
          </View>

          {/* TIPO DE ACTIVIDAD */}
          <View style={styles.grupoCampo}>
            <Text style={[styles.label, { color: isDarkMode ? '#E2E8F0' : '#0F172A' }]}>
              Tipo de actividad
            </Text>
            <View style={styles.contenedorPills}>
              {tipos.map((tipo) => {
                const activo = tipoSeleccionado === tipo;
                return (
                  <TouchableOpacity
                    key={tipo}
                    style={[
                      styles.pillTipo,
                      { backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9' },
                      activo && [
                        styles.pillTipoActiva,
                        {
                          backgroundColor: isDarkMode ? '#172554' : '#E0F2FE',
                          borderColor: isDarkMode ? '#38BDF8' : '#0284C7',
                        },
                      ],
                    ]}
                    onPress={() => setTipoSeleccionado(tipo)}
                  >
                    <Text
                      style={[
                        styles.textoPill,
                        { color: isDarkMode ? '#94A3B8' : '#64748B' },
                        activo && [
                          styles.textoPillActivo,
                          { color: isDarkMode ? '#38BDF8' : '#0284C7' },
                        ],
                      ]}
                    >
                      {tipo}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ADJUNTAR ARCHIVOS */}
          <View style={styles.grupoCampo}>
            <Text style={[styles.label, { color: isDarkMode ? '#E2E8F0' : '#0F172A' }]}>
              Adjuntar archivos
            </Text>

            {/* ZONA DASHED */}
            <TouchableOpacity
              style={[
                styles.dropzoneDashed,
                {
                  backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
                  borderColor: isDarkMode ? '#334155' : '#CBD5E1',
                },
              ]}
              onPress={seleccionarGaleria}
              activeOpacity={0.7}
            >
              {archivo ? (
                <View style={styles.archivoInfo}>
                  <Ionicons name="document-attach" size={24} color={isDarkMode ? '#38BDF8' : '#0284C7'} />
                  <Text
                    style={[
                      styles.nombreArchivoSeleccionado,
                      { color: isDarkMode ? '#F8FAFC' : '#0F172A' },
                    ]}
                    numberOfLines={1}
                  >
                    {archivo.name}
                  </Text>
                  <TouchableOpacity onPress={() => setArchivo(null)}>
                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text
                    style={[
                      styles.textoDropzonePrincipal,
                      { color: isDarkMode ? '#94A3B8' : '#64748B' },
                    ]}
                  >
                    Toca para seleccionar fotos o archivos
                  </Text>
                  <Text style={[styles.textoDropzoneSecundario, { color: isDarkMode ? '#64748B' : '#94A3B8' }]}>
                    JPG, PNG, PDF · Máx. 10 MB
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* OPCIONES DE CARGA */}
            <View style={styles.contenedorBotonesAdjuntar}>
              <TouchableOpacity
                style={[styles.botonAdjuntar, { backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9' }]}
                onPress={capturarFoto}
              >
                <Text style={[styles.textoBotonAdjuntar, { color: isDarkMode ? '#E2E8F0' : '#334155' }]}>
                  Cámara
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.botonAdjuntar, { backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9' }]}
                onPress={seleccionarGaleria}
              >
                <Text style={[styles.textoBotonAdjuntar, { color: isDarkMode ? '#E2E8F0' : '#334155' }]}>
                  Galería
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.botonAdjuntar, { backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9' }]}
                onPress={seleccionarArchivo}
              >
                <Text style={[styles.textoBotonAdjuntar, { color: isDarkMode ? '#E2E8F0' : '#334155' }]}>
                  Archivo
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* BOTÓN GUARDAR EVIDENCIA */}
          <TouchableOpacity
            style={[styles.botonGuardar, { backgroundColor: isDarkMode ? '#0284C7' : '#2563EB' }]}
            onPress={handleGuardar}
          >
            <Text style={styles.textoBotonGuardar}>Guardar evidencia</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  pantallaCompleta: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
  },
  tituloModal: {
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
  },
  subtituloModal: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  contenedorMascota: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  imagenMascota: {
    width: 150,
    height: 150,
  },
  botonVolver: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  grupoCampo: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  contenedorPills: {
    flexDirection: 'row',
    gap: 10,
  },
  pillTipo: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  pillTipoActiva: {
    borderWidth: 1,
  },
  textoPill: {
    fontSize: 13,
    fontWeight: '500',
  },
  textoPillActivo: {
    fontWeight: '600',
  },
  dropzoneDashed: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  textoDropzonePrincipal: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  textoDropzoneSecundario: {
    fontSize: 11,
  },
  archivoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nombreArchivoSeleccionado: {
    fontSize: 13,
    fontWeight: '600',
    maxWidth: 200,
  },
  contenedorBotonesAdjuntar: {
    flexDirection: 'row',
    gap: 10,
  },
  botonAdjuntar: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  textoBotonAdjuntar: {
    fontSize: 13,
    fontWeight: '600',
  },
  botonGuardar: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  textoBotonGuardar: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});