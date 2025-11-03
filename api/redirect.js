// api/redirect.js
export default async function handler(req, res) {
  try {
    const jsonUrl = req.query.json || 'https://oigwwzzmvibflie8.public.blob.vercel-storage.com/pizzeria12.json';
    
    const prompt = `Estoy desarrollando un juego. Los datos de este universo están en el JSON en esta URL: ${jsonUrl}
     Todo lo que existe está definido allí. Quiero que lo explores y juegues dentro de ese universo.
     Cuando un “usuario” interactúe, respondé como un personaje de este mundo`;

    const encoded = encodeURIComponent(prompt);
    return res.redirect(302, `https://grok.com/chat?q=${encoded}`);
  } catch (err) {
    res.status(500).send(`Error: ${err.message}`);
  }
}
