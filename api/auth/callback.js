import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  const { code, state, error } = req.query;

  if (error) return res.status(400).send(`OAuth error: ${error}`);

  // 1. Intercambiar code por tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code"
    })
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    return res.status(400).json({ error: "No access_token", detail: tokenData });
  }

  // 2. Recuperar state
  let payload = {};
  try {
    payload = JSON.parse(Buffer.from(state, "base64").toString("utf-8"));
  } catch (e) {
    return res.status(400).send("Invalid state");
  }

  // 3. SETUP — el comercio conecta su calendar
  if (payload.mode === "setup") {
    if (!tokenData.refresh_token) {
      return res.status(400).send("No refresh_token. Revocá el acceso en myaccount.google.com/permissions y volvé a intentar.");
    }
    await redis.set("google_refresh_token", tokenData.refresh_token);
    return res.send(`
      <html><body style="font-family:system-ui;text-align:center;padding:60px">
        <h1>✅ Google Calendar conectado</h1>
        <p>Ya podés cerrar esta ventana.</p>
      </body></html>
    `);
  }

  // 4. RUNTIME — usar el token del comercio
  const refreshToken = await redis.get("google_refresh_token");
  if (!refreshToken) {
    return res.status(500).send("Calendar no configurado. El comercio debe conectar su cuenta primero.");
  }

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

  // 5. Crear evento
  const startDate = buildDateTime(payload.date, payload.time);
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

  const event = {
    summary: `${payload.service || "Turno"} - ${payload.name || "Cliente"}`,
    description: payload.notes || "",
    start: { dateTime: startDate.toISOString(), timeZone: "America/Argentina/Buenos_Aires" },
    end:   { dateTime: endDate.toISOString(),   timeZone: "America/Argentina/Buenos_Aires" }
  };

  const calRes = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(event)
    }
  );

  const calData = await calRes.json();

  if (calData.htmlLink) {
    return res.redirect(
      `/portal.html?status=ok&event=${encodeURIComponent(calData.htmlLink)}&name=${encodeURIComponent(payload.name)}`
    );
  } else {
    return res.status(500).json({ error: "Calendar API error", detail: calData });
  }
}

function buildDateTime(dateStr, timeStr) {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);
  if (!dateStr && !timeStr) return tomorrow;
  try {
    const parsed = new Date(`${dateStr} ${timeStr}`);
    if (!isNaN(parsed)) return parsed;
  } catch (e) {}
  return tomorrow;
}
