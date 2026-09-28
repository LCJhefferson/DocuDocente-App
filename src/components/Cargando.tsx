// src/components/Cargando.tsx
import LottieView from 'lottie-react-native';
import React, { useEffect, useRef } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';

const { width } = Dimensions.get('window');

interface CargandoProps {
  mensaje?: string;
}

export const Cargando: React.FC<CargandoProps> = ({
  mensaje = 'Docu está procesando la información...',
}) => {
  const animationRef = useRef<LottieView>(null);

  useEffect(() => {
    // Forzamos la reproducción programática al montar el componente
    if (animationRef.current) {
      animationRef.current.play();
    }
  }, []);

  return (
    <View style={styles.contenedor}>
      <View style={styles.lottieWrapper}>
        <LottieView
          ref={animationRef}
          autoPlay
          loop
          resizeMode="contain"
          style={styles.animacionLottie}
          source={require('../../assets/animations/cargar_animacion.json')}
        />
      </View>
      <Text style={styles.textoMensaje}>{mensaje}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
  },
  lottieWrapper: {
    width: width * 0.6,
    height: width * 0.6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  animacionLottie: {
    width: '100%',
    height: '100%',
  },
  textoMensaje: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: '600',
    color: '#0B2545',
    textAlign: 'center',
  },
});