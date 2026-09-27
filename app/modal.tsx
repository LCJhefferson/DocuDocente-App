// app/modal.tsx
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../src/context/AuthContext';
import { PerfilDocenteService } from '../src/services/perfilDocenteService';

export default function PerfilModalScreen() {
  const router = useRouter();
  const { cuentaId, perfilDocente, recargarPerfil, cerrarSesion } = useAuth();

  const [cargando, setCargando] = useState(false);
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [gradoAcademico, setGradoAcademico] = useState('');
  const [facultad, setFacultad] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [codigoInstitucional, setCodigoInstitucional] = useState('');

  // Cargar datos actuales del perfil en el formulario
  useEffect(() => {
    if (perfilDocente) {
      setNombreCompleto(perfilDocente.nombreCompleto || '');
      setGradoAcademico(perfilDocente.gradoAcademico || '');
      setFacultad(perfilDocente.facultad || '');
      setDepartamento(perfilDocente.departamento || '');
      setCodigoInstitucional(perfilDocente.codigoInstitucional || '');
    }
  }, [perfilDocente]);

  const guardarCambios = async () => {
    if (!cuentaId) return;

    if (!nombreCompleto.trim() || !facultad.trim()) {
      Alert.alert('Atención', 'El Nombre Completo y la Facultad son obligatorios.');
      return;
    }

    setCargando(true);
    try {
      await PerfilDocenteService.actualizarPerfil(cuentaId, {
        nombreCompleto: nombreCompleto.trim(),
        gradoAcademico: gradoAcademico.trim(),
        facultad: facultad.trim(),
        departamento: departamento.trim(),
        codigoInstitucional: codigoInstitucional.trim(),
      });

      await recargarPerfil();
      Alert.alert('Éxito', 'Perfil actualizado correctamente.');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudieron guardar los cambios.');
    } finally {
      setCargando(false);
    }
  };

  const manejarCerrarSesion = () => {
    Alert.alert('Cerrar Sesión', '¿Estás seguro de que deseas salir de tu cuenta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar Sesión',
        style: 'destructive',
        onPress: async () => {
          router.back();
          await cerrarSesion();
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.contenedor}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.encabezadoModal}>
          <Text style={styles.titulo}>Mi Perfil Docente</Text>
          <Text style={styles.subtitulo}>Actualiza tu información personal e institucional</Text>
        </View>

        <View style={styles.tarjetaFormulario}>
          <Text style={styles.etiqueta}>Nombre Completo *</Text>
          <TextInput
            style={styles.entrada}
            value={nombreCompleto}
            onChangeText={setNombreCompleto}
            placeholder="Ej: Dr. Juan Pérez"
          />

          <View style={styles.filaCampos}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.etiqueta}>Grado Académico</Text>
              <TextInput
                style={styles.entrada}
                value={gradoAcademico}
                onChangeText={setGradoAcademico}
                placeholder="Mg. / Dr."
              />
            </View>

            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.etiqueta}>Facultad *</Text>
              <TextInput
                style={styles.entrada}
                value={facultad}
                onChangeText={setFacultad}
                placeholder="Ej: FISME"
              />
            </View>
          </View>

          <Text style={styles.etiqueta}>Departamento Académico</Text>
          <TextInput
            style={styles.entrada}
            value={departamento}
            onChangeText={setDepartamento}
            placeholder="Ej: Ingeniería de Sistemas"
          />

          <Text style={styles.etiqueta}>Código Institucional</Text>
          <TextInput
            style={styles.entrada}
            value={codigoInstitucional}
            onChangeText={setCodigoInstitucional}
            placeholder="Ej: DOC-2026-01"
          />

          <TouchableOpacity
            style={styles.botonGuardar}
            onPress={guardarCambios}
            disabled={cargando}
          >
            {cargando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.textoBotonGuardar}>Guardar Cambios</Text>
            )}
          </TouchableOpacity>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#f2f2f7' },
  scroll: { padding: 20 },
  encabezadoModal: { marginBottom: 20 },
  titulo: { fontSize: 24, fontWeight: '800', color: '#003366' },
  subtitulo: { fontSize: 14, color: 'rgb(17, 16, 17)', marginTop: 4 },
  tarjetaFormulario: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  etiqueta: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6 },
  entrada: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e1e4e8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    fontSize: 15,
  },
  filaCampos: { flexDirection: 'row', justifyContent: 'space-between' },
  botonGuardar: {
    backgroundColor: '#003366',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  textoBotonGuardar: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
  botonCerrarSesion: {
    backgroundColor: '#ffe5e5',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
  },

});