import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Cargando } from '../src/components/Cargando';
import { useAuth } from '../src/context/AuthContext';

export default function LoginScreen() {
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [procesando, setProcesando] = useState(false);

  const { iniciarSesion } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!usuario.trim() || !contrasena.trim()) {
      Alert.alert('Atención', 'Por favor ingrese su usuario y contraseña.');
      return;
    }

    try {
      setProcesando(true);
      await iniciarSesion({
        correoElectronico: usuario.trim(),
        contrasena: contrasena.trim(),
      });
    } catch (error) {
      setProcesando(false);
      Alert.alert(
        'Error de Autenticación',
        'Credenciales incorrectas o problemas al conectar con la base de datos local.'
      );
    }
  };

  const handleOlvideContrasena = () => {
    Alert.alert('Recuperación', 'Póngase en contacto con el administrador del sistema.');
  };

  const handleCrearCuenta = () => {
    router.push('/registro');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.contenedor}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo Principal con el Arrendajo y Nombre */}
          <View style={styles.contenedorLogo}>
            <Image
              source={require('../assets/images/arrendajo_posado.png')}
              style={styles.logoImagen}
              resizeMode="contain"
            />
          </View>

          {/* Formulario de Login */}
          <View style={styles.formulario}>
            {/* Campo Usuario / Email */}
            <View style={styles.grupoInput}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder=""
                value={usuario}
                onChangeText={setUsuario}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            {/* Campo Contraseña */}
            <View style={styles.grupoInput}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.contenedorPassword}>
                <TextInput
                  style={[styles.input, styles.inputPassword]}
                  placeholder=""
                  value={contrasena}
                  onChangeText={setContrasena}
                  secureTextEntry={!mostrarContrasena}
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

            {/* Botón Iniciar Sesión */}
            <TouchableOpacity
              style={styles.botonLogin}
              onPress={handleLogin}
              disabled={procesando}
              activeOpacity={0.85}
            >
              <Text style={styles.textoBoton}>Iniciar Sesión</Text>
            </TouchableOpacity>

            {/* Enlaces de Acción */}
            <View style={styles.contenedorEnlaces}>
              <TouchableOpacity onPress={handleOlvideContrasena} activeOpacity={0.7}>
                <Text style={styles.textoOlvide}>¿Olvidaste tu contraseña?</Text>
              </TouchableOpacity>

              <View style={styles.contenedorRegistro}>
                <Text style={styles.textoSinCuenta}>no tengo cuenta? </Text>
                <TouchableOpacity
                  onPress={handleCrearCuenta}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.textoCrearCuenta}>Crear cuenta</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Overlay de Carga */}
        <Modal visible={procesando} transparent animationType="fade">
          <View style={styles.overlayCarga}>
            <Cargando mensaje="Autenticando y sincronizando expedientes..." />
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contenedor: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingBottom: 24,
  },
  contenedorLogo: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    marginTop: 10,
  },
  logoImagen: {
    width: '100%',
    height: 170,
  },
  formulario: {
    width: '100%',
  },
  grupoInput: {
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#83968C',
    marginBottom: 4,
  },
  input: {
    borderBottomWidth: 1.2,
    borderBottomColor: '#A8B9C2',
    fontSize: 16,
    color: '#1C252C',
    paddingVertical: 8,
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
    bottom: 8,
    padding: 4,
  },
  botonLogin: {
    backgroundColor: '#1E88E5',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
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
  contenedorEnlaces: {
    alignItems: 'center',
    marginTop: 32,
    gap: 16,
  },
  textoOlvide: {
    fontSize: 14,
    fontWeight: '700',
    color: '#212631',
  },
  contenedorRegistro: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  textoSinCuenta: {
    fontSize: 14,
    color: '#8A999F',
  },
  textoCrearCuenta: {
    fontSize: 14,
    fontWeight: '700',
    color: '#124874',
  },
  overlayCarga: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
});