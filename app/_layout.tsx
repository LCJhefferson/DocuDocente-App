import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider, Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { ThemeProvider as CustomThemeProvider, useTheme } from '../src/context/ThemeContext';
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
      <CustomThemeProvider>
        <RootLayoutNav />
      </CustomThemeProvider>
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();
  const { cuentaId, cargando } = useAuth();
  const { isDarkMode } = useTheme();

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
    <NavigationThemeProvider value={isDarkMode ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" />
        <Stack.Screen name="registro" />
        <Stack.Screen name="recuperar" />
        <Stack.Screen name="curso/[id]" />
        <Stack.Screen name="curso/notas-estadisticas" />
        <Stack.Screen name="informe/[id]" />
        <Stack.Screen name="informe/nuevo" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </NavigationThemeProvider>
  );
}