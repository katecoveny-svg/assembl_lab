// assembl lab · the studio guide's voice on the ArchiPro concept page: text in, speech out, through ElevenLabs.
// Cloudflare Pages Function. Needs the ELEVENLABS_API_KEY secret and ELEVENLABS_VOICE_ID (the New Zealand voice chosen in
// ElevenLabs). Optional: ELEVENLABS_MODEL (default eleven_multilingual_v2), ARCHIPRO_VOICE_DAILY_CHARS (per running
// instance, default 60000 characters a day). Text is not stored. Without the key, the page falls back to the browser's
// own voice and says so.
const MAX_CHARS = 700;
let day = "", chars = 0;
// the assembl.co.nz home page (a separate static site) uses this voice too, so its origins get CORS headers
const ALLOW = new Set(["assembl.co.nz", "www.assembl.co.nz", "assembl-home.pages.dev"]);
function cors(request) {
  const o = request.headers.get("origin"); let host = ""; try { host = new URL(o).host; } catch {}
  return ALLOW.has(host) ? { "access-control-allow-origin": o, "access-control-allow-methods": "GET, POST, OPTIONS", "access-control-allow-headers": "content-type", "access-control-max-age": "86400", vary: "origin" } : {};
}

export async function onRequest({ request, env }) {
  const H = cors(request);
  const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...H } });
  const ready = !!(env.ELEVENLABS_API_KEY && env.ELEVENLABS_VOICE_ID);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: H });
  if (request.method === "GET") return json(200, { type: "assembl.archipro.voice.status", configured: ready, provider: "elevenlabs" });
  if (request.method !== "POST") return json(405, { error: "method" });
  const origin = request.headers.get("origin"); let oh = ""; try { oh = new URL(origin).host; } catch {}
  if (origin && oh !== new URL(request.url).host && !ALLOW.has(oh)) return json(403, { error: "origin" });
  if (!ready) return json(503, { error: "not_configured" });
  let body; try { body = await request.json(); } catch { return json(400, { error: "bad_json" }); }
  const text = String(body?.text ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_CHARS);
  if (!text) return json(400, { error: "text_required" });
  const today = new Date().toISOString().slice(0, 10); if (today !== day) { day = today; chars = 0; }
  if (chars + text.length > +(env.ARCHIPRO_VOICE_DAILY_CHARS || 60000)) return json(429, { error: "daily_cap" });
  chars += text.length;
  try {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(env.ELEVENLABS_VOICE_ID)}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "audio/mpeg", "xi-api-key": env.ELEVENLABS_API_KEY },
      body: JSON.stringify({ text, model_id: env.ELEVENLABS_MODEL || "eleven_multilingual_v2", voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true } }),
    });
    if (!r.ok) { console.warn("archipro-voice: provider error", r.status, (await r.text()).slice(0, 200)); return json(502, { error: "voice_error" }); }
    return new Response(r.body, { status: 200, headers: { "content-type": "audio/mpeg", "cache-control": "no-store", ...H } });
  } catch (e) { console.warn("archipro-voice: failed", e?.message); return json(502, { error: "upstream" }); }
}
