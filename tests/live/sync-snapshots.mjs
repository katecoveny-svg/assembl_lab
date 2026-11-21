// Rewrites api/_feeds/snapshots/*.js from the .json files beside them. Run after editing a snapshot.
import { readFileSync, writeFileSync } from "node:fs";
const dir = new URL("../../api/_feeds/snapshots/", import.meta.url);
for (const n of ["edhistory", "grocery", "qsdep"]) {
  const data = JSON.parse(readFileSync(new URL(`${n}.json`, dir), "utf8"));
  writeFileSync(new URL(`${n}.js`, dir),
    `// Generated copy of ./${n}.json so the feeds bundle on Cloudflare Pages, whose build cannot read JSON imports.\n` +
    `// Edit ${n}.json, then run: node tests/live/sync-snapshots.mjs  (a test fails if the two differ).\n` +
    `export default ${JSON.stringify(data, null, 1)};\n`);
  console.log("wrote", `${n}.js`);
}
