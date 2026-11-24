// Homepage review. These checks also run with no browser or network connection.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('../../', import.meta.url);
const html = fs.readFileSync(new URL('index.html', root), 'utf8');
const tools = ['/architecture/', '/auckland/live/', '/roof-solar/', 'https://assembl-waitemata-tides.pages.dev/'];
const hrefs = markup => [...markup.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)].map(match => match[1]);

test('the four destinations are real links in the primary navigation and toolkit', () => {
  const nav = html.match(/<nav aria-label="Main navigation">([\s\S]*?)<\/nav>/)?.[1];
  assert.deepEqual(hrefs(nav), tools);
  assert.deepEqual([...html.matchAll(/<a\b[^>]*class="tool"[^>]*href="([^"]+)"/g)].map(match => match[1]), tools);
  for (const href of hrefs(html).filter(url => url.startsWith('/'))) {
    const pathname = new URL(href, 'http://localhost/').pathname;
    assert.ok(fs.existsSync(new URL('.' + pathname + 'index.html', root)), pathname);
  }
});

test('the skip target and architecture entries remain usable without JavaScript', () => {
  assert.match(html, /class="skip" href="#main"/);
  assert.match(html, /<main\b[^>]*id="main"[^>]*tabindex="-1"/);
  for (const href of ['/plan-studio/twins/drop/', '#tools', '/plan-studio/twins/16a/', '/plan-studio/twins/services/']) {
    assert.ok(hrefs(html).includes(href), href);
  }
});

test('the lead and cards use local images with intrinsic dimensions and an alternative', () => {
  const images = html.match(/<img\b[^>]*>/g);
  assert.equal(images.length, 5);
  for (const image of images) {
    const src = image.match(/src="(\/[^"]+)"/)?.[1];
    assert.ok(src && fs.statSync(new URL('.' + src, root)).size > 2000);
    assert.match(image, /width="\d+"/);
    assert.match(image, /height="\d+"/);
    assert.match(image, /alt="[^"]*"/);
  }
  assert.match(images[0], /alt="[^"]+"/);
});

test('the front page does not load the former bird gallery; Manu keeps its own entry point', () => {
  const css = fs.readFileSync(new URL('lab/v3/front-door.css', root), 'utf8');
  assert.doesNotMatch(html, /<script\b|<canvas\b/);
  assert.doesNotMatch(html + css, /(?:birds|tui)\.webp|\/manu\/|three\.module/i);
  assert.ok(fs.existsSync(new URL('manu/index.html', root)));
});
