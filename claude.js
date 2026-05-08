// Vercel serverless function for Claude-powered semantic OEM matching.
// Deploy this alongside index.html on Vercel (or adapt for Netlify/Cloudflare Workers).
//
// Setup:
//   1. Sign up at https://console.anthropic.com and create an API key.
//   2. In your Vercel project settings, add an environment variable:
//        ANTHROPIC_API_KEY = sk-ant-...
//   3. In index.html, set CLAUDE_API_URL = "/api/claude" (same Vercel project)
//      or a full URL if hosted separately.
//
// Cost: a few cents per 100 searches with Haiku. The API key stays on the server
// and is never exposed to the browser.

export default async function handler(req, res) {
  // Allow same-origin POST only
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "ANTHROPIC_API_KEY not configured on the server" });
    return;
  }

  const { query, oems } = req.body || {};
  if (!query || !Array.isArray(oems) || oems.length === 0) {
    res.status(400).json({ error: "Body must be { query: string, oems: [{id, name, description}] }" });
    return;
  }

  const prompt = `You are matching an internal sales query to OEM partners we work with.

The user is looking for: "${String(query).replace(/"/g, '\\"')}"

Below is a list of OEM partners with their descriptions. Return EVERY OEM whose products or solutions could plausibly fulfill the user's query — including indirect or related fits (for example, a security vendor that offers firewalls would match "Rack Mount Firewall" even if the description doesn't mention rack-mount specifically).

For each match, return:
- id: the OEM's id (exactly as given)
- match_quality: "strong" if the OEM is a clear primary fit, "partial" if related/adjacent
- reason: one short sentence (max 18 words) explaining what they offer that fits the query

Output ONLY valid JSON in this exact shape, with NO other text, markdown, or commentary:
{"matches":[{"id":"...","match_quality":"strong","reason":"..."}]}

If no OEMs match at all, return: {"matches":[]}

OEM partners to evaluate:
${JSON.stringify(oems, null, 2)}`;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }]
      })
    });
    if (!r.ok) {
      const errText = await r.text();
      res.status(r.status).json({ error: "Anthropic API error", detail: errText });
      return;
    }
    const data = await r.json();
    const text = data?.content?.[0]?.text || "";
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) {
      res.status(500).json({ error: "Could not parse Claude response", raw: text });
      return;
    }
    const parsed = JSON.parse(m[0]);
    if (!Array.isArray(parsed.matches)) {
      res.status(500).json({ error: "Response missing 'matches' array", raw: text });
      return;
    }
    res.status(200).json({ matches: parsed.matches });
  } catch (e) {
    res.status(500).json({ error: "Server error", detail: String(e?.message || e) });
  }
}
