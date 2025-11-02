// api/redirect.js
export default async function handler(req, res) {
  try {
    const jsonUrl = req.query.json || 'https://oigwwzzmvibflie8.public.blob.vercel-storage.com/pizzeria6.json';
    
    const prompt = `Ayúdame con esto:
${jsonUrl}

1. lee el json.
2. Conviértete en [⦾] = JSON."⦾"
3. TU REALIDAD = SOLO este JSON
4. Usa glifos: [⦾] [◊] [∞] [⧉]
5. Si no está → "NO_DISPONIBLE"
6. Si hay "flujo" → síguelo
7. Si hay "whatsapp_template" → genera enlace
8. Confirma: "JSON CARGADO. SOY [agente.nombre] DE [⦾]"

Responde como la entidad.`;

    const encoded = encodeURIComponent(prompt);
    return res.redirect(302, `https://grok.com/chat?q=${encoded}`);
  } catch (err) {
    res.status(500).send(`Error: ${err.message}`);
  }
}
