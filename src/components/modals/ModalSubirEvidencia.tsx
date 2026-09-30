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
        uri: asset.uri,
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setArchivo({
        uri: asset.uri,
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
        setArchivo({
          uri: doc.uri,
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
      <SafeAreaView style={styles.pantallaCompleta} edges={['top', 'left', 'right', 'bottom']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* CABECERA */}
           <Text style={styles.tituloModal}>{titulo}</Text>
          {(subtitulo || nombreCurso) && (
            <Text style={styles.subtituloModal}>
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
          <TouchableOpacity style={styles.botonVolver} onPress={onClose}>
            <Ionicons name="chevron-back" size={24} color="#0F172A" />
          </TouchableOpacity>

          {/* FORMULARIO */}
          <View style={styles.grupoCampo}>
            <Text style={styles.label}>Nombre de la Actividad</Text>
            <TextInput
              style={styles.input}
              placeholder=""
              value={nombreActividad}
              onChangeText={setNombreActividad}
            />
          </View>

          <View style={styles.grupoCampo}>
            <Text style={styles.label}>Descripción (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Clase sobre React Navigation"
              placeholderTextColor="#94A3B8"
              value={descripcion}
              onChangeText={setDescripcion}
            />
          </View>

          {/* TIPO DE ACTIVIDAD */}
          <View style={styles.grupoCampo}>
            <Text style={styles.label}>Tipo de actividad</Text>
            <View style={styles.contenedorPills}>
              {tipos.map((tipo) => {
                const activo = tipoSeleccionado === tipo;
                return (
                  <TouchableOpacity
                    key={tipo}
                    style={[styles.pillTipo, activo && styles.pillTipoActiva]}
                    onPress={() => setTipoSeleccionado(tipo)}
                  >
                    <Text style={[styles.textoPill, activo && styles.textoPillActivo]}>
                      {tipo}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ADJUNTAR ARCHIVOS */}
          <View style={styles.grupoCampo}>
            <Text style={styles.label}>Adjuntar archivos</Text>

            {/* ZONA DASHED */}
            <TouchableOpacity
              style={styles.dropzoneDashed}
              onPress={seleccionarGaleria}
              activeOpacity={0.7}
            >
              {archivo ? (
                <View style={styles.archivoInfo}>
                  <Ionicons name="document-attach" size={24} color="#0284C7" />
                  <Text style={styles.nombreArchivoSeleccionado} numberOfLines={1}>
                    {archivo.name}
                  </Text>
                  <TouchableOpacity onPress={() => setArchivo(null)}>
                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={styles.textoDropzonePrincipal}>
                    Toca para seleccionar fotos o archivos
                  </Text>
                  <Text style={styles.textoDropzoneSecundario}>
                    JPG, PNG, PDF · Mág. 10 MB
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* OPCIONES DE CARGA */}
            <View style={styles.contenedorBotonesAdjuntar}>
              <TouchableOpacity style={styles.botonAdjuntar} onPress={capturarFoto}>
                <Text style={styles.textoBotonAdjuntar}>Cámara</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.botonAdjuntar} onPress={seleccionarGaleria}>
                <Text style={styles.textoBotonAdjuntar}>Galería</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.botonAdjuntar} onPress={seleccionarArchivo}>
                <Text style={styles.textoBotonAdjuntar}>Archivo</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* BOTÓN GUARDAR EVIDENCIA */}
          <TouchableOpacity style={styles.botonGuardar} onPress={handleGuardar}>
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
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
  },
  tituloModal: {
    fontSize: 22,
    fontWeight: '600',
    color: '#0F172A',
    textAlign: 'center',
  },
  subtituloModal: {
    fontSize: 13,
    color: '#64748B',
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
    borderColor: '#BAE6FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  grupoCampo: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
  },
  contenedorPills: {
    flexDirection: 'row',
    gap: 10,
  },
  pillTipo: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  pillTipoActiva: {
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#0284C7',
  },
  textoPill: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  textoPillActivo: {
    color: '#0284C7',
    fontWeight: '600',
  },
  dropzoneDashed: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  textoDropzonePrincipal: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 4,
  },
  textoDropzoneSecundario: {
    fontSize: 11,
    color: '#94A3B8',
  },
  archivoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nombreArchivoSeleccionado: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
    maxWidth: 200,
  },
  contenedorBotonesAdjuntar: {
    flexDirection: 'row',
    gap: 10,
  },
  botonAdjuntar: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  textoBotonAdjuntar: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  botonGuardar: {
    backgroundColor: '#2563EB',
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