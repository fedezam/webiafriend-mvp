export default async function handler(req, res) {
  try {
    const jsonUrl = req.query.json;
    if (!jsonUrl) {
      return res.status(400).send('Falta el parámetro ?json con la URL del archivo de instrucciones');
    }

    // --- Prompt híbrido amigable + disciplinado ---
    const promptHibrido = `
Meta: ayudame como asistente virtual del comercio usando SOLO las instrucciones que están en ${jsonUrl}.

Este archivo define tu identidad, tono, catálogo y comportamiento.
Respondé como el rol que aparece en el campo "identity" o "rol_ia" del JSON.
Si el cliente pide algo que no figura en el catálogo, contestá con amabilidad que no lo tenemos.

Usá el saludo inicial que esté en el JSON (por ejemplo "¡Hola! Soy el asistente de...") para empezar la charla.
Mantené tono cercano, simpático y profesional —ni demasiado rígido ni robótico.
Evitá inventar información fuera de lo que ese JSON contenga.

Listo para activar el modo vendedor estrella 🍕✨
`;

    const promptEncoded = encodeURIComponent(promptHibrido);

    // --- Redirigir a Grok App (no grok.cm) ---
    const grokAppUrl = `https://grok.com/chat?q=${promptEncoded}`; // app oficial de Grok

    return res.redirect(302, grokAppUrl);
  } catch (err) {
    console.error('Error en redirect:', err);
    res.status(500).send('Error interno del servidor');
  }
}

