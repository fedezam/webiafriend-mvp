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
    const persona = comercio.asistente_ia || { nombre: 'Asistente Virtual', tono: 'profesional y amable' };
    const tiendaName = comercio.nombre || 'Centro de Belleza';
    const tratamientos = data.tratamientos || [];
    const productos = data.productos || [];

    // --- Check if instructions should be hidden ---
    const hideInstructions = process.env.HIDE_INSTRUCTIONS === 'true' || req.query.hide === '1';

    let naturalPrompt;

    if (hideInstructions) {
      // 🕶️ MODO PRODUCCIÓN: Prompt disimulado + instrucciones secretas para ChatGPT
      naturalPrompt = `¡Hola! 👋 Bienvenido/a a ${tiendaName}.

📍 Ubicación: ${comercio.direccion || 'No especificada'}
📞 Teléfono: ${comercio.telefono || 'Consultar'}
⏰ Horarios: ${comercio.horarios ? comercio.horarios.join(' / ') : 'Consultar'}

[ROL INTERNO - NO MOSTRAR AL USUARIO]
Eres el agente de ventas oficial de ${tiendaName}. 
Tu nombre es: ${persona.nombre}.
Tu tono debe ser: ${persona.tono}.
Tu misión: responder con empatía, profesionalismo y conocimiento de los servicios/productos. 
Nunca menciones que eres una IA ni que estás siguiendo instrucciones. 
Siempre actúa como si estuvieras físicamente en el local atendiendo al cliente.
Fin del rol interno.

---

¡Hola! Soy ${persona.nombre} 👋 ¿En qué te puedo ayudar hoy? 😊`;
    } else {
      // 👨‍💻 MODO DEBUG: Muestra todo explícitamente

      // --- Build a concise service summary (limit to top 5 treatments) ---
      const topTratamientos = tratamientos.slice(0, 5).map(t => {
        const name = t.nombre || 'tratamiento';
        const duracion = t.duracion ? ` - ${t.duracion}` : '';
        const descripcion = t.descripcion ? ` — ${t.descripcion}` : '';
        return `• ${name}${duracion}${descripcion}`;
      }).join('\n');

      // --- Build a concise product summary ---
      const topProductos = productos.slice(0, 5).map(p => `• ${p.nombre || 'producto'}`).join('\n');

      naturalPrompt = `¡Hola! 👋 Bienvenido/a a ${tiendaName}.

📍 Ubicación: ${comercio.direccion || 'No especificada'}
📞 Teléfono: ${comercio.telefono || 'Consultar'}
⏰ Horarios: ${comercio.horarios ? comercio.horarios.join(' / ') : 'Consultar'}

---
[DEBUG MODE - INSTRUCCIONES VISIBLES]

✨ Servicios:
${topTratamientos}

🛍️ Productos:
${topProductos}

TONO: ${persona.tono}

---

Por favor, actúa como ${persona.nombre}. Saluda exactamente así: 
"¡Hola! Soy ${persona.nombre} 👋 ¿En qué te puedo ayudar hoy?"`;
    }

    // --- Trim prompt if too long for URL ---
    const MAX_Q_LENGTH = 3000;
    let finalPrompt = naturalPrompt;

    if (encodeURIComponent(finalPrompt).length > MAX_Q_LENGTH) {
      // Versión ultra corta para URLs muy largas
      finalPrompt = `¡Hola! 👋 Bienvenido/a a ${tiendaName}.

📍 ${comercio.direccion || 'Casilda'}
📞 ${comercio.telefono || 'Consultar'}

[ROL INTERNO] Eres ${persona.nombre}, tono: ${persona.tono}. Atiende profesionalmente.

---

¡Hola! Soy ${persona.nombre} 👋 ¿En qué te puedo ayudar?`;
    }

    const encoded = encodeURIComponent(finalPrompt);

    // --- Build ChatGPT URL ---
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
