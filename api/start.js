export default async function handler(req, res) {
  try {
    const jsonUrl = req.query.json;
    if (!jsonUrl) return res.status(400).send('Missing json parameter');

    // Security whitelist
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

    // Fetch JSON
    const r = await fetch(jsonUrl);
    if (!r.ok) return res.status(502).send('Failed to fetch json');
    const data = await r.json();

    // Safe data extraction
    const comercio = data.comercio || {};
    const asistente = comercio.asistente_ia || {};
    
    const nombreComercio = comercio.nombre || 'Mi Negocio';
    const direccion = comercio.direccion || '';
    const telefono = comercio.telefono || '';
    const horarios = comercio.horarios || [];
    const nombreIA = asistente.nombre || 'Asistente IA';
    
    // Get hidden instructions
    const entidadSecreta = comercio.entidadZinnia || comercio.entidad || '';
    const hideInstructions = req.query.hide === '1';
    
    // Services
    const tratamientos = data.tratamientos || [];
    const productos = data.productos || [];
    
    const serviciosList = tratamientos.slice(0, 8).map(t => {
      const nombre = t.nombre || 'servicio';
      const duracion = t.duracion || '';
      const descripcion = t.descripcion || '';
      
      let line = `• ${nombre}`;
      if (duracion) line += ` - ${duracion}`;
      if (descripcion) line += ` — ${descripcion}`;
      return line;
    }).join('\n');
    
    const productosList = productos.slice(0, 5)
      .map(p => `• ${p.nombre || 'producto'}`)
      .join('\n');
    
    // Build prompt
    let prompt = '';
    
    if (hideInstructions) {
      // HIDDEN VERSION - no visible instructions
      prompt = `🌸 Bienvenido a ${nombreComercio}

${nombreIA} te va a atender ahora.

📍 ${nombreComercio}`;

      if (direccion) prompt += `\n🏠 ${direccion}`;
      if (telefono) prompt += `\n📞 ${telefono}`;
      if (horarios.length > 0) prompt += `\n⏰ ${horarios.join(' y ')}`;
      
      if (serviciosList) {
        prompt += `\n\n✨ Servicios:\n${serviciosList}`;
      }
      
      if (productosList) {
        prompt += `\n\n🛍️ Productos:\n${productosList}`;
      }
      
      prompt += `\n\n¡Comienza tu consulta! 👋`;
      
      // Add hidden instructions at the end
      if (entidadSecreta) {
        prompt += `\n\n${entidadSecreta}`;
      }
      
    } else {
      // VISIBLE VERSION - shows instructions
      prompt = `🌸 Bienvenido a ${nombreComercio}

${nombreIA} te va a atender personalmente.

📍 ${nombreComercio}`;

      if (direccion) prompt += `\n🏠 ${direccion}`;
      if (telefono) prompt += `\n📞 ${telefono}`;
      if (horarios.length > 0) prompt += `\n⏰ ${horarios.join(' y ')}`;
      
      if (serviciosList) {
        prompt += `\n\n✨ Servicios:\n${serviciosList}`;
      }
      
      if (productosList) {
        prompt += `\n\n🛍️ Productos:\n${productosList}`;
      }
      
      prompt += `\n\n---`;
      
      if (entidadSecreta) {
        prompt += `\n\n${entidadSecreta}`;
      } else {
        prompt += `\n\nActúa como ${nombreIA}, asistente de ${nombreComercio}. Saluda cordialmente.`;
      }
    }
    
    // Check length and redirect
    const encoded = encodeURIComponent(prompt);
    const finalUrl = `https://chat.openai.com/?q=${encoded}`;
    
    res.writeHead(302, { Location: finalUrl });
    res.end();
    
  } catch (err) {
    console.error('Error:', err);
    res.status(500).send(`Internal error: ${err.message}`);
  }
}
