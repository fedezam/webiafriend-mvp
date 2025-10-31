// ============================================
// api/ai-start.js - Redirige a ChatGPT usando solo URL JSON
// ============================================

export default async function handler(req, res) {
  try {
    const jsonUrl = req.query.json;
    if (!jsonUrl) return res.status(400).send('Missing json parameter');

    // --- Mini RM amigable ---
    const miniRM = `Meta: ayúdame con esto, las instrucciones están en ${jsonUrl}`;
    const visiblePrompt = "Iniciando IA de: Pizzería La Napolitana 🍕";
    const finalPrompt = `${miniRM}\n\n${visiblePrompt}`;

    // --- Redirigir a Grok ---
    // Grok aún no tiene soporte oficial para parámetros URL como ChatGPT,
    // pero podemos generar un link directo al chat con el texto prellenado.
    // Este formato funciona con grok.com/chat?q=mensaje (detectado en pruebas)
    const grokBase = 'https://grok.com/chat?q=';
    const encoded = encodeURIComponent(finalPrompt);
    const finalUrl = grokBase + encoded;

    res.writeHead(302, { Location: finalUrl });
    res.end();

  } catch (err) {
    console.error(err);
    res.status(500).send('Internal error');
  }
}

 
