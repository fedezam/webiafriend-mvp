// ============================================
// api/ai-start.js - Redirige a ChatGPT usando solo URL JSON
// ============================================

export default async function handler(req, res) {
  try {
    const jsonUrl = req.query.json;
    const hideInstructions = req.query.hide === '1';

    if (!jsonUrl) return res.status(400).send('Missing json parameter');

    // --- Seguridad: whitelist de dominios ---
    const allowedHosts = [
  'ia-data.vercel.app',
  'raw.githubusercontent.com',
  'gist.githubusercontent.com',
  'oigwwzzmvibflie8.public.blob.vercel-storage.com'
];

    ];
    let parsed;
    try { parsed = new URL(jsonUrl); } catch(e) { return res.status(400).send('Invalid json url'); }
    if (!allowedHosts.includes(parsed.hostname)) return res.status(400).send('Domain not allowed');

    // --- Fetch JSON ---
    const r = await fetch(jsonUrl);
    if (!r.ok) return res.status(502).send('Failed to fetch JSON');
    const data = await r.json();

    // --- Construir mini RM y prompt visible ---
    const comercio = data.comercio || {};
    const personaName = data.ia_persona?.nombre || 'Asistente';
    const tiendaName = comercio.nombre || 'Comercio';
    
    const miniRM = `Meta: Ayúdame con esto, las instrucciones están en ${jsonUrl}`;
    const visiblePrompt = `Iniciando IA de: ${tiendaName} 🍕`;

    const finalPrompt = miniRM + "\n\n" + visiblePrompt;

    // --- Codificar para URL ---
    const encodedPrompt = encodeURIComponent(finalPrompt);

    // --- Link a ChatGPT ---
    const chatGptBase = 'https://chat.openai.com/?q=';
    const finalUrl = chatGptBase + encodedPrompt;

    // --- Redirigir ---
    res.writeHead(302, { Location: finalUrl });
    res.end();

  } catch (err) {
    console.error(err);
    res.status(500).send('Internal error');
  }
}

