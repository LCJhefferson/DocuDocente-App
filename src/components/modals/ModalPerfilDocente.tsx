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
  onSincronizacionCompletada?: () => void; // Prop agregada para recargar datos en caliente
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

      // Notificar a la pantalla invocadora para recargar el listado de SQLite
      if (onSincronizacionCompletada) {
        onSincronizacionCompletada();
      }

      Alert.alert(
        'Sincronización Completa',
        `Subidos a Supabase:\n• Cursos: ${res.cursosSubidos}\n• Evidencias: ${res.evidenciasSubidas}\n\nDescargados a Local:\n• Cursos: ${res.cursosDescargados}\n• Evidencias: ${res.evidenciasDescargadas}`
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
          <View style={styles.encabezado}>
            <Text style={styles.titulo}>Mi Perfil y Configuración</Text>
            <TouchableOpacity onPress={onClose} style={styles.botonCerrar}>
              <Ionicons name="close" size={24} color="#0F172A" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            <Text style={styles.subtituloSeccion}>Datos Docentes</Text>

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

            <TouchableOpacity style={styles.botonGuardar} onPress={guardarCambios} disabled={cargando}>
              {cargando ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.textoBotonGuardar}>Guardar Cambios</Text>
              )}
            </TouchableOpacity>

            <View style={styles.separador} />

            <Text style={styles.subtituloSeccion}>Mantenimiento de Datos</Text>

            <TouchableOpacity
              style={styles.botonSincronizar}
              onPress={manejarSincronizacion}
              disabled={sincronizando}
            >
              {sincronizando ? (
                <ActivityIndicator color="#0369A1" />
              ) : (
                <Ionicons name="cloud-download-outline" size={20} color="#0369A1" />
              )}
              <Text style={styles.textoBotonSincronizar}>
                {sincronizando ? 'Sincronizando todo...' : 'Sincronizar / Descargar de Supabase'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.botonRestablecer} onPress={manejarRestablecerBD}>
              <Ionicons name="refresh-outline" size={20} color="#B45309" />
              <Text style={styles.textoBotonRestablecer}>Restablecer BD Local (Dev)</Text>
            </TouchableOpacity>

            <View style={styles.separador} />

            <TouchableOpacity style={styles.botonCerrarSesion} onPress={manejarCerrarSesion}>
              <Ionicons name="log-out-outline" size={20} color="#DC2626" />
              <Text style={styles.textoCerrarSesion}>Cerrar Sesión</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  contenedorModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  encabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  titulo: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  botonCerrar: {
    padding: 4,
  },
  scroll: {
    paddingBottom: 12,
  },
  subtituloSeccion: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 10,
    marginTop: 4,
  },
  etiqueta: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 12,
  },
  botonGuardar: {
    backgroundColor: '#1E88E5',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  textoBotonGuardar: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  separador: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 16,
  },
  botonSincronizar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#E0F2FE',
    borderRadius: 10,
    paddingVertical: 12,
    marginBottom: 10,
  },
  textoBotonSincronizar: {
    color: '#0369A1',
    fontWeight: '600',
    fontSize: 14,
  },
  botonRestablecer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    paddingVertical: 12,
  },
  textoBotonRestablecer: {
    color: '#B45309',
    fontWeight: '600',
    fontSize: 14,
  },
  botonCerrarSesion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    paddingVertical: 12,
  },
  textoCerrarSesion: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 14,
  },
});