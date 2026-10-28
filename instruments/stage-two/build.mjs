import { build } from "esbuild";
await build({
  entryPoints: ["src/app.js"],
  bundle: true,
  format: "esm",
  outdir: "dist",
  minify: true,
  legalComments: "linked",
  target: "es2022",
});
