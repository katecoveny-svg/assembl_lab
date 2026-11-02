// assembl lab · study machines: public, referrer-restricted map keys handed to the browser as a tiny script.
//
// GET /api/study-env/  →  JavaScript that sets window.ASSEMBLY_GOOGLE_MAPS_KEY and window.ASSEMBLY_LINZ_KEY
//
// Vercel env names (Project → Settings → Environment Variables):
//   GOOGLE_MAPS_TILES_KEY  Google Maps Platform key restricted to the Map Tiles API and to the HTTP referrers
//                          https://study.assembl.co.nz/* and https://assembl-lab.vercel.app/*. Turns on Photorealistic
//                          3D Tiles in /study/m/fly.html. Unset = the page stays on LINZ terrain (free, keyless).
//   LINZ_BASEMAPS_KEY      Free LINZ Basemaps developer key (d01…). Unset = the page mints a per-visitor client key.
// Neither value is secret in the browser sense (both are meant to be public, referrer-restricted keys), but they are
// kept out of the repo so Kate can rotate them from the Vercel dashboard.
export default function handler(req, res) {
  const g = (process.env.GOOGLE_MAPS_TILES_KEY || "").trim();
  const l = (process.env.LINZ_BASEMAPS_KEY || "").trim();
  const safe = (s) => /^[A-Za-z0-9_-]{0,128}$/.test(s) ? s : "";
  res.setHeader("Content-Type", "text/javascript; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");
  res.status(200).send(`window.ASSEMBLY_GOOGLE_MAPS_KEY=${JSON.stringify(safe(g))};window.ASSEMBLY_LINZ_KEY=${JSON.stringify(safe(l))};`);
}
