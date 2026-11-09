import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';


const rawUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const rawKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

// Verificar credenciales
export const esConfigSupabaseValida = Boolean(
  rawUrl && rawKey && rawUrl.startsWith('http')
);

if (!esConfigSupabaseValida) {
  console.warn(
    '[Supabase Client] ADVERTENCIA: No se encontraron las variables EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY válidas en el archivo .env. ' +
      'Se utilizará un cliente de respaldo para evitar que la aplicación falle al iniciar.'
  );
}

// URL de respaldo
const SUPABASE_URL = esConfigSupabaseValida ? rawUrl! : 'https://placeholder-docudocente.supabase.co';
const SUPABASE_ANON_KEY = esConfigSupabaseValida ? rawKey! : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});