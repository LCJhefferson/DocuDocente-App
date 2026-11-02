import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';

interface ModalCrearCursoProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (datos: {
    nombre: string;
    codigo: string;
    ciclo: string;
    semestre: string;
  }) => void;
}

export const ModalCrearCurso: React.FC<ModalCrearCursoProps> = ({
  visible,
  onClose,
  onSubmit,
}) => {
  const { isDarkMode } = useTheme();

  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [ciclo, setCiclo] = useState('');
  const [semestre, setSemestre] = useState('');

  const handleGuardar = () => {
    if (!nombre.trim() || !codigo.trim() || !ciclo.trim() || !semestre.trim()) {
      Alert.alert('Campos incompletos', 'Por favor, completa todos los campos para crear el curso.');
      return;
    }

    onSubmit({
      nombre: nombre.trim(),
      codigo: codigo.trim(),
      ciclo: ciclo.trim(),
      semestre: semestre.trim(),
    });

    // Limpiar campos y cerrar modal
    setNombre('');
    setCodigo('');
    setCiclo('');
    setSemestre('');
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
        {/* CABECERA */}
        <View style={styles.encabezadoModal}>
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
          <Text style={[styles.tituloModal, { color: isDarkMode ? '#F8FAFC' : '#0F172A' }]}>
            Registrar Nuevo Curso
          </Text>
        </View>

        <View style={styles.formularioContainer}>
          {/* CAMPO NOMBRE */}
          <View style={styles.grupoCampo}>
            <Text style={[styles.label, { color: isDarkMode ? '#E2E8F0' : '#0F172A' }]}>
              Nombre del Curso
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
              placeholder="Ej: Programación Móvil"
              placeholderTextColor={isDarkMode ? '#64748B' : '#94A3B8'}
              value={nombre}
              onChangeText={setNombre}
            />
          </View>

          {/* CAMPO CÓDIGO */}
          <View style={styles.grupoCampo}>
            <Text style={[styles.label, { color: isDarkMode ? '#E2E8F0' : '#0F172A' }]}>
              Código
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
              placeholder="Ej: IS-042"
              placeholderTextColor={isDarkMode ? '#64748B' : '#94A3B8'}
              value={codigo}
              onChangeText={setCodigo}
            />
          </View>

          {/* CAMPO CICLO */}
          <View style={styles.grupoCampo}>
            <Text style={[styles.label, { color: isDarkMode ? '#E2E8F0' : '#0F172A' }]}>
              Ciclo
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
              placeholder="Ej: VII Ciclo"
              placeholderTextColor={isDarkMode ? '#64748B' : '#94A3B8'}
              value={ciclo}
              onChangeText={setCiclo}
            />
          </View>

          {/* CAMPO SEMESTRE */}
          <View style={styles.grupoCampo}>
            <Text style={[styles.label, { color: isDarkMode ? '#E2E8F0' : '#0F172A' }]}>
              Semestre Académico
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
              placeholder="Ej: 2026-I"
              placeholderTextColor={isDarkMode ? '#64748B' : '#94A3B8'}
              value={semestre}
              onChangeText={setSemestre}
            />
          </View>

          {/* BOTÓN GUARDAR */}
          <TouchableOpacity
            style={[
              styles.botonGuardar,
              { backgroundColor: isDarkMode ? '#0284C7' : '#2679A8' },
            ]}
            onPress={handleGuardar}
          >
            <Text style={styles.textoBotonGuardar}>Guardar Curso</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  pantallaCompleta: {
    flex: 1,
    paddingHorizontal: 20,
  },
  encabezadoModal: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  botonVolver: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tituloModal: {
    fontSize: 20,
    fontWeight: '700',
  },
  formularioContainer: {
    marginTop: 20,
  },
  grupoCampo: {
    marginBottom: 18,
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
  botonGuardar: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  textoBotonGuardar: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});