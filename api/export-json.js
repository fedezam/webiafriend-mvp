// api/redirect.js
// Endpoint optimizado para Grok con tono conversacional y seguridad reforzada
// Uso: /api/redirect?json=URL_DEL_JSON

const ALLOWED_HOSTS = [
  'oigwwzzmvibflie8.public.blob.vercel-storage.com',
  // Agrega más hosts aquí si usás otros buckets seguros, ej.:
  // 'miotro-bucket.public.blob.vercel-storage.com'
];

export default function handler(req, res) {
  const { json } = req.query;

  // Validación del parámetro
  if (!json) {
    return res.status(400).json({
      error: 'Falta el parámetro "json"',
      uso: '/api/redirect?json=https://tu-storage.com/comercio.json',
      ejemplo: 'https://webiafriend-mvp.vercel.app/api/redirect?json=https://oigwwzzmvibflie8.public.blob.vercel-storage.com/comercio_abc1234.json'
    });
  }

  let url;
  try {
    url = new URL(json);
  } catch (e) {
    return res.status(400).json({
      error: 'El parámetro "json" debe ser una URL válida',
      recibido: json
    });
  }

  // Validar que el host esté permitido
  if (!ALLOWED_HOSTS.includes(url.hostname)) {
    return res.status(403).json({
      error: 'Origen no autorizado',
      permitidos: ALLOWED_HOSTS,
      recibido: url.hostname
    });
  }

  // ✨ PROMPT OPTIMIZADO - Tono amigable rioplatense (ideal para Grok)
  const promptAmigable = `Ey! Me das una mano con algo? Las indicaciones están acá: ${json}\n\n¡Gracias crack! 😊`;

  // Codificar el prompt para la URL
  const promptEncoded = encodeURIComponent(promptAmigable);

  // ✅ URL CORREGIDA: sin espacios al inicio
  const grokUrl = `https://grok.com/chat?q=${promptEncoded}`;

  // Redirigir a Grok
  res.redirect(302, grokUrl);
}
