import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthService } from '../src/services/authService';

export default function RegistroScreen() {
  const router = useRouter();
  const [paso, setPaso] = useState<1 | 2 | 3>(1);
  const [cargando, setCargando] = useState(false);

  const [nombreCompleto, setNombreCompleto] = useState('');
  const [gradoAcademico, setGradoAcademico] = useState('');

  const [facultad, setFacultad] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [codigoInstitucional, setCodigoInstitucional] = useState('');

  const [correoElectronico, setCorreoElectronico] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');

  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [mostrarConfirmarContrasena, setMostrarConfirmarContrasena] = useState(false);

  const obtenerImagenPaso = () => {
    switch (paso) {
      case 1:
        return require('../assets/images/paso1_huevo.png');
      case 2:
        return require('../assets/images/paso2_polluelo.png');
      case 3:
        return require('../assets/images/paso3_ave.png');
    }
  };

  const manejarAvanzarPaso1 = () => {
    if (!nombreCompleto.trim()) {
      Alert.alert('Campo Obligatorio', 'Por favor ingresa tu Nombre completo.');
      return;
    }
    setPaso(2);
  };

  const manejarAvanzarPaso2 = () => {
    setPaso(3);
  };

  const manejarAtras = () => {
    if (paso === 3) setPaso(2);
    else if (paso === 2) setPaso(1);
    else router.back();
  };

  const manejarRegistroFinal = async () => {
    if (!correoElectronico.trim() || !contrasena.trim() || !confirmarContrasena.trim()) {
      Alert.alert('Atención', 'Por favor completa todos los campos obligatorios.');
      return;
    }

    if (contrasena !== confirmarContrasena) {
      Alert.alert('Error', 'Las contraseñas no coinciden. Por favor verifica.');
      return;
    }

    setCargando(true);
    try {
      await AuthService.registrarse({
        nombreCompleto: nombreCompleto.trim(),
        gradoAcademico: gradoAcademico.trim(),
        facultad: facultad.trim(),
        departamento: departamento.trim(),
        codigoInstitucional: codigoInstitucional.trim(),
        correoElectronico: correoElectronico.trim(),
        contrasena: contrasena.trim(),
      });

      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Error de Registro', error.message || 'No se pudo crear la cuenta.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.contenedorFlex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Botón superior de retroceso cuando se avanza de paso */}
          {paso > 1 && (
            <TouchableOpacity onPress={manejarAtras} style={styles.botonAtrasHeader}>
              <Ionicons name="arrow-back" size={24} color="#1C252C" />
            </TouchableOpacity>
          )}

          {/* Imagen dinámica según el paso activo */}
          <View style={styles.contenedorLogo}>
            <Image
              source={obtenerImagenPaso()}
              style={styles.logoImagen}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.tituloSecundario}>Crear cuenta</Text>

          {/* PASO 1: Datos Básicos */}
          {paso === 1 && (
            <View style={styles.formulario}>
              <View style={styles.grupoInput}>
                <Text style={styles.label}>Nombre completo</Text>
                <TextInput
                  style={styles.input}
                  value={nombreCompleto}
                  onChangeText={setNombreCompleto}
                  placeholder=""
                />
              </View>

              <View style={styles.grupoInput}>
                <Text style={styles.label}>Grado Académico</Text>
                <TextInput
                  style={styles.input}
                  value={gradoAcademico}
                  onChangeText={setGradoAcademico}
                  placeholder=""
                />
              </View>

              <TouchableOpacity
                style={styles.botonPrincipal}
                onPress={manejarAvanzarPaso1}
                activeOpacity={0.85}
              >
                <Text style={styles.textoBoton}>Siguiente</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* PASO 2: Datos Institucionales */}
          {paso === 2 && (
            <View style={styles.formulario}>
              <View style={styles.grupoInput}>
                <Text style={styles.label}>Facultad</Text>
                <TextInput
                  style={styles.input}
                  value={facultad}
                  onChangeText={setFacultad}
                  placeholder=""
                />
              </View>

              <View style={styles.grupoInput}>
                <Text style={styles.label}>Departamento</Text>
                <TextInput
                  style={styles.input}
                  value={departamento}
                  onChangeText={setDepartamento}
                  placeholder=""
                />
              </View>

              <View style={styles.grupoInput}>
                <Text style={styles.label}>Código Institucional</Text>
                <TextInput
                  style={styles.input}
                  value={codigoInstitucional}
                  onChangeText={setCodigoInstitucional}
                  placeholder=""
                />
              </View>

              <TouchableOpacity
                style={styles.botonPrincipal}
                onPress={manejarAvanzarPaso2}
                activeOpacity={0.85}
              >
                <Text style={styles.textoBoton}>Siguiente</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* PASO 3: Credenciales de Acceso */}
          {paso === 3 && (
            <View style={styles.formulario}>
              <View style={styles.grupoInput}>
                <Text style={styles.label}>Correo electrónico</Text>
                <TextInput
                  style={styles.input}
                  value={correoElectronico}
                  onChangeText={setCorreoElectronico}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder=""
                />
              </View>

              <View style={styles.grupoInput}>
                <Text style={styles.label}>Contraseña</Text>
                <View style={styles.contenedorPassword}>
                  <TextInput
                    style={[styles.input, styles.inputPassword]}
                    value={contrasena}
                    onChangeText={setContrasena}
                    secureTextEntry={!mostrarContrasena}
                    placeholder=""
                  />
                  <TouchableOpacity
                    onPress={() => setMostrarContrasena(!mostrarContrasena)}
                    style={styles.iconoOjo}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={mostrarContrasena ? 'eye-outline' : 'eye-off-outline'}
                      size={20}
                      color="#8E9AA0"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.grupoInput}>
                <Text style={styles.label}>Confirmar contraseña</Text>
                <View style={styles.contenedorPassword}>
                  <TextInput
                    style={[styles.input, styles.inputPassword]}
                    value={confirmarContrasena}
                    onChangeText={setConfirmarContrasena}
                    secureTextEntry={!mostrarConfirmarContrasena}
                    placeholder=""
                  />
                  <TouchableOpacity
                    onPress={() => setMostrarConfirmarContrasena(!mostrarConfirmarContrasena)}
                    style={styles.iconoOjo}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={mostrarConfirmarContrasena ? 'eye-outline' : 'eye-off-outline'}
                      size={20}
                      color="#8E9AA0"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={styles.botonPrincipal}
                onPress={manejarRegistroFinal}
                disabled={cargando}
                activeOpacity={0.85}
              >
                {cargando ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.textoBoton}>Registrarse</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Paginador de 3 Puntos (Dots) */}
          <View style={styles.contenedorPuntos}>
            <View style={[styles.punto, paso === 1 ? styles.puntoActivo : styles.puntoInactivo]} />
            <View style={[styles.punto, paso === 2 ? styles.puntoActivo : styles.puntoInactivo]} />
            <View style={[styles.punto, paso === 3 ? styles.puntoActivo : styles.puntoInactivo]} />
          </View>

          {/* Enlace para Iniciar Sesión */}
          <View style={styles.contenedorLoginLink}>
            <Text style={styles.textoYaCuenta}>¿Ya tienes cuenta? </Text>
            <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
              <Text style={styles.textoIniciarSesion}>Iniciar sesión</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contenedorFlex: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingBottom: 24,
  },
  botonAtrasHeader: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 10,
    padding: 8,
  },
  contenedorLogo: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  logoImagen: {
    width: '100%',
    height: 180,
  },
  tituloSecundario: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1C252C',
    textAlign: 'center',
    marginBottom: 24,
  },
  formulario: {
    width: '100%',
  },
  grupoInput: {
    marginBottom: 22,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#83968C',
    marginBottom: 2,
  },
  input: {
    borderBottomWidth: 1.2,
    borderBottomColor: '#1E88E5',
    fontSize: 15,
    color: '#1C252C',
    paddingVertical: 6,
    paddingHorizontal: 0,
  },
  contenedorPassword: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputPassword: {
    paddingRight: 36,
  },
  iconoOjo: {
    position: 'absolute',
    right: 0,
    bottom: 6,
    padding: 4,
  },
  botonPrincipal: {
    backgroundColor: '#1E88E5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 18,
    elevation: 3,
    shadowColor: '#1E88E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  textoBoton: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  contenedorPuntos: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginTop: 32,
    marginBottom: 20,
  },
  punto: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  puntoActivo: {
    backgroundColor: '#000000',
  },
  puntoInactivo: {
    backgroundColor: '#C5D1D7',
  },
  contenedorLoginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoYaCuenta: {
    fontSize: 14,
    color: '#8A999F',
  },
  textoIniciarSesion: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E88E5',
  },
});