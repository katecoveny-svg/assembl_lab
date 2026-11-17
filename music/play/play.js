// assembl lab · play guitar. The guitar from the instrument studies, opened straight into playing, with nothing to learn first.
import { Studio, THREE, V } from '../engine.js';
import { Sound } from '../audio.js';
import guitar from '../guitar.js';

const $ = (id) => document.getElementById(id);
const ORDER = ['G', 'C', 'D', 'Em', 'Am', 'E', 'A', 'Dm', 'F'];
let coachGone = false, nowT = 0;

const ui = {
  bind() {}, onLoad() {}, sync() {}, frame() {}, moveTip() {}, openCard() {}, closeCard() {}, setPlayPanel() {}, showPlay() {}, heroLoaded() {},
  hover() {},
  flash() { hideCoach(); },
};
const hideCoach = () => { if (!coachGone) { coachGone = true; $('coach').classList.add('gone'); } };

function diagram(shape) {
  // six strings, four frets, a dot where a finger goes and an x over a string that is not played
  const x = (i) => 3 + i * 5.6, y = (f) => 6 + (f - 0.5) * 6;
  let s = `<svg viewBox="0 0 34 30" aria-hidden="true"><g stroke="currentColor" stroke-width=".7" fill="none">`;
  for (let i = 0; i < 6; i++) s += `<line x1="${x(i)}" y1="6" x2="${x(i)}" y2="30"/>`;
  for (let f = 0; f <= 4; f++) s += `<line x1="3" y1="${6 + f * 6}" x2="31" y2="${6 + f * 6}" ${f === 0 ? 'stroke-width="1.6"' : ''}/>`;
  s += '</g>';
  shape.forEach((n, i) => {
    if (n > 0 && n <= 4) s += `<circle cx="${x(i)}" cy="${y(n)}" r="2.1" fill="currentColor"/>`;
    if (n < 0) s += `<text x="${x(i)}" y="4.2" font-size="4.6" text-anchor="middle" fill="currentColor">×</text>`;
  });
  return s + '</svg>';
}

async function start() {
  let gl = false;
  try { gl = !!document.createElement('canvas').getContext('webgl2'); } catch { gl = false; }
  if (!gl) { $('loading').textContent = 'This needs WebGL 2, which this browser has turned off.'; return; }
  const sound = new Sound();
  const studio = new Studio({ host: $('canvas'), ui, sound });
  window.__studio = studio;
  // the clean modelled guitar (no take-apart, no generated model), framed like you are holding it
  // wide screens: the guitar across the screen; tall screens: looking up the neck, so you swipe sideways across the strings
  const wide = innerWidth > innerHeight * 0.9;
  const dir = wide ? V(0.55, 0.8, 0.42) : V(-0.42, 0.9, 0.62);
  const def = { ...guitar, heroPlay: true, cam: { ...guitar.cam, dir, play: { target: V(0, wide ? 0.0 : -0.2, 0.08), radius: wide ? 0.8 : 0.68, dir } } };
  await studio.load(def);
  // a soft warm light behind it
  const cv = document.createElement('canvas'); cv.width = cv.height = 512;
  const g = cv.getContext('2d'), gr = g.createRadialGradient(256, 230, 30, 256, 256, 360);
  gr.addColorStop(0, '#FBF7F3'); gr.addColorStop(0.6, '#F2EAE6'); gr.addColorStop(1, '#E6D8DE');
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  const bg = new THREE.CanvasTexture(cv); bg.colorSpace = THREE.SRGBColorSpace; studio.scene.background = bg;
  studio.ground.material.opacity = 0.12;
  studio.setMode('play');
  const P = studio.built.play;

  // chord pads
  $('pads').innerHTML = ORDER.map((c, i) => `<button type="button" class="pad" data-c="${c}" aria-pressed="false" aria-label="${c} chord"><kbd>${i + 1}</kbd><b>${c}</b>${diagram(P.shapes[c])}</button>`).join('');
  const play = (c, vel = 0.75) => { sound.ensure(); hideCoach(); P.setChord(c); P.strum(true, vel); };
  $('pads').addEventListener('click', (e) => { const b = e.target.closest('.pad'); if (b) play(b.dataset.c); });
  $('strum').addEventListener('click', () => { sound.ensure(); hideCoach(); P.strum(true, 0.8); });
  const setMute = (on) => { P.setMute(on); $('mute').setAttribute('aria-pressed', String(on)); $('ring').setAttribute('aria-pressed', String(!on)); };
  $('mute').addEventListener('click', () => setMute(true));
  $('ring').addEventListener('click', () => setMute(false));
  const now = () => {
    $('pads').querySelectorAll('.pad').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.c === P.chord)));
    const el = $('now'); el.textContent = P.chord; el.classList.add('hit'); clearTimeout(nowT); nowT = setTimeout(() => el.classList.remove('hit'), 300);
  };
  P.on(now); now();
  // keys: 1–9 chords, space strums (shift for an up-stroke), m mutes
  addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^[1-9]$/.test(e.key)) { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) play(ORDER[+e.key - 1]); }
    else if (e.key === ' ') { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) { sound.ensure(); hideCoach(); P.strum(!e.shiftKey, 0.8); } }
    else if (e.key === 'm' || e.key === 'M') { e.stopImmediatePropagation(); setMute(!P.mute); }
  }, { capture: true });
  $('loading').hidden = true;
}
start();
