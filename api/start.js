export default async function handler(req, res) {
  try {
    const jsonUrl = req.query.json;
    if (!jsonUrl) return res.status(400).send('Missing json parameter');

    // ═══════════════════════════════════════════════════════
    // 🔒 SECURITY: whitelist domains
    // ═══════════════════════════════════════════════════════
    const allowedHosts = [
      'webiafriend-mvp.vercel.app',     // ← TU DOMINIO
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

    // ═══════════════════════════════════════════════════════
    // 📥 Fetch JSON
    // ═══════════════════════════════════════════════════════
    const r = await fetch(jsonUrl);
    if (!r.ok) return res.status(502).send('Failed to fetch json');
    const data = await r.json();

    // ═══════════════════════════════════════════════════════
    // 📊 Extract data from JSON
    // ═══════════════════════════════════════════════════════
    const comercio = data.comercio || {};
    const asistente = comercio.asistente_ia || data.asistente_ia || {};

    // Basic info
    const nombreComercio = comercio.nombre || 'Mi Negocio';
    const direccion = comercio.direccion || '';
    const ciudad = comercio.ciudad || '';
    const telefono = comercio.telefono || '';
    const whatsapp = comercio.whatsapp || '';
    const horarios = comercio.horarios || [];
    const nombreIA = asistente.nombre || 'Asistente IA';

    // ═══════════════════════════════════════════════════════
    // 🎯 MAGIC: Hidden instructions
    // ═══════════════════════════════════════════════════════
    const entidadSecreta = 
      data.SYSTEM_PROMPT ||                    // Nuevo formato
      comercio.entidadZinnia || 
      comercio.entidad || 
      comercio.instrucciones_ia || 
      data.INSTRUCCIONES_IA?.saludo_inicial ||
      `Actúa como ${nombreIA}, asistente de ${nombreComercio}. Saluda cordialmente y ofrece ayuda profesional.`;

    // ═══════════════════════════════════════════════════════
    // 📦 Products/Services
    // ═══════════════════════════════════════════════════════
    const tratamientos = data.tratamientos || [];
    const productos = data.productos || [];
    const catalogo = data.CATALOGO || {};

    // Unificar productos de diferentes formatos
    const todosProductos = [
      ...productos,
      ...tratamientos,
      ...(catalogo.pizzas || []),
      ...(catalogo.extras || []),
      ...(catalogo.bebidas || [])
    ];

    // ═══════════════════════════════════════════════════════
    // 📋 Build services list
    // ═══════════════════════════════════════════════════════
    const serviciosList = todosProductos.slice(0, 8).map(item => {
      const nombre = item.nombre || 'producto';
      const duracion = item.duracion || item.tiempo_prep || '';
      const precio = item.precio 
        ? (typeof item.precio === 'number' 
            ? `$${item.precio.toLocaleString('es-AR')}` 
            : item.precio)
        : '';
      const descripcion = item.descripcion || '';

      let line = `• ${nombre}`;
      if (duracion) line += ` - ${duracion}`;
      if (precio) line += ` - ${precio}`;
      if (descripcion && descripcion.length < 60) line += ` — ${descripcion}`;

      return line;
    }).join('\n');

    // ═══════════════════════════════════════════════════════
    // 🎨 BUILD PROMPT
    // ═══════════════════════════════════════════════════════
    const hideInstructions = process.env.HIDE_INSTRUCTIONS === 'true' || req.query.hide === '1';
    
    let prompt;
    
    if (hideInstructions) {
      // ═══════════════════════════════════════════════════════
      // 🔒 HIDDEN MODE: User sees nice info, GPT gets instructions
      // ═══════════════════════════════════════════════════════
      
      if (todosProductos.length > 3) {
        // Version larga con catálogo
        prompt = `🌸 Bienvenido a ${nombreComercio}

${nombreIA} te va a atender ahora.

📍 ${nombreComercio}
${direccion ? `🏠 ${direccion}${ciudad ? `, ${ciudad}` : ''}` : ''}
${whatsapp ? `📞 ${whatsapp}` : telefono ? `📞 ${telefono}` : ''}
${horarios.length ? `⏰ ${horarios.join(' y ')}` : ''}

${serviciosList ? `✨ Servicios:\n${serviciosList}\n` : ''}

¡Comienza tu consulta! 👋

💬 ${entidadSecreta}`;
      } else {
        // Version corta
        const shortServicios = todosProductos.slice(0, 3).map(p => p.nombre).join(', ');
        
        prompt = `🌸 ${nombreComercio}

${nombreIA} te atiende ahora.

📍 ${direccion || ''} ${whatsapp ? `📞 ${whatsapp}` : ''}
${shortServicios ? `Servicios: ${shortServicios}` : ''}

¡Comienza tu consulta! 👋

💬 ${entidadSecreta}`;
      }
    } else {
      // ═══════════════════════════════════════════════════════
      // 👁️ VISIBLE MODE: Shows instructions (testing)
      // ═══════════════════════════════════════════════════════
      prompt = `🌸 Bienvenido a ${nombreComercio}

${nombreIA} te atiende ahora.

📍 ${direccion || ''} ${whatsapp ? `📞 ${whatsapp}` : ''}

${serviciosList}

---

INSTRUCCIONES:
${entidadSecreta}`;
    }

    // ═══════════════════════════════════════════════════════
    // 🚀 Redirect to ChatGPT
    // ═══════════════════════════════════════════════════════
    const encoded = encodeURIComponent(prompt);
    const finalUrl = `https://chat.openai.com/?q=${encoded}`;

    res.writeHead(302, { Location: finalUrl });
    res.end();

  } catch (err) {
    console.error('❌ Error en /api/start:', err);
    res.status(500).send('Internal error: ' + err.message);
  }
}
