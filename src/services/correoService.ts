// Identificadores públicos de EmailJS para la demo; .env permite sobrescribirlos.
const URL_EMAILJS = 'https://api.emailjs.com/api/v1.0/email/send';

export const enviarCodigoRecuperacion = async (correo: string, codigo: string, minutos: number): Promise<void> => {
  const serviceId = process.env.EXPO_PUBLIC_EMAILJS_SERVICE_ID || 'service_nb3wbpn';
  const templateId = process.env.EXPO_PUBLIC_EMAILJS_TEMPLATE_ID || 'template_s82sv9m';
  const publicKey = process.env.EXPO_PUBLIC_EMAILJS_PUBLIC_KEY || '5p7IY-8Ahf3bckbuv';
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), 15000);
  try {
    const respuesta = await fetch(URL_EMAILJS, {
      signal: controlador.signal,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        template_params: { to_email: correo, codigo, minutos },
      }),
    });
    if (respuesta.status === 429) throw new Error('Se alcanzó el límite de envíos. Espera unos minutos.');
    if (!respuesta.ok) throw new Error('No se pudo enviar el correo. Revisa tu conexión y la configuración de EmailJS.');
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('El envío tardó demasiado. Revisa tu conexión e inténtalo de nuevo.');
    if (error instanceof TypeError) throw new Error('No hay conexión con el servicio de correo. Revisa internet e inténtalo de nuevo.');
    throw error;
  } finally {
    clearTimeout(temporizador);
  }
};
