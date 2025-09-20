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

    // --- Extract lists ---
    function extractList(keys) {
      for (const key of keys) {
        if (Array.isArray(data[key])) return data[key];
      }
      return [];
    }
    const servicios = extractList(['servicios', 'tratamientos', 'services']);
    const productos = extractList(['productos', 'items', 'catalogo']);
    const capacidades = extractList(['servicios_ia', 'capabilities', 'features']);

    // --- Build user-visible prompt (solo saludo inicial) ---
    const hideInstructions = process.env.HIDE_INSTRUCTIONS === 'true' || req.query.hide === '1';

    let userPrompt;
    if (hideInstructions) {
      // Solo saludo inicial + mensaje natural
      userPrompt = `¡Hola! Soy ${personaName} 👋
Soy la asistente virtual de ${tiendaName}. 
Estoy lista para ayudarte con nuestros servicios y productos. 
¿Querés que te cuente sobre nuestros servicios o productos disponibles?`;
    } else {
      // Muestra un poco más de info si hide=false
      const topServicios = servicios.slice(0,5).map(s => s.nombre || s).join(', ') || 'consultar servicios';
      const topProductos = productos.slice(0,5).map(p => p.nombre || p).join(', ') || 'consultar productos';

      userPrompt = `¡Hola! Soy ${personaName} 👋
Soy la asistente virtual de ${tiendaName}. 
Puedo ayudarte con nuestros servicios: ${topServicios} 
y con productos: ${topProductos}. 
¿En qué te puedo ayudar hoy?`;
    }

    // --- Encode and redirect ---
    const encoded = encodeURIComponent(userPrompt);
    const chatGptBase = 'https://chat.openai.com/?q=';
    const finalUrl = chatGptBase + encoded;

    res.writeHead(302, { Location: finalUrl });
    res.end();

  } catch (err) {
    console.error(err);
    res.status(500).send('Internal error');
  }
}
