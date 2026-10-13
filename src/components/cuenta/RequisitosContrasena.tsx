import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { requisitosContrasena } from '../../utils/validaciones';

export const RequisitosContrasena = ({ valor }: { valor: string }) => (
  <View style={styles.lista}>
    {requisitosContrasena(valor).map(r => (
      <View key={r.texto} style={styles.fila} accessible accessibilityLabel={`${r.texto}: ${r.cumple ? 'cumplido' : 'pendiente'}`}>
        <Ionicons name={r.cumple ? 'checkmark' : 'close'} size={17} color={r.cumple ? '#218653' : '#83909B'} />
        <Text style={[styles.texto, r.cumple && styles.cumplido]}>{r.texto}</Text>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  lista: { marginTop: 12, gap: 6 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  texto: { fontSize: 12, color: '#667581', flexShrink: 1 },
  cumplido: { color: '#218653' },
});
