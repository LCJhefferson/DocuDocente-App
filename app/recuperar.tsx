import { RequisitosContrasena } from '../src/components/cuenta/RequisitosContrasena';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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
import { esCorreoValido, validarContrasena } from '../src/utils/validaciones';

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
  const enCurso = useRef(false);
  const revision = useRef(0);
  const [verificando, setVerificando] = useState(false);
  const [verificadoHasta, setVerificadoHasta] = useState<number | null>(null);
  const [errorCodigo, setErrorCodigo] = useState('');

  useEffect(() => {
    if (verificadoHasta === null) return;
    const temporizador = setTimeout(() => {
      setVerificadoHasta(null);
      setErrorCodigo('El código venció. Solicita uno nuevo.');
    }, Math.max(0, verificadoHasta - Date.now()));
    return () => clearTimeout(temporizador);
  }, [verificadoHasta]);

  useEffect(() => () => { revision.current += 1; }, []);

  const actualizarCodigo = async (texto: string) => {
    const valor = texto.replace(/\D/g, '').slice(0, 6);
    const turno = ++revision.current;
    setCodigo(valor); setVerificadoHasta(null); setErrorCodigo(''); setVerificando(false);
    if (valor.length !== 6) return;
    setVerificando(true);
    try {
      const vencimiento = await AuthService.verificarCodigoRecuperacion(correo, valor);
      if (turno === revision.current) setVerificadoHasta(vencimiento);
    } catch (error) {
      if (turno === revision.current) setErrorCodigo(error instanceof Error ? error.message : 'No se pudo verificar el código.');
    } finally {
      if (turno === revision.current) setVerificando(false);
    }
  };

  const puedeCambiar = verificadoHasta !== null && validarContrasena(nueva) === null && nueva === confirmar;
  const deshabilitado = procesando || verificando || (paso === 'codigo' ? !puedeCambiar : !esCorreoValido(correo));

  const ejecutar = async (accion: () => Promise<void>) => {
    if (enCurso.current) return;
    enCurso.current = true;
    setProcesando(true);
    try {
      await accion();
    } catch (error: any) {
      Alert.alert('No se pudo completar', error?.message || 'Inténtalo de nuevo.');
    } finally {
      enCurso.current = false;
      setProcesando(false);
    }
  };

  const enviarCodigo = () =>
    ejecutar(async () => {
      await AuthService.solicitarRecuperacion(correo);
      revision.current += 1;
      setCodigo(''); setVerificadoHasta(null); setErrorCodigo(''); setVerificando(false);
      setPaso('codigo');
      Alert.alert('Código enviado', `Revisa tu bandeja de entrada (y spam) en ${correo.trim()}.`);
    });

  const cambiarContrasena = () =>
    ejecutar(async () => {
      if (verificadoHasta === null || verificadoHasta <= Date.now()) throw new Error('El código venció. Solicita uno nuevo.');
      if (!puedeCambiar) throw new Error('Verifica el código y completa una contraseña válida que coincida con la confirmación.');
      if (!/^\d{6}$/.test(codigo.trim())) throw new Error('El código tiene 6 dígitos.');
      const problema = validarContrasena(nueva);
      if (problema) throw new Error(problema);
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
              ? 'Escribe el correo con el que te registraste (Gmail, Outlook u otro) y te enviaremos un código de 6 dígitos.'
              : `Ingresa el código que enviamos a ${correo.trim()} y crea tu nueva contraseña.`}
          </Text>

          {paso === 'correo' ? (
            <View style={styles.grupoInput}>
              <Text style={styles.label}>Correo electrónico</Text>
              <TextInput
                style={styles.input}
                editable={!procesando}
                value={correo}
                maxLength={254}
                onChangeText={setCorreo}
                placeholder="nombre@gmail.com"
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
                <View style={styles.codigoContenedor}>
                  <View style={styles.codigoFila} pointerEvents="none" accessible={false}>
                    {Array.from({ length: 6 }, (_, i) => (
                      <View key={i} style={[styles.casilla, verificadoHasta !== null && styles.casillaVerificada]}>
                        <Text style={styles.digito}>{codigo[i] ?? ''}</Text>
                      </View>
                    ))}
                  </View>
                  <TextInput
                    style={styles.codigoEntrada}
                    value={codigo}
                    onChangeText={actualizarCodigo}
                    keyboardType="number-pad"
                    autoComplete="one-time-code"
                    autoCorrect={false}
                    caretHidden
                    editable={!procesando}
                    maxLength={6}
                    accessibilityLabel="Código de verificación de seis dígitos"
                    accessibilityHint="Puedes escribir o pegar el código recibido por correo."
                  />
                </View>
                <View style={styles.estadoCodigo} accessibilityLiveRegion="polite">
                  {verificando ? <ActivityIndicator size="small" color="#1E88E5" /> : verificadoHasta !== null ? <Ionicons name="checkmark" size={18} color="#218653" /> : null}
                  <Text style={[styles.estadoTexto, verificadoHasta !== null && styles.verde, !!errorCodigo && styles.error]}>
                    {verificando ? 'Verificando código…' : verificadoHasta !== null ? 'Código verificado' : errorCodigo || 'Ingresa los 6 dígitos del correo.'}
                  </Text>
                </View>
              </View>
              <View style={styles.grupoInput}>
                <Text style={styles.label}>Nueva contraseña</Text>
                <View style={styles.contenedorPassword}>
                  <TextInput
                    style={[styles.input, styles.inputPassword]}
                    value={nueva}
                    autoCorrect={false}
                    maxLength={128}
                    onChangeText={setNueva}
                    secureTextEntry={!mostrar}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity style={styles.iconoOjo} onPress={() => setMostrar(!mostrar)}>
                    <Ionicons name={mostrar ? 'eye-off-outline' : 'eye-outline'} size={20} color="#83968C" />
                  </TouchableOpacity>
                </View>
                <RequisitosContrasena valor={nueva} />
              </View>
              <View style={styles.grupoInput}>
                <Text style={styles.label}>{confirmar ? (confirmar === nueva ? 'Las contraseñas coinciden' : 'Las contraseñas no coinciden') : 'Confirmar contraseña'}</Text>
                <TextInput
                  style={styles.input}
                  value={confirmar}
                  autoCorrect={false}
                  maxLength={128}
                  onChangeText={setConfirmar}
                  secureTextEntry={!mostrar}
                  autoCapitalize="none"
                />
              </View>
            </>
          )}

          <TouchableOpacity
            style={[styles.boton, deshabilitado && styles.botonDeshabilitado]}
            onPress={paso === 'correo' ? enviarCodigo : cambiarContrasena}
            disabled={deshabilitado}
            accessibilityState={{ disabled: deshabilitado }}
          >
            {procesando ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.textoBoton}>{paso === 'correo' ? 'Enviar código' : 'Cambiar contraseña'}</Text>
            )}
          </TouchableOpacity>

          {paso === 'codigo' && (
            <TouchableOpacity onPress={enviarCodigo} disabled={procesando || verificando} style={styles.enlace}>
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
  codigoContenedor: { position: 'relative', marginTop: 8, height: 46 },
  codigoFila: { flexDirection: 'row', gap: 8, height: 46 },
  casilla: { flex: 1, borderWidth: 1, borderColor: '#DCE3E8', borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFCFD' },
  casillaVerificada: { borderColor: '#218653' },
  digito: { fontSize: 20, fontWeight: '600', color: '#1C252C' },
  codigoEntrada: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: 0 },
  estadoCodigo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 9 },
  estadoTexto: { flex: 1, fontSize: 12, color: '#667581' },
  verde: { color: '#218653' },
  error: { color: '#B42318' },
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
