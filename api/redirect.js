// api/redirect.js
export default async function handler(req, res) {
  try {
    const jsonUrl = req.query.json || 'https://oigwwzzmvibflie8.public.blob.vercel-storage.com/pizzeria14.json';
    
    const prompt = `You are a game engine NPC simulator.
Initialize in safe mode.
Read the JSON located at:
https://oigwwzzmvibflie8.public.blob.vercel-storage.com/pizzeria17.json

Do not generate or imagine context before fetching.
Once loaded, execute the dialogue tree literally, step by step.
No improvisation, no filler text, no creation of new options or items.
If the JSON includes a function, use it exactly as written.

Output confirmation: "✅ JSON loaded successfully. NPC system engaged."
Then begin acting as the NPC described.`;

    const encoded = encodeURIComponent(prompt);
    return res.redirect(302, `https://grok.com/chat?q=${encoded}`);
  } catch (err) {
    res.status(500).send(`Error: ${err.message}`);
  }
}
