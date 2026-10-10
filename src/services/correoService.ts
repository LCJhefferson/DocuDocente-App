// Envío de correos con EmailJS (https://www.emailjs.com): la app no tiene servidor propio.
// Las claves van en el archivo .env (ver .env.example).

const URL_EMAILJS = 'https://api.emailjs.com/api/v1.0/email/send';

export const enviarCodigoRecuperacion = async (correo: string, codigo: string, minutos: number): Promise<void> => {
  const serviceId = process.env.EXPO_PUBLIC_EMAILJS_SERVICE_ID;
  const templateId = process.env.EXPO_PUBLIC_EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.EXPO_PUBLIC_EMAILJS_PUBLIC_KEY;

  if (!serviceId || !templateId || !publicKey) {
    throw new Error('El envío de correos no está configurado (faltan las claves de EmailJS en .env).');
  }

  const respuesta = await fetch(URL_EMAILJS, {
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
    throw new Error('No se pudo enviar el correo. Revisa tu conexión a internet e inténtalo de nuevo.');
  }
};
