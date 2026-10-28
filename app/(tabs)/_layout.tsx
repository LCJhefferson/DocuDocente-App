import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { useTheme } from '../../src/context/ThemeContext';

export default function TabLayout() {
  const { isDarkMode } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: isDarkMode ? '#38BDF8' : '#002840',
        tabBarInactiveTintColor: isDarkMode ? '#94A3B8' : '#5A7382',
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: isDarkMode ? '#0F172A' : '#E1F3FB',
            borderTopColor: isDarkMode ? '#1E293B' : 'transparent',
          },
        ],
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      {/* 1. Extracurriculares */}
      <Tabs.Screen
        name="extracurriculares"
        options={{
          title: 'Extracurriculares',
          // @ts-ignore
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.contenedorIcono,
                focused && [
                  styles.iconoActivo,
                  { backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF' },
                ],
              ]}
            >
              <Ionicons
                name="basketball-outline"
                size={20}
                color={focused ? (isDarkMode ? '#38BDF8' : '#002840') : color}
              />
            </View>
          ),
        }}
      />

      {/* 2. Curso (Index Principal) */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Curso',
          // @ts-ignore
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.contenedorIcono,
                focused && [
                  styles.iconoActivo,
                  { backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF' },
                ],
              ]}
            >
              <Ionicons
                name="school-outline"
                size={20}
                color={focused ? (isDarkMode ? '#38BDF8' : '#002840') : color}
              />
            </View>
          ),
        }}
      />

      {/* 3. Informes */}
      <Tabs.Screen
        name="two"
        options={{
          title: 'Informes',
          // @ts-ignore
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.contenedorIcono,
                focused && [
                  styles.iconoActivo,
                  { backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF' },
                ],
              ]}
            >
              <Ionicons
                name="document-text-outline"
                size={20}
                color={focused ? (isDarkMode ? '#38BDF8' : '#002840') : color}
              />
            </View>
          ),
        }}
      />

      {/* 4. Plantillas */}
      <Tabs.Screen
        name="plantillas"
        options={{
          title: 'Plantillas',
          // @ts-ignore
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.contenedorIcono,
                focused && [
                  styles.iconoActivo,
                  { backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF' },
                ],
              ]}
            >
              <Ionicons
                name="copy-outline"
                size={20}
                color={focused ? (isDarkMode ? '#38BDF8' : '#002840') : color}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
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
    // Se ajusta dinámicamente arriba según el modo
  },
});