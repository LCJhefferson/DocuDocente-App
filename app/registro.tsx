// app/registro.tsx
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity
} from 'react-native';
import { AuthService } from '../src/services/authService';

export default function RegistroScreen() {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);

  const [nombreCompleto, setNombreCompleto] = useState('');
  const [gradoAcademico, setGradoAcademico] = useState('');
  const [facultad, setFacultad] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [codigoInstitucional, setCodigoInstitucional] = useState('');
  const [correoElectronico, setCorreoElectronico] = useState('');
  const [contrasena, setContrasena] = useState('');

  const manejarRegistro = async () => {
    if (!nombreCompleto || !correoElectronico || !contrasena) {
      Alert.alert('Atención', 'Por favor completa todos los campos obligatorios (*).');
      return;
    }

    setCargando(true);
    try {
      await AuthService.registrarse({
        nombreCompleto,
        gradoAcademico,
        facultad,
        departamento,
        codigoInstitucional,
        correoElectronico,
        contrasena,
      });

      // Al registrarse, AuthService guarda la sesión automáticamente.
      // Redirigimos al tab de inicio/cursos:
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Error de Registro', error.message || 'No se pudo crear la cuenta.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.contenedor}>
      <Text style={styles.titulo}>Crear Cuenta Docente</Text>
      <Text style={styles.subtitulo}>Ingresa tus datos para empezar a gestionar tus asignaturas</Text>

      <Text style={styles.etiqueta}>Nombre Completo *</Text>
      <TextInput
        style={styles.entrada}
        value={nombreCompleto}
        onChangeText={setNombreCompleto}
        placeholder="Ej: Dr. Carlos Pérez"
      />

      <Text style={styles.etiqueta}>Correo Electrónico *</Text>
      <TextInput
        style={styles.entrada}
        value={correoElectronico}
        onChangeText={setCorreoElectronico}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholder="docente@universidad.edu.pe"
      />

      <Text style={styles.etiqueta}>Contraseña *</Text>
      <TextInput
        style={styles.entrada}
        value={contrasena}
        onChangeText={setContrasena}
        secureTextEntry
        placeholder="******"
      />

      <Text style={styles.etiqueta}>Grado Académico</Text>
      <TextInput
        style={styles.entrada}
        value={gradoAcademico}
        onChangeText={setGradoAcademico}
        placeholder="Ej: Magíster / Doctor"
      />

      <Text style={styles.etiqueta}>Facultad</Text>
      <TextInput
        style={styles.entrada}
        value={facultad}
        onChangeText={setFacultad}
        placeholder="Ej: Ingeniería de Sistemas"
      />

      <Text style={styles.etiqueta}>Departamento Académico</Text>
      <TextInput
        style={styles.entrada}
        value={departamento}
        onChangeText={setDepartamento}
        placeholder="Ej: Ciencias Computacionales"
      />

      <Text style={styles.etiqueta}>Código Institucional</Text>
      <TextInput
        style={styles.entrada}
        value={codigoInstitucional}
        onChangeText={setCodigoInstitucional}
        placeholder="Ej: DOC-2026-88"
      />

      <TouchableOpacity style={styles.boton} onPress={manejarRegistro} disabled={cargando}>
        {cargando ? <ActivityIndicator color="#fff" /> : <Text style={styles.textoBoton}>Registrarse e Iniciar</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()} style={styles.linkVolver}>
        <Text style={styles.textoLink}>¿Ya tienes cuenta? Inicia sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flexGrow: 1, padding: 24, backgroundColor: '#ffffff', justifyContent: 'center' },
  titulo: { fontSize: 24, fontWeight: '800', color: '#000000', marginBottom: 6 },
  subtitulo: { fontSize: 14, color: '#666666', marginBottom: 20 },
  etiqueta: { fontSize: 13, fontWeight: '600', color: '#333333', marginBottom: 4 },
  entrada: { backgroundColor: '#f2f2f7', borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 14 },
  boton: { backgroundColor: '#000000', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 12 },
  textoBoton: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
  linkVolver: { marginTop: 18, alignItems: 'center' },
  textoLink: { color: '#003366', fontWeight: '600', fontSize: 14 },
});