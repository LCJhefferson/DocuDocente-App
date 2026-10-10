// Versión de prueba de expo-asset: el require de la imagen ya es la ruta del archivo
export const Asset = {
  fromModule: (modulo: string) => ({ localUri: modulo, downloadAsync: async () => {} }),
};
