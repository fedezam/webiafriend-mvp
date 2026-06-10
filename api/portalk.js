import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  const { action } = req.query;

  switch(action) {

    case "github_file":   return handleGithubFile(req, res);
    case "github_issue":  return handleGithubIssue(req, res);
    case "calendar":      return handleCalendar(req, res);
    case "payment":       return handlePayment(req, res);

    default:
      return res.status(400).json({ error: `Acción desconocida: ${action}` });
  }
}

// ── GitHub: leer archivo ─────────────────────
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

// ── GitHub: crear issue ──────────────────────
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

// ── Calendar: crear evento ───────────────────
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

  const calRes = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: `${service || "Turno"} - ${name || "Cliente"}`,
        description: notes || "",
        start: { dateTime: startDate.toISOString(), timeZone: "America/Argentina/Buenos_Aires" },
        end:   { dateTime: endDate.toISOString(),   timeZone: "America/Argentina/Buenos_Aires" }
      })
    }
  );
  const calData = await calRes.json();
  if (calData.htmlLink) {
    return res.redirect(
      `/portal.html?status=ok&event=${encodeURIComponent(calData.htmlLink)}&name=${encodeURIComponent(name || "Cliente")}`
    );
  }
  return res.status(500).json({ error: "Calendar API error", detail: calData });
}

// ── Mercado Pago: crear preferencia ─────────
async function handlePayment(req, res) {
  const { amount, description, name, payer_email } = req.query;
  if (!amount || !description) return res.status(400).json({ error: "amount y description requeridos" });

  const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    },
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
