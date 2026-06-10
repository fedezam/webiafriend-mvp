export default async function handler(req, res) {
  const { code, state, error } = req.query;

  if (error) {
    return res.status(400).send(`OAuth error: ${error}`);
  }

  // 1. Intercambiar code por access_token
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

  // 2. Recuperar los datos originales del state
  let payload = {};
  try {
    payload = JSON.parse(Buffer.from(state, "base64").toString("utf-8"));
  } catch (e) {
    return res.status(400).send("Invalid state");
  }

  // 3. Construir el evento
  const startDate = buildDateTime(payload.date, payload.time);
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // +1 hora

  const event = {
    summary: `${payload.service || "Turno"} - ${payload.name || "Cliente"}`,
    description: payload.notes || "",
    start: { dateTime: startDate.toISOString(), timeZone: "America/Argentina/Buenos_Aires" },
    end:   { dateTime: endDate.toISOString(),   timeZone: "America/Argentina/Buenos_Aires" }
  };

  // 4. Crear el evento en Google Calendar
  const calRes = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(event)
    }
  );

  const calData = await calRes.json();

  if (calData.htmlLink) {
    // Éxito — redirigir al portal con confirmación
    return res.redirect(
      `/portal.html?status=ok&event=${encodeURIComponent(calData.htmlLink)}&name=${encodeURIComponent(payload.name)}`
    );
  } else {
    return res.status(500).json({ error: "Calendar API error", detail: calData });
  }
}

function buildDateTime(dateStr, timeStr) {
  // dateStr puede ser "jueves", "2025-06-15", etc.
  // timeStr puede ser "10:00", "10:00 AM", etc.
  // Por ahora: si no parsea, usamos mañana a las 10:00
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  if (!dateStr && !timeStr) return tomorrow;

  // Intento simple de parseo
  try {
    const combined = dateStr && timeStr
      ? `${dateStr} ${timeStr}`
      : dateStr || timeStr;
    const parsed = new Date(combined);
    if (!isNaN(parsed)) return parsed;
  } catch (e) {}

  return tomorrow;
}
