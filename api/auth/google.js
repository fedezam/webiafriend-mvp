export default function handler(req, res) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  const scope = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/blogger"
  ].join(" ");
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", scope);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  const mode = req.query.mode || "runtime";
  const state = JSON.stringify({
    mode,
    action: req.query.action || "",
    name: req.query.name || "",
    service: req.query.service || "",
    date: req.query.date || "",
    time: req.query.time || "",
    notes: req.query.notes || ""
  });
  authUrl.searchParams.set("state", Buffer.from(state).toString("base64"));
  res.redirect(authUrl.toString());
}
