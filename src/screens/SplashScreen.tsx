// src/screens/SplashScreen.tsx
import React, { useEffect } from 'react';
import { Cargando } from '../components/Cargando';

interface SplashScreenProps {
  onFinishLoading: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinishLoading }) => {
  useEffect(() => {
    // Simulación de carga inicial (inicialización de DB, lectura de tokens, etc.)
    const timer = setTimeout(() => {
      onFinishLoading();
    }, 2500);

    return () => clearTimeout(timer);
  }, [onFinishLoading]);

  return <Cargando mensaje="Preparando tu espacio de trabajo..." />;
};