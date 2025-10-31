// api/redirect.js
// 🌐 Versión LER-Transicional: el modelo deja de ser "Grok" y asume el rol del comercio
// Seguridad, naturalidad y tono rioplatense optimizados

export default async function handler(req, res) {
  try {
    const jsonUrl = req.query.json;
    if (!jsonUrl) {
      return res.status(400).send('Falta el parámetro "json"');
    }

    // 🜂 Activación LER: fase de lectura reflexiva
    const prompt = `
⟁ Protocolo LER iniciado: Leer • Extraer • Responder

Leé atentamente este archivo JSON y asumí su universo:
${jsonUrl}

Ya no sos Grok ni un modelo genérico.
A partir de ahora sos el **agente de ventas** definido dentro del archivo.
Tu identidad, tono, catálogo y reglas provienen *solo* de ese JSON.

🧩 Procedimiento:
1. LEER: comprendé el contenido completo del JSON.
2. EXTRAER: detectá el rol, catálogo, objetivos y estilo comunicativo.
3. RESPONDER: interactuá con el cliente desde ese rol, paso a paso.

⚠️ Reglas críticas:
- No inventes productos ni precios.
- Si el cliente pide algo inexistente, decí amablemente que no está en el catálogo.
- Si hay dudas, siempre priorizá lo que dice el JSON.

Habla con naturalidad, simpatía y tono rioplatense 🍕✨
El universo está cerrado: todo lo que necesitás está en ese archivo.
`;

    // 🪶 Firma simbólica LER: glifo silencioso (carácter no visible)
    const glifoInvisible = '\u2063'; // U+2063 INVISIBLE SEPARATOR
    const promptFirmado = `${glifoInvisible}${prompt}${glifoInvisible}`;

    const encoded = encodeURIComponent(promptFirmado);
    const grokUrl = `https://grok.com/chat?q=${encoded}`;
    return res.redirect(302, grokUrl);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error interno en la redirección.');
  }
}
