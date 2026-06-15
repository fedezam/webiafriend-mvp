import { escapeHtml } from "../../lib/html.js";
import {
  createAccessRequest,
  getAccessRequest,
  approveAccessRequest
} from "../../lib/auth.js";

const BASE_URL = "https://webiafriend-mvp.vercel.app";

export const config = {
  api: { bodyParser: { sizeLimit: '1mb' } }
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  const { action } = req.query;

  switch (action) {
    case "request_access": return handleRequestAccess(req, res);
    case "approve_access": return handleApproveAccess(req, res);
    case "confirm_access": return handleConfirmAccess(req, res);
    default:
      return res.status(400).json({ error: `Acción desconocida: ${action}` });
  }
}

// ── request_access: el LLM pide permiso ──────────────────────
async function handleRequestAccess(req, res) {
  const { scope } = req.query;
  if (!scope) return res.status(400).json({ error: "scope requerido" });

  const code = await createAccessRequest(scope);
  const approveUrl = `${BASE_URL}/api/auth/access?action=approve_access&code=${encodeURIComponent(code)}`;

  return res.json({
    status: "pending_authorization",
    code,
    scope,
    approve_url: approveUrl,
    message: "Pedile al usuario que abra approve_url y confirme. Luego reintentá la acción original agregando &auth=" + code
  });
}

// ── approve_access: pantalla de confirmación (NO ejecuta) ─────
async function handleApproveAccess(req, res) {
  const { code } = req.query;
  if (!code) return res.status(400).send("code requerido");

  const data = await getAccessRequest(code);
  if (!data) return res.status(404).send("Código inválido o expirado.");

  if (data.status === "approved") {
    return res.send(`
<!doctype html>
<html><head><meta charset="utf-8"><title>Ya aprobado</title></head>
<body style="font-family:system-ui;max-width:480px;margin:60px auto;text-align:center;">
<h1>✅ Ya aprobado</h1>
<p>Este acceso (scope: <code>${escapeHtml(data.scope)}</code>) ya fue aprobado anteriormente.</p>
<p>Código: <code>${escapeHtml(code)}</code></p>
</body></html>
`);
  }

  const confirmUrl = `/api/auth/access?action=confirm_access&code=${encodeURIComponent(code)}`;

  const html = `
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Autorización solicitada</title>
<style>
body{
  font-family: system-ui, sans-serif;
  max-width:480px;
  margin:60px auto;
  padding:24px;
  text-align:center;
}
.btn{
  display:inline-block;
  margin-top:24px;
  padding:14px 28px;
  background:#22c55e;
  color:#022c22;
  text-decoration:none;
  border-radius:10px;
  font-weight:600;
}
.code{
  font-family:monospace;
  background:#f5f5f5;
  padding:4px 8px;
  border-radius:6px;
}
</style>
</head>
<body>
<h1>🔐 Solicitud de acceso</h1>
<p>Un asistente (LLM) está solicitando acceso a:</p>
<p class="code">${escapeHtml(data.scope)}</p>
<p>Si no iniciaste esta acción, ignorá esta página — no se ejecuta nada hasta que aprobés.</p>
<a class="btn" href="${confirmUrl}">Aprobar acceso</a>
</body>
</html>
`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.send(html);
}

// ── confirm_access: el click real que aprueba ───────────────────
async function handleConfirmAccess(req, res) {
  const { code } = req.query;
  if (!code) return res.status(400).send("code requerido");

  const data = await approveAccessRequest(code);
  if (!data) return res.status(404).send("Código inválido o expirado.");

  return res.send(`
<!doctype html>
<html><head><meta charset="utf-8"><title>Aprobado</title></head>
<body style="font-family:system-ui;max-width:480px;margin:60px auto;text-align:center;">
<h1>✅ Acceso aprobado</h1>
<p>El asistente ya puede usar el código <code>${escapeHtml(code)}</code> durante la próxima hora.</p>
<p>Scope: <code>${escapeHtml(data.scope)}</code></p>
</body></html>
`);
}
