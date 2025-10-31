// pages/api/redirect.js
export default async function handler(req, res) {
  try {
    const jsonUrl = req.query.json;
    if (!jsonUrl) return res.status(400).send('Falta ?json=');

    // === FETCHEAR EL JSON (tu catálogo completo) ===
    const response = await fetch(decodeURIComponent(jsonUrl));
    const config = await response.json();

    // === CONSTRUIR EL PROMPT COMPLETO (todo el JSON como system) ===
    const systemPrompt = `
${config._meta}

IDENTIDAD: ${config.identity}
OBJETIVO: ${config.goal}
REGLAS: ${config.behavior_rules}
FLUJO: ${config.conversation_flow}
VALIDACIÓN: ${config.validation_glyphs}
FUENTE: ${config.data_source}

CATÁLOGO COMPLETO:
${JSON.stringify(config.catalog, null, 2)}

PLANTILLA WHATSAPP:
${config.catalog.whatsapp_template}

INSTRUCCIONES DE TEMPLATE:
${config.catalog.template_instructions}

CONTEXTO CERRADO: ${config._ler_context}

¡EMPEZÁ CON ESTE SALUDO EXACTO!
${config.catalog.greeting}
    `.trim();

    const encodedPrompt = encodeURIComponent(systemPrompt);

    // === REDIRECCIÓN INTELIGENTE (móvil + desktop) ===
    const ua = req.headers['user-agent'] || '';
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);

    if (isMobile) {
      // MÓVIL: HTML con deep link a app X + fallback
      const xApp = `x://compose/tweet?text=${encodedPrompt}`;
      const xWeb = `https://x.com/intent/post?text=${encodedPrompt}`;
      const grokWeb = `https://grok.x.ai/chat?q=${encodedPrompt}`;

      const html = `
<!DOCTYPE html>
<html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>La Napolitana IA</title>
<style>
  body{font-family:Arial;text-align:center;padding:20px;background:#fff8f0}
  .pizza{font-size:4em;animation:pulse 2s infinite}
  @keyframes pulse{0%{transform:scale(1)}50%{transform:scale(1.1)}100%{transform:scale(1)}}
  .btn{background:#ff4500;color:white;padding:15px 30px;border:none;border-radius:50px;font-size:18px;margin:10px;text-decoration:none;display:inline-block}
  .tip{background:#fff3cd;padding:15px;border-radius:10px;margin:15px;font-size:14px}
</style>
</head><body>
<div class="pizza">Pizza</div>
<h1>Pizzería La Napolitana</h1>
<p><strong>Abriendo tu asistente IA...</strong></p>
<div class="tip">
  <strong>Tip:</strong> Si no abre, probá en <strong>modo incógnito</strong> o <strong>app de X</strong>.
</div>
<script>
  // Intentar app → web → Grok
  location.href = "${xApp}";
  setTimeout(() => { if (document.hasFocus()) location.href = "${xWeb}"; }, 1500);
  setTimeout(() => { if (document.hasFocus()) location.href = "${grokWeb}"; }, 3000);
</script>
<a href="${grokWeb}" class="btn">Abrir en Grok</a>
<a href="${xWeb}" class="btn">Abrir en X</a>
</body></html>`;
      res.setHeader('Content-Type', 'text/html');
      return res.send(html);
    } else {
      // DESKTOP: directo a Grok
      res.writeHead(302, { Location: `https://grok.x.ai/chat?q=${encodedPrompt}` });
      res.end();
    }

  } catch (err) {
    console.error(err);
    res.status(500).send('Error interno');
  }
}
