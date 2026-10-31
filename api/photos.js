module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const input = new URL(req.url, "https://photo-lab.local").searchParams;
  const endpoint = input.get("endpoint") || "curated";
  if (!["curated", "search", "photo"].includes(endpoint)) {
    return res.status(400).json({ error: "Invalid photo endpoint" });
  }
  const singlePhoto = endpoint === "photo";
  const id = input.get("id");
  if (singlePhoto && !/^[1-9]\d{0,14}$/.test(id || "")) {
    return res.status(400).json({ error: "Invalid photo ID" });
  }
  if (!process.env.PEXELS_API_KEY) {
    return res.status(503).json({ error: "Photo service is not configured" });
  }

  const upstream = new URL(`https://api.pexels.com/v1/${singlePhoto ? `photos/${id}` : endpoint}`);
  if (!singlePhoto) {
    for (const name of ["query", "orientation", "size", "color", "page", "per_page"]) {
      const value = input.get(name);
      if (value) upstream.searchParams.set(name, value);
    }
    upstream.searchParams.set("per_page", "24");
  }

  try {
    const response = await fetch(upstream, {
      headers: { Authorization: process.env.PEXELS_API_KEY },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      return res.status(response.status).json({ error: "Photo service request failed" });
    }
    const data = await response.json();
    if (singlePhoto ? data.id !== Number(id) || !data.src?.original || !(data.width > 0 && data.height > 0) : !Array.isArray(data.photos)) {
      throw new Error("Invalid photo response");
    }
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json(data);
  } catch {
    return res.status(502).json({ error: "Photo service is temporarily unavailable" });
  }
};
