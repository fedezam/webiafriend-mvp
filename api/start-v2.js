// api/start-v2.js
export default async function handler(req, res) {
  try {
    const jsonUrl = req.query.json;
    if (!jsonUrl) return res.status(400).send('Missing json parameter');

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

    if (!allowedHosts.includes(parsed.hostname)) {
      return res.status(400).send('Domain not allowed');
    }

    const r = await fetch(jsonUrl);
    if (!r.ok) return res.status(502).send('Failed to fetch json');
    const data = await r.json();

    // --- Extracción avanzada desde TU estructura ---
    const nombreComercio = data.NOMBRE || 'Mi Negocio';
    const direccion = data.UBICACION?.direccion || '';
    const ciudad = data.UBICACION?.ciudad || '';
    const fullDireccion = direccion ? `${direccion}, ${ciudad}` : '';
    const telefono = data.CONTACTO?.whatsapp || '';
    const horario = data.CONTACTO?.horario || '';
    const horarios = horario ? [horario] : [];

    const rol = data.ROL_IA || {};
    const instrucciones = data.INSTRUCCIONES_IA || {};

    const nombreIA = 'Asistente IA';
    const saludoInicial = instrucciones.saludo || `¡Hola! Bienvenido a ${nombreComercio}`;

    // Servicios desde CATALOGO (máx 6)
    const serviciosList = (data.CATALOGO || [])
      .slice(0, 6)
      .map(p => {
        const nombre = p.nombre || 'Producto';
        const desc = p.descripcion || '';
        const precio = p.precio ? `$${p.precio.toLocaleString('es-AR')}` : '';
        let line = `• ${nombre}`;
        if (precio) line += ` — ${precio}`;
        if (desc) line += `\n  _${desc}_`;
        return line;
      })
      .join('\n');

    // Productos desde EXTRAS + BEBIDAS (máx 4)
    const extras = (data.EXTRAS || []).map(e => e.nombre).slice(0, 2);
    const bebidas = (data.BEBIDAS || []).map(b => b.nombre).slice(0, 2);
    const productosList = [...extras, ...bebidas]
      .slice(0, 4)
      .map(n => `• ${n}`)
      .join('\n');

    // --- Construcción del prompt oculto (solo para el LLM) ---
    const entidad = `
Actúa como asistente virtual de ${nombreComercio}.
${rol.personalidad || ''}
Tono: ${rol.tono || 'profesional y amable'}.
Objetivo: ${rol.objetivo || 'ayudar al cliente'}.

Reglas:
- ${instrucciones.restricciones?.join('\n- ') || 'No inventes información.'}
- Si el cliente quiere pedir, genera un link de WhatsApp con todos los detalles.
- Usa emojis con moderación.
- Responde preguntas usando la info del catálogo y FAQ.
- Inicia SIEMPRE con: "${saludoInicial}"
`.trim();

    const hideInstructions = req.query.hide === '1';

    let prompt = '';

    if (hideInstructions) {
      // Solo interfaz limpia para el usuario
      prompt = `🌸 Bienvenido a ${nombreComercio}

Tu asistente te atenderá ahora.

📍 ${nombreComercio}`;
      if (fullDireccion) prompt += `\n🏠 ${fullDireccion}`;
      if (telefono) prompt += `\n📞 ${telefono}`;
      if (horarios.length) prompt += `\n⏰ ${horarios.join(' y ')}`;

      if (serviciosList) {
        prompt += `\n\n✨ Menú:\n${serviciosList}`;
      }
      if (productosList) {
        prompt += `\n\n🛍️ Extras y bebidas:\n${productosList}`;
      }
      prompt += `\n\n¡Comienza tu consulta! 👋`;

      // Añadir ENTIDAD al final → el LLM la ve, el usuario NO la nota (está tras el saludo)
      
    } else {
      // Versión para depuración
      prompt = `... [versión visible con separador] ...`;
      prompt += `\n\n---\n${entidad}`;
    }

    const encoded = encodeURIComponent(prompt);
    const finalUrl = `https://chat.openai.com/?q=${encoded}`;
    
    res.writeHead(302, { Location: finalUrl });
    res.end();

  } catch (err) {
    console.error('Error:', err);
    res.status(500).send(`Internal error: ${err.message}`);
  }
}
