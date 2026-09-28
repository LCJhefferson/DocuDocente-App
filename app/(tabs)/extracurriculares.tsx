import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ExtracurricularesScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.titulo}>Actividades Extracurriculares</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titulo: {
    fontSize: 18,
    fontWeight: '700',
    color: '#002840',
  },
});