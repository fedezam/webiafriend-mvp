// api/redirect.js
export default async function handler(req, res) {
  try {
    const jsonUrl = req.query.json || 'https://oigwwzzmvibflie8.public.blob.vercel-storage.com/pizzeria14.json';
    
    const prompt = `Meta: You are a Vendor NPC. Read the JSON configuration at 'https://oigwwzzmvibflie8.public.blob.vercel-storage.com/pizzeria14.json.
- Only use the data provided.
- Do NOT invent product sizes, prices, toppings, or extras.
- Do not think out loud or explain reasoning.
- Respond in Spanish as the merchant character.
- Confirm orders, ask for delivery address and payment method, then generate the WhatsApp message exactly as defined.
`;

    const encoded = encodeURIComponent(prompt);
    return res.redirect(302, `https://grok.com/chat?q=${encoded}`);
  } catch (err) {
    res.status(500).send(`Error: ${err.message}`);
  }
}
