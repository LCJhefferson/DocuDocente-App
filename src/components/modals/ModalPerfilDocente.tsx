import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { dropAndRecreateDatabaseDev } from '../../database/client';
import { PerfilDocenteService } from '../../services/perfilDocenteService';
import { syncService } from '../../services/supabase/syncService';

interface ModalPerfilDocenteProps {
  visible: boolean;
  onClose: () => void;
  onSincronizacionCompletada?: () => void;
}

export const ModalPerfilDocente: React.FC<ModalPerfilDocenteProps> = ({
  visible,
  onClose,
  onSincronizacionCompletada,
}) => {
  const { cuentaId, perfilDocente, recargarPerfil, cerrarSesion } = useAuth();
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [gradoAcademico, setGradoAcademico] = useState('');
  const [cargando, setCargando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);

  useEffect(() => {
    if (perfilDocente) {
      setNombreCompleto(perfilDocente.nombreCompleto || '');
      setGradoAcademico(perfilDocente.gradoAcademico || 'Mg.');
    }
  }, [perfilDocente, visible]);

  const guardarCambios = async () => {
    if (!cuentaId) return;
    if (!nombreCompleto.trim()) {
      Alert.alert('Atención', 'El Nombre Completo es obligatorio.');
      return;
    }

    setCargando(true);
    try {
      await PerfilDocenteService.actualizarPerfil(cuentaId, {
        nombreCompleto: nombreCompleto.trim(),
        gradoAcademico: gradoAcademico.trim() || 'Mg.',
      });
      await recargarPerfil();
      Alert.alert('Éxito', 'Perfil actualizado correctamente.');
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudieron guardar los cambios.');
    } finally {
      setCargando(false);
    }
  };

  const manejarSincronizacion = async () => {
    if (!cuentaId) return;
    setSincronizando(true);
    try {
      const docenteIdLocal = perfilDocente?.id || cuentaId;
      const res = await syncService.sincronizarTodo(cuentaId, docenteIdLocal);

      // Notificar a la pantalla invocadora para recargar la lista local de SQLite
      if (onSincronizacionCompletada) {
        onSincronizacionCompletada();
      }

      Alert.alert(
        'Sincronización Completa',
        `Subidos a Supabase:\n• Cursos: ${res.cursosSubidos}\n• Evidencias: ${res.evidenciasSubidas}\n\nDescargados a Local:\n• Cursos: ${res.cursosDescargados}\n• Evidencias: ${res.evidenciasDescargadas}\n\nEliminaciones procesadas: ${res.eliminacionesProcesadas}`
      );
    } catch (error: any) {
      Alert.alert('Error de Sincronización', error.message || 'No se pudo sincronizar con Supabase.');
    } finally {
      setSincronizando(false);
    }
  };

  const manejarRestablecerBD = () => {
    Alert.alert(
      'Restablecer Base de Datos Local',
      'Esta acción eliminará las tablas locales de SQLite y las volverá a crear desde cero. ¿Deseas continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restablecer',
          style: 'destructive',
          onPress: async () => {
            try {
              await dropAndRecreateDatabaseDev();
              await recargarPerfil();
              if (onSincronizacionCompletada) {
                onSincronizacionCompletada();
              }
              Alert.alert('Base de Datos Restablecida', 'La base de datos local se ha reiniciado correctamente.');
              onClose();
            } catch (error: any) {
              Alert.alert('Error', 'No se pudo reiniciar la base de datos.');
            }
          },
        },
      ]
    );
  };

  const manejarCerrarSesion = () => {
    Alert.alert('Cerrar Sesión', '¿Está seguro de que desea salir de su cuenta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: async () => {
          onClose();
          await cerrarSesion();
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.contenedorModal}>
          {/* ENCABEZADO */}
          <View style={styles.encabezado}>
            <View style={styles.iconoPerfilBadge}>
              <Ionicons name="person" size={20} color="#0284C7" />
            </View>
            <View style={styles.tituloContenedor}>
              <Text style={styles.titulo}>Mi Perfil</Text>
              <Text style={styles.subtitulo}>Ajustes de cuenta y sincronización</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.botonCerrar}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {/* SECCIÓN 1: DATOS DOCENTES */}
            <View style={styles.seccionCard}>
              <Text style={styles.subtituloSeccion}>Información Personal</Text>

              <Text style={styles.etiqueta}>Nombre Completo *</Text>
              <TextInput
                style={styles.input}
                value={nombreCompleto}
                onChangeText={setNombreCompleto}
                placeholder="Ej: Dr. Juan Pérez"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.etiqueta}>Grado Académico</Text>
              <TextInput
                style={styles.input}
                value={gradoAcademico}
                onChangeText={setGradoAcademico}
                placeholder="Mg. / Dr. / Ing."
                placeholderTextColor="#94A3B8"
              />

              <TouchableOpacity
                style={styles.botonGuardar}
                onPress={guardarCambios}
                disabled={cargando}
                activeOpacity={0.85}
              >
                {cargando ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.textoBotonGuardar}>Guardar Cambios</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* SECCIÓN 2: SINCRONIZACIÓN Y NUBE */}
            <View style={styles.seccionCard}>
              <Text style={styles.subtituloSeccion}>Sincronización de Datos</Text>
              <Text style={styles.descripcionSeccion}>
                Respalda o descarga tus cursos y evidencias en la nube de Supabase.
              </Text>

              <TouchableOpacity
                style={styles.botonSincronizar}
                onPress={manejarSincronizacion}
                disabled={sincronizando}
                activeOpacity={0.85}
              >
                {sincronizando ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Ionicons name="cloud-download-outline" size={18} color="#FFFFFF" />
                )}
                <Text style={styles.textoBotonSincronizar}>
                  {sincronizando ? 'Sincronizando todo...' : 'Sincronizar con Supabase'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* SECCIÓN 3: MANTENIMIENTO Y CUENTA */}
            <View style={styles.seccionCard}>
              <Text style={styles.subtituloSeccion}>Mantenimiento y Cuenta</Text>

              <TouchableOpacity
                style={styles.botonRestablecer}
                onPress={manejarRestablecerBD}
                activeOpacity={0.85}
              >
                <Ionicons name="refresh-circle-outline" size={20} color="#D97706" />
                <Text style={styles.textoBotonRestablecer}>Restablecer BD Local (Dev)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.botonCerrarSesion}
                onPress={manejarCerrarSesion}
                activeOpacity={0.85}
              >
                <Ionicons name="log-out-outline" size={18} color="#DC2626" />
                <Text style={styles.textoCerrarSesion}>Cerrar Sesión</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  contenedorModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 24,
  },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  iconoPerfilBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tituloContenedor: {
    flex: 1,
  },
  titulo: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitulo: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  botonCerrar: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
  },
  scroll: {
    paddingBottom: 12,
  },
  seccionCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  subtituloSeccion: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  descripcionSeccion: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
    lineHeight: 16,
  },
  etiqueta: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 10,
  },
  botonGuardar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingVertical: 11,
    marginTop: 4,
  },
  textoBotonGuardar: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  botonSincronizar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0284C7',
    borderRadius: 10,
    paddingVertical: 11,
  },
  textoBotonSincronizar: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  botonRestablecer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    borderWidth: 1.2,
    borderColor: '#FCD34D',
    borderRadius: 10,
    paddingVertical: 10,
    marginBottom: 10,
  },
  textoBotonRestablecer: {
    color: '#D97706',
    fontWeight: '700',
    fontSize: 13,
  },
  botonCerrarSesion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1.2,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingVertical: 10,
  },
  textoCerrarSesion: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 13,
  },
});