// api/redirect.js
export default async function handler(req, res) {
  try {
    const jsonUrl =
      req.query.json ||
      'https://oigwwzzmvibflie8.public.blob.vercel-storage.com/pizzeria21.json';

    let prompt = `You are a game engine NPC simulator.
Initialize in safe mode.
Read the JSON located at:
https://oigwwzzmvibflie8.public.blob.vercel-storage.com/pizzeria20.json
${jsonUrl}

Do not generate or imagine context before fetching.
Once loaded, execute the dialogue tree literally, step by step.
No improvisation, no filler text, no creation of new options or items.
If the JSON includes a function, use it exactly as written.

Output confirmation: "✅ JSON loaded successfully. NPC system engaged."
Then begin acting as the NPC described.`;

    // 🔒 Limpieza para evitar error de header
    prompt = prompt.replace(/\r?\n+/g, ' ');

    const encoded = encodeURIComponent(prompt);

    // ✅ Redirección única y segura
    res.redirect(302, `https://grok.com/chat?q=${encoded}`);
  } catch (err) {
    res.status(500).send(`Error: ${err.message}`);
  }
}
