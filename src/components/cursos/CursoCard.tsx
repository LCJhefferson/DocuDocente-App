import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Curso } from '../../models/Curso';

interface Props {
  curso: Curso;
  onPress: () => void;
  onOpenOptions: () => void;
}

export const CursoCard: React.FC<Props> = ({ curso, onPress, onOpenOptions }) => {
  return (
    <TouchableOpacity style={styles.tarjetaCurso} activeOpacity={0.88} onPress={onPress}>
      <TouchableOpacity
        style={styles.botonTresPuntos}
        onPress={onOpenOptions}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons name="ellipsis-vertical" size={20} color="#002840" />
      </TouchableOpacity>

      <Text style={styles.nombreCurso}>{curso.nombre}</Text>
      {(curso.ciclo || curso.semestre || curso.codigo) && (
        <Text style={styles.detallesCurso}>
          {curso.ciclo ? `${curso.ciclo} Ciclo` : ''}{' '}
          {curso.semestre ? `• ${curso.semestre}` : ''}{' '}
          {curso.codigo ? `• ${curso.codigo}` : ''}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  tarjetaCurso: {
    position: 'relative',
    backgroundColor: '#9DE0FF',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 14,
    alignItems: 'center',
  },
  botonTresPuntos: {
    position: 'absolute',
    right: 14,
    top: 14,
    zIndex: 10,
    padding: 6,
  },
  nombreCurso: {
    fontSize: 16,
    fontWeight: '600',
    color: '#002840',
    textAlign: 'center',
    paddingRight: 20,
  },
  detallesCurso: {
    fontSize: 12,
    color: '#1B5270',
    marginTop: 4,
  },
});