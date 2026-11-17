// assembl lab · instrument studies: page controller. Wires the controls to the studio and swaps instruments.
import { Studio, V } from './engine.js';
import { Sound } from './audio.js';

const $ = (id) => document.getElementById(id);
const MODS = { guitar: () => import('./guitar.js'), snare: () => import('./snare.js'), piano: () => import('./piano.js') };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let studio, current = '', lastPct = -1, flashT = 0, searchSel = -1, searchList = [];

const ui = {
  bind(s) {
    $('demo').addEventListener('click', () => { s.sound.ensure(); s.demo(); });
    $('explode').addEventListener('input', (e) => { s.stopDemo(); s.setExplode(e.target.value / 100); ui.sync(); });
    $('knoll').addEventListener('click', () => { s.stopDemo(); s.setKnoll(!s.kGoal); });
    $('heroBtn').addEventListener('click', () => s.setHero(!s.heroMode));
    $('cardBack').addEventListener('click', () => s.setMode('overview'));
    $('cardPrev').addEventListener('click', () => s.step(-1));
    $('cardNext').addEventListener('click', () => s.step(1));
    $('chips').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) s.setFilter(b.dataset.cat); });
    const inp = $('search'), list = $('results');
    const show = () => {
      const q = inp.value.trim().toLowerCase();
      searchList = q ? s.parts.filter((p) => `${p.name} ${p.code} ${catName(p.cat)}`.toLowerCase().includes(q)).slice(0, 12) : [];
      searchSel = searchList.length ? 0 : -1;
      list.innerHTML = searchList.map((p, i) => `<li role="option" id="r${i}" data-i="${i}" aria-selected="${i === searchSel}">${esc(p.name)}<small>${p.code} · ${esc(catName(p.cat))}</small></li>`).join('') || (q ? '<li aria-disabled="true">No part by that name</li>' : '');
      list.hidden = !q; inp.setAttribute('aria-expanded', String(!!q));
    };
    const choose = (i) => { const p = searchList[i]; if (!p) return; inp.value = ''; show(); if (s.filter !== 'all' && s.filter !== p.cat) s.setFilter('all'); s.inspect(p); };
    inp.addEventListener('input', show);
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); searchSel = (searchSel + (e.key === 'ArrowDown' ? 1 : -1) + searchList.length) % Math.max(1, searchList.length); [...list.children].forEach((li, i) => li.setAttribute('aria-selected', String(i === searchSel))); }
      if (e.key === 'Enter') { e.preventDefault(); choose(Math.max(0, searchSel)); inp.blur(); }
      if (e.key === 'Escape') { inp.value = ''; show(); inp.blur(); }
    });
    list.addEventListener('mousedown', (e) => { const li = e.target.closest('li[data-i]'); if (li) { e.preventDefault(); choose(+li.dataset.i); } });
    inp.addEventListener('blur', () => setTimeout(() => { list.hidden = true; inp.setAttribute('aria-expanded', 'false'); }, 120));
    document.querySelectorAll('.pick a').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); open(a.dataset.i); }));
  },

  onLoad(s) {
    const d = s.def;
    $('title').textContent = d.title; $('line').textContent = d.line; $('eyebrow').textContent = d.eyebrow;
    const [a, b] = d.stats(s.parts.length); $('stat1').textContent = a; $('stat2').textContent = b;
    $('barLabel').textContent = d.bar; $('hint').textContent = d.hint; $('truth').textContent = d.truth;
    document.title = `${d.title.replace(/\.$/, '')} · instrument studies · assembl lab`;
    $('chips').innerHTML = [`<button type="button" data-cat="all" aria-pressed="true">All<span>${s.parts.length}</span></button>`,
      ...s.cats.map((c) => `<button type="button" data-cat="${c.id}" aria-pressed="false">${esc(c.name)}<span>${s.parts.filter((p) => p.cat === c.id).length}</span></button>`)].join('');
    const acts = $('actions'); acts.innerHTML = '';
    for (const act of s.built?.actions || []) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'b'; b.id = `act-${act.id}`; b.textContent = act.label;
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', () => { s.stopDemo(); s.sound.ensure(); act.toggle(); ui.sync(); });
      acts.append(b);
    }
    $('heroBtn').hidden = !d.hero;
    $('loading').hidden = true;
    ui.buildKnollLabels(s);
    ui.sync();
  },

  buildKnollLabels(s) {
    $('knollLabels').innerHTML = (s.knollBlocks || []).map((b, i) => `<span data-b="${i}" style="opacity:0">${esc(b.cat.name)} · ${b.its.length}</span>`).join('');
  },

  heroLoaded(ok) { if (!ok) $('heroBtn').hidden = true; ui.sync(); },

  sync() {
    const s = studio; if (!s?.def) return;
    const pct = Math.round(s.eGoal * 100);
    if (document.activeElement !== $('explode')) $('explode').value = pct;
    $('pct').textContent = `${pct}%`;
    $('knoll').setAttribute('aria-pressed', String(!!s.kGoal));
    $('demo').setAttribute('aria-pressed', String(!!s.demoOn));
    $('demo').innerHTML = s.demoOn ? '<span class="ico">❚❚</span> Stop' : '<span class="ico">▷</span> Demo';
    $('heroBtn').setAttribute('aria-pressed', String(!!s.heroMode));
    $('heroBtn').title = s.heroMode ? 'Showing the generated model while assembled. Click to show the parts model.' : 'Showing the parts model. Click to show the generated model when assembled.';
    for (const act of s.built?.actions || []) $(`act-${act.id}`)?.setAttribute('aria-pressed', String(!!act.pressed?.()));
    $('chips').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cat === s.filter)));
    ui.state();
  },

  state() {
    const s = studio;
    const t = s.kGoal ? 'Laid flat' : s.mode === 'inspect' ? 'Inspecting' : s.mode === 'play' ? 'Playing' : s.eGoal < 0.02 ? 'Assembled' : s.eGoal > 0.98 ? 'Exploded' : `Exploding · ${Math.round(s.eGoal * 100)}%`;
    if ($('state').textContent !== t) $('state').textContent = t;
  },

  frame(s) {
    const pct = Math.round(s.eGoal * 100);
    if (pct !== lastPct) { lastPct = pct; if (document.activeElement !== $('explode')) $('explode').value = pct; $('pct').textContent = `${pct}%`; ui.state(); }
    const show = s.k > 0.92;
    const spans = $('knollLabels').children;
    (s.knollBlocks || []).forEach((b, i) => {
      const el = spans[i]; if (!el) return;
      if (!show) { if (el.style.opacity !== '0') el.style.opacity = '0'; return; }
      const p = s.project(V(b.x, 0.001, b.z - 0.035));
      el.style.opacity = p.front ? '1' : '0';
      el.style.left = `${p.x}px`; el.style.top = `${p.y}px`;
    });
    if (flashT && performance.now() > flashT) { $('flash').classList.remove('on'); flashT = 0; }
  },

  hover(p, hp, m) {
    const tip = $('tip');
    const txt = hp ? studio.built?.hoverText?.(hp) : null;
    if (txt) { tip.innerHTML = esc(txt); tip.hidden = false; ui.moveTip(m); return; }
    if (!p) { tip.hidden = true; return; }
    tip.innerHTML = `${esc(p.name)}<small>${p.code} · ${studio.mode === 'inspect' && studio.selected === p ? 'inspecting' : 'click to inspect'}</small>`;
    tip.hidden = false; ui.moveTip(m);
  },
  moveTip(m) { if (!m) return; const tip = $('tip'); tip.style.left = `${m.x}px`; tip.style.top = `${m.y}px`; },

  openCard(p) {
    $('card').hidden = false; $('tip').hidden = true;
    $('cardCode').textContent = `${p.code} / ${catName(p.cat)}`;
    $('cardTitle').textContent = p.name; $('cardDesc').textContent = p.desc;
    $('cardSpec').textContent = p.spec || '—'; $('cardRole').textContent = p.role || '—';
    const list = studio.visibleParts(); $('cardCount').textContent = `${list.indexOf(p) + 1} of ${list.length}`;
    ui.sync();
  },
  closeCard() { $('card').hidden = true; ui.sync?.(); },

  flash(t) { const f = $('flash'); f.textContent = t; f.classList.add('on'); flashT = performance.now() + 1100; },
  setPlayPanel(el) { const w = $('play'); w.innerHTML = ''; if (el) w.append(el); },
  showPlay(on) { $('play').hidden = !on; ui.sync(); },
};
const catName = (id) => studio?.def?.cats.find((c) => c.id === id)?.name || id;

async function open(id) {
  if (!MODS[id]) id = 'guitar';
  if (id === current) return;
  current = id;
  document.querySelectorAll('.pick a').forEach((a) => (a.dataset.i === id ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  const u = new URL(location.href); u.searchParams.set('i', id); history.replaceState(null, '', u);
  $('loading').hidden = false; $('play').hidden = true; $('play').innerHTML = '';
  const mod = (await MODS[id]()).default;
  if (current !== id) return;
  await studio.load(mod);
}

function start() {
  let gl = false;
  try { gl = !!document.createElement('canvas').getContext('webgl2'); } catch { gl = false; }
  if (!gl) { $('loading').textContent = 'This study needs WebGL 2, which this browser has turned off.'; return; }
  studio = new Studio({ host: $('canvas'), ui, sound: new Sound() });
  window.__studio = studio;
  open(new URLSearchParams(location.search).get('i') || 'guitar');
}
start();
