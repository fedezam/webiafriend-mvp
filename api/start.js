// ============================================
// api/ai-start.js - Redirige a ChatGPT usando solo URL JSON
// ============================================

export default async function handler(req, res) {
  try {
    const jsonUrl = req.query.json;
    const hideInstructions = req.query.hide === '1';

    if (!jsonUrl) return res.status(400).send('Missing json parameter');

    // --- Whitelist dominios ---
    const allowedHosts = [
      'oigwwzzmvibflie8.public.blob.vercel-storage.com'
    ];

    let parsed;
    try { parsed = new URL(jsonUrl); } catch(e) { return res.status(400).send('Invalid JSON URL'); }
    if (!allowedHosts.includes(parsed.hostname)) return res.status(400).send('Domain not allowed');

    // --- Construir mini RM + prompt visible ---
    const miniRM = `Meta: Ayúdame con esto, las instrucciones están en ${jsonUrl}`;
    const visiblePrompt = "Iniciando IA de: Pizzería La Napolitana 🍕";
    const finalPrompt = miniRM + "\n\n" + visiblePrompt;

    // --- Codificar y redirigir a ChatGPT ---
    const chatGptBase = 'https://chat.openai.com/?q=';
    const encodedPrompt = encodeURIComponent(finalPrompt);
    const finalUrl = chatGptBase + encodedPrompt;

    res.writeHead(302, { Location: finalUrl });
    res.end();

  } catch (err) {
    console.error(err);
    res.status(500).send('Internal error');
  }
}
