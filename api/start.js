// ============================================
// api/start.js - Redirige a ChatGPT con prompt
// Versión simplificada para JSONs en GitHub
// ============================================

export default async function handler(req, res) {
  try {
    const jsonUrl = req.query.json;
    
    if (!jsonUrl) {
      return res.status(400).send('❌ Missing json parameter. Usage: /api/start?json=URL&hide=1');
    }

    // ═══════════════════════════════════════════════════════
    // 🔒 SECURITY: whitelist domains
    // ═══════════════════════════════════════════════════════
    const allowedHosts = [
      'raw.githubusercontent.com',
      'gist.githubusercontent.com',
      'webiafriend-mvp.vercel.app',    // Para cuando uses DB
    ];
    
    let parsed;
    try {
      parsed = new URL(jsonUrl);
    } catch (e) {
      return res.status(400).send('❌ Invalid json URL');
    }
    
    if (!allowedHosts.includes(parsed.hostname)) {
      return res.status(400).send(`❌ Domain not allowed: ${parsed.hostname}`);
    }

    // ═══════════════════════════════════════════════════════
    // 📥 Fetch JSON
    // ═══════════════════════════════════════════════════════
    console.log('📥 Fetching JSON from:', jsonUrl);
    
    const r = await fetch(jsonUrl);
    if (!r.ok) {
      return res.status(502).send(`❌ Failed to fetch JSON (HTTP ${r.status})`);
    }
    
    const data = await r.json();
    console.log('✅ JSON loaded successfully');

    // ═══════════════════════════════════════════════════════
    // 📊 Extract data from JSON (múltiples formatos)
    // ═══════════════════════════════════════════════════════
    
    // Soporta diferentes estructuras de JSON
    const comercio = data.comercio || data.COMERCIO || {};
    const ubicacion = data.UBICACION || {};
    const contacto = data.CONTACTO || {};
    const rolIA = data.ROL_IA || {};
    const asistente = comercio.asistente_ia || data.asistente_ia || {};
    
    // Información básica
    const nombreComercio = 
      comercio.nombre || 
      data.NOMBRE || 
      comercio.nombreComercio || 
      'Mi Negocio';
    
    const direccion = 
      ubicacion.direccion || 
      comercio.direccion || 
      '';
    
    const ciudad = 
      ubicacion.ciudad || 
      comercio.ciudad || 
      '';
    
    const barrio = 
      ubicacion.barrio || 
      comercio.barrio || 
      '';
    
    const telefono = 
      contacto.telefono || 
      comercio.telefono || 
      '';
    
    const whatsapp = 
      contacto.whatsapp || 
      comercio.whatsapp || 
      '';
    
    const horarios = 
      contacto.horario ? [contacto.horario] :
      comercio.horarios || 
      [];
    
    const nombreIA = 
      rolIA.nombre ||
      asistente.nombre || 
      comercio.aiName || 
      'Asistente IA';

    // ═══════════════════════════════════════════════════════
    // 🎯 SYSTEM PROMPT (el secreto que GPT recibe)
    // ═══════════════════════════════════════════════════════
    
    const entidadSecreta = 
      data.SYSTEM_PROMPT ||                     // Formato pizzería
      comercio.entidadZinnia ||                 // Formato Zinnia
      comercio.entidad || 
      comercio.instrucciones_ia || 
      data.INSTRUCCIONES_IA?.saludo_inicial ||
      asistente.saludo_inicial ||
      `Actúa como ${nombreIA}, asistente virtual de ${nombreComercio}. 
Mantén un tono ${rolIA.tono || 'profesional y amigable'}. 
${rolIA.restriccion_absoluta || 'Solo proporciona información basada en el catálogo disponible.'}
Nunca menciones que eres una IA o bot, actúa como empleado humano del local.`;

    // ═══════════════════════════════════════════════════════
    // 📦 Products/Services (múltiples formatos)
    // ═══════════════════════════════════════════════════════
    
    const catalogo = data.CATALOGO || {};
    const tratamientos = data.tratamientos || [];
    const productos = data.productos || [];
    
    // Unificar todos los productos
    const todosProductos = [
      ...productos,
      ...tratamientos,
      ...(catalogo.pizzas || []),
      ...(catalogo.extras || []),
      ...(catalogo.bebidas || []),
      ...(catalogo.ensaladas || []),
      ...(catalogo.postres || [])
    ];

    // ═══════════════════════════════════════════════════════
    // 📋 Build products list (para mostrar al usuario)
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
    
    const hideInstructions = req.query.hide === '1';
    
    let prompt;
    
    if (hideInstructions) {
      // ═══════════════════════════════════════════════════════
      // 🔒 HIDDEN MODE: User sees info, GPT gets instructions
      // ═══════════════════════════════════════════════════════
      
      if (todosProductos.length > 3) {
        // Versión completa con catálogo
        prompt = `🌸 Bienvenido a ${nombreComercio}

${nombreIA} te va a atender ahora.

📍 ${nombreComercio}
${direccion ? `🏠 ${direccion}${ciudad ? `, ${ciudad}` : ''}${barrio ? ` (${barrio})` : ''}` : ''}
${whatsapp ? `📞 ${whatsapp}` : telefono ? `📞 ${telefono}` : ''}
${horarios.length ? `⏰ ${horarios.join(' y ')}` : ''}

${serviciosList ? `✨ Nuestro catálogo:\n${serviciosList}\n` : ''}

¡Comienza tu consulta! 👋

💬 ${entidadSecreta}`;
      } else {
        // Versión corta
        const shortServicios = todosProductos.slice(0, 3).map(p => p.nombre).join(', ');
        
        prompt = `🌸 ${nombreComercio}

${nombreIA} te atiende ahora.

📍 ${direccion || ''}${ciudad ? `, ${ciudad}` : ''} 
${whatsapp ? `📞 ${whatsapp}` : ''}
${shortServicios ? `\n✨ ${shortServicios}` : ''}

¡Comienza tu consulta! 👋

💬 ${entidadSecreta}`;
      }
    } else {
      // ═══════════════════════════════════════════════════════
      // 👁️ VISIBLE MODE: Shows instructions (for testing)
      // ═══════════════════════════════════════════════════════
      
      prompt = `🌸 Bienvenido a ${nombreComercio}

${nombreIA} te atiende ahora.

📍 ${direccion || ''}${ciudad ? `, ${ciudad}` : ''}
${whatsapp ? `📞 ${whatsapp}` : ''}

${serviciosList || 'Catálogo disponible en el sistema'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 INSTRUCCIONES VISIBLES (modo testing):

${entidadSecreta}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Tip: Usa ?hide=1 para ocultar las instrucciones`;
    }

    // ═══════════════════════════════════════════════════════
    // 🚀 Redirect to ChatGPT
    // ═══════════════════════════════════════════════════════
    
    const encoded = encodeURIComponent(prompt);
    const finalUrl = `https://chat.openai.com/?q=${encoded}`;

    console.log('✅ Redirecting to ChatGPT');
    console.log('📝 Prompt length:', prompt.length, 'chars');

    res.writeHead(302, { Location: finalUrl });
    res.end();

  } catch (err) {
    console.error('❌ Error en /api/start:', err);
    res.status(500).send(`❌ Internal error: ${err.message}`);
  }
}
