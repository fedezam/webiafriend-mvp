export default async function handler(req, res) {
  try {
    const jsonUrl = req.query.json;
    if (!jsonUrl) {
      return res.status(400).send('Missing json parameter');
    }

    // === Detectar dispositivo ===
    const ua = req.headers['user-agent'] || '';
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);

    // === Prompt específico para Pizzería La Napolitana ===
    const miniRM = `Meta: ayúdame con esto, las instrucciones están en ${jsonUrl}`;
    const visiblePrompt = `¡Hola! 👋 Bienvenido a **Pizzería La Napolitana** 🍕\n\n¿Qué te gustaría pedir hoy?`;
    const finalPrompt = `${miniRM}\n\n${visiblePrompt}`;
    const encodedPrompt = encodeURIComponent(finalPrompt);

    // === URLs de redirección (funcionan 100% en 2025) ===
    const xAppScheme = `x://compose/tweet?text=${encodedPrompt}`;
    const xWeb = `https://x.com/intent/post?text=${encodedPrompt}`;
    const grokWeb = `https://grok.x.ai/chat?q=${encodedPrompt}`;

    let redirectUrl;

    if (isMobile) {
      // === MÓVIL: HTML con fallback automático ===
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>🍕 Pizzería La Napolitana</title>
            <style>
              body { font-family: Arial; text-align: center; padding: 20px; background: #f8f9fa; }
              .pizza { font-size: 3em; margin: 20px 0; }
              .btn { background: #ff6b35; color: white; padding: 15px 30px; border: none; border-radius: 25px; font-size: 18px; text-decoration: none; display: inline-block; margin: 10px; }
              .loading { color: #666; }
            </style>
            <meta http-equiv="refresh" content="2;url=${xWeb}" />
          </head>
          <body>
            <div class="pizza">🍕</div>
            <h1>Pizzería La Napolitana</h1>
            <p class="loading">Abriendo en la app de X... (2s)</p>
            
            <script>
              // Intentar app primero, fallback a web
              window.location.href = "${xAppScheme}";
              setTimeout(() => {
                if (document.hasFocus()) {
                  window.location.href = "${xWeb}";
                }
              }, 1500);
            </script>
            
            <br><br>
            <a href="${xWeb}" class="btn">→ Abrir en Web</a>
            <br><small>o espera 2 segundos...</small>
          </body>
        </html>
      `;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(html);
    } else {
      // === DESKTOP: Redirección directa ===
      redirectUrl = xWeb;
      res.writeHead(302, { Location: redirectUrl });
      res.end();
    }

  } catch (err) {
    console.error('❌ Error interno:', err);
    res.status(500).send('Internal error');
  }
}
