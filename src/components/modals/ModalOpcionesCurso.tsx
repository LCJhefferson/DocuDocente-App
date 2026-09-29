import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Curso } from '../../models/Curso';

interface Props {
  visible: boolean;
  curso: Curso | null;
  onClose: () => void;
  onUpdate: (
    cursoId: string,
    datos: { nombre: string; codigo: string; ciclo: string; semestre: string }
  ) => Promise<void>;
  onDelete: (curso: Curso) => void;
  onGenerarReporte: (cursoId: string) => void;
}

export const ModalOpcionesCurso: React.FC<Props> = ({
  visible,
  curso,
  onClose,
  onUpdate,
  onDelete,
  onGenerarReporte,
}) => {
  const [modoEdicion, setModoEdicion] = useState(false);
  const [editNombre, setEditNombre] = useState('');
  const [editCodigo, setEditCodigo] = useState('');
  const [editCiclo, setEditCiclo] = useState('');
  const [editSemestre, setEditSemestre] = useState('');
  const [actualizando, setActualizando] = useState(false);

  useEffect(() => {
    if (curso) {
      setEditNombre(curso.nombre);
      setEditCodigo(curso.codigo || '');
      setEditCiclo(curso.ciclo || '');
      setEditSemestre(curso.semestre || '');
    }
    setModoEdicion(false);
  }, [curso, visible]);

  if (!curso) return null;

  const manejarEditar = async () => {
    if (!editNombre.trim() || !editCiclo.trim() || !editSemestre.trim()) {
      Alert.alert('Atención', 'Por favor complete el nombre, ciclo y semestre.');
      return;
    }

    setActualizando(true);
    try {
      await onUpdate(curso.id, {
        nombre: editNombre.trim(),
        codigo: editCodigo.trim(),
        ciclo: editCiclo.trim(),
        semestre: editSemestre.trim(),
      });
      setModoEdicion(false);
      Alert.alert('Éxito', 'El curso ha sido actualizado correctamente.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo actualizar el curso.');
    } finally {
      setActualizando(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalPantallaCompleta}>
        {!modoEdicion ? (
          <View style={styles.contenidoOpciones}>
            <View style={styles.seccionSuperiorOpciones}>
              <TouchableOpacity onPress={onClose} style={styles.botonVolverCircle}>
                <Ionicons name="chevron-back" size={26} color="#1E293B" />
              </TouchableOpacity>

              <View style={styles.contenedorImagenOpciones}>
                <Image
                  source={require('../../../assets/images/arrendajo_opciones_curso.png')}
                  style={styles.imagenOpciones}
                  resizeMode="contain"
                />
              </View>
            </View>

            <View style={styles.tarjetaResumenCurso}>
              <Text style={styles.resumenNombre}>{curso.nombre}</Text>
              <Text style={styles.resumenDetalle}>
                {curso.ciclo ? `${curso.ciclo} ciclo` : ''}
                {curso.semestre ? ` • ${curso.semestre}` : ''}
                {curso.codigo ? ` • ${curso.codigo}` : ''}
              </Text>
            </View>

            <View style={styles.contenedorOpcionesSeparadas}>
              <TouchableOpacity
                style={styles.tarjetaOpcionIndividual}
                onPress={() => setModoEdicion(true)}
                activeOpacity={0.8}
              >
                <View style={styles.iconoCuadro}>
                  <Ionicons name="create-outline" size={26} color="#00a108" />
                </View>
                <View style={styles.textoOpcionContainer}>
                  <Text style={[styles.tituloOpcion, { color: '#00a108' }]}>Editar curso</Text>
                  <Text style={styles.subtituloOpcion}>Modificar nombre, ciclo o código</Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color="#1E293B" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.tarjetaOpcionIndividual}
                onPress={() => onGenerarReporte(curso.id)}
                activeOpacity={0.8}
              >
                <View style={styles.iconoCuadro}>
                  <Ionicons name="document-text-outline" size={26} color="#38BDF8" />
                </View>
                <View style={styles.textoOpcionContainer}>
                  <Text style={[styles.tituloOpcion, { color: '#38BDF8' }]}>Generar Reporte</Text>
                  <Text style={styles.subtituloOpcion}>Aplicar filtros y exportar PDF/Word</Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color="#1E293B" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.tarjetaOpcionIndividual}
                onPress={() => onDelete(curso)}
                activeOpacity={0.8}
              >
                <View style={styles.iconoCuadro}>
                  <Ionicons name="trash-outline" size={26} color="#EF4444" />
                </View>
                <View style={styles.textoOpcionContainer}>
                  <Text style={[styles.tituloOpcion, { color: '#EF4444' }]}>Eliminar curso</Text>
                  <Text style={styles.subtituloOpcion}>Borrar este curso permanentemente</Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color="#1E293B" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.contenedorCentroEdicion}>
            <View style={styles.headerEdicionSuperior}>
              <TouchableOpacity
                onPress={() => setModoEdicion(false)}
                style={styles.botonVolverCircleEdicion}
              >
                <Ionicons name="chevron-back" size={24} color="#1E293B" />
              </TouchableOpacity>
              <Text style={styles.tituloHeaderEdicion}>Editar Curso</Text>
            </View>

            <View style={styles.tarjetaEdicionCentrada}>
              <View style={styles.cuerpoFormularioEdicion}>
                <Text style={styles.etiqueta}>Nombre de la Asignatura *</Text>
                <TextInput
                  style={styles.entradaTextoEdicion}
                  value={editNombre}
                  onChangeText={setEditNombre}
                  placeholder="Nombre del curso"
                />

                <View style={styles.filaCampos}>
                  <View style={{ flex: 1, marginRight: 6 }}>
                    <Text style={styles.etiqueta}>Ciclo *</Text>
                    <TextInput
                      style={styles.entradaTextoEdicion}
                      value={editCiclo}
                      onChangeText={setEditCiclo}
                      placeholder="Ciclo"
                    />
                  </View>

                  <View style={{ flex: 1, marginLeft: 6 }}>
                    <Text style={styles.etiqueta}>Semestre *</Text>
                    <TextInput
                      style={styles.entradaTextoEdicion}
                      value={editSemestre}
                      onChangeText={setEditSemestre}
                      placeholder="Semestre"
                    />
                  </View>
                </View>

                <Text style={styles.etiqueta}>Código de Curso (Opcional)</Text>
                <TextInput
                  style={styles.entradaTextoEdicion}
                  value={editCodigo}
                  onChangeText={setEditCodigo}
                  placeholder="Código"
                />
              </View>

              <View style={styles.modalBotonesEdicion}>
                <TouchableOpacity
                  style={[styles.botonModal, styles.botonCancelar]}
                  onPress={() => setModoEdicion(false)}
                >
                  <Text style={styles.textoBotonCancelar}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.botonModal, styles.botonGuardar]}
                  onPress={manejarEditar}
                  disabled={actualizando}
                >
                  {actualizando ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.textoBotonGuardar}>Guardar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalPantallaCompleta: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contenidoOpciones: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  seccionSuperiorOpciones: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  botonVolverCircle: {
    position: 'absolute',
    left: 0,
    top: 10,
    zIndex: 10,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#38BDF8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contenedorImagenOpciones: {
    width: 170,
    height: 170,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagenOpciones: {
    width: '100%',
    height: '100%',
  },
  tarjetaResumenCurso: {
    backgroundColor: '#80CAFF',
    borderRadius: 45,
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  resumenNombre: {
    fontSize: 18,
    color: '#000000',
    textAlign: 'center',
    fontWeight: '600',
  },
  resumenDetalle: {
    fontSize: 14,
    color: '#000000',
    marginTop: 4,
    textAlign: 'center',
  },
  contenedorOpcionesSeparadas: {
    gap: 14,
  },
  tarjetaOpcionIndividual: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#1E293B',
  },
  iconoCuadro: {
    width: 36,
    height: 36,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoOpcionContainer: {
    flex: 1,
  },
  tituloOpcion: {
    fontSize: 16,
    fontWeight: '700',
  },
  subtituloOpcion: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  contenedorCentroEdicion: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    backgroundColor: '#FFFFFF',
  },
  headerEdicionSuperior: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  botonVolverCircleEdicion: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#38BDF8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  tituloHeaderEdicion: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  tarjetaEdicionCentrada: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
  },
  cuerpoFormularioEdicion: {
    width: '100%',
  },
  etiqueta: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5B63',
    marginBottom: 4,
  },
  entradaTextoEdicion: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    fontSize: 14,
    color: '#1E293B',
  },
  filaCampos: {
    flexDirection: 'row',
  },
  modalBotonesEdicion: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    gap: 12,
  },
  botonModal: {
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  botonCancelar: {
    backgroundColor: '#E5E9EB',
  },
  botonGuardar: {
    backgroundColor: '#1E88E5',
  },
  textoBotonCancelar: {
    color: '#334148',
    fontWeight: '600',
  },
  textoBotonGuardar: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});