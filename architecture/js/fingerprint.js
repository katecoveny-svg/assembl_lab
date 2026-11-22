// The model fingerprint: a short code for exactly what a plan model says.
// It is the same sum the 3D page uses (plan-studio/twins/src/twin/approvals.ts), so an approval recorded here and an
// approval recorded on the 3D page name the same version of the same model. If the two ever differ, the unit test in
// tests/architecture/fingerprint.test.mjs fails.

// SHA-256 in plain script, so it works on any page without a secure context.
// Copied from the 3D page exactly, including one quirk: when the text is 55 bytes more than a multiple of 64, the
// padding runs one block long, so for those lengths (1 in 64) the sum is not the standard SHA-256 of the text. It is
// still a steady fingerprint, and matching the 3D page matters more here than matching the standard. If the 3D page
// is ever corrected, correct this in the same change: the test compares the two.
const K = new Uint32Array([0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);

export function sha256(text) {
  const src = new TextEncoder().encode(text), bits = src.length * 8, n = (((src.length + 9) >> 6) + 1) << 6, m = new Uint8Array(n);
  m.set(src); m[src.length] = 0x80;
  const dv = new DataView(m.buffer); dv.setUint32(n - 8, Math.floor(bits / 0x100000000)); dv.setUint32(n - 4, bits >>> 0);
  const h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]), w = new Uint32Array(64);
  const r = (x, s) => (x >>> s) | (x << (32 - s));
  for (let o = 0; o < n; o += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
    for (let i = 16; i < 64; i++) { const a = w[i - 15], b = w[i - 2]; w[i] = (w[i - 16] + (r(a, 7) ^ r(a, 18) ^ (a >>> 3)) + w[i - 7] + (r(b, 17) ^ r(b, 19) ^ (b >>> 10))) >>> 0; }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const t1 = (hh + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) >>> 0, t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    h[0] += a; h[1] += b; h[2] += c; h[3] += d; h[4] += e; h[5] += f; h[6] += g; h[7] += hh;
  }
  return [...h].map((x) => x.toString(16).padStart(8, '0')).join('');
}

/** A fingerprint of what the model says: buildings, site features, job notes and revision. The bulky ground data is left out. */
export function modelFingerprint(plan) {
  const core = { schema: plan?.schema, job: plan?.job, revision: plan?.revision, buildings: plan?.buildings, features: plan?.site?.features, clearing: plan?.site?.terrain?.clearing };
  return sha256(JSON.stringify(core)).slice(0, 12);
}

export const PLAN_SCHEMA = 'assembl.plan-model.v1';

/**
 * Read the text of a plan model file and return what the project keeps about it: its name, drawings note, revision
 * and fingerprint. (The page keeps the file itself apart, through the storage module, so it can open in 3D.)
 * Throws an Error with a plain message when the text is not a plan model.
 */
export function describeModel(text, fileName) {
  let plan;
  try { plan = typeof text === 'string' ? JSON.parse(text) : text; } catch { throw new Error('That file is not JSON, so it is not a plan model.'); }
  if (!plan || typeof plan !== 'object' || !Array.isArray(plan.buildings)) throw new Error('That JSON has no buildings in it, so it is not a plan model.');
  return {
    fingerprint: modelFingerprint(plan),
    drawings: String(plan.job?.drawings ?? 'not stated'),
    revision: String(plan.revision?.current ?? 'not stated'),
    file_name: String(fileName || 'plan-model.json'),
    // not stored on the project: used once, to say what was read
    title: String(plan.job?.title ?? ''),
    schemaOk: plan.schema === PLAN_SCHEMA,
  };
}
