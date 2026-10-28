import { build } from "esbuild";
import { copyFile, mkdir, readFile, writeFile, rm } from "node:fs/promises";
await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
await build({
  entryPoints: ["src/app.js"],
  bundle: true,
  splitting: true,
  format: "esm",
  outdir: "dist",
  minify: true,
  legalComments: "linked",
  external: ["node:*"],
  target: "es2022",
});
await copyFile("node_modules/manifold-3d/manifold.wasm", "dist/manifold.wasm");
for (const [route, title] of [
  ["reality-remix", "Reality Remix"],
  ["soft-matter", "Soft Matter"],
  ["impossible-objects", "Impossible Objects"],
]) {
  await writeFile(
    `${route}/index.html`,
    (await readFile("src/shell.html", "utf8"))
      .replaceAll("{{title}}", title)
      .replaceAll("{{route}}", route),
  );
}
