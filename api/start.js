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

    // --- Build service summary ---
    const topTratamientos = tratamientos.slice(0, 5).map(t => {
      const name = t.nombre || 'tratamiento';
      const duracion = t.duracion ? ` - ${t.duracion}` : '';
      const descripcion = t.descripcion ? ` — ${t.descripcion}` : '';
      return `• ${name}${duracion}${descripcion}`;
    }).join('\n');

    const topProductos = productos.slice(0, 5).map(p => `• ${p.nombre || 'producto'}`).join('\n');

    const personaName = persona.nombre || 'ZINNIA IA';
    const tone = persona.tono || 'elegante, profesional, transmite tranquilidad y frescura';

    // --- NUEVO APPROACH: Solo mensaje inicial visible ---
    const mensajeVisible = `¡Hola! Soy ${personaName} 👋 ¿En qué te puedo ayudar hoy?

Puedo asistirte con:
• Reservas de turnos
• Información sobre tratamientos
• Consultas sobre productos
• Preguntas de estética

¿Te gustaría reservar un turno o conocer más sobre algún servicio?

---
CONTEXTO PARA EL ASISTENTE:
Eres ${personaName}, asistente de ${tiendaName} (${comercio.direccion || 'Casilda'}).
Tono: ${tone}.
Mantén siempre este rol profesional y elegante.

SERVICIOS:
${topTratamientos}

PRODUCTOS:
${topProductos}

HORARIOS: ${comercio.horarios ? comercio.horarios.join(', ') : 'Consultar'}
CONTACTO: ${comercio.telefono || 'Consultar'}

Para reservas, solicita contacto del cliente.`;

    // --- Build prompt that looks natural when shown ---
    const naturalPrompt = `Configurando ${personaName} para ${tiendaName}...

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

    // --- Build ChatGPT URL (back to working solution) ---
    const chatGptBase = 'https://chat.openai.com/?q=';
    const encoded = encodeURIComponent(naturalPrompt);
    const finalUrl = chatGptBase + encoded;

    // Redirect
    res.writeHead(302, { Location: finalUrl });
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal error');
  }
}
