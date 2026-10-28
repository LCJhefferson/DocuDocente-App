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
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { dropAndRecreateDatabaseDev } from '../database/client';
import { PerfilDocenteService } from '../services/perfilDocenteService';
import { syncService } from '../services/supabase/syncService';

interface MenuDocenteProps {
  visible: boolean;
  onClose: () => void;
  onSincronizacionCompletada?: () => void;
}

export const MenuDocente: React.FC<MenuDocenteProps> = ({
  visible,
  onClose,
  onSincronizacionCompletada,
}) => {
  const { cuentaId, perfilDocente, recargarPerfil, cerrarSesion } = useAuth();
  const { themeMode, setThemeMode, isDarkMode } = useTheme();

  // Vista actual del menú lateral
  const [vistaActual, setVistaActual] = useState<'menu' | 'perfil' | 'apariencia' | 'sincronizacion'>('menu');

  const [nombreCompleto, setNombreCompleto] = useState('');
  const [gradoAcademico, setGradoAcademico] = useState('');
  const [cargando, setCargando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);

  useEffect(() => {
    if (perfilDocente) {
      setNombreCompleto(perfilDocente.nombreCompleto || '');
      setGradoAcademico(perfilDocente.gradoAcademico || 'Mg.');
    }
    if (visible) {
      setVistaActual('menu');
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
      setVistaActual('menu');
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

      if (onSincronizacionCompletada) {
        onSincronizacionCompletada();
      }

      Alert.alert(
        'Sincronización Completa',
        `Subidos a Supabase:\nCursos: ${res.cursosSubidos}\nEvidencias: ${res.evidenciasSubidas}\n\nDescargados a Local:\nCursos: ${res.cursosDescargados}\nEvidencias: ${res.evidenciasDescargadas}\n\nEliminaciones procesadas: ${res.eliminacionesProcesadas}`
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
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* Panel lateral izquierdo (desliza desde la izquierda) */}
        <View
          style={[
            styles.contenedorMenu,
            { backgroundColor: isDarkMode ? '#0F172A' : '#FFFFFF' },
          ]}
        >
          {/* ENCABEZADO */}
          <View
            style={[
              styles.headerMenu,
              { borderBottomColor: isDarkMode ? '#1E293B' : '#F1F5F9' },
            ]}
          >
            {vistaActual !== 'menu' ? (
              <TouchableOpacity
                onPress={() => setVistaActual('menu')}
                style={[styles.botonCerrar, { backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9' }]}
              >
                <Ionicons name="arrow-back" size={20} color={isDarkMode ? '#38BDF8' : '#0284C7'} />
              </TouchableOpacity>
            ) : (
              <View
                style={[
                  styles.avatarContainer,
                  { backgroundColor: isDarkMode ? '#172554' : '#E0F2FE' },
                ]}
              >
                <Ionicons name="person" size={22} color={isDarkMode ? '#38BDF8' : '#0284C7'} />
              </View>
            )}

            <View style={styles.headerInfo}>
              <Text style={[styles.nombreDocente, { color: isDarkMode ? '#F8FAFC' : '#0F172A' }]}>
                {vistaActual === 'menu' ? (perfilDocente?.nombreCompleto || 'Docente UNTRM') : 
                 vistaActual === 'perfil' ? 'Perfil y Datos' :
                 vistaActual === 'apariencia' ? 'Apariencia y Tema' : 'Sincronización'}
              </Text>
              <Text style={[styles.gradoDocente, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
                {vistaActual === 'menu' ? 'Menú Principal' : 'Regresar al menú'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.botonCerrar, { backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9' }]}
            >
              <Ionicons name="close" size={20} color={isDarkMode ? '#94A3B8' : '#64748B'} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            
            {/* VISTA 1: MENÚ PRINCIPAL (TODAS LAS OPCIONES AQUÍ) */}
            {vistaActual === 'menu' && (
              <View style={styles.listaOpciones}>
                <TouchableOpacity
                  style={[styles.menuItem, { backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', borderColor: isDarkMode ? '#334155' : '#E2E8F0' }]}
                  onPress={() => setVistaActual('perfil')}
                  activeOpacity={0.8}
                >
                  <View style={styles.menuItemLeft}>
                    <Ionicons name="person-outline" size={20} color={isDarkMode ? '#38BDF8' : '#0284C7'} />
                    <Text style={[styles.menuItemText, { color: isDarkMode ? '#F8FAFC' : '#0F172A' }]}>Perfil</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={isDarkMode ? '#94A3B8' : '#64748B'} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.menuItem, { backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', borderColor: isDarkMode ? '#334155' : '#E2E8F0' }]}
                  onPress={() => setVistaActual('apariencia')}
                  activeOpacity={0.8}
                >
                  <View style={styles.menuItemLeft}>
                    <Ionicons name="color-palette-outline" size={20} color={isDarkMode ? '#38BDF8' : '#0284C7'} />
                    <Text style={[styles.menuItemText, { color: isDarkMode ? '#F8FAFC' : '#0F172A' }]}>Apariencia</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={isDarkMode ? '#94A3B8' : '#64748B'} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.menuItem, { backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', borderColor: isDarkMode ? '#334155' : '#E2E8F0' }]}
                  onPress={() => setVistaActual('sincronizacion')}
                  activeOpacity={0.8}
                >
                  <View style={styles.menuItemLeft}>
                    <Ionicons name="cloud-download-outline" size={20} color={isDarkMode ? '#38BDF8' : '#0284C7'} />
                    <Text style={[styles.menuItemText, { color: isDarkMode ? '#F8FAFC' : '#0F172A' }]}>Sincronización</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={isDarkMode ? '#94A3B8' : '#64748B'} />
                </TouchableOpacity>

                {/* RESTABLECER BD EN EL MENÚ PRINCIPAL */}
                <TouchableOpacity
                  style={[styles.menuItemAccion, { backgroundColor: isDarkMode ? '#422006' : '#FFFBEB', borderColor: isDarkMode ? '#B45309' : '#FCD34D' }]}
                  onPress={manejarRestablecerBD}
                  activeOpacity={0.8}
                >
                  <View style={styles.menuItemLeft}>
                    <Ionicons name="refresh-circle-outline" size={20} color={isDarkMode ? '#FBBF24' : '#D97706'} />
                    <Text style={[styles.textoAccionItem, { color: isDarkMode ? '#FBBF24' : '#D97706' }]}>Restablecer Base de Datos (Dev)</Text>
                  </View>
                </TouchableOpacity>

                {/* CERRAR SESIÓN EN EL MENÚ PRINCIPAL */}
                <TouchableOpacity
                  style={[styles.menuItemAccion, { backgroundColor: isDarkMode ? '#450A0A' : '#FEF2F2', borderColor: isDarkMode ? '#991B1B' : '#FECACA' }]}
                  onPress={manejarCerrarSesion}
                  activeOpacity={0.8}
                >
                  <View style={styles.menuItemLeft}>
                    <Ionicons name="log-out-outline" size={20} color={isDarkMode ? '#F87171' : '#DC2626'} />
                    <Text style={[styles.textoAccionItem, { color: isDarkMode ? '#F87171' : '#DC2626' }]}>Cerrar Sesión</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* VISTA 2: PERFIL (Solo información personal y guardar) */}
            {vistaActual === 'perfil' && (
              <View style={styles.subVistaContainer}>
                <Text style={[styles.etiqueta, { color: isDarkMode ? '#CBD5E1' : '#334155' }]}>Nombre Completo *</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: isDarkMode ? '#0F172A' : '#FFFFFF',
                      borderColor: isDarkMode ? '#334155' : '#CBD5E1',
                      color: isDarkMode ? '#F8FAFC' : '#0F172A',
                    },
                  ]}
                  value={nombreCompleto}
                  onChangeText={setNombreCompleto}
                  placeholder="Ej: Dr. Juan Pérez"
                  placeholderTextColor={isDarkMode ? '#64748B' : '#94A3B8'}
                />

                <Text style={[styles.etiqueta, { color: isDarkMode ? '#CBD5E1' : '#334155' }]}>Grado Académico</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: isDarkMode ? '#0F172A' : '#FFFFFF',
                      borderColor: isDarkMode ? '#334155' : '#CBD5E1',
                      color: isDarkMode ? '#F8FAFC' : '#0F172A',
                    },
                  ]}
                  value={gradoAcademico}
                  onChangeText={setGradoAcademico}
                  placeholder="Mg. / Dr. / Ing."
                  placeholderTextColor={isDarkMode ? '#64748B' : '#94A3B8'}
                />

                <TouchableOpacity
                  style={[styles.botonAccion, { backgroundColor: isDarkMode ? '#38BDF8' : '#0F172A' }]}
                  onPress={guardarCambios}
                  disabled={cargando}
                >
                  {cargando ? (
                    <ActivityIndicator color={isDarkMode ? '#0F172A' : '#FFFFFF'} size="small" />
                  ) : (
                    <Text style={[styles.textoBotonAccion, { color: isDarkMode ? '#0F172A' : '#FFFFFF' }]}>
                      Guardar Cambios
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* VISTA 3: APARIENCIA */}
            {vistaActual === 'apariencia' && (
              <View style={styles.subVistaContainer}>
                <Text style={[styles.descripcionSub, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
                  Elige cómo deseas que se vea DocuDocente en tu dispositivo.
                </Text>
                <View style={styles.contenedorOpcionesTema}>
                  <TouchableOpacity
                    style={[
                      styles.botonTemaOpcion,
                      { backgroundColor: isDarkMode ? '#0F172A' : '#FFFFFF', borderColor: isDarkMode ? '#334155' : '#CBD5E1' },
                      themeMode === 'system' && { backgroundColor: isDarkMode ? '#172554' : '#E0F2FE', borderColor: '#0284C7' },
                    ]}
                    onPress={() => setThemeMode('system')}
                  >
                    <Ionicons name="phone-portrait-outline" size={16} color={themeMode === 'system' ? '#0284C7' : '#64748B'} />
                    <Text style={[styles.textoTemaOpcion, themeMode === 'system' && { color: '#0284C7', fontWeight: '700' }]}>Sistema</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.botonTemaOpcion,
                      { backgroundColor: isDarkMode ? '#0F172A' : '#FFFFFF', borderColor: isDarkMode ? '#334155' : '#CBD5E1' },
                      themeMode === 'light' && { backgroundColor: isDarkMode ? '#172554' : '#E0F2FE', borderColor: '#0284C7' },
                    ]}
                    onPress={() => setThemeMode('light')}
                  >
                    <Ionicons name="sunny-outline" size={16} color={themeMode === 'light' ? '#0284C7' : '#64748B'} />
                    <Text style={[styles.textoTemaOpcion, themeMode === 'light' && { color: '#0284C7', fontWeight: '700' }]}>Claro</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.botonTemaOpcion,
                      { backgroundColor: isDarkMode ? '#0F172A' : '#FFFFFF', borderColor: isDarkMode ? '#334155' : '#CBD5E1' },
                      themeMode === 'dark' && { backgroundColor: isDarkMode ? '#172554' : '#E0F2FE', borderColor: '#0284C7' },
                    ]}
                    onPress={() => setThemeMode('dark')}
                  >
                    <Ionicons name="moon-outline" size={16} color={themeMode === 'dark' ? '#0284C7' : '#64748B'} />
                    <Text style={[styles.textoTemaOpcion, themeMode === 'dark' && { color: '#0284C7', fontWeight: '700' }]}>Oscuro</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* VISTA 4: SINCRONIZACIÓN */}
            {vistaActual === 'sincronizacion' && (
              <View style={styles.subVistaContainer}>
                <Text style={[styles.descripcionSub, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
                  Respalda o descarga tus cursos y evidencias en la nube de Supabase.
                </Text>
                <TouchableOpacity
                  style={styles.botonSincronizar}
                  onPress={manejarSincronizacion}
                  disabled={sincronizando}
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
            )}

          </ScrollView>
        </View>

        {/* Fondo táctil para cerrar al pulsar fuera */}
        <TouchableOpacity style={styles.fondoTectil} activeOpacity={1} onPress={onClose} />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    flexDirection: 'row',
    justifyContent: 'flex-start', // Abre desde la izquierda (del otro lado)
  },
  fondoTectil: {
    flex: 1,
  },
  contenedorMenu: {
    width: '88%',
    maxWidth: 390,
    height: '100%',
    paddingHorizontal: 16,
    paddingTop: 45,
    paddingBottom: 24,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  headerMenu: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  nombreDocente: {
    fontSize: 15,
    fontWeight: '800',
  },
  gradoDocente: {
    fontSize: 11,
    marginTop: 2,
  },
  botonCerrar: {
    padding: 6,
    borderRadius: 18,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  listaOpciones: {
    gap: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '700',
  },
  subVistaContainer: {
    gap: 12,
    paddingTop: 4,
  },
  descripcionSub: {
    fontSize: 12,
    marginBottom: 8,
    lineHeight: 16,
  },
  contenedorOpcionesTema: {
    flexDirection: 'row',
    gap: 6,
  },
  botonTemaOpcion: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
  },
  textoTemaOpcion: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  etiqueta: {
    fontSize: 11,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
  },
  botonAccion: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  textoBotonAccion: {
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
    paddingVertical: 12,
  },
  textoBotonSincronizar: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  menuItemAccion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.2,
    borderRadius: 12,
    padding: 14,
  },
  textoAccionItem: {
    fontWeight: '700',
    fontSize: 14,
  },
});