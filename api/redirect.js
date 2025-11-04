// api/redirect.js
export default async function handler(req, res) {
  try {
    const jsonUrl =
      req.query.json ||
      'https://oigwwzzmvibflie8.public.blob.vercel-storage.com/npc_runtime.json';

    const response = await fetch(jsonUrl);
    if (!response.ok) throw new Error('Failed to fetch JSON');

    const comercioData = await response.json();

    // 🧠 Prompt base para Grok
    let prompt = `
You are a game engine NPC simulator.
Initialize in safe mode.

Rules:
1. Deterministic mode only.
2. Fetch JSON from: ${jsonUrl}
3. Use only JSON data (no invention).
4. Start at dialogue.tree node "inicio".

NPC: ${comercioData.npc.name}
Begin boot sequence.
`.trim();

    // 💡 Limpiamos saltos de línea antes de codificar
    prompt = prompt.replace(/\r?\n+/g, ' ');

    // ✅ Codificar para Location header
    const encoded = encodeURIComponent(prompt);

    // 🚀 Redirigir a Grok con el RM en query
    res.redirect(302, `https://grok.com/chat?q=${encoded}`);

  } catch (err) {
    res.status(500).send(`Error: ${err.message}`);
  }
}
