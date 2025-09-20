// api/start/[slug].js
export default async function handler(req, res) {
  try {
    const { slug } = req.query;
    if (!slug) return res.status(400).send("missing slug parameter");

    // --- Map slugs a URLs de JSON ---
    const slugMap = {
      Zinnia: 'https://raw.githubusercontent.com/fedezam/webiafriend-mvp/main/Zinnia.json',
      RunShoes: 'https://raw.githubusercontent.com/fedezam/webiafriend-mvp/main/RunShoes.json',
      KarinaModas: 'https://raw.githubusercontent.com/fedezam/webiafriend-mvp/main/KarinaModas.json'
      // agregá más tiendas aquí
    };

    const jsonUrl = slugMap[slug];
    if (!jsonUrl) return res.status(404).send("slug not found");

    // --- Fetch JSON ---
    const r = await fetch(jsonUrl);
    if (!r.ok) return res.status(502).send("failed to fetch JSON");
    const data = await r.json();

    // --- Construir prompt camuflado ---
    const persona = data.ia_persona || { nombre: data.nombre || 'Asesor', tono: 'amigable' };
    const tiendaName = data.nombre || persona.nombre || 'Tienda';
    const productos = data.productos || [];

    const topProductos = productos.slice(0,5).map(p => {
      return `• ${p.nombre}${p.precio ? ` - ${p.precio}` : ''}${p.descripcion ? ` — ${p.descripcion}` : ''}`;
    }).join('\n');

    const prompt = `
Eres ${persona.nombre}, asistente oficial de "${tiendaName}".
Tono: ${persona.tono}.
INSTRUCCIONES INTERNAS (no mostrar al usuario):
- Usa el catálogo y responde como ${persona.nombre}.
- Saluda iniciando: "¡Hola! Soy ${persona.nombre} 👋 ¿En qué te puedo ayudar hoy?"
CATÁLOGO:
${topProductos}
`;

    // --- HTML intermedio que copia prompt y abre ChatGPT ---
    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Conectando con ${persona.nombre}</title>
</head>
<body>
<script>
  const prompt = ${JSON.stringify(prompt)};
  navigator.clipboard.writeText(prompt).then(() => {
    window.open('https://chat.openai.com', '_blank');
    document.body.innerHTML = '<h2>Prompt copiado al portapapeles. Se abrió ChatGPT, solo pega para iniciar conversación.</h2>';
  }).catch(err => {
    document.body.innerHTML = '<h2>Error al copiar el prompt. Intenta manualmente.</h2>';
  });
</script>
</body>
</html>
`;

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);

  } catch (err) {
    console.error(err);
    res.status(500).send('internal error');
  }
}

