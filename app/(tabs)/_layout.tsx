// app/(tabs)/_layout.tsx
import { Link, Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Alert, Pressable, View } from 'react-native';

import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '../../src/context/AuthContext';

export default function TabLayout() {
  const colorScheme = useColorScheme()?? 'light';
  const { cerrarSesion } = useAuth();

  // Función para confirmar el cierre de sesión
  const confirmarCerrarSesion = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que deseas salir de tu cuenta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            await cerrarSesion();
          },
        },
      ]
    );
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tint,
        // Desactiva el renderizado estático del header en Web
        headerShown: useClientOnlyValue(false, true),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Cursos',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'book',
                android: 'book',
                web: 'book',
              }}
              tintColor={color}
              size={26}
            />
          ),
          // Botones de acción en la esquina superior derecha del Header
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 15 }}>
              {/* 1. Botón de Perfil Docente (Abre el Modal) */}
              <Link href="/modal" asChild>
                <Pressable style={{ padding: 4, marginRight: 12 }}>
                  {({ pressed }) => (
                    <SymbolView
                      name={{
                        ios: 'person.crop.circle',
                        android: 'account_circle',
                        web: 'account_circle',
                      }}
                      size={26}
                      tintColor={Colors[colorScheme].text}
                      style={{ opacity: pressed ? 0.5 : 1 }}
                    />
                  )}
                </Pressable>
              </Link>

              {/* 2. Botón explícito para Cerrar Sesión */}
              <Pressable onPress={confirmarCerrarSesion} style={{ padding: 4 }}>
                {({ pressed }) => (
                  <SymbolView
                    name={{
                      ios: 'rectangle.portrait.and.arrow.right',
                      android: 'logout',
                      web: 'logout',
                    }}
                    size={24}
                    tintColor="#a09a9a"
                    style={{ opacity: pressed ? 0.5 : 1 }}
                  />
                )}
              </Pressable>
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="two"
        options={{
          title: 'Informes',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'doc.text',
                android: 'description',
                web: 'description',
              }}
              tintColor={color}
              size={26}
            />
          ),
        }}
      />
    </Tabs>
  );
}