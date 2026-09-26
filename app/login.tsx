import { useRouter } from 'expo-router';
import { useState } from 'react';
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
import { AuthService } from '../src/services/authService';

export default function LoginScreen() {
  const router = useRouter();
  const [esModoRegistro, setEsModoRegistro] = useState(false);
  const [cargando, setCargando] = useState(false);

  // Campos de formulario
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [gradoAcademico, setGradoAcademico] = useState('Mg.');
  const [facultad, setFacultad] = useState('FISME');
  const [departamento, setDepartamento] = useState('');

  const manejarAutenticacion = async () => {
    if (!correo || !contrasena) {
      Alert.alert('Atención', 'Por favor complete el correo y la contraseña.');
      return;
    }

    setCargando(true);
    try {
      if (esModoRegistro) {
        if (!nombreCompleto || !facultad) {
          Alert.alert('Atención', 'Ingrese su nombre completo y facultad.');
          setCargando(false);
          return;
        }

        await AuthService.registrarse({
          correoElectronico: correo,
          contrasena: contrasena,
          nombreCompleto: nombreCompleto,
          gradoAcademico: gradoAcademico,
          facultad: facultad,
          departamento: departamento,
        });
        Alert.alert('¡Bienvenido!', 'Su perfil docente ha sido registrado con éxito.');
      } else {
        await AuthService.iniciarSesion({
          correoElectronico: correo,
          contrasena: contrasena,
        });
      }

      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Ocurrió un error inesperado.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.contenedorPadre}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.encabezado}>
          <Text style={styles.titulo}>DocuDocente</Text>
          <Text style={styles.subtitulo}>
            {esModoRegistro ? 'Registro de Perfil Docente' : 'Control de Acceso'}
          </Text>
        </View>

        <View style={styles.tarjetaFormulario}>
          {esModoRegistro && (
            <>
              <Text style={styles.etiqueta}>Nombre Completo *</Text>
              <TextInput
                style={styles.entradaTexto}
                placeholder="Ej: Heling Kristtel Masgo Ventura"
                value={nombreCompleto}
                onChangeText={setNombreCompleto}
              />

              <View style={styles.filaCampos}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.etiqueta}>Grado *</Text>
                  <TextInput
                    style={styles.entradaTexto}
                    placeholder="Mg. / Dr. / Lic."
                    value={gradoAcademico}
                    onChangeText={setGradoAcademico}
                  />
                </View>

                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.etiqueta}>Facultad *</Text>
                  <TextInput
                    style={styles.entradaTexto}
                    placeholder="Ej: FISME"
                    value={facultad}
                    onChangeText={setFacultad}
                  />
                </View>
              </View>

              <Text style={styles.etiqueta}>Departamento Académico</Text>
              <TextInput
                style={styles.entradaTexto}
                placeholder="Ej: Ingeniería de Sistemas"
                value={departamento}
                onChangeText={setDepartamento}
              />
            </>
          )}

          <Text style={styles.etiqueta}>Correo Institucional *</Text>
          <TextInput
            style={styles.entradaTexto}
            placeholder="docente@untrm.edu.pe"
            value={correo}
            onChangeText={setCorreo}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.etiqueta}>Contraseña *</Text>
          <TextInput
            style={styles.entradaTexto}
            placeholder="••••••••"
            value={contrasena}
            onChangeText={setContrasena}
            secureTextEntry
          />

          <TouchableOpacity
            style={styles.botonPrincipal}
            onPress={manejarAutenticacion}
            disabled={cargando}
          >
            {cargando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.textoBotonPrincipal}>
                {esModoRegistro ? 'Crear Perfil e Iniciar' : 'Ingresar'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.botonSecundario}
            onPress={() => setEsModoRegistro(!esModoRegistro)}
          >
            <Text style={styles.textoBotonSecundario}>
              {esModoRegistro
                ? '¿Ya tienes cuenta? Inicia sesión aquí'
                : '¿Nuevo docente? Registra tu cuenta aquí'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  contenedorPadre: { flex: 1, backgroundColor: '#f2f2f7' },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  encabezado: { alignItems: 'center', marginBottom: 24 },
  titulo: { fontSize: 32, fontWeight: '800', color: '#003366', letterSpacing: 0.5 },
  subtitulo: { fontSize: 15, color: '#666', marginTop: 4 },
  tarjetaFormulario: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  etiqueta: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6 },
  entradaTexto: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e1e4e8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    fontSize: 15,
    color: '#1a1a1a',
  },
  filaCampos: { flexDirection: 'row', justifyContent: 'space-between' },
  botonPrincipal: {
    backgroundColor: '#003366',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  textoBotonPrincipal: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
  botonSecundario: { marginTop: 18, alignItems: 'center' },
  textoBotonSecundario: { color: '#003366', fontSize: 14, fontWeight: '500' },
});