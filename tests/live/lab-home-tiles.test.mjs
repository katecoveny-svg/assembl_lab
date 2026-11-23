// lab home (/index.html) · "More from the lab": every tile opens a page that is in the repo (or is guarded until it is), shows a still
// that is in the repo, and carries a name, one line and a truth label.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const band = html.slice(html.indexOf('id="more"'), html.indexOf('</section>', html.indexOf('id="more"')));
const tiles = [...band.matchAll(/<a class="tile"([^>]*)>([\s\S]*?)<\/a>/g)].map((m) => ({ attrs: m[1], body: m[2], href: /href="([^"]+)"/.exec(m[1])[1] }));
const served = (p) => fs.existsSync(path.join(ROOT, p, p.endsWith('/') ? 'index.html' : ''));

test('the band is on the page and linked from the nav', () => {
  assert.ok(band.length > 100); assert.match(html, /<a href="#more">More<\/a>/);
  assert.ok(tiles.length >= 5, `tiles: ${tiles.length}`);
});

test('each tile: page in the repo or guarded, a still in the repo, name, line and label', () => {
  for (const t of tiles) {
    const guarded = /data-needs="/.test(t.attrs);
    if (guarded) { assert.match(t.attrs, /\shidden/, `${t.href} is guarded, so it starts hidden`); assert.match(t.attrs, /data-needs-text="&lt;title&gt;/, `${t.href} checks the page's own title`); }
    else assert.ok(served(t.href), `${t.href} is not a page in the repo`);
    const img = /<img src="([^"?]+)"[^>]*width="880" height="550"[^>]*alt="([^"]+)"/.exec(t.body);
    assert.ok(img, `${t.href}: still with size and alt text`);
    assert.ok(fs.statSync(path.join(ROOT, img[1])).size > 2000, `${img[1]} missing or empty`);
    for (const c of ['t-name', 't-line', 'chip mono']) assert.match(t.body, new RegExp(`class="${c}">[^<]+<`), `${t.href}: ${c}`);
  }
});

test('the roof solar twin and the architecture pieces are reachable', () => {
  const hrefs = new Set(tiles.map((t) => t.href));
  for (const h of ['/roof-solar/', '/plan-studio/twins/drop/', '/plan-studio/twins/16a/', '/architecture/', '/auckland/live/']) assert.ok(hrefs.has(h), h);
});

test('the guard script is loaded and reads the page before showing a tile', () => {
  assert.match(html, /src="\/lab\/v3\/more\.js/);
  const js = fs.readFileSync(path.join(ROOT, 'lab/v3/more.js'), 'utf8'); assert.match(js, /needsText/); assert.match(js, /a\.hidden = false/);
});
