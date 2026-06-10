import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  const { name, service, date, time, notes } = req.query;

  // 1. Recuperar el refresh_token que el comercio guardó en el setup
  const refreshToken = await redis.get("google_refresh_token");
  if (!refreshToken) {
    return res.redirect("/portal.html?mode=setup");
  }

  // 2. Intercambiar refresh_token por access_token fresco
  const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type:    "refresh_token"
    })
  });

  const tokenData = await refreshRes.json();

  if (!tokenData.access_token) {
    console.error("Token refresh failed:", tokenData);
    return res.status(500).json({
      error: "No se pudo refrescar el token de Google.",
      detail: tokenData
    });
  }

  // 3. Construir el evento
  const startDate = new Date(`${date} ${time}`);
  const endDate   = new Date(startDate.getTime() + 60 * 60 * 1000); // +1 hora

  const event = {
    summary:     `${service || "Turno"} - ${name || "Cliente"}`,
    description: notes || "",
    start: {
      dateTime: startDate.toISOString(),
      timeZone: "America/Argentina/Buenos_Aires"
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: "America/Argentina/Buenos_Aires"
    }
  };

  // 4. Crear el evento en Google Calendar
  const calRes = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization:  `Bearer ${tokenData.access_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(event)
    }
  );

  const calData = await calRes.json();

  if (calData.htmlLink) {
    // 5. Volver al portal con el resultado
    return res.redirect(
      `/portal.html?status=ok` +
      `&event=${encodeURIComponent(calData.htmlLink)}` +
      `&name=${encodeURIComponent(name || "Cliente")}`
    );
  } else {
    console.error("Calendar API error:", calData);
    return res.status(500).json({
      error: "Error al crear evento en Google Calendar.",
      detail: calData
    });
  }
}
