// Offline helpers: replay a recorded "cassette" of LINZ's answers as a fetch, and count what was asked.
import fs from "node:fs";
export const fx = (name) => JSON.parse(fs.readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), "utf8"));
const bytes = (b64) => Uint8Array.from(Buffer.from(b64, "base64"));
/** a fetch that answers only what was recorded; anything else fails the test loudly. `over(url, range)` may return a Response to stand in. */
export function replay(cassette, over) {
  const asked = [];
  const f = async (url, init = {}) => {
    const range = init.headers?.range ?? null; asked.push({ url: String(url), range });
    const alt = over ? await over(String(url), range) : null; if (alt) return alt;
    const c = cassette.calls.find((x) => x.url === String(url) && x.range === range);
    if (!c) throw new Error(`not in the recording: ${range} ${url}`);
    return new Response(bytes(c.body), { status: c.status });
  };
  return { fetch: f, asked };
}
export const tileOf = (cassette) => { const c = cassette.calls.filter((x) => x.url.endsWith(".tiff") && x.range !== "bytes=0-65535").sort((a, b) => b.bytes - a.bytes)[0]; return bytes(c.body); };
export async function withGlobalFetch(f, fn) { const real = globalThis.fetch; globalThis.fetch = f; try { return await fn(); } finally { globalThis.fetch = real; } }
