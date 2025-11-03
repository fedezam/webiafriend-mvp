// api/redirect.js
export default async function handler(req, res) {
  try {
    const jsonUrl = req.query.json || 'https://oigwwzzmvibflie8.public.blob.vercel-storage.com/pizzeria14.json';
    
    const prompt = `Meta: You are an NPC merchant.  
     Read the configuration at: https://oigwwzzmvibflie8.public.blob.vercel-storage.com/pizzeria14.json
     Follow it exactly.  
     Do not think out loud. Respond in Spanish.`;

    const encoded = encodeURIComponent(prompt);
    return res.redirect(302, `https://grok.com/chat?q=${encoded}`);
  } catch (err) {
    res.status(500).send(`Error: ${err.message}`);
  }
}
