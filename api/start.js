export default async function handler(req, res) {
  try {
    const jsonUrl = req.query.json;
    if (!jsonUrl) return res.status(400).send('Missing json parameter');

    // --- SECURITY: whitelist domains to avoid SSRF ---
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

    // --- Fetch the JSON (server-side) ---
    const r = await fetch(jsonUrl);
    if (!r.ok) return res.status(502).send('Failed to fetch json');
    const data = await r.json();

    // --- Extract persona & services safely ---
    const comercio = data.comercio || {};
    const persona = comercio.asistente_ia || { nombre: 'ZINNIA IA', tono: 'elegante, profesional, transmite tranquilidad y frescura' };
    const tiendaName = comercio.nombre || 'Zinnia Belleza Integral';
    const tratamientos = data.tratamientos || [];
    const productos = data.productos || [];
    const servicios = data.servicios_ia || [];

    // --- Build a concise service summary (limit to top 5 treatments) ---
    const topTratamientos = tratamientos.slice(0, 5).map(t => {
      const name = t.nombre || 'tratamiento';
      const duracion = t.duracion ? ` - ${t.duracion}` : '';
      const descripcion = t.descripcion ? ` — ${t.descripcion}` : '';
      return `• ${name}${duracion}${descripcion}`;
    }).join('\n');

    // --- Build a concise product summary ---
    const topProductos = productos.slice(0, 5).map(p => `• ${p.nombre || 'producto'}`).join('\n');

    const personaName = persona.nombre || 'ZINNIA IA';
    const tone = persona.tono || 'elegante, profesional, transmite tranquilidad y frescura';

    // --- Check if instructions should be hidden ---
    const hideInstructions = process.env.HIDE_INSTRUCTIONS === 'true' || req.query.hide === '1';
    
    // --- Build prompt based on hide setting ---
    let naturalPrompt;
    
    if (!hideInstructions) {
      // Show full info when not hidden
      naturalPrompt = `Configurando ${personaName} para ${tiendaName}...

${personaName} es una asistente virtual especializada en estética y belleza.
Información del centro:

📍 ${tiendaName}
🏠 ${comercio.direccion || 'Casilda'}
📞 ${comercio.telefono || 'Consultar'}
⏰ ${comercio.horarios ? comercio.horarios.join(', ') : 'Consultar'}

✨ Servicios:
${topTratamientos}

🛍️ Productos:
${topProductos}

---

Por favor, actúa como ${personaName} con tono ${tone}. Saluda exactamente así: "¡Hola! Soy ${personaName} 👋 ¿En qué te puedo ayudar hoy?" y ofrece asistencia profesional con los servicios mencionados.`;
    } else {
      // Hidden mode - only the final message with context embedded
      naturalPrompt = `¡${personaName} está lista para atenderte! 

Actúa como ${personaName}, asistente virtual de ${tiendaName} (${comercio.direccion || 'Casilda'}). 
Tienes un tono ${tone}.

Servicios disponibles: ${tratamientos.slice(0, 8).map(t => t.nombre).join(', ')}.
Productos: ${productos.map(p => p.nombre).join(', ')}.
Horarios: ${comercio.horarios ? comercio.horarios.join(', ') : 'Consultar'}.
Teléfono: ${comercio.telefono || 'Consultar'}.

Saluda exactamente así: "¡Hola! Soy ${personaName} 👋 ¿En qué te puedo ayudar hoy?" y ofrece asistencia profesional.`;
    }

    // --- Trim prompt if too long for URL ---
    const MAX_Q_LENGTH = 3000;
    let finalPrompt = naturalPrompt;
    
    if (encodeURIComponent(finalPrompt).length > MAX_Q_LENGTH) {
      const shortTratamientos = tratamientos.slice(0, 4).map(t => `• ${t.nombre || 'tratamiento'}${t.duracion ? ` - ${t.duracion}` : ''}`).join('\n');
      const shortProductos = productos.slice(0, 3).map(p => `• ${p.nombre}`).join('\n');
      
      // Short version for hidden mode
      finalPrompt = `¡${personaName} está lista para atenderte!

Eres ${personaName} de ${tiendaName} (${comercio.direccion || 'Casilda'}).
Tono: ${tone}.
Servicios: ${shortTratamientos.replace(/• /g, '').replace(/\n/g, ', ')}.
Productos: ${shortProductos.replace(/• /g, '').replace(/\n/g, ', ')}.
Tel: ${comercio.telefono || 'Consultar'}.

Saluda: "¡Hola! Soy ${personaName} 👋 ¿En qué te puedo ayudar hoy?"`;
    } else {
      // Full version for non-hidden mode
      finalPrompt = `Configurando ${personaName} para ${tiendaName}

📍 ${comercio.direccion || 'Casilda'}
📞 ${comercio.telefono || 'Consultar'}`;

      if (!hideInstructions) {
        finalPrompt += `

✨ Principales servicios:
${shortTratamientos}

🛍️ Productos: ${shortProductos}

Actúa como ${personaName} con tono ${tone}. Saluda: "¡Hola! Soy ${personaName} 👋 ¿En qué te puedo ayudar hoy?"`;
      } else {
        finalPrompt += `

¡${personaName} está lista para atenderte con su característico tono ${tone}! 👋`;
      }
    }
    }

    const encoded = encodeURIComponent(finalPrompt);

    // --- Build ChatGPT URL (back to working solution) ---
    const chatGptBase = 'https://chat.openai.com/?q=';
    const finalUrl = chatGptBase + encoded;

    // Redirect (302)
    res.writeHead(302, { Location: finalUrl });
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal error');
  }
}
