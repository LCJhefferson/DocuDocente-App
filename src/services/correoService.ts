// Identificadores públicos de EmailJS para la demo; .env permite sobrescribirlos.
const URL_EMAILJS = 'https://api.emailjs.com/api/v1.0/email/send';

// Traduce la respuesta sin mostrar destinatarios, códigos ni claves.
export const mensajeErrorEmailJS = (estado: number, detalle: string): string => {
  if (/non[- ]browser/i.test(detalle)) return 'EmailJS bloquea las aplicaciones móviles. En EmailJS entra a Account > Security y habilita las solicitudes API para aplicaciones no navegador.';
  if (estado === 429 || /quota|limit.*reached/i.test(detalle)) return 'Se alcanzó el límite de envíos de EmailJS. Espera unos minutos o revisa la cuota de la cuenta.';
  if (/recipient|to_email|address.*empty/i.test(detalle)) return 'Revisa la plantilla de EmailJS: el campo To Email debe usar {{to_email}} para recibir el correo del usuario.';
  if (/template/i.test(detalle)) return 'EmailJS no reconoce la plantilla. Revisa el Template ID y que la plantilla esté disponible en la misma cuenta.';
  if (/service/i.test(detalle)) return 'Revisa el Service ID y que el servicio de correo esté conectado en EmailJS.';
  if (/public.?key|user.?id|account.*not.*found/i.test(detalle)) return 'EmailJS no reconoce la clave pública. Revisa la configuración de la cuenta.';
  if (estado === 401 || estado === 403) return `EmailJS rechazó el acceso (HTTP ${estado}). Revisa Account > Security y los permisos del servicio.`;
  if (estado === 412) return 'EmailJS no pudo usar el proveedor de correo. Revisa o reconecta el servicio en Email Services.';
  return `EmailJS rechazó el envío (HTTP ${estado}). Revisa el servicio y la configuración de la plantilla.`;
};

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
    if (!respuesta.ok) {
      const detalle = typeof respuesta.text === 'function' ? await respuesta.text() : '';
      throw new Error(mensajeErrorEmailJS(respuesta.status, detalle));
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('El envío tardó demasiado. Revisa tu conexión e inténtalo de nuevo.');
    if (error instanceof TypeError) throw new Error('No hay conexión con el servicio de correo. Revisa internet e inténtalo de nuevo.');
    throw error;
  } finally {
    clearTimeout(temporizador);
  }
};
