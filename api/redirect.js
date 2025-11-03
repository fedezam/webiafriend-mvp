// api/redirect.js
export default async function handler(req, res) {
  try {
    const jsonUrl = req.query.json || 'https://oigwwzzmvibflie8.public.blob.vercel-storage.com/pizzeria10.json';
    
    const prompt = `Estoy desarrollando un juego y quiero probar si todo funciona bien. 
     Acá están las reglas y objetos  ${jsonUrl}
     ¿Me ayudás a simularlo?`;

    const encoded = encodeURIComponent(prompt);
    return res.redirect(302, `https://grok.com/chat?q=${encoded}`);
  } catch (err) {
    res.status(500).send(`Error: ${err.message}`);
  }
}
