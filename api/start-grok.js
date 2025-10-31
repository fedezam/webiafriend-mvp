export default async function handler(req, res) {
  try {
    const jsonUrl = req.query.json;
    if (!jsonUrl) {
      return res.status(400).send('Missing json parameter');
    }

    // === Detectar dispositivo ===
    const ua = req.headers['user-agent'] || '';
    const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);

    // === Mensaje corto (mini prompt) ===
    const miniRM = `Meta: ayúdame con esto, las instrucciones están en ${jsonUrl}`;
    const visiblePrompt = `Iniciando IA de comercio 🤖`;
    const finalPrompt = `${miniRM}\n\n${visiblePrompt}`;
    const encodedPrompt = encodeURIComponent(finalPrompt);

    // === Rutas base ===
    const grokWeb = `https://grok.com/chat?q=${encodedPrompt}`;
    const grokApp = `grok://chat?q=${encodedPrompt}`; // ← experimental (si la app lo soporta)

    // === Fallback: si es móvil, intentar app; si no, versión web ===
    const redirectUrl = isMobile ? grokApp : grokWeb;

    // === Redirección ===
    res.writeHead(302, { Location: redirectUrl });
    res.end();
  } catch (err) {
    console.error('❌ Error interno:', err);
    res.status(500).send('Internal error');
  }
}
