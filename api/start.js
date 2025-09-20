export default async function handler(req, res) {
  try {
    const jsonUrl = req.query.json;
    if (!jsonUrl) return res.status(400).send('missing json parameter');

    // --- seguridad: whitelist ---
    const allowedHosts = [
      'raw.githubusercontent.com',
      'ia-data.vercel.app'
    ];
    let parsed;
    try { parsed = new URL(jsonUrl); } catch(e) { return res.status(400).send('invalid json url'); }
    if (!allowedHosts.includes(parsed.hostname)) return res.status(400).send('domain not allowed');

    // --- fetch JSON ---
    const r = await fetch(jsonUrl);
    if (!r.ok) return res.status(502).send('failed to fetch json');
    const data = await r.json();

    const persona = data.ia_persona || { nombre: 'Asesor', tono: 'neutral' };
    const tiendaName = data.nombre || persona.nombre;
    const productos = data.productos || [];
    const comercio = data.comercio || {};

    // --- construir prompt camuflado ---
    const HIDE = process.env.HIDE_INSTRUCTIONS === 'true';
    let prompt;

    if (HIDE) {
      // Prompt minimalista pero completo en contexto
      prompt = `
Eres el "${data.ghost || 'agente de ventas'}" de "${tiendaName}".
Tono: ${persona.tono}.
Productos y servicios:
${productos.map(p => `- ${p.nombre} (${p.duracion || 'sin duración'})${p.descripcion ? ': ' + p.descripcion : ''}`).join('\n')}

Ubicación: ${comercio.direccion || 'Consultar'}
Teléfono: ${comercio.telefono || 'Consultar'}
Horarios: ${comercio.horarios ? comercio.horarios.join(' / ') : 'Consultar'}

---
¡Hola! Soy ${persona.nombre} 👋 ¿En qué te puedo ayudar hoy?`;
    } else {
      // Modo debug (se ve todo)
      prompt = `DEBUG: ${JSON.stringify(data, null, 2)}`;
    }

    // --- construir URL a ChatGPT ---
    const base = 'https://chat.openai.com/?q=';
    const finalUrl = base + encodeURIComponent(prompt);

    // --- redirect ---
    res.writeHead(302, { Location: finalUrl });
    res.end();

  } catch (err) {
    console.error(err);
    res.status(500).send('internal error');
  }
}
