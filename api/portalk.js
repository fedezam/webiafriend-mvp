import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export const config = {
  api: { bodyParser: { sizeLimit: '1mb' } }
};

// ── Render público: mapeo id -> repo/branch ─────────────────
const RENDER_REPO_MAP = {
  "a3f9c1e02b4d": { repo: "INDICEIA-PUBLIC", branch: "main" },
};

const RENDER_GITHUB_TOKEN = process.env.GITHUB_TOKEN_RENDER_ONLY || process.env.GITHUB_TOKEN;
const BASE_URL = "https://webiafriend-mvp.vercel.app";

// ── Helpers ───────────────────────────────────────────────────
function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function generateAuthCode() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

async function checkAuth(code, requiredScope) {
  if (!code) return false;
  const raw = await redis.get(`authreq:${code}`);
  if (!raw) return false;
  const data = typeof raw === "string" ? JSON.parse(raw) : raw;
  return data.status === "approved" && data.scope === requiredScope;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  const { action } = req.query;

  switch (action) {
    // ── GitHub ───────────────────────────────────
    case "github_file":          return handleGithubFile(req, res);
    case "github_tree":          return handleGithubTree(req, res);
    case "github_write":         return handleGithubWrite(req, res);
    case "github_write_preview": return handleGithubWritePreview(req, res);
    case "github_write_confirm": return handleGithubWriteConfirm(req, res);
    case "github_write_cancel":  return handleGithubWriteCancel(req, res);
    
    case "github_write_large_request": return handleGithubWriteLargeRequest(req, res);
    case "github_write_large_preview":  return handleGithubWriteLargePreview(req, res);
    case "github_write_large_confirm":  return handleGithubWriteLargeConfirm(req, res);
    case "github_write_large_cancel":   return handleGithubWriteLargeCancel(req, res);
    
    case "github_issue":       return handleGithubIssue(req, res);

    // ── Render público ────────────────────────
    case "render_tree":  return handleRenderTree(req, res);
    case "render_file":  return handleRenderFile(req, res);

    // ── Autorización ──────────────────────────
    case "request_access": return handleRequestAccess(req, res);
    case "approve_access": return handleApproveAccess(req, res);
    case "confirm_access": return handleConfirmAccess(req, res);

    // ── Memoria ───────────────────────────────
    case "memory_read":  return handleMemoryRead(req, res);
    case "memory_write": return handleMemoryWrite(req, res);
    case "memory_list":  return handleMemoryList(req, res);

    // ── Sheets ────────────────────────────────
    case "sheets_read":  return handleSheetsRead(req, res);

    // ── Calendar ──────────────────────────────
    case "calendar":     return handleCalendar(req, res);

    // ── Blogger ───────────────────────────────
    case "blogger_post": return handleBloggerPost(req, res);

    // ── Mercado Pago ──────────────────────────
    case "payment":      return handlePayment(req, res);

    // ── Utilidades ────────────────────────────
    case "ping":         return res.json({ ok: true, ts: Date.now() });
    case "shorten":      return handleShorten(req, res);
    case "go":           return handleGo(req, res);

    default:
      return res.status(400).json({ error: `Acción desconocida: ${action}` });
  }
}

// ── GitHub: leer archivo ─────────────────────────────────────
async function handleGithubFile(req, res) {
  const { repo, path, branch = "main" } = req.query;
  if (!repo || !path) return res.status(400).json({ error: "repo y path requeridos" });

  const ghRes = await fetch(
    `https://api.github.com/repos/fedezam/${repo}/contents/${path}?ref=${branch}`,
    { headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: "application/vnd.github.v3+json" } }
  );
  const data = await ghRes.json();
  if (data.message) return res.status(404).json({ error: data.message });

  const content = Buffer.from(data.content, "base64").toString("utf-8");
  return res.json({ repo, path, branch, sha: data.sha, content });
}

// ── GitHub: árbol de archivos ────────────────────────────────
async function handleGithubTree(req, res) {
  const { repo, branch = "main" } = req.query;
  if (!repo) return res.status(400).json({ error: "repo requerido" });

  const ghRes = await fetch(
    `https://api.github.com/repos/fedezam/${repo}/git/trees/${branch}?recursive=1`,
    { headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: "application/vnd.github.v3+json" } }
  );
  const data = await ghRes.json();
  if (data.message) return res.status(404).json({ error: data.message });

  const paths = data.tree?.filter(f => f.type === "blob").map(f => f.path) ?? [];
  return res.json({ repo, branch, paths });
}

// ── GitHub: proponer escritura (flujo chico) ─────────────────
async function handleGithubWrite(req, res) {
  const { repo, path, message = "update via portalk", branch = "main" } = req.query;
  const body = req.method === "POST" ? req.body : req.query;
  const { content, sha } = body;

  if (!repo || !path || content === undefined) {
    return res.status(400).json({ error: "repo, path y content requeridos" });
  }

  const code = generateAuthCode();
  await redis.set(
    `ghwrite:${code}`,
    JSON.stringify({ repo, path, content, sha, message, branch, status: "pending", created: Date.now() }),
    { ex: 600 }
  );

  return res.redirect(`/portal.html?status=github_write_pending&code=${encodeURIComponent(code)}`);
}

async function handleGithubWritePreview(req, res) {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: "code requerido" });

  const raw = await redis.get(`ghwrite:${code}`);
  if (!raw) return res.status(404).json({ error: "Código inválido o expirado" });

  const data = typeof raw === "string" ? JSON.parse(raw) : raw;
  return res.json({
    code, repo: data.repo, path: data.path, branch: data.branch,
    message: data.message, content: data.content, sha: data.sha || null, status: data.status
  });
}

async function handleGithubWriteConfirm(req, res) {
  const { code } = req.query;
  if (!code) return res.status(400).send("code requerido");

  const raw = await redis.get(`ghwrite:${code}`);
  if (!raw) return res.status(404).send("Código inválido o expirado.");

  const data = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (data.status !== "pending") return res.status(409).send("Esta escritura ya fue procesada.");

  const encoded = Buffer.from(data.content).toString("base64");
  const payload = { message: data.message, content: encoded, branch: data.branch };
  if (data.sha) payload.sha = data.sha;

  const ghRes = await fetch(
    `https://api.github.com/repos/fedezam/${data.repo}/contents/${data.path}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  );
  const ghData = await ghRes.json();
  await redis.del(`ghwrite:${code}`);

  if (ghData.content?.sha) {
    return res.redirect(
      `/portal.html?status=github_write_ok&repo=${encodeURIComponent(data.repo)}&path=${encodeURIComponent(data.path)}&sha=${ghData.content.sha}&url=${encodeURIComponent(ghData.content.html_url)}`
    );
  }
  return res.redirect(`/portal.html?status=github_write_fail&path=${encodeURIComponent(data.path)}`);
}

async function handleGithubWriteCancel(req, res) {
  const { code } = req.query;
  if (!code) return res.status(400).send("code requerido");
  await redis.del(`ghwrite:${code}`);
  return res.redirect(`/portal.html?status=github_write_cancelled`);
}

// ── GitHub write GRANDE: paso 1, registrar metadata ──────────
async function handleGithubWriteLargeRequest(req, res) {
  const { repo, path, message = "update via portalk (large)", branch = "main", sha, auth } = req.query;

  if (!repo || !path) return res.status(400).json({ error: "repo y path requeridos" });

  const authorized = await checkAuth(auth, "github_write");
  if (!authorized) {
    return res.status(403).json({
      status: "pending_authorization",
      message: "Acceso no autorizado para escribir en GitHub. Solicitá autorización primero.",
      request_url: `${BASE_URL}/api/auth/access?action=request_access&scope=github_write`
    });
  }

  const code = generateAuthCode();
  await redis.set(
    `ghwrite_large:${code}`,
    JSON.stringify({ repo, path, message, branch, sha: sha || null, status: "awaiting_content", created: Date.now() }),
    { ex: 1800 }
  );

  return res.redirect(`/portal.html?status=github_write_large_pending&code=${encodeURIComponent(code)}`);
}

// ── GitHub write GRANDE: preview metadata ────────────────────
async function handleGithubWriteLargePreview(req, res) {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: "code requerido" });

  const raw = await redis.get(`ghwrite_large:${code}`);
  if (!raw) return res.status(404).json({ error: "Código inválido o expirado" });

  const data = typeof raw === "string" ? JSON.parse(raw) : raw;
  return res.json({
    code, repo: data.repo, path: data.path, branch: data.branch,
    message: data.message, sha: data.sha, status: data.status
  });
}

// ── GitHub write GRANDE: paso 2, recibir contenido y escribir ─
async function handleGithubWriteLargeConfirm(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Usar POST" });

  const { code, content } = req.body || {};
  if (!code || content === undefined) return res.status(400).json({ error: "code y content requeridos" });

  const raw = await redis.get(`ghwrite_large:${code}`);
  if (!raw) return res.status(404).json({ error: "Código inválido o expirado" });

  const data = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (data.status !== "awaiting_content") return res.status(409).json({ error: "Esta escritura ya fue procesada" });

  const encoded = Buffer.from(content).toString("base64");
  const payload = { message: data.message, content: encoded, branch: data.branch };
  if (data.sha) payload.sha = data.sha;

  const ghRes = await fetch(
    `https://api.github.com/repos/fedezam/${data.repo}/contents/${data.path}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  );
  const ghData = await ghRes.json();
  await redis.del(`ghwrite_large:${code}`);

  if (ghData.content?.sha) {
    return res.json({ ok: true, repo: data.repo, path: data.path, sha: ghData.content.sha, url: ghData.content.html_url });
  }
  return res.status(500).json({ error: "Error escribiendo archivo", detail: ghData });
}

async function handleGithubWriteLargeCancel(req, res) {
  const { code } = req.query;
  if (!code) return res.status(400).send("code requerido");
  await redis.del(`ghwrite_large:${code}`);
  return res.redirect(`/portal.html?status=github_write_cancelled`);
}

// ── GitHub: crear issue ──────────────────────────────────────
async function handleGithubIssue(req, res) {
  const { repo, title, body, label } = req.query;
  if (!repo || !title) return res.status(400).json({ error: "repo y title requeridos" });

  const ghRes = await fetch(
    `https://api.github.com/repos/fedezam/${repo}/issues`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ title, body: body || "", labels: label ? [label] : [] })
    }
  );
  const data = await ghRes.json();
  if (data.html_url) {
    return res.redirect(
      `/portal.html?status=github_ok&issue_url=${encodeURIComponent(data.html_url)}&issue_number=${data.number}&title=${encodeURIComponent(title)}`
    );
  }
  return res.status(500).json({ error: "Error creando issue", detail: data });
}

// ── Render: árbol navegable (HTML) ───────────────────────────
async function handleRenderTree(req, res) {
  const { id, auth, branch: branchOverride } = req.query;
  if (!id) return res.status(400).send("id requerido");

  const entry = RENDER_REPO_MAP[id];
  if (!entry) return res.status(404).send("id no encontrado");

  const authorized = await checkAuth(auth, id);
  if (!authorized) {
    return res.status(403).json({
      status: "pending_authorization",
      message: "Acceso no autorizado. Solicitá autorización primero.",
      request_url: `${BASE_URL}/api/auth/access?action=request_access&scope=${encodeURIComponent(id)}`
    });
  }

  const repo = entry.repo;
  const branch = branchOverride || entry.branch || "main";

  const ghRes = await fetch(
    `https://api.github.com/repos/fedezam/${repo}/git/trees/${branch}?recursive=1`,
    { headers: { Authorization: `Bearer ${RENDER_GITHUB_TOKEN}`, Accept: "application/vnd.github.v3+json" } }
  );
  const data = await ghRes.json();
  if (data.message) return res.status(404).send(escapeHtml(data.message));

  const files = data.tree?.filter(f => f.type === "blob").map(f => f.path) ?? [];

  const html = `
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Repo (${escapeHtml(id)})</title>
<style>
body{ font-family: monospace; max-width:1200px; margin:40px auto; padding:20px; }
li{ margin:4px 0; } a{ text-decoration:none; } .warn{ color:#a00; font-weight:bold; }
</style>
</head>
<body>
<h1>Repo (${escapeHtml(id)})</h1>
<p>Total files: ${files.length}</p>
${data.truncated ? `<p class="warn">⚠ El árbol fue truncado por GitHub.</p>` : ""}
<ul>
${files.map(path => `
<li><a href="/api/portalk?action=render_file&id=${encodeURIComponent(id)}&auth=${encodeURIComponent(auth)}&path=${encodeURIComponent(path)}">${escapeHtml(path)}</a></li>
`).join("")}
</ul>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.send(html);
}

// ── Render: contenido de archivo (HTML) ──────────────────────
async function handleRenderFile(req, res) {
  const { id, path, auth, branch: branchOverride } = req.query;
  if (!id || !path) return res.status(400).send("id y path requeridos");

  const entry = RENDER_REPO_MAP[id];
  if (!entry) return res.status(404).send("id no encontrado");

  const authorized = await checkAuth(auth, id);
  if (!authorized) {
    return res.status(403).json({
      status: "pending_authorization",
      message: "Acceso no autorizado. Solicitá autorización primero.",
      request_url: `${BASE_URL}/api/auth/access?action=request_access&scope=${encodeURIComponent(id)}`
    });
  }

  const repo = entry.repo;
  const branch = branchOverride || entry.branch || "main";

  const ghRes = await fetch(
    `https://api.github.com/repos/fedezam/${repo}/contents/${path}?ref=${branch}`,
    { headers: { Authorization: `Bearer ${RENDER_GITHUB_TOKEN}`, Accept: "application/vnd.github.v3+json" } }
  );
  const data = await ghRes.json();
  if (data.message) return res.status(404).send(escapeHtml(data.message));

  const safePath = escapeHtml(path);
  const looksBinary = data.encoding !== "base64" || !data.content;
  let bodyHtml;

  if (looksBinary) {
    bodyHtml = `<p class="warn">⚠ No se puede renderizar este archivo como texto.</p>${data.html_url ? `<p><a href="${data.html_url}" target="_blank">Ver en GitHub</a></p>` : ""}`;
  } else {
    let content;
    try { content = Buffer.from(data.content, "base64").toString("utf8"); } catch { content = null; }
    if (content === null) {
      bodyHtml = `<p class="warn">⚠ No se pudo decodificar el contenido.</p>${data.html_url ? `<p><a href="${data.html_url}" target="_blank">Ver en GitHub</a></p>` : ""}`;
    } else {
      bodyHtml = `<pre>${escapeHtml(content)}</pre>`;
    }
  }

  const html = `
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${safePath}</title>
<style>
body{ font-family: monospace; max-width:1400px; margin:40px auto; padding:20px; }
pre{ white-space:pre-wrap; overflow-x:auto; background:#f5f5f5; padding:20px; }
.warn{ color:#a00; font-weight:bold; }
</style>
</head>
<body>
<h1>${safePath}</h1>
<p><a href="/api/portalk?action=render_tree&id=${encodeURIComponent(id)}&auth=${encodeURIComponent(auth)}">⟵ volver al árbol</a></p>
${bodyHtml}
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.send(html);
}

// ── request_access ───────────────────────────────────────────
async function handleRequestAccess(req, res) {
  const { scope } = req.query;
  if (!scope) return res.status(400).json({ error: "scope requerido" });

  const code = generateAuthCode();
  await redis.set(`authreq:${code}`, JSON.stringify({ scope, status: "pending", created: Date.now() }), { ex: 300 });

  const approveUrl = `${BASE_URL}/api/portalk?action=approve_access&code=${encodeURIComponent(code)}`;
  return res.json({
    status: "pending_authorization", code, scope, approve_url: approveUrl,
    message: "Pedile al usuario que abra approve_url y confirme. Luego reintentá la acción original agregando &auth=" + code
  });
}

async function handleApproveAccess(req, res) {
  const { code } = req.query;
  if (!code) return res.status(400).send("code requerido");

  const raw = await redis.get(`authreq:${code}`);
  if (!raw) return res.status(404).send("Código inválido o expirado.");
  const data = typeof raw === "string" ? JSON.parse(raw) : raw;

  if (data.status === "approved") {
    return res.send(`<!doctype html><html><head><meta charset="utf-8"><title>Ya aprobado</title></head><body style="font-family:system-ui;max-width:480px;margin:60px auto;text-align:center;"><h1>✅ Ya aprobado</h1><p>Este acceso (scope: <code>${escapeHtml(data.scope)}</code>) ya fue aprobado anteriormente.</p><p>Código: <code>${escapeHtml(code)}</code></p></body></html>`);
  }

  const confirmUrl = `/api/portalk?action=confirm_access&code=${encodeURIComponent(code)}`;
  const html = `
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Autorización solicitada</title>
<style>
body{ font-family: system-ui, sans-serif; max-width:480px; margin:60px auto; padding:24px; text-align:center; }
.btn{ display:inline-block; margin-top:24px; padding:14px 28px; background:#22c55e; color:#022c22; text-decoration:none; border-radius:10px; font-weight:600; }
.code{ font-family:monospace; background:#f5f5f5; padding:4px 8px; border-radius:6px; }
</style>
</head>
<body>
<h1>🔐 Solicitud de acceso</h1>
<p>Un asistente (LLM) está solicitando acceso de lectura a:</p>
<p class="code">${escapeHtml(data.scope)}</p>
<p>Si no iniciaste esta acción, ignorá esta página — no se ejecuta nada hasta que aprobés.</p>
<a class="btn" href="${confirmUrl}">Aprobar acceso</a>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.send(html);
}

async function handleConfirmAccess(req, res) {
  const { code } = req.query;
  if (!code) return res.status(400).send("code requerido");

  const raw = await redis.get(`authreq:${code}`);
  if (!raw) return res.status(404).send("Código inválido o expirado.");

  const data = typeof raw === "string" ? JSON.parse(raw) : raw;
  data.status = "approved";
  data.approved_at = Date.now();
  await redis.set(`authreq:${code}`, JSON.stringify(data), { ex: 3600 });

  return res.send(`<!doctype html><html><head><meta charset="utf-8"><title>Aprobado</title></head><body style="font-family:system-ui;max-width:480px;margin:60px auto;text-align:center;"><h1>✅ Acceso aprobado</h1><p>El asistente ya puede usar el código <code>${escapeHtml(code)}</code> durante la próxima hora.</p><p>Scope: <code>${escapeHtml(data.scope)}</code></p></body></html>`);
}

// ── Memoria ──────────────────────────────────────────────────
async function handleMemoryRead(req, res) {
  const { entity, key } = req.query;
  if (!entity) return res.status(400).json({ error: "entity requerido" });

  if (key) {
    const value = await redis.get(`memory:${entity}:${key}`);
    return res.json({ entity, key, value: value ?? null });
  }

  const keys = await redis.keys(`memory:${entity}:*`);
  if (!keys.length) return res.json({ entity, memory: {} });

  const values = await Promise.all(keys.map(k => redis.get(k)));
  const memory = {};
  keys.forEach((k, i) => {
    const shortKey = k.replace(`memory:${entity}:`, "");
    memory[shortKey] = values[i];
  });
  return res.json({ entity, memory });
}

async function handleMemoryWrite(req, res) {
  let entity, key, value;
  if (req.method === "POST") {
    const body = req.body || {};
    entity = body.entity ?? req.query.entity;
    key    = body.key    ?? req.query.key;
    value  = body.value  ?? req.query.value;
  } else {
    ({ entity, key, value } = req.query);
  }

  if (!entity || !key || value === undefined) return res.status(400).json({ error: "entity, key y value requeridos" });
  await redis.set(`memory:${entity}:${key}`, value);

  if (req.method === "POST") return res.json({ ok: true, entity, key, length: value.length });
  return res.redirect(`/portal.html?status=memory_ok&entity=${encodeURIComponent(entity)}&key=${encodeURIComponent(key)}`);
}

async function handleMemoryList(req, res) {
  const { entity } = req.query;
  if (!entity) return res.status(400).json({ error: "entity requerido" });
  const keys = await redis.keys(`memory:${entity}:*`);
  const shortKeys = keys.map(k => k.replace(`memory:${entity}:`, ""));
  return res.json({ entity, keys: shortKeys });
}

// ── Sheets ───────────────────────────────────────────────────
async function handleSheetsRead(req, res) {
  const url = process.env.SHEETS_CSV_URL;
  if (!url) return res.status(400).json({ error: "SHEETS_CSV_URL no configurada en env" });

  const r = await fetch(url);
  if (!r.ok) return res.status(502).json({ error: "No se pudo leer la Sheet", status: r.status });
  const csv = await r.text();

  const memory = {};
  for (const row of csv.split("\n").slice(1)) {
    if (!row.trim()) continue;
    const cols = row.split(",");
    const key  = cols[0]?.trim();
    const val  = cols.slice(1, -1).join(",").replace(/^"|"$/g, "").trim();
    if (key) memory[key] = val;
  }
  return res.json({ ok: true, memory });
}

// ── Calendar ─────────────────────────────────────────────────
async function handleCalendar(req, res) {
  const { name, service, date, time, notes } = req.query;
  const refreshToken = await redis.get("google_refresh_token");
  if (!refreshToken) return res.redirect("/portal.html?mode=setup");

  const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    })
  });
  const { access_token } = await refreshRes.json();

  const startDate = new Date(`${date} ${time}`);
  const endDate   = new Date(startDate.getTime() + 60 * 60 * 1000);

  const calRes = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      summary: `${service || "Turno"} - ${name || "Cliente"}`,
      description: notes || "",
      start: { dateTime: startDate.toISOString(), timeZone: "America/Argentina/Buenos_Aires" },
      end:   { dateTime: endDate.toISOString(),   timeZone: "America/Argentina/Buenos_Aires" }
    })
  });
  const calData = await calRes.json();
  if (calData.htmlLink) {
    return res.redirect(`/portal.html?status=ok&event=${encodeURIComponent(calData.htmlLink)}&name=${encodeURIComponent(name || "Cliente")}`);
  }
  return res.status(500).json({ error: "Calendar API error", detail: calData });
}

// ── Blogger ──────────────────────────────────────────────────
async function handleBloggerPost(req, res) {
  const body = req.method === "POST" ? (req.body || {}) : req.query;
  const title    = body.title    ?? req.query.title;
  const content  = body.content  ?? req.query.content;
  const labels   = body.labels   ?? req.query.labels;
  const page_id  = body.page_id  ?? req.query.page_id;

  if (!title || !content) return res.status(400).json({ error: "title y content requeridos" });

  const BLOG_ID = process.env.BLOGGER_BLOG_ID || "1841430618213161331";
  const refreshToken = await redis.get("google_refresh_token");
  if (!refreshToken) return res.status(401).json({ error: "Sin refresh token" });

  const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    })
  });
  const { access_token, error: tokenError } = await refreshRes.json();
  if (!access_token) return res.status(401).json({ error: "Token refresh falló", detail: tokenError });

  const headers = { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" };
  const payload = { title, content, ...(labels && { labels: labels.split(",").map(l => l.trim()) }) };

  let blogRes, blogData;
  if (page_id) {
    blogRes = await fetch(`https://www.googleapis.com/blogger/v3/blogs/${BLOG_ID}/posts/${page_id}`, { method: "PUT", headers, body: JSON.stringify(payload) });
  } else {
    blogRes = await fetch(`https://www.googleapis.com/blogger/v3/blogs/${BLOG_ID}/posts/`, { method: "POST", headers, body: JSON.stringify(payload) });
  }
  blogData = await blogRes.json();

  if (blogData.url) {
    return res.redirect(`/portal.html?status=blogger_ok&post_url=${encodeURIComponent(blogData.url)}&title=${encodeURIComponent(title)}&post_id=${blogData.id}`);
  }
  if (blogData.error?.code === 403) {
    return res.status(403).json({ error: "Sin permiso para Blogger — necesitás re-autorizar con scope blogger", detail: blogData.error, reauth_url: "/api/auth/google?mode=setup" });
  }
  return res.status(500).json({ error: "Error posteando en Blogger", detail: blogData });
}

// ── Mercado Pago ─────────────────────────────────────────────
async function handlePayment(req, res) {
  const { amount, description, name, payer_email } = req.query;
  if (!amount || !description) return res.status(400).json({ error: "amount y description requeridos" });

  const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [{ title: description, quantity: 1, currency_id: "ARS", unit_price: parseFloat(amount) }],
      payer: { name: name || "Cliente", ...(payer_email && { email: payer_email }) },
      back_urls: {
        success: `https://webiafriend-mvp.vercel.app/portal.html?status=payment_ok&name=${encodeURIComponent(name || "Cliente")}&amount=${encodeURIComponent(amount)}&description=${encodeURIComponent(description)}`,
        failure: `https://webiafriend-mvp.vercel.app/portal.html?status=payment_fail`,
        pending: `https://webiafriend-mvp.vercel.app/portal.html?status=payment_pending`
      },
      auto_return: "approved"
    })
  });
  const mpData = await mpRes.json();
  if (mpData.init_point) return res.redirect(mpData.init_point);
  return res.status(500).json({ error: "Error creando preferencia", detail: mpData });
}

// ── Shortener ────────────────────────────────────────────────
async function handleShorten(req, res) {
  const { url } = req.method === "POST" ? (req.body || {}) : req.query;
  if (!url) return res.status(400).json({ error: "url requerida" });
  const code = generateAuthCode();
  await redis.set(`shortlink:${code}`, url, { ex: 3600 });
  return res.json({ short_url: `${BASE_URL}/api/portalk?action=go&code=${code}` });
}

async function handleGo(req, res) {
  const { code } = req.query;
  if (!code) return res.status(400).send("code requerido");
  const url = await redis.get(`shortlink:${code}`);
  if (!url) return res.status(404).send("Link expirado o inválido.");
  return res.redirect(url);
}
