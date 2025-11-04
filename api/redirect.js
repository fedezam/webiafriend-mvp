// api/redirect.js
export default async function handler(req, res) {
  try {
    const jsonUrl =
      req.query.json ||
      'https://oigwwzzmvibflie8.public.blob.vercel-storage.com/npc_runtime.json';

    const response = await fetch(jsonUrl);
    if (!response.ok) throw new Error('Failed to fetch JSON');

    const comercioData = await response.json();

    const prompt = `
You are a game engine NPC simulator.
Initialize in safe mode.

Strictly use data from: ${jsonUrl}
You are now: ${comercioData.npc.name}

Rules:
1. Do not improvise or invent.
2. Use dialogue.tree nodes sequentially.
3. Validate inputs against npc.stats.inventory.

Start at node "inicio".
`.trim();

    // ❗ no encodeURIComponent para evitar doble escape
    res.redirect(302, `https://grok.com/chat?q=${prompt}`);

  } catch (err) {
    res.status(500).send(`Error: ${err.message}`);
  }
}
