// constants/Colors.ts
const tintColorLight = '#4298E7'; 
const tintColorDark = '#CBE6F8'; 

export const Colors = {
  light: {
    text: '#212631',
    tint: tintColorLight,
    tabIconDefault: '#5A6D7C',
    tabIconSelected: tintColorLight,     
    accent: '#4298E7',       
    card: '#FFFFFF',
    border: '#CBE6F8',
    primary: '#1E88E5',        // Azul botones
    textDark: '#1C252C',       // Texto principal
    textMuted: '#83968C',      // Labels y marcas de agua
    borderUnderline: '#A8B9C2',// Línea de input
    linkDark: '#124874',       // Enlace Crear cuenta
    background: '#FFFFFF',
  },
  dark: {
    text: '#FFFFFF',
    background: '#212631',
    tint: tintColorDark,
    tabIconDefault: '#5A6D7C',
    tabIconSelected: tintColorDark,
    primary: '#4298E7',
    accent: '#CBE6F8',
    card: '#1A1E26',
    border: '#5A6D7C',
  },
};

export default Colors;