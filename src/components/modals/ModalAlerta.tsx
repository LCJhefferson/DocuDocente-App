import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type TipoAlerta = 'exito' | 'error' | 'advertencia' | 'confirmacion';

interface ModalAlertaProps {
  visible: boolean;
  tipo?: TipoAlerta;
  titulo: string;
  mensaje: string;
  textoBotonPrincipal?: string;
  textoBotonCancelar?: string;
  onClose: () => void;
  onConfirmar?: () => void;
}

export const ModalAlerta: React.FC<ModalAlertaProps> = ({
  visible,
  tipo = 'exito',
  titulo,
  mensaje,
  textoBotonPrincipal = 'Aceptar',
  textoBotonCancelar = 'Cancelar',
  onClose,
  onConfirmar,
}) => {
  const obtenerConfiguracionTipo = () => {
    switch (tipo) {
      case 'exito':
        return {
          icono: 'checkmark-sharp' as const,
          colorIcono: '#10B981',
          colorFondoIcono: '#D1FAE5',
          colorBoton: '#10B981',
        };
      case 'error':
        return {
          icono: 'close-sharp' as const,
          colorIcono: '#EF4444',
          colorFondoIcono: '#FEE2E2',
          colorBoton: '#EF4444',
        };
      case 'advertencia':
        return {
          icono: 'warning-outline' as const,
          colorIcono: '#F59E0B',
          colorFondoIcono: '#FEF3C7',
          colorBoton: '#F59E0B',
        };
      case 'confirmacion':
        return {
          icono: 'help-outline' as const,
          colorIcono: '#3B82F6',
          colorFondoIcono: '#DBEAFE',
          colorBoton: '#3B82F6',
        };
      default:
        return {
          icono: 'information-outline' as const,
          colorIcono: '#0284C7',
          colorFondoIcono: '#E0F2FE',
          colorBoton: '#0284C7',
        };
    }
  };

  const config = obtenerConfiguracionTipo();
  const esConfirmacion = tipo === 'confirmacion' || !!onConfirmar;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.tarjetaModal}>
          <View style={[styles.contenedorIcono, { backgroundColor: config.colorFondoIcono }]}>
            <View style={[styles.circuloInternoIcono, { backgroundColor: config.colorIcono }]}>
              <Ionicons name={config.icono} size={32} color="#FFFFFF" />
            </View>
          </View>

          <Text style={styles.titulo}>{titulo}</Text>
          <Text style={styles.mensaje}>{mensaje}</Text>

          <View style={styles.contenedorBotones}>
            {esConfirmacion && (
              <TouchableOpacity
                style={[styles.boton, styles.botonCancelar]}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={styles.textoBotonCancelar}>{textoBotonCancelar}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.boton, { backgroundColor: config.colorBoton }, esConfirmacion && { flex: 1 }]}
              onPress={() => {
                if (onConfirmar) {
                  onConfirmar();
                } else {
                  onClose();
                }
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.textoBotonPrincipal}>{textoBotonPrincipal}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  tarjetaModal: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  contenedorIcono: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  circuloInternoIcono: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titulo: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  mensaje: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  contenedorBotones: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  boton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonCancelar: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  textoBotonCancelar: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '600',
  },
  textoBotonPrincipal: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});