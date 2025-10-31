// ============================================
// api/ai-start.js - Redirige a ChatGPT usando solo URL JSON
// ============================================

import fetch from 'node-fetch'; // o global fetch en Node 18+

export default async function handler(req, res) {
  try {
    const jsonUrl = req.query.json;
    if (!jsonUrl) return res.status(400).send('Missing json parameter');

    // Mini-RM amigable + instrucciones estrictas
    const systemMessage = `
Meta: Ayúdame con esto, las instrucciones están en ${jsonUrl}
INSTRUCCIONES CLAVE:
1) Usa ÚNICAMENTE la información que figure en ese JSON (productos, servicios, precios, horarios, tono).
2) NO INVENTES productos, precios, servicios ni promociones. 
   Si algo no aparece en el JSON, responde exactamente: "No tengo esa información disponible."
3) Responde con tono amigable y profesional, breve y directo.
4) Si el usuario pide algo que no está en el JSON, sugiere opciones reales del JSON o invita a contactar al comercio.
`;

    const userMessage = `Iniciando IA de: Pizzería La Napolitana 🍕\nComienza tu consulta:`;

    const body = {
      model: 'grok-4',      // o el modelo que uses
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage }
      ],
      temperature: 0,
      max_tokens: 700
    };

    const apiRes = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROK_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const json = await apiRes.json();
    const text = json.choices?.[0]?.message?.content || json.output?.[0]?.content || '';

    res.status(200).json({ text });

  } catch (err) {
    console.error(err);
    res.status(500).send('Internal server error');
  }
}

 
