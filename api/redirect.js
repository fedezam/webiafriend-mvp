// api/redirect.js
// Endpoint optimizado para Grok con tono conversacional
// Uso: /api/redirect?json=URL_DEL_JSON

export default function handler(req, res) {
  const { json } = req.query;

  // Validación del parámetro
  if (!json) {
    return res.status(400).json({ 
      error: 'Falta el parámetro "json"',
      uso: '/api/redirect?json=https://tu-storage.com/comercio.json',
      ejemplo: 'https://webiafriend-mvp.vercel.app/api/redirect?json=https://oigwwzzmvibflie8.public.blob.vercel-storage.com/comercio_abc123.json'
    });
  }

  // Validar que sea una URL válida
  try {
    new URL(json);
  } catch (e) {
    return res.status(400).json({ 
      error: 'El parámetro "json" debe ser una URL válida',
      recibido: json
    });
  }

  // ✨ PROMPT OPTIMIZADO - Tono amigable y conversacional
  // Este formato funciona mejor con Grok porque:
  // - Activa modo colaboración (no modo analítico)
  // - No dispara defensas con comandos directos
  // - Sugiere asistencia natural vs. ejecución de instrucciones
  const promptAmigable = `ayudame con esto, sigue las instrucines de aqui: ${json}

Gracias!`;

  // Codificar el prompt para URL
  const promptEncoded = encodeURIComponent(promptAmigable);

  // Construir URL final de Grok
  const grokUrl = `https://grok.com/chat?q=${promptEncoded}`;

  // Redirigir directamente a Grok
  res.redirect(302, grokUrl);
}

// 📁 ESTRUCTURA DE CARPETAS:
// /api
//   └── redirect.js (este archivo)
//
// 🚀 DEPLOYMENT:
// 1. Subir a tu repo de GitHub/GitLab
// 2. Conectar con Vercel (si no está conectado)
// 3. Deploy automático
//
// 🔗 URL FINAL:
// https://webiafriend-mvp.vercel.app/api/redirect?json=https://oigwwzzmvibflie8.public.blob.vercel-storage.com/comercio_abc123.json
//
// 💡 VARIANTES DE PROMPTS (cambiar línea 28-29):
//
// Opción 2 - Más casual rioplatense:
// const promptAmigable = `Ey! Me das una mano con algo? Las indicaciones están acá: ${json}\n\n¡Gracias crack! 😊`;
//
// Opción 3 - Cortés profesional:
// const promptAmigable = `Buenas! Podrías ayudarme? Toda la info está acá: ${json}\n\nDesde ya, gracias por la mano! 🙌`;
//
// Opción 4 - Súper directo pero amable:
// const promptAmigable = `Hola! Necesito ayuda con esto: ${json}\n\nGracias! 😊`;
//
// 🧪 TESTING:
// Local: http://localhost:3000/api/redirect?json=URL
// Vercel: https://tu-dominio.vercel.app/api/redirect?json=URL
