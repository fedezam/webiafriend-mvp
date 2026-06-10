export default async function handler(req, res) {
  const { repo, path, branch = "main" } = req.query;

  if (!repo || !path) {
    return res.status(400).json({ error: "repo y path requeridos" });
  }

  const url = `https://api.github.com/repos/fedezam/${repo}/contents/${path}?ref=${branch}`;

  const ghRes = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github.v3+json"
    }
  });

  const data = await ghRes.json();

  if (data.message) {
    return res.status(404).json({ error: data.message });
  }

  // GitHub devuelve el contenido en base64
  const content = Buffer.from(data.content, "base64").toString("utf-8");

  return res.json({
    repo,
    path,
    branch,
    sha: data.sha,
    content
  });
}
