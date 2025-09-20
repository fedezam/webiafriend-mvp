export default async function handler(req, res) {
  try {
    const jsonUrl = req.query.json;
    if (!jsonUrl) return res.status(400).send('Missing json parameter');

    // --- SECURITY: whitelist domains ---
    const allowedHosts = [
      'ia-data.vercel.app',
      'raw.githubusercontent.com',
      'gist.githubusercontent.com'
    ];
    let parsed;
    try {
      parsed = new URL(jsonUrl);
    } catch (e) {
      return res.status(400).send('Invalid json url');
    }
    if (!allowedHosts.includes(parsed.hostname)) return res.status(400).send('Domain not allowed');

    // --- Fetch JSON ---
    const r = await fetch(jsonUrl);
    if (!r.ok) return res.status(502).send('Failed to fetch json');
    const data = await r.json();

    // --- Extract persona / negocio ---
    const comercio = data.comercio || data.negocio || data.empresa || {};
    const persona = comercio.asistente_ia || data.persona || data.asistente || {};
    const personaName = persona.nombre || 'Asistente Virtual';
    const tone = persona.tono || 'profesional, amable';
    const tiendaName = comercio.nombre || 'Mi Negocio';

    // --- Generic extract helper ---
    function extractList(keys) {
      for (const key of keys) {
        if (Array.isArray(data[key])) return data[key];
      }
      return [];
    }

    const tratamientos = extractList(['tratamientos', 'servicios', 'services']);
    const productos = extractList(['productos', 'items', 'catalogo']);
    const serviciosIA = extractList(['servicios_ia', 'capabilities', 'features']);

    // --- Build sections dynamically ---
    let naturalPrompt = `Configurando ${personaName} para ${tiendaName}...\n\n`;

    // Info negocio
    if (comercio.nombre || comercio.direccion || comercio.telefono || comercio.horarios) {
      naturalPrompt += `Información del centro:\n`;
      if (comercio.nombre) naturalPrompt += `📍 ${comercio.nombre}\n`;
      if (comercio.direccion) naturalPrompt += `🏠 ${comercio.direccion}\n`;
      if (comercio.telefono) naturalPrompt += `📞 ${comercio.telefono}\n`;
      if (Array.isArray(comercio.horarios)) {
        naturalPrompt += `⏰ ${comercio.horarios.join(', ')}\n`;
      }
      naturalPrompt += `\n`;
    }

    // Tratamientos / servicios
    if (tratamientos.length) {
      naturalPrompt += `✨ Servicios:\n` + tratamientos.slice(0, 5).map(t => {
        const name = t.nombre || t;
        const duracion = t.duracion ? ` - ${t.duracion}` : '';
        const desc = t.descripcion ? ` — ${t.descripcion}` : '';
        return `• ${name}${duracion}${desc}`;
      }).join('\n') + `\n\n`;
    }

    // Productos
    if (productos.length) {
      naturalPrompt += `🛍️ Productos:\n` + productos.slice(0, 5).map(p => `• ${p.nombre || p}`).join('\n') + `\n\n`;
    }

    // Servicios IA / capacidades
    if (serviciosIA.length) {
      naturalPrompt += `🤖 Capacidades de la asistente:\n` + serviciosIA.map(s => `• ${s}`).join('\n') + `\n\n`;
    }

    // --- Check hideInstructions ---
    const hideInstructions = process.env.HIDE_INSTRUCTIONS === 'true' || req.query.hide === '1';

    if (!hideInstructions) {
      naturalPrompt += `---\n\nPor favor, actúa como ${personaName} con tono ${tone}. Saluda exactamente así: "¡Hola! Soy ${personaName} 👋 ¿En qué te puedo ayudar hoy?"`;
    } else {
      naturalPrompt += `---\n\n¡${personaName} está lista para atenderte! Su especialidad es brindar un servicio ${tone}. 👋`;
    }

    // --- Trim prompt if too long ---
    const MAX_Q_LENGTH = 3000;
    let finalPrompt = naturalPrompt;
    if (encodeURIComponent(finalPrompt).length > MAX_Q_LENGTH) {
      finalPrompt = `Configurando ${personaName} para ${tiendaName}.\n\n¡${personaName} está lista para atenderte con su tono ${tone}! 👋`;
    }

    // Encode + redirect
    const encoded = encodeURIComponent(finalPrompt);
    const chatGptBase = 'https://chat.openai.com/?q=';
    const finalUrl = chatGptBase + encoded;

    res.writeHead(302, { Location: finalUrl });
    res.end();

  } catch (err) {
    console.error(err);
    res.status(500).send('Internal error');
  }
}
