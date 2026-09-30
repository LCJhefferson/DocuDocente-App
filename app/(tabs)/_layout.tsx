import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#002840',
        tabBarInactiveTintColor: '#5A7382',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      {/* 1. Extracurriculares */}
      <Tabs.Screen
        name="extracurriculares"
        options={{
          title: 'Extracurriculares',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.contenedorIcono, focused && styles.iconoActivo]}>
              <Ionicons name="basketball-outline" size={20} color={focused ? '#002840' : color} />
            </View>
          ),
        }}
      />

      {/* 2. Curso (Index Principal) */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Curso',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.contenedorIcono, focused && styles.iconoActivo]}>
              <Ionicons name="school-outline" size={20} color={focused ? '#002840' : color} />
            </View>
          ),
        }}
      />

      {/* 3. Informes */}
      <Tabs.Screen
        name="two"
        options={{
          title: 'Informes',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.contenedorIcono, focused && styles.iconoActivo]}>
              <Ionicons name="document-text-outline" size={20} color={focused ? '#002840' : color} />
            </View>
          ),
        }}
      />

      {/* 4. Plantillas (NUEVA PESTAÑA) */}
      <Tabs.Screen
        name="plantillas"
        options={{
          title: 'Plantillas',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.contenedorIcono, focused && styles.iconoActivo]}>
              <Ionicons name="copy-outline" size={20} color={focused ? '#002840' : color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#E1F3FB', // Fondo Azul Pastel
    borderTopWidth: 0,
    height: Platform.OS === 'ios' ? 82 : 64,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 6,
    elevation: 0,
    shadowOpacity: 0,
  },
  tabBarLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    fontStyle: 'italic',
    marginTop: 2,
  },
  contenedorIcono: {
    width: 44,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
  },
  iconoActivo: {
    backgroundColor: '#FFFFFF', // Fondo blanco delimitado en píldora compacta
  },
});