import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { ModalAlerta, TipoAlerta } from './ModalAlerta';

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

  // Estado del modal de alerta personalizado
  const [alerta, setAlerta] = useState<{
    visible: boolean;
    tipo: TipoAlerta;
    titulo: string;
    mensaje: string;
    onConfirmar?: () => void;
    textoBotonPrincipal?: string;
  }>({
    visible: false,
    tipo: 'exito',
    titulo: '',
    mensaje: '',
  });

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

  const mostrarAlerta = (
    tipo: TipoAlerta,
    titulo: string,
    mensaje: string,
    onConfirmar?: () => void,
    textoBotonPrincipal?: string
  ) => {
    setAlerta({
      visible: true,
      tipo,
      titulo,
      mensaje,
      onConfirmar,
      textoBotonPrincipal,
    });
  };

  const cerrarAlerta = () => {
    setAlerta((prev) => ({ ...prev, visible: false }));
  };

  const manejarEditar = async () => {
    if (!editNombre.trim() || !editCiclo.trim() || !editSemestre.trim()) {
      mostrarAlerta(
        'advertencia',
        'Campos incompletos',
        'Por favor completa el nombre del curso, ciclo y semestre antes de guardar.'
      );
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
      mostrarAlerta(
        'exito',
        '¡Éxito!',
        'El curso ha sido actualizado correctamente.'
      );
    } catch (error: any) {
      mostrarAlerta(
        'error',
        'Error al actualizar',
        error.message || 'No se pudo actualizar el curso.'
      );
    } finally {
      setActualizando(false);
    }
  };

  const confirmarEliminacion = () => {
    mostrarAlerta(
      'confirmacion',
      '¿Eliminar curso?',
      `Esta acción eliminará el curso "${curso.nombre}" permanentemente y no se podrá deshacer.`,
      () => {
        cerrarAlerta();
        onDelete(curso);
      },
      'Sí, eliminar'
    );
  };

  return (
    <>
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
                  {[
                    curso.ciclo ? `${curso.ciclo} ciclo` : null,
                    curso.semestre ? curso.semestre : null,
                    curso.codigo ? curso.codigo : null,
                  ]
                    .filter(Boolean)
                    .join(' • ')}
                </Text>
              </View>

              <View style={styles.contenedorOpcionesSeparadas}>
                <TouchableOpacity
                  style={styles.tarjetaOpcionIndividual}
                  onPress={() => setModoEdicion(true)}
                  activeOpacity={0.8}
                >
                  <View style={styles.iconoCuadro}>
                    <Ionicons name="create-outline" size={26} color="#10B981" />
                  </View>
                  <View style={styles.textoOpcionContainer}>
                    <Text style={[styles.tituloOpcion, { color: '#059669' }]}>Editar curso</Text>
                    <Text style={styles.subtituloOpcion}>Modificar nombre, ciclo o código</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={22} color="#64748B" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.tarjetaOpcionIndividual}
                  onPress={() => onGenerarReporte(curso.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.iconoCuadro}>
                    <Ionicons name="document-text-outline" size={26} color="#0284C7" />
                  </View>
                  <View style={styles.textoOpcionContainer}>
                    <Text style={[styles.tituloOpcion, { color: '#0284C7' }]}>Generar Reporte</Text>
                    <Text style={styles.subtituloOpcion}>Aplicar filtros y exportar PDF/Word</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={22} color="#64748B" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.tarjetaOpcionIndividual}
                  onPress={confirmarEliminacion}
                  activeOpacity={0.8}
                >
                  <View style={styles.iconoCuadro}>
                    <Ionicons name="trash-outline" size={26} color="#EF4444" />
                  </View>
                  <View style={styles.textoOpcionContainer}>
                    <Text style={[styles.tituloOpcion, { color: '#EF4444' }]}>Eliminar curso</Text>
                    <Text style={styles.subtituloOpcion}>Borrar este curso permanentemente</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={22} color="#64748B" />
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
                    placeholderTextColor="#94A3B8"
                  />

                  <View style={styles.filaCampos}>
                    <View style={{ flex: 1, marginRight: 6 }}>
                      <Text style={styles.etiqueta}>Ciclo *</Text>
                      <TextInput
                        style={styles.entradaTextoEdicion}
                        value={editCiclo}
                        onChangeText={setEditCiclo}
                        placeholder="Ciclo"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>

                    <View style={{ flex: 1, marginLeft: 6 }}>
                      <Text style={styles.etiqueta}>Semestre *</Text>
                      <TextInput
                        style={styles.entradaTextoEdicion}
                        value={editSemestre}
                        onChangeText={setEditSemestre}
                        placeholder="Semestre"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                  </View>

                  <Text style={styles.etiqueta}>Código de Curso (Opcional)</Text>
                  <TextInput
                    style={styles.entradaTextoEdicion}
                    value={editCodigo}
                    onChangeText={setEditCodigo}
                    placeholder="Código"
                    placeholderTextColor="#94A3B8"
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

      {/* Componente Modular de Alerta / Feedback */}
      <ModalAlerta
        visible={alerta.visible}
        tipo={alerta.tipo}
        titulo={alerta.titulo}
        mensaje={alerta.mensaje}
        onClose={cerrarAlerta}
        onConfirmar={alerta.onConfirmar}
        textoBotonPrincipal={alerta.textoBotonPrincipal}
      />
    </>
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
    backgroundColor: '#E0F2FE',
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  resumenNombre: {
    fontSize: 18,
    color: '#0F172A',
    textAlign: 'center',
    fontWeight: '700',
  },
  resumenDetalle: {
    fontSize: 14,
    color: '#0284C7',
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '500',
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
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconoCuadro: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cuerpoFormularioEdicion: {
    width: '100%',
  },
  etiqueta: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
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
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  botonCancelar: {
    backgroundColor: '#F1F5F9',
  },
  botonGuardar: {
    backgroundColor: '#0284C7',
  },
  textoBotonCancelar: {
    color: '#475569',
    fontWeight: '600',
  },
  textoBotonGuardar: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});