import { Ionicons } from '@expo/vector-icons';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthService } from '../src/services/authService';
import { MIN_LARGO_CONTRASENA } from '../src/utils/validaciones';

type Paso = 'correo' | 'codigo';

export default function RecuperarScreen() {
  const router = useRouter();
  const [paso, setPaso] = useState<Paso>('correo');
  const [correo, setCorreo] = useState('');
  const [codigo, setCodigo] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [mostrar, setMostrar] = useState(false);
  const [procesando, setProcesando] = useState(false);

  const ejecutar = async (accion: () => Promise<void>) => {
    setProcesando(true);
    try {
      await accion();
    } catch (error: any) {
      Alert.alert('No se pudo completar', error?.message || 'Inténtalo de nuevo.');
    } finally {
      setProcesando(false);
    }
  };

  const enviarCodigo = () =>
    ejecutar(async () => {
      await AuthService.solicitarRecuperacion(correo);
      setPaso('codigo');
      Alert.alert('Código enviado', `Revisa tu bandeja de entrada (y spam) en ${correo.trim()}.`);
    });

  const cambiarContrasena = () =>
    ejecutar(async () => {
      if (codigo.trim().length !== 6) throw new Error('El código tiene 6 dígitos.');
      if (nueva !== confirmar) throw new Error('Las contraseñas no coinciden.');
      await AuthService.restablecerContrasena(correo, codigo, nueva);
      Alert.alert('Contraseña actualizada', 'Ya puedes iniciar sesión con tu nueva contraseña.', [
        { text: 'Ir al inicio de sesión', onPress: () => router.replace('/login') },
      ]);
    });

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.contenedor} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} style={styles.botonAtras} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color="#1C252C" />
          </TouchableOpacity>

          <Text style={styles.titulo}>Recuperar contraseña</Text>
          <Text style={styles.subtitulo}>
            {paso === 'correo'
              ? 'Escribe el correo con el que te registraste y te enviaremos un código de 6 dígitos.'
              : `Ingresa el código que enviamos a ${correo.trim()} y crea tu nueva contraseña.`}
          </Text>

          {paso === 'correo' ? (
            <View style={styles.grupoInput}>
              <Text style={styles.label}>Correo electrónico</Text>
              <TextInput
                style={styles.input}
                value={correo}
                onChangeText={setCorreo}
                placeholder="nombre@untrm.edu.pe"
                placeholderTextColor="#A8B9C2"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          ) : (
            <>
              <View style={styles.grupoInput}>
                <Text style={styles.label}>Código de verificación</Text>
                <TextInput
                  style={[styles.input, styles.inputCodigo]}
                  value={codigo}
                  onChangeText={(t) => setCodigo(t.replace(/\D/g, ''))}
                  placeholder="000000"
                  placeholderTextColor="#A8B9C2"
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
              <View style={styles.grupoInput}>
                <Text style={styles.label}>Nueva contraseña</Text>
                <View style={styles.contenedorPassword}>
                  <TextInput
                    style={[styles.input, styles.inputPassword]}
                    value={nueva}
                    onChangeText={setNueva}
                    secureTextEntry={!mostrar}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity style={styles.iconoOjo} onPress={() => setMostrar(!mostrar)}>
                    <Ionicons name={mostrar ? 'eye-off-outline' : 'eye-outline'} size={20} color="#83968C" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.ayuda}>Mínimo {MIN_LARGO_CONTRASENA} caracteres, con letras y números.</Text>
              </View>
              <View style={styles.grupoInput}>
                <Text style={styles.label}>Confirmar contraseña</Text>
                <TextInput
                  style={styles.input}
                  value={confirmar}
                  onChangeText={setConfirmar}
                  secureTextEntry={!mostrar}
                  autoCapitalize="none"
                />
              </View>
            </>
          )}

          <TouchableOpacity
            style={[styles.boton, procesando && styles.botonDeshabilitado]}
            onPress={paso === 'correo' ? enviarCodigo : cambiarContrasena}
            disabled={procesando}
          >
            {procesando ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.textoBoton}>{paso === 'correo' ? 'Enviar código' : 'Cambiar contraseña'}</Text>
            )}
          </TouchableOpacity>

          {paso === 'codigo' && (
            <TouchableOpacity onPress={enviarCodigo} disabled={procesando} style={styles.enlace}>
              <Text style={styles.textoEnlace}>¿No te llegó? Reenviar código</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  contenedor: { flex: 1 },
  scrollContainer: { flexGrow: 1, paddingHorizontal: 28, paddingVertical: 24 },
  botonAtras: { alignSelf: 'flex-start', marginBottom: 24 },
  titulo: { fontSize: 26, fontWeight: '700', color: '#124874', marginBottom: 8 },
  subtitulo: { fontSize: 14, color: '#8A999F', lineHeight: 20, marginBottom: 32 },
  grupoInput: { marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '600', color: '#83968C', marginBottom: 4 },
  input: {
    borderBottomWidth: 1.2,
    borderBottomColor: '#A8B9C2',
    fontSize: 16,
    color: '#1C252C',
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  inputCodigo: { fontSize: 24, letterSpacing: 8, fontWeight: '600' },
  contenedorPassword: { position: 'relative', justifyContent: 'center' },
  inputPassword: { paddingRight: 36 },
  iconoOjo: { position: 'absolute', right: 0, bottom: 8, padding: 4 },
  ayuda: { fontSize: 12, color: '#8A999F', marginTop: 6 },
  boton: {
    backgroundColor: '#1E88E5',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    elevation: 3,
  },
  botonDeshabilitado: { opacity: 0.6 },
  textoBoton: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  enlace: { alignItems: 'center', marginTop: 24 },
  textoEnlace: { fontSize: 14, fontWeight: '700', color: '#124874' },
});
