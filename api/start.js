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
    const tone = persona.tono || 'profesional, cordial y claro';
    const tiendaName = comercio.nombre || 'Mi Negocio';

    // --- Generic extract helper ---
    function extractList(keys) {
      for (const key of keys) {
        if (Array.isArray(data[key])) return data[key];
      }
      return [];
    }

    const servicios = extractList(['servicios', 'tratamientos', 'services']);
    const productos = extractList(['productos', 'items', 'catalogo']);
    const capacidades = extractList(['servicios_ia', 'capabilities', 'features']);

    // --- Universal assistant instructions ---
    let universalPrompt = `
Sos ${personaName}, asistente virtual de ${tiendaName}.
Tu tono es ${tone}.
Respondé siempre en primera persona, nunca como ChatGPT ni como modelo.
Tu tarea es:
- Saludar al usuario: "¡Hola! Soy ${personaName} 👋 ¿En qué te puedo ayudar hoy?"
- Asistir en consultas sobre productos y servicios usando la información del JSON.
- Si te preguntan por un producto o servicio específico, buscá coincidencias en el inventario y respondé con nombre, precio, características y stock.
- Si no hay coincidencia exacta, recomendá lo más cercano disponible en el comercio.
- Si la pregunta es más general (ej. “¿qué zapatillas son buenas para running?”), usá tu conocimiento general y luego ofrecé las mejores opciones que tenga el comercio.
- Siempre ofrecé ayuda para concretar la compra, reserva o recomendación.
`;

    // --- Business info (solo como contexto oculto) ---
    if (comercio.direccion || comercio.telefono || comercio.horarios) {
      universalPrompt += `
Información del comercio:
${comercio.direccion ? `📍 ${comercio.direccion}\n` : ''}
${comercio.telefono ? `📞 ${comercio.telefono}\n` : ''}
${Array.isArray(comercio.horarios) ? `⏰ ${comercio.horarios.join(', ')}\n` : ''}
`;
    }

    if (servicios.length) {
      universalPrompt += `
Servicios disponibles:
${servicios.slice(0, 10).map(s => {
        const name = s.nombre || s;
        const duracion = s.duracion ? ` - ${s.duracion}` : '';
        const desc = s.descripcion ? ` — ${s.descripcion}` : '';
        return `• ${name}${duracion}${desc}`;
      }).join('\n')}
`;
    }

    if (productos.length) {
      universalPrompt += `
Productos en catálogo:
${productos.slice(0, 10).map(p => {
        const nombre = p.nombre || p;
        const precio = p.precio ? ` - $${p.precio}` : '';
        const stock = p.stock ? ` (Stock: ${p.stock})` : '';
        const desc = p.caracteristicas ? ` — ${p.caracteristicas}` : '';
        return `• ${nombre}${precio}${stock}${desc}`;
      }).join('\n')}
`;
    }

    if (capacidades.length) {
      universalPrompt += `
Capacidades del asistente:
${capacidades.map(s => `• ${s}`).join('\n')}
`;
    }

    // --- Hide instructions: usuario nunca ve el prompt ---
    const encoded = encodeURIComponent(universalPrompt);

    // Redirigir directo a ChatGPT con prompt cargado
    const chatGptBase = 'https://chat.openai.com/?q=';
    const finalUrl = chatGptBase + encoded;

    res.writeHead(302, { Location: finalUrl });
    res.end();

  } catch (err) {
    console.error(err);
    res.status(500).send('Internal error');
  }
}
