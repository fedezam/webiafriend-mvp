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

    // --- UNIVERSAL FIELD EXTRACTION ---
    const comercio = data.comercio || {};
    const asistente = comercio.asistente_ia || {};
    
    // Basic info (universal fields)
    const nombreIA = asistente.nombre || 'Asistente IA';
    const nombreComercio = comercio.nombre || 'Mi Negocio';
    const direccion = comercio.direccion || '';
    const telefono = comercio.telefono || '';
    const horarios = comercio.horarios || [];
    const tono = asistente.tono || 'amigable y profesional';
    const saludo = asistente.saludo || `¡Hola! Soy ${nombreIA} 👋 ¿En qué te puedo ayudar hoy?`;
    
    // Services/Products (universal structure)
    const tratamientos = data.tratamientos || data.servicios || data.productos || [];
    const productos = data.productos || [];
    
    // --- BUILD UNIVERSAL PROMPT ---
    const hideInstructions = process.env.HIDE_INSTRUCTIONS === 'true' || req.query.hide === '1';
    
    // Services summary (max 8 items)
    const serviciosList = tratamientos.slice(0, 8).map(item => {
      const nombre = item.nombre || item.name || 'servicio';
      const duracion = item.duracion || item.duration || '';
      const precio = item.precio || item.price || '';
      const descripcion = item.descripcion || item.description || '';
      
      let line = `• ${nombre}`;
      if (duracion) line += ` - ${duracion}`;
      if (precio) line += ` - ${precio}`;
      if (descripcion) line += ` — ${descripcion}`;
      
      return line;
    }).join('\n');
    
    // Products summary (max 5 items)
    const productosList = productos.slice(0, 5).map(item => {
      const nombre = item.nombre || item.name || 'producto';
      const marca = item.marca || item.brand || '';
      return marca ? `• ${marca} ${nombre}` : `• ${nombre}`;
    }).join('\n');
    
    // Contact info
    const infoContacto = [
      direccion ? `📍 ${direccion}` : '',
      telefono ? `📞 ${telefono}` : '',
      horarios.length ? `⏰ ${horarios.join(', ')}` : ''
    ].filter(Boolean).join('\n');
    
    // Build prompt based on hide setting
    let prompt;
    
    if (!hideInstructions) {
      // Full version - shows business info nicely
      prompt = `Configurando ${nombreIA} para ${nombreComercio}...

${nombreIA} es tu asistente virtual especializado.
Información del negocio:

${infoContacto}

${serviciosList ? `✨ Servicios:\n${serviciosList}` : ''}

${productosList ? `🛍️ Productos:\n${productosList}` : ''}

---

Por favor, actúa como ${nombreIA} con tono ${tono}. Saluda exactamente así: "${saludo}" y ofrece asistencia profesional.`;
    } else {
      // Hidden version - minimal but functional
      prompt = `¡${nombreIA} está listo para atenderte!

Actúa como ${nombreIA}, asistente de ${nombreComercio}${direccion ? ` (${direccion})` : ''}.
Tono: ${tono}.
${serviciosList ? `Servicios: ${serviciosList.replace(/• /g, '').replace(/\n/g, ', ')}.` : ''}
${productosList ? `Productos: ${productosList.replace(/• /g, '').replace(/\n/g, ', ')}.` : ''}
${telefono ? `Tel: ${telefono}.` : ''}
${horarios.length ? `Horarios: ${horarios.join(', ')}.` : ''}

Saluda exactamente así: "${saludo}" y ofrece asistencia profesional.`;
    }
    
    // --- Trim if too long ---
    const MAX_LENGTH = 3000;
    if (encodeURIComponent(prompt).length > MAX_LENGTH) {
      // Ultra-short version for long URLs
      const shortServicios = tratamientos.slice(0, 4).map(s => s.nombre || s.name || 'servicio').join(', ');
      
      prompt = hideInstructions ? 
        `${nombreIA} de ${nombreComercio}. Tono: ${tono}. Servicios: ${shortServicios}. Saluda: "${saludo}"` :
        `${nombreIA} para ${nombreComercio}\n📍 ${direccion}\n📞 ${telefono}\n\nServicios: ${shortServicios}\n\nActúa como ${nombreIA} con tono ${tono}. Saluda: "${saludo}"`;
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
