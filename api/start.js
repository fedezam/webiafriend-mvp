// ============================================
// api/ai-start.js - Redirige a ChatGPT usando solo URL JSON
// ============================================

export default async function handler(req, res) {
  try {
    const jsonUrl = req.query.json || 'https://raw.githubusercontent.com/fedezam/webiafriend-mvp/refs/heads/main/pizeria.json';
    
    // ═══════════════════════════════════════════════════════
    // 🔒 Seguridad: whitelist
    const allowedHosts = [
      'raw.githubusercontent.com',
      'gist.githubusercontent.com',
      'webiafriend-mvp.vercel.app'
    ];
    
    const parsed = new URL(jsonUrl);
    if (!allowedHosts.includes(parsed.hostname)) {
      return res.status(400).send(`❌ Domain not allowed: ${parsed.hostname}`);
    }

    // ═══════════════════════════════════════════════════════
    // 🔹 Construir prompt mínimo
    // En vez de enviar todo el JSON, le pasamos solo la URL
    const prompt = `
🌸 Bienvenido a tu asistente virtual

Lee los datos desde este JSON en vivo:
${jsonUrl}

Genera respuestas solo basadas en este catálogo. 
Mantén un tono profesional y amigable. 
No inventes productos ni servicios que no estén en el JSON.
Nunca digas que eres una IA, actúa como empleado humano.
¡Comienza tu consulta! 👋
`;

    // ═══════════════════════════════════════════════════════
    // 🚀 Redirigir a ChatGPT
    const encoded = encodeURIComponent(prompt);
    const finalUrl = `https://chat.openai.com/?q=${encoded}`;

    res.writeHead(302, { Location: finalUrl });
    res.end();

  } catch (err) {
    console.error('❌ Error en /api/ai-start:', err);
    res.status(500).send(`❌ Internal error: ${err.message}`);
  }
}
