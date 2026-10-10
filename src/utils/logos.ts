import { Asset } from 'expo-asset';
import { File, Paths } from 'expo-file-system';
import { Logo } from '../models/Plantilla';

// Logos que vienen con la app (assets/images)
const LOGOS_INCLUIDOS = {
  untrm: require('../../assets/images/untrm-horizontal.png'),
  fisme: require('../../assets/images/fisme.png'),
} as const;

export const esLogoIncluido = (logo: Logo): logo is keyof typeof LOGOS_INCLUIDOS => logo in LOGOS_INCLUIDOS;

/** Para <Image source={...}> */
export const fuenteLogo = (logo: Logo) => (esLogoIncluido(logo) ? LOGOS_INCLUIDOS[logo] : { uri: logo });

/** Ruta file:// del logo (los incluidos se copian del paquete de la app) */
export const rutaLocalLogo = async (logo: Logo): Promise<string | null> => {
  if (!esLogoIncluido(logo)) return logo;
  const asset = Asset.fromModule(LOGOS_INCLUIDOS[logo]);
  await asset.downloadAsync();
  return asset.localUri;
};

/** La galería devuelve una ruta temporal: se copia a la carpeta de la app para que no se borre */
export const guardarLogoPermanente = (uriTemporal: string): string => {
  const extension = uriTemporal.split('.').pop()?.toLowerCase() === 'png' ? 'png' : 'jpg';
  const destino = new File(Paths.document, `logo-${Date.now()}.${extension}`);
  new File(uriTemporal).copy(destino);
  return destino.uri;
};
