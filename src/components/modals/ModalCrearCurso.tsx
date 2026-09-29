import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (datos: { nombre: string; codigo: string; ciclo: string; semestre: string }) => Promise<void>;
}

export const ModalCrearCurso: React.FC<Props> = ({ visible, onClose, onSubmit }) => {
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [ciclo, setCiclo] = useState('');
  const [semestre, setSemestre] = useState('');
  const [guardando, setGuardando] = useState(false);

  const manejarGuardar = async () => {
    if (!nombre.trim() || !ciclo.trim() || !semestre.trim()) {
      Alert.alert('Atención', 'Por favor complete el nombre, ciclo y semestre.');
      return;
    }

    setGuardando(true);
    try {
      await onSubmit({
        nombre: nombre.trim(),
        codigo: codigo.trim(),
        ciclo: ciclo.trim(),
        semestre: semestre.trim(),
      });
      setNombre('');
      setCodigo('');
      setCiclo('');
      setSemestre('');
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo crear el curso.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.modalFondo}>
        <View style={styles.modalTarjeta}>
          <Text style={styles.modalTitulo}>Crear Nuevo Curso</Text>

          <Text style={styles.etiqueta}>Nombre de la Asignatura *</Text>
          <TextInput
            style={styles.entradaTextoModal}
            value={nombre}
            onChangeText={setNombre}
            placeholder="Ej. Desarrollo de Aplicaciones"
          />

          <View style={styles.filaCampos}>
            <View style={{ flex: 1, marginRight: 6 }}>
              <Text style={styles.etiqueta}>Ciclo *</Text>
              <TextInput
                style={styles.entradaTextoModal}
                value={ciclo}
                onChangeText={setCiclo}
                placeholder="Ej. V"
              />
            </View>

            <View style={{ flex: 1, marginLeft: 6 }}>
              <Text style={styles.etiqueta}>Semestre *</Text>
              <TextInput
                style={styles.entradaTextoModal}
                value={semestre}
                onChangeText={setSemestre}
                placeholder="Ej. 2026-I"
              />
            </View>
          </View>

          <Text style={styles.etiqueta}>Código de Curso (Opcional)</Text>
          <TextInput
            style={styles.entradaTextoModal}
            value={codigo}
            onChangeText={setCodigo}
            placeholder="Ej. INF-101"
          />

          <View style={styles.modalBotones}>
            <TouchableOpacity style={[styles.botonModal, styles.botonCancelar]} onPress={onClose}>
              <Text style={styles.textoBotonCancelar}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.botonModal, styles.botonGuardar]}
              onPress={manejarGuardar}
              disabled={guardando}
            >
              {guardando ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.textoBotonGuardar}>Guardar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalFondo: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalTarjeta: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitulo: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C252C',
    marginBottom: 16,
  },
  etiqueta: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5B63',
    marginBottom: 4,
  },
  entradaTextoModal: {
    backgroundColor: '#F2F5F7',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    fontSize: 14,
    color: '#1C252C',
  },
  filaCampos: {
    flexDirection: 'row',
  },
  modalBotones: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    gap: 10,
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