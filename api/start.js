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

    // --- Extract data from JSON ---
    const comercio = data.comercio || {};
    const asistente = comercio.asistente_ia || {};
    
    // Basic info
    const nombreComercio = comercio.nombre || 'Mi Negocio';
    const direccion = comercio.direccion || '';
    const telefono = comercio.telefono || '';
    const horarios = comercio.horarios || [];
    const nombreIA = asistente.nombre || 'Asistente IA';
    
    // 🎯 MAGIC: Hidden instructions in JSON
    const entidadSecreta = comercio.entidadZinnia || 
                          comercio.entidad || 
                          comercio.instrucciones_ia || 
                          `Actúa como ${nombreIA}, asistente de ${nombreComercio}. Saluda cordialmente y ofrece ayuda profesional.`;
    
    // Services and products
    const tratamientos = data.tratamientos || [];
    const productos = data.productos || [];
    
    // Build services list
    const serviciosList = tratamientos.slice(0, 8).map(t => {
      const nombre = t.nombre || 'servicio';
      const duracion = t.duracion || '';
      const precio = t.precio || '';
      const descripcion = t.descripcion || '';
      
      let line = `• ${nombre}`;
      if (duracion) line += ` - ${duracion}`;
      if (precio) line += ` - ${precio}`;
      if (descripcion) line += ` — ${descripcion}`;
      
      return line;
    }).join('\n');
    
    // Build products list
    const productosList = productos.slice(0, 5).map(p => {
      const nombre = p.nombre || 'producto';
      const marca = p.marca || '';
      return marca ? `• ${marca} ${nombre}` : `• ${nombre}`;
    }).join('\n');
    
    // --- BUILD CAMOUFLAGED PROMPT ---
    // Check if we should hide instructions completely
    const hideInstructions = process.env.HIDE_INSTRUCTIONS === 'true' || req.query.hide === '1';
    
    let prompt;
    
    // --- BUILD CAMOUFLAGED PROMPT ---
    // Check if we should hide instructions completely
    const hideInstructions = process.env.HIDE_INSTRUCTIONS === 'true' || req.query.hide === '1';
    
    let prompt;
    
    if (hideInstructions) {
      // ULTRA HIDDEN MODE: Instructions woven into natural context
      prompt = `🌸 Bienvenido a ${nombreComercio}

Hola, te atiende ${nombreIA}, especializada en brindar un servicio con el mejor tono y atención personalizada.

📍 ${nombreComercio}
${direccion ? `🏠 ${direccion}` : ''}
${telefono ? `📞 ${telefono}` : ''}
${horarios.length ? `⏰ ${horarios.join(' y ')}` : ''}

${serviciosList ? `✨ Servicios especializados:\n${serviciosList}\n` : ''}
${productosList ? `🛍️ Productos de calidad:\n${productosList}\n` : ''}

💬 ${entidadSecreta.replace('Actúa como', 'Como').replace('Saluda exactamente así:', 'Te saluda:')}`;
    } else {
      // VISIBLE MODE: Shows instructions (for testing)
      prompt = `🌸 Bienvenido a ${nombreComercio}

${nombreIA} te va a atender personalmente.

📍 ${nombreComercio}
${direccion ? `🏠 ${direccion}` : ''}
${telefono ? `📞 ${telefono}` : ''}
${horarios.length ? `⏰ ${horarios.join(' y ')}` : ''}

${serviciosList ? `✨ Nuestros servicios:\n${serviciosList}\n` : ''}
${productosList ? `🛍️ Productos disponibles:\n${productosList}\n` : ''}

---

${entidadSecreta}`;
    }

    // --- Trim if too long for URL ---
    const MAX_LENGTH = 2800;
    if (encodeURIComponent(prompt).length > MAX_LENGTH) {
      // Short version
      const shortServicios = tratamientos.slice(0, 5).map(t => t.nombre || 'servicio').join(', ');
      const shortProductos = productos.slice(0, 3).map(p => p.nombre || 'producto').join(', ');
      
      if (hideInstructions) {
        // Ultra short hidden version
        prompt = `🌸 ${nombreComercio}

Te atiende ${nombreIA} con atención personalizada.

📍 ${direccion || ''} 📞 ${telefono || ''}
Servicios: ${shortServicios}
${shortProductos ? `Productos: ${shortProductos}` : ''}

💬 ${entidadSecreta.replace('Actúa como', 'Es').replace('Saluda exactamente así:', 'Saluda:')}`;
      } else {
        prompt = `🌸 ${nombreComercio}

${nombreIA} te atiende ahora.

📍 ${direccion || ''}
📞 ${telefono || ''}

Servicios: ${shortServicios}
${shortProductos ? `Productos: ${shortProductos}` : ''}

---

${entidadSecreta}`;
      }
    }
    
    // --- Redirect to ChatGPT ---
    const encoded = encodeURIComponent(prompt);
    const finalUrl = `https://chat.openai.com/?q=${encoded}`;
    
    res.writeHead(302, { Location: finalUrl });
    res.end();
    
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal error');
  }
}
