// Este endpoint es para cuando ya tenés un token (futuro uso).
// El flujo principal pasa por /api/auth/google → /api/auth/callback
export default function handler(req, res) {
  res.json({ message: "Usar /api/auth/google para iniciar el flujo OAuth" });
}
