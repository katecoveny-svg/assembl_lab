// The fly-through (plan-studio/twins/src/twin/flightPath.ts) and the MP4 writer for its film (mp4Mux.ts). The shot list here
// is invented: a made-up house with a gate, a path, a deck and a living room.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { importShotList, readMove, timeline, confirm, edited, bump, reorder, readFlight, emptyFlight, newShot, WALK, FLIGHT_SCHEMA } from '../../plan-studio/twins/src/twin/flightPath.ts';
import { muxMp4, boxes } from '../../plan-studio/twins/src/twin/mp4Mux.ts';
import { backToSource } from '../../architecture/js/site-sources-rules.js';

const LIST = {
  schema: 'assembl.shot-list.v1', source: 'invented for the tests',
  shots: [
    { id: '01', where: 'at the gate', move: 'walk up the path' },
    { id: '02', where: 'halfway up the path', move: 'slow here, then turn to the deck' },
    { id: '03', where: 'on the deck', move: 'pause here' },
    { id: '04', where: 'the stair void', move: 'pan up and down the void' },
    { id: '05', where: 'the living room', move: 'pan round' },
    { id: 'note', where: 'by the kitchen', move: '-', note: 'feature the window seat' },
  ],
  open_questions: ['Where does it end?'],
  defaults_chosen: { end: 'back to the deck, then up' },
};

test('a shot list arrives as unplaced shots, its words read by rule, its notes kept as notes', () => {
  const fp = importShotList(LIST, { frame: 'test frame' });
  assert.equal(fp.schema, FLIGHT_SCHEMA);
  assert.deepEqual(fp.shots.map((s) => s.id), ['01', '02', '03', '04', '05']);
  assert.ok(fp.shots.every((s) => s.x == null && s.source === 'not placed'));
  assert.equal(fp.status, 'proposed');
  const by = Object.fromEntries(fp.shots.map((s) => [s.id, s]));
  assert.equal(by['01'].speed, WALK);
  assert.ok(by['02'].speed < WALK, 'slow');
  assert.equal(by['03'].dwell, 3, 'a pause is about 3 s');
  assert.equal(by['04'].pan, 0, 'up and down is a tilt, not a pan'); assert.ok(by['04'].tilt > 0);
  assert.equal(by['05'].pan, 120);
  assert.deepEqual(fp.from.notes, ['by the kitchen: feature the window seat']);
  assert.deepEqual(fp.from.open_questions, ['Where does it end?']);
  assert.equal(fp.from.defaults_chosen.end, 'back to the deck, then up');
});

test('anything that is not a shot list is refused with a reason', () => {
  assert.throws(() => importShotList({ schema: 'something.else', shots: [{}] }), /assembl\.shot-list\.v1/);
  assert.throws(() => importShotList({ schema: 'assembl.shot-list.v1', shots: [] }), /no shots/);
  assert.throws(() => importShotList(null), /not a shot list/);
  assert.equal(readMove('pause for 5 s').dwell, 5);
});

const flat = () => 0;
function placed() {
  const fp = importShotList(LIST, { frame: 'f' });
  const at = { '01': [0, 0], '02': [10, 0], '03': [20, 5], '04': [24, 12], '05': [20, 18] };
  return { ...fp, shots: fp.shots.map((s) => ({ ...s, x: at[s.id][0], z: at[s.id][1], source: 'placed by a person' })) };
}

test('the timeline: holds where asked, travels at the shot’s pace, ends where it should, stays on the ground plus eye height', () => {
  const fp = placed(), tl = timeline(fp, flat, [20, 3, 10]);
  assert.ok(tl.duration > 0 && Number.isFinite(tl.duration));
  const m3 = tl.marks.find((m) => m.id === '03');
  assert.equal(Math.round((m3.leave - m3.arrive) * 10) / 10, 3, 'held 3 s at 03');
  const mid = tl.at((m3.arrive + m3.leave) / 2);
  assert.deepEqual(mid.eye.map((v) => Math.round(v * 100) / 100), [20, 1.6, 5]);
  assert.equal(mid.phase, 'dwell');
  const start = tl.at(0), end = tl.at(tl.duration);
  assert.deepEqual([start.eye[0], start.eye[2]], [0, 0]);
  assert.deepEqual([Math.round(end.eye[0]), Math.round(end.eye[2])], [20, 18]);
  // walking pace: the travel time is at least the path length over the fastest speed
  assert.ok(tl.duration > tl.length / WALK);
  // no NaN anywhere, eye always 1.6 m over flat ground except in the finish
  for (let t = 0; t <= tl.duration; t += 0.25) { const c = tl.at(t); assert.ok([...c.eye, ...c.look].every(Number.isFinite)); assert.ok(Math.abs(c.eye[1] - 1.6) < 1e-6); }
});

test('a tilt goes up and comes back; a pan turns and the way on unwinds it', () => {
  const fp = placed(), tl = timeline(fp, flat), m4 = tl.marks.find((m) => m.id === '04');
  const a = tl.at(m4.arrive + 0.01), b = tl.at((m4.arrive + m4.leave) / 2), c = tl.at(m4.leave - 0.01);
  assert.ok(b.look[1] > a.look[1] + 1, 'looks up mid-hold'); assert.ok(Math.abs(c.look[1] - a.look[1]) < 0.3, 'and back down');
  const m5 = tl.marks.find((m) => m.id === '05');
  const d0 = tl.at(m5.arrive + 0.01), d1 = tl.at(m5.leave - 0.01);
  const ang = (q) => Math.atan2(q.look[2] - q.eye[2], q.look[0] - q.eye[0]);
  let turn = ((ang(d1) - ang(d0)) * 180) / Math.PI; turn = ((turn + 540) % 360) - 180;
  assert.ok(Math.abs(Math.abs(turn) - 120) < 2, `turned ${turn.toFixed(1)}°`);
});

test('the way back and the aerial pull-back: after the last shot, back through the named shots, then up and away', () => {
  const fp = { ...placed(), finish: { via: ['03'], aerial: true, rise: 30, pull: 40, secs: 8 } };
  const tl = timeline(fp, flat, [20, 3, 10]), end = tl.at(tl.duration);
  assert.equal(end.phase, 'finish');
  assert.ok(end.eye[1] > 30, 'risen');
  const plain = timeline(placed(), flat);
  assert.ok(tl.duration > plain.duration + 8);
});

test('unplaced shots are skipped; fewer than two placed gives no travel', () => {
  const fp = importShotList(LIST, { frame: 'f' });
  assert.equal(timeline(fp, flat).duration, 0);
  const one = { ...fp, shots: fp.shots.map((s, i) => (i === 0 ? { ...s, x: 1, z: 2 } : s)) };
  assert.equal(timeline(one, flat).length, 0);
});

test('proposed until a person confirms; any edit makes it a proposal again; each save is a new version', () => {
  const fp = placed();
  assert.throws(() => confirm(fp, ''), /initials/);
  assert.throws(() => confirm(importShotList(LIST, { frame: 'f' }), 'KH'), /two shots/);
  const ok = confirm(fp, 'KH', '2026-11-23T00:00:00.000Z');
  assert.equal(ok.status, 'confirmed'); assert.equal(ok.confirmed_by, 'KH');
  const ed = edited(ok); assert.equal(ed.status, 'proposed'); assert.equal(ed.confirmed_by, null);
  const moved = reorder(ok, '02', -1);
  assert.deepEqual(moved.shots.slice(0, 2).map((s) => s.id), ['02', '01']); assert.equal(moved.status, 'proposed');
  assert.equal(bump(bump(ok)).version, 2);
  // read back: a record that says confirmed without a person is a proposal
  assert.equal(readFlight({ ...ok, confirmed_by: null }).status, 'proposed');
  assert.equal(readFlight(JSON.parse(JSON.stringify(ok))).status, 'confirmed');
  assert.throws(() => readFlight({ schema: 'x' }), /fly-through/);
  assert.equal(emptyFlight('f').shots.length, 0);
  assert.equal(newShot('9', { speed: -4 }).speed, 0.2, 'speeds are kept to something a camera can do');
});

test('the MP4 writer: ftyp, moov before mdat, one avc1 track with its decoder record, every frame in', () => {
  const avcC = new Uint8Array([1, 0x64, 0, 0x28, 0xff, 0xe1, 0, 4, 0x67, 0x64, 0, 0x28, 1, 0, 4, 0x68, 0xee, 0x3c, 0x80]);
  const samples = Array.from({ length: 45 }, (_, i) => ({ data: new Uint8Array([0, 0, 0, 3, i % 30 === 0 ? 0x65 : 0x41, i, 7]), key: i % 30 === 0, dur: 1000 }));
  const mp4 = muxMp4({ width: 1280, height: 720, timescale: 30000, avcC, samples });
  const top = boxes(mp4).map((b) => b[0]);
  assert.deepEqual(top, ['ftyp', 'moov', 'mdat']);
  const [, mo, ms] = boxes(mp4).find((b) => b[0] === 'moov');
  const text = new TextDecoder('latin1').decode(mp4.subarray(mo, mo + ms));
  for (const t of ['mvhd', 'trak', 'tkhd', 'mdhd', 'hdlr', 'vide', 'stsd', 'avc1', 'avcC', 'stts', 'stss', 'stsz', 'stco']) assert.ok(text.includes(t), t);
  // the chunk offset points at the first frame inside mdat
  const dv = new DataView(mp4.buffer), co = text.indexOf('stco') + mo;
  const off = dv.getUint32(co + 12);
  const [, md] = boxes(mp4).find((b) => b[0] === 'mdat');
  assert.equal(off, md + 8);
  assert.equal(mp4[off + 4], 0x65, 'the first frame is the key frame');
  assert.equal(mp4.length, md + 8 + 45 * 7);
  assert.throws(() => muxMp4({ width: 2, height: 2, timescale: 30, avcC, samples: [] }), /no frames/);
});

test('the 3D page offers the editor on opened models and on generated homes, and saves back through the hand-over store', () => {
  const plan = readFileSync(new URL('../../plan-studio/twins/src/twin/projectPlan.ts', import.meta.url), 'utf8');
  assert.match(plan, /import \{ flightPanel \} from '\.\/flightUI';/);
  assert.equal((plan.match(/flightPanel\(app, \{/g) ?? []).length, 2);
  const ui = readFileSync(new URL('../../plan-studio/twins/src/twin/flightUI.ts', import.meta.url), 'utf8');
  assert.match(ui, /putBackRecord\(ctx\.handoffId, 'flight'/); assert.match(ui, /putBackRecord\(ctx\.handoffId, 'film'/);
  for (const w of ['Import a shot list', 'Add a shot', 'Preview', 'Confirm the path', 'Save to the project', 'Render film', 'Download']) assert.ok(ui.includes(w), w);
});

test('what the 3D page passes back lands in the project: fly-through path, films and stills, the camera path; nothing unknown', () => {
  assert.deepEqual(backToSource({ kind: 'flight', name: 'flight-path-v2.json', meta: { version: 2, status: 'confirmed', confirmed_by: 'KH', shots: 8 } }), { slot: 'flythrough', name: 'flight-path-v2.json', note: 'From the 3D page: v2, confirmed by KH, 8 shots' });
  assert.equal(backToSource({ kind: 'film', name: 'a.mp4', meta: { secs: 64, size: '1280x720', quality: 'draft', status: 'proposed' } }).slot, 'films');
  assert.match(backToSource({ kind: 'film', name: 'a.mp4', meta: { status: 'proposed' } }).note, /path proposed/);
  assert.equal(backToSource({ kind: 'shot', name: 's.png', meta: { shot: 'S1' } }).slot, 'films');
  assert.match(backToSource({ kind: 'look', name: 'l.png', meta: {} }).note, /waiting for a person/);
  assert.deepEqual(backToSource({ kind: 'camera_path', path: { pts: [] } }), { path: { pts: [] } });
  assert.equal(backToSource({ kind: 'mystery' }), null);
  assert.equal(backToSource(null), null);
});

test('a layout change at a held shot: B pans as the layout comes in, A fades to black, changes at the dark, and fades back', () => {
  const fp = placed();
  fp.shots = fp.shots.map((s) => (s.id === '05' ? { ...s, layout: 'lounge', dwell: 6 } : s));
  const B = timeline(fp, flat, [20, 3, 10]), m = B.marks.find((k) => k.id === '05');
  const early = B.at(m.arrive + 0.1), late = B.at(m.leave - 0.1);
  assert.equal(early.layout.name, 'lounge'); assert.ok(early.layout.amount < 0.1); assert.ok(late.layout.amount > 0.95); assert.ok(!early.fade);
  const A = timeline(fp, flat, [20, 3, 10], { variants: { '05': 'fade' } });
  const mid = A.at((m.arrive + m.leave) / 2), before = A.at(m.arrive + 0.5), after = A.at(m.leave - 0.05);
  assert.equal(mid.fade, 1); assert.ok(before.fade < 1 && before.fade > 0); assert.ok(after.fade < 0.1);
  assert.equal(before.layout.amount, 0); assert.equal(after.layout.amount, 1, 'changed while dark');
  // the new layout stays after the shot
  assert.equal(B.at(B.duration).layout?.name, 'lounge');
  // the words of a shot list ask for both
  assert.equal(readMove('pan round; try a fade out').variant, 'fade');
  assert.ok(readMove('pan round and change mode').layout);
});

test('ending by rising where it ends (up a void): straight up, looking up and level again; the path can carry on later', () => {
  const fp = { ...placed(), finish: { via: [], aerial: false, kind: 'rise', rise: 4, pull: 0, secs: 6 } };
  const tl = timeline(fp, flat), end = tl.at(tl.duration), mid = tl.at(tl.duration - 3);
  assert.deepEqual([Math.round(end.eye[0]), Math.round(end.eye[2])], [20, 18], 'it rises where the last shot is');
  assert.ok(Math.abs(end.eye[1] - 5.6) < 1e-6, 'up by 4 m from eye height');
  assert.ok(mid.look[1] > mid.eye[1], 'looking up on the way');
  assert.equal(readFlight({ ...fp, schema: FLIGHT_SCHEMA }).finish.kind, 'rise');
  assert.equal(readFlight({ ...placed(), finish: { via: [], aerial: true } }).finish.kind, 'aerial', 'an older record with aerial reads as aerial');
});

test('modes come in from a shot list and are kept, at most six', () => {
  const fp = importShotList({ ...LIST, modes: ['banquet', 'conference'] }, { frame: 'f' });
  assert.deepEqual(fp.modes, ['banquet', 'conference']);
  assert.deepEqual(readFlight({ ...fp, modes: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] }).modes.length, 6);
});
