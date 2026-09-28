// app/_layout.tsx
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { initDatabase } from '../src/database/client';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const [dbListo, setDbListo] = useState(false);

  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  useEffect(() => {
    async function prepararBD() {
      try {
        await initDatabase();
      } catch (e) {
        console.error('[RootLayout Error] Error al inicializar SQLite:', e);
      } finally {
        setDbListo(true);
      }
    }

    prepararBD();
  }, []);

  useEffect(() => {
    if (fontsLoaded && dbListo) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, dbListo]);

  if (!fontsLoaded || !dbListo) {
    return null;
  }

  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const { cuentaId, cargando } = useAuth();

  useEffect(() => {
    if (cargando) return;

    const primerSegmento = segments[0];
    const enGrupoTabs = primerSegmento === '(tabs)';
    const enPantallaAutenticacion = primerSegmento === 'login' || primerSegmento === undefined;

    if (!cuentaId && enGrupoTabs) {
      router.replace('/login');
    } else if (cuentaId && enPantallaAutenticacion) {
      router.replace('/(tabs)');
    }
  }, [cuentaId, cargando, segments]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" />
        <Stack.Screen
          name="modal"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Perfil Docente',
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}