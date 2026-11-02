// Dealer twin stock: no listing is shown as a recoloured stand-in render, every picture is labelled for what it is,
// and the stock data, filters and counts are unchanged. Run: node --test cars/dealer-twin/tests/
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";

const dir = new URL("../", import.meta.url);
const read = (p) => readFileSync(new URL(p, dir), "utf8");
const stock = JSON.parse(read("data/stock.json"));
const cfg = JSON.parse(read("js/variant.js").replace(/^window\.TWIN_CFG\s*=\s*/, "").trim().replace(/;$/, ""));
const BODIES = ["hatch", "sedan", "wagon", "suv", "ute", "van"];

// What each real model on the yard actually is. A Hilux is a ute, an Aqua is a small hatch, a HiAce is a van.
const MODEL_BODY = { Aqua: "hatch", Corolla: ["hatch", "sedan"], Swift: "hatch", Leaf: "hatch", Fit: "hatch", Jazz: "hatch", Ioniq: "hatch",
  RAV4: "suv", "CX-5": "suv", "CX-3": "suv", Outlander: "suv", Highlander: "suv", Niro: "suv", Sportage: "suv", Tucson: "suv", "Atto 3": "suv", "ZS EV": "suv",
  Ranger: "ute", Hilux: "ute", HiAce: "van", "Model 3": "sedan" };

test("every listing shows its own body style (a drawing, or a generic render), labelled as not the actual car", () => {
  assert.equal(stock.cars.length, 48);
  for (const c of stock.cars) {
    const want = MODEL_BODY[c.model];
    assert.ok(want, `${c.id} ${c.model} has a known body`);
    assert.ok([].concat(want).includes(c.body), `${c.id} ${c.make} ${c.model} is a ${c.body}`);
    if (c.img.kind === "drawing") {
      assert.equal(c.img.card, `img/body/${c.body}.svg`, c.id);
      assert.equal(c.img.sq, `img/body/${c.body}-sq.svg`, c.id);
      assert.match(c.img.alt, /Not a picture of this car/, c.id);
      assert.match(c.img.label, /not this car/, c.id);
    } else {
      assert.equal(c.img.kind, "render", c.id); assert.equal(c.img.generic, true, c.id);
      assert.ok(c.img.card.startsWith(`img/stock/${c.body}-`), c.id);
      assert.match(c.img.alt, /Not the actual vehicle/, c.id);
      assert.match(c.img.label, /not the actual vehicle/, c.id);
    }
    assert.equal(c.render, undefined, `${c.id} has no stand-in render hint`);
    assert.ok(existsSync(new URL(c.img.card, dir)) && existsSync(new URL(c.img.sq, dir)), c.id);
  }
});

test("data, filters and counts are unchanged: 48 cars, SUV 22, hatch 17, ute 5, van 1, electric 10, hybrid 16", () => {
  const n = (f) => stock.cars.filter(f).length;
  assert.deepEqual([n((c) => c.body === "suv"), n((c) => c.body === "hatch"), n((c) => c.body === "ute"), n((c) => c.body === "van"), n((c) => c.fuel === "electric"), n((c) => /hybrid/.test(c.fuel))], [22, 17, 5, 1, 10, 16]);
  assert.equal(stock.truth, "Simulated");
  for (const c of stock.cars) { assert.equal(c.truthLabel, "Simulated"); assert.ok(c.priceNzd > 0 && c.year > 2000 && c.make && c.model, c.id); }
});

test("nothing references the old one-mesh renders, the procedural car kit or the AI-generated GLB", () => {
  const files = ["index.html", "css/site.css", "data/stock.json", ...readdirSync(new URL("js/", dir)).filter((f) => f.endsWith(".js")).map((f) => `js/${f}`)];
  for (const f of files) {
    const s = read(f);
    assert.ok(!/img\/cars\//.test(s), `${f} points at img/cars/`);
    assert.ok(!/sedan\.glb/.test(s), `${f} points at the AI-generated sedan.glb`);
    assert.ok(!/spot3d|vendor\/kit3d|vendor\/look3d/.test(s), `${f} loads the one-mesh car kit`);
  }
  assert.equal(cfg.hero.glb, undefined);
  assert.ok(!existsSync(new URL("assets/hero/sedan.glb", dir)));
  assert.ok(!existsSync(new URL("img/cars/", dir)) || readdirSync(new URL("img/cars/", dir)).length === 0);
});

test("the stock heading is plain Instrument Sans copy, no render boast, and the simulated-stock honesty stays", () => {
  const html = read("index.html"), h = html.match(/<h2 id="stockH">(.*?)<\/h2>/)[1];
  assert.equal(h, "48 cars on the yard today.");
  assert.ok(!/<em>|render/i.test(h));
  assert.match(html, /Simulated stock for a fictional dealer/);
  assert.match(html, /They are not (pictures of the listed cars|the actual vehicles)/);
  assert.match(read("css/site.css"), /\.stock h2\{font-family:var\(--sans\)\}/);
});

test("the three lead cars are three different body styles, not three of the same hatch", () => {
  const leads = cfg.lead3.map((id) => stock.cars.find((c) => c.id === id));
  assert.equal(leads.filter(Boolean).length, 3);
  assert.equal(new Set(leads.map((c) => c.body)).size, 3);
});

test("drawings: six body styles at one shared scale, brand palette only, no text, no logos", () => {
  const allowed = new Set(["#492b3e", "#240b21", "#fffdfb", "#f5f1f2", "#916a70", "#e6e1ec", "#efcfd4", "#e6dce1", "#cdbfdd"]);
  for (const b of BODIES) for (const f of [`${b}.svg`, `${b}-sq.svg`]) {
    const s = read(`img/body/${f}`);
    assert.match(s, /viewBox="0 0 6000 (4500|6000)"/, f);
    assert.ok(!/<text|<image|href=/.test(s), `${f} has text or an embedded image`);
    for (const hex of s.match(/#[0-9a-fA-F]{6}\b/g)) assert.ok(allowed.has(hex.toLowerCase()), `${f} uses ${hex}`);
    assert.match(s, /Not a picture of any listed car/, f);
  }
});
