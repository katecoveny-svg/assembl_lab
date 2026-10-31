/* Source/control-flow regressions only. These mocks do not certify visual output,
 * browser lifecycle behavior, GPU support, accessibility or mobile performance. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = name => fs.readFileSync(path.join(__dirname, name), 'utf8');

function studioHarness() {
  // Load the real controller without browser-only imports or asynchronous startup.
  const source = read('studio.js').replace(/^import .*\n/gm, '')
    .replace(/^legacy=await window\.legacyStudioReady;[\s\S]*/m, '');
  const ids = new Map(), events = {};
  const stats = {draws: 0, disposals: 0, cancelled: 0, requested: 0};
  let blobDone;
  const context2d = {
    fillRect() {}, drawImage() {}, fillText() {},
    measureText: value => ({width: value.length}), canvas: {height: 2400}
  };
  function element(id = '') {
    return {
      id, hidden: false, disabled: false, value: id === 'format' ? 'square' : '',
      open: false, checked: false, width: 800, height: 600,
      dataset: {}, style: {}, children: [], listeners: {},
      classList: {toggle() {}, add() {}, remove() {}},
      attributes: {}, setAttribute(name, value) { this.attributes[name] = value; }, replaceChildren() { this.children = []; },
      append(...children) { this.children.push(...children); }, remove() {},
      addEventListener(name, callback) { this.listeners[name] = callback; },
      getBoundingClientRect: () => ({width: 800, height: 600, left: 0, top: 0}),
      closest: () => ({}), getContext: () => context2d,
      toBlob(callback) { blobDone = callback; }, toDataURL: () => '',
      showModal() { this.open = true; }, close() { this.open = false; }
    };
  }
  const get = id => {
    if (!ids.has(id)) ids.set(id, element(id));
    return ids.get(id);
  };
  const materials = ['chrome','glass','coral','porcelain'].map(material => {
    const button = element(); button.dataset.material = material; return button;
  });
  const legacy = {
    engines: {attract: {
      name: 'Attract', hint: '', description: '', prompt: '',
      controls: [['attA', 'Curve A', -3, 3, .05]]
    }},
    state: {attA: -1.4}, render() { stats.draws++; },
    resize() {}, select() {}, palette() {}, reset() {}, canvas: element()
  };
  const sandbox = {
    document: {
      getElementById: get,
      querySelectorAll: selector => selector.startsWith('.mode,')
        ? [get('pause'), get('open-settings'), get('open-export')] : selector === '[data-material]' ? materials : [],
      querySelector: () => element(), createElement: () => element(), hidden: false
    },
    window: {addEventListener: (name, handler) => { events[name] = handler; }},
    matchMedia: () => ({matches: false, addEventListener() {}}),
    ResizeObserver: class { observe() {} }, devicePixelRatio: 1,
    requestAnimationFrame: () => ++stats.requested,
    cancelAnimationFrame: () => stats.cancelled++, console,
    URL: {createObjectURL: () => 'blob:test-file', revokeObjectURL() {}},
    location:{hash:'',search:''},URLSearchParams,cleanRecipe:vm.runInNewContext(read('atelier-shapes.js').replace(/export /g,'' )+';cleanRecipe'),
    navigator: {}, File: class { constructor(parts, name) { this.name = name; } },
    captionLines: () => 0, createLiquid() {}, createGarden() {}, createSculpture() {}, createFluid() {}, createTuring() {}, createSlime() {}, createVessel() {}, createFlock() {}
  };
  vm.createContext(sandbox);
  vm.runInContext(source + `
    globalThis.access = {
      setLegacy(value) { legacy=value; active='attract'; ready=true; paused=false; },
      getState() { return {tempo, time, active, savedFile, raf, material:settings.material}; },
      controls,
      setModern(renderer) {
        active='liquid';
        renderers.set('liquid', {canvas:document.createElement('canvas'), renderer});
      }, tick
    };`, sandbox);
  const access = sandbox.access;
  access.setLegacy(legacy);
  const modern = () => access.setModern({
    render() {}, resize() {}, dispose() { stats.disposals++; }
  });
  return {get, stats, events, legacy, access, modern, materials,
    finishBlob: () => { assert.equal(typeof blobDone, 'function'); blobDone({size: 1}); }};
}

test('live legacy tempo multiplies frames but Step once remains a single frame', () => {
  const h = studioHarness();
  h.get('speed').value = 3;
  h.get('speed').oninput();
  h.access.tick(10);
  h.access.tick(50);
  assert.equal(h.stats.draws, 3);
  h.get('step').onclick();
  assert.equal(h.stats.draws, 4);
  h.access.tick(90);
  assert.equal(h.stats.draws, 4, 'Step leaves animation paused');
});

test('opening settings refreshes values modified by a legacy canvas gesture', () => {
  const h = studioHarness();
  const currentInput = () => h.get('live-controls').children.find(e => e.id === 'c-attA');
  h.get('open-settings').onclick();
  assert.equal(currentInput().value, -1.4);
  h.get('settings').close();
  h.legacy.state.attA = 3;
  h.get('open-settings').onclick();
  assert.equal(currentInput().value, 3);
});

test('changing export format discards an in-flight stale capture', async () => {
  const h = studioHarness();
  h.modern();
  const pending = h.get('capture').onclick();
  h.get('format').value = 'story';
  h.get('format').listeners.input();
  h.finishBlob();
  await pending;
  assert.equal(h.get('download').disabled, true);
  assert.equal(h.get('print').disabled, true);
  assert.equal(h.access.getState().savedFile, null);
  assert.equal(h.get('capture').disabled, false);
  assert.doesNotMatch(h.get('export-status').textContent, /^Ready/);
});

test('an unchanged capture prepares the expected output filename and dimensions', async () => {
  const h = studioHarness();
  h.modern();
  h.get('format').value = 'story';
  const pending = h.get('capture').onclick();
  h.finishBlob();
  await pending;
  assert.equal(h.get('download').disabled, false);
  assert.equal(h.access.getState().savedFile.name, 'assembl-liquid-2160x3840.png');
  assert.match(h.get('dimensions').textContent, /^2160 × 3840 px/);
});

test('cached page departure preserves renderers and restoration restarts the loop', () => {
  const h = studioHarness();
  h.modern();
  h.access.tick(10);
  h.events.pagehide({persisted: true});
  assert.equal(h.stats.disposals, 0);
  assert.equal(h.access.getState().raf, 0);
  const requests = h.stats.requested;
  h.events.pageshow({persisted: true});
  assert.equal(h.stats.requested, requests + 1);
  assert.ok(h.access.getState().raf > 0);
  h.events.pageshow({persisted: true});
  assert.equal(h.stats.requested, requests + 1, 'do not create duplicate loops');
  h.events.pagehide({persisted: false});
  assert.equal(h.stats.disposals, 1);
});

test('Suminagashi automatic drops follow the legacy frame clock, not every draw', () => {
  const sandbox = {
    console, window: {}, devicePixelRatio: 1, width: 800, height: 1000,
    frameCount: 0, TWO_PI: Math.PI * 2, CLOSE: 'close', ROUND: 'round',
    LEFT: 'left', CENTER: 'center', pixelDensity() {},
    createCanvas() { return {elt: {}, parent() {}}; }, noLoop() {},
    randomSeed() {}, noiseSeed() {}, noise: () => .5,
    random: (a, b) => a === undefined ? .5 : b === undefined ? a * .5 : (a + b) * .5
  };
  for (const name of ['background', 'noStroke', 'fill', 'rect', 'stroke',
    'strokeWeight', 'noFill', 'beginShape', 'vertex', 'endShape']) sandbox[name] = () => {};
  vm.createContext(sandbox);
  // Noise/geometry rendering is outside this scheduling test; run the actual
  // engine and legacy adapter with constant noise and no-op drawing primitives.
  vm.runInContext(read('engines.js') + '\n' + read('living.js') + `
    fbm=()=>.5;
    setup(); window.LegacyStudio.select('sumi');
    globalThis.readDrops=()=>sumiDrops.length;`, sandbox);
  assert.equal(sandbox.frameCount, 93);
  assert.equal(sandbox.readDrops(), 5, 'three initial drops plus frames 45 and 90');
  for (let i = 0; i < 42; i++) sandbox.window.LegacyStudio.render();
  assert.equal(sandbox.frameCount, 135);
  assert.equal(sandbox.readDrops(), 6, 'next automatic drop occurs at frame 135');
});


test('initial material, switching and reset keep exactly one truthful pressed label', () => {
  const h = studioHarness();
  const assertSelected = expected => {
    assert.equal(h.access.getState().material, expected);
    assert.deepEqual(h.materials.filter(b => b.attributes['aria-pressed'] === 'true').map(b => b.dataset.material), [expected]);
    assert.ok(h.materials.every(b => ['true','false'].includes(b.attributes['aria-pressed'])));
  };
  // controls() is the common initial/mode-entry path; it must repair stale markup.
  h.materials[1].attributes['aria-pressed'] = 'true';
  h.access.controls(); assertSelected('porcelain');
  for (const button of h.materials) {
    button.onclick(); assertSelected(button.dataset.material);
    h.access.controls(); assertSelected(button.dataset.material);
  }
  h.get('reset').onclick(); assertSelected('porcelain');
  h.access.controls(); assertSelected('porcelain');
});
