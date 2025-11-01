// api/redirect.js
export default async function handler(req, res) {
  try {
    const txtUrl = req.query.txt;
    if (!txtUrl) {
      return res.status(400).send('Falta parametro txt');
    }
    const prompt = `LEE COMPLETO ${txtUrl} ANTES DE RESPONDER. Este TXT es tu UNICO manual. NO uses conocimiento general de pizzerias. SOLO existe lo escrito ahi. Navega ahora y comienza.`;
    const encoded = encodeURIComponent(prompt);
    return res.redirect(302, `https://grok.com/chat?q=${encoded}`);
  } catch (err) {
    res.status(500).send('Error');
  }
}
