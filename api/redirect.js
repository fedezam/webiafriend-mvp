// api/redirect.js
const ALLOWED_HOSTS = [
  'oigwwzzmvibflie8.public.blob.vercel-storage.com',
];

export default function handler(req, res) {
  const { json } = req.query;

  if (!json) {
    return res.status(400).json({
      error: 'Falta el parámetro "json"',
      uso: '/api/redirect?json=https://tu-storage.com/archivo.json',
      ejemplo: 'https://webiafriend-mvp.vercel.app/api/redirect?json=https://oigwwzzmvibflie8.public.blob.vercel-storage.com/comercio_abc1234.json'
    });
  }

  let url;
  try {
    url = new URL(json);
  } catch {
    return res.status(400).json({
      error: 'El parámetro "json" debe ser una URL válida',
      recibido: json
    });
  }

  if (!ALLOWED_HOSTS.includes(url.hostname)) {
    return res.status(403).json({
      error: 'Origen no autorizado',
      permitidos: ALLOWED_HOSTS,
      recibido: url.hostname
    });
  }

  const promptAmigable = `Ey! Me das una mano con algo? Las indicaciones están acá: ${json}\n\n¡Gracias crack! 😊`;
  const promptEncoded = encodeURIComponent(promptAmigable);
  const grokUrl = `https://grok.com/chat?q=${promptEncoded}`; // ✅ sin espacios

  res.redirect(302, grokUrl);
}
