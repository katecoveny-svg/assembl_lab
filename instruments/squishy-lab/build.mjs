import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { rm } from "node:fs/promises";
const root = dirname(fileURLToPath(import.meta.url));
await rm(join(root, "dist"), { recursive: true, force: true });
await build({
  entryPoints: [join(root, "src/main.js")],
  bundle: true,
  format: "esm",
  outdir: join(root, "dist"),
  minify: true,
  legalComments: "linked",
  target: "es2022",
});
