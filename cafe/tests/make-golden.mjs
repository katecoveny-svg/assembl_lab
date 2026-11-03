// Regenerates the café model golden baseline. Run ONLY when the business model is changed on purpose:
//   node cafe/tests/make-golden.mjs
// A 3D or layout change must never need this.
import { writeFileSync } from 'node:fs';
import { loadCafe, baseline, modelHash } from './cafe-harness.mjs';
const out = { note: 'Golden behaviour of the café twin business model (cafe/index.html CAFE script). Generated before the 3D/GLB change on branch claude/3d-cafe; the 3D work must not alter it.', modelSha256: modelHash(), ...baseline(loadCafe()) };
writeFileSync(new URL('./golden/cafe-model-baseline.json', import.meta.url), JSON.stringify(out) + '\n');
console.log('wrote golden', out.modelSha256);
