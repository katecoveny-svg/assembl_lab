import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  SOURCES, READ_ON, CONSENT_SOURCED, CONSENT_STARTER, COMPLETION_STARTER, NZIA_TASKS, STAGES, STAGE_KEYS, AUCKLAND,
  sourceRef, sourceLabel, isEdited, stageTasks, missingSourced, consentRow, taskRow, newProject, sampleProject, readBundle, writeBundle, copyBundle,
} from '../../architecture/js/model.js';
import { createStore, memoryBackend, memoryFiles } from '../../architecture/js/store.js';

const T0 = '2026-11-22T00:00:00.000Z';
const OFFICIAL = /^https:\/\/www\.(legislation\.govt\.nz|building\.govt\.nz|aucklandcouncil\.govt\.nz|nzia\.co\.nz)\//;
const root = new URL('../../', import.meta.url);

test('every source is an official page, with its address, what it said about its own date, and the date it was read', () => {
  assert.match(READ_ON, /^\d{4}-\d{2}-\d{2}$/);
  for (const [key, s] of Object.entries(SOURCES)) {
    assert.match(s.url, OFFICIAL, `${key} is on an official site`);
    assert.ok(s.name && s.publisher && s.version, `${key} names its document, publisher and version`);
    assert.equal(s.read, READ_ON, `${key} carries the date it was read`);
  }
  assert.equal(SOURCES.ac1011.council, AUCKLAND);
  assert.deepEqual(Object.keys(SOURCES).filter((k) => SOURCES[k].council), ['ac1011'], 'only the council checklist is council-specific');
});

test('every consent item carries its source: document, clause, address and date read', () => {
  assert.ok(CONSENT_SOURCED.length >= 30);
  const ids = new Set();
  for (const c of CONSENT_SOURCED) {
    const s = c.source_ref;
    assert.ok(c.title.length > 3 && s, c.title);
    assert.ok(SOURCES[s.key], `${c.title}: known source`);
    assert.equal(s.name, SOURCES[s.key].name); assert.equal(s.url, SOURCES[s.key].url); assert.equal(s.read, READ_ON);
    assert.ok(s.clause, `${c.title}: has a clause or section`);
    assert.equal(s.title, c.title, 'the row remembers the wording it started with');
    assert.equal(ids.has(s.id), false, `${s.id} is used once`); ids.add(s.id);
  }
  assert.deepEqual(CONSENT_STARTER, CONSENT_SOURCED.map((c) => c.title), 'the old name still lists the titles');
});

test('items that differ by council are marked Auckland Council, and only those', () => {
  const akl = CONSENT_SOURCED.filter((c) => c.source_ref.council === AUCKLAND), rest = CONSENT_SOURCED.filter((c) => !c.source_ref.council);
  assert.ok(akl.length > 0 && rest.length > 0);
  assert.ok(akl.every((c) => c.source_ref.key === 'ac1011' && c.source_ref.url.includes('aucklandcouncil.govt.nz')));
  assert.ok(rest.every((c) => ['ba45', 'form2', 'mbie_apply', 'mbie_support'].includes(c.source_ref.key)));
  assert.ok(rest.filter((c) => c.source_ref.key === 'ba45').every((c) => /^section 45\(/.test(c.source_ref.clause)), 'Building Act items name the subsection');
});

test('stage tasks: the ones from the Institute’s page carry that source, the rest say they are a starter', () => {
  let sourced = 0, starter = 0;
  for (const key of STAGE_KEYS) {
    const def = STAGES.find((s) => s.key === key), tasks = stageTasks(key);
    assert.deepEqual(tasks.map((t) => t.title), def.starter, `${key}: the same tasks, in order`);
    assert.ok(NZIA_TASKS[key].length > 0 && NZIA_TASKS[key].every((t) => def.starter.includes(t)), `${key}: every sourced task is in the stage’s list`);
    for (const t of tasks) {
      if (NZIA_TASKS[key].includes(t.title)) {
        sourced++;
        assert.equal(t.origin, 'source'); assert.equal(t.source_ref.key, 'nzia'); assert.match(t.source_ref.url, /^https:\/\/www\.nzia\.co\.nz\//);
        assert.match(t.source_ref.clause, new RegExp(`^${STAGE_KEYS.indexOf(key) + 1}\\. `), 'the clause is that stage’s heading on the page');
      } else { starter++; assert.equal(t.origin, 'starter'); assert.equal('source_ref' in t, false); }
    }
  }
  assert.equal(sourced, 31); assert.equal(starter, 14);
});

test('a new project starts with the sourced lists on its rows, and the completion list marked as a starter', () => {
  const b = newProject({ name: 'House A', now: T0 });
  const consent = b.checklist.filter((c) => c.list === 'consent'), completion = b.checklist.filter((c) => c.list === 'completion');
  assert.equal(consent.length, CONSENT_SOURCED.length);
  assert.ok(consent.every((c) => c.source_ref?.url && c.origin === 'source' && c.status === 'needed' && c.project_id === b.project.id));
  assert.deepEqual(completion.map((c) => c.title), COMPLETION_STARTER);
  assert.ok(completion.every((c) => c.origin === 'starter' && !c.source_ref), 'no source was read for the completion list, and it says so');
  assert.equal(b.tasks.filter((t) => t.source_ref).length, 31); assert.equal(b.tasks.filter((t) => t.origin === 'starter').length, 14);
  // rows do not share one source object: editing one leaves the others alone
  consent[0].source_ref.read = 'changed'; assert.equal(consent[1].source_ref.read, READ_ON); assert.equal(CONSENT_SOURCED[0].source_ref.read, READ_ON);
  assert.equal(sampleProject(T0).checklist.filter((c) => c.source_ref).length, CONSENT_SOURCED.length);
});

test('an edited sourced item is marked as edited and keeps its source; an unedited one is not', () => {
  const row = consentRow('p1', CONSENT_SOURCED[0]);
  assert.equal(isEdited(row), false);
  row.title = `  ${row.title} `; assert.equal(isEdited(row), false, 'spaces at the ends are not an edit');
  row.title = 'Form 2, signed by the owner'; assert.equal(isEdited(row), true);
  assert.equal(row.source_ref.title, CONSENT_SOURCED[0].title, 'the wording it started with is still on the row');
  assert.equal(isEdited({ title: 'Our own item' }), false, 'an item with no source is not “edited”');
  assert.equal(sourceLabel(row.source_ref), 'Building Act 2004, section 45(1)(a)');
  assert.equal(sourceLabel(null), '');
  assert.throws(() => sourceRef('blog', 'x', 'y', 'z'), /Unknown source/);
});

test('a project made before the lists had sources can add them without changing what is there', () => {
  const b = newProject({ name: 'Old project', now: T0 });
  b.checklist = b.checklist.filter((c) => c.list !== 'consent'); b.tasks = [];
  b.checklist.push({ id: 'c_old', project_id: b.project.id, stage: 'detailed', list: 'consent', title: 'Drawings', status: 'gathered', document_id: '', note: '' });
  assert.equal(missingSourced(b, 'consent').length, CONSENT_SOURCED.length);
  assert.equal(missingSourced(b, 'tasks', 'predesign').length, NZIA_TASKS.predesign.length);
  for (const c of missingSourced(b, 'consent')) b.checklist.push(consentRow(b.project.id, c));
  for (const t of missingSourced(b, 'tasks', 'predesign')) b.tasks.push(taskRow(b.project.id, 'predesign', t));
  assert.equal(missingSourced(b, 'consent').length, 0); assert.equal(missingSourced(b, 'tasks', 'predesign').length, 0);
  assert.equal(b.checklist.find((c) => c.id === 'c_old').status, 'gathered', 'the old item is as it was');
  // an edited item still counts as present: it is not added a second time
  b.checklist.find((c) => c.source_ref).title = 'Reworded'; assert.equal(missingSourced(b, 'consent').length, 0);
});

test('sources survive saving, export, import and copying', async () => {
  const s = createStore(memoryBackend(), { files: memoryFiles() }), b = newProject({ name: 'House A', now: T0 });
  await s.saveProject(b);
  const back = await s.loadProject(b.project.id);
  assert.deepEqual(back.checklist.find((c) => c.source_ref?.id === 'ba45.1a').source_ref, CONSENT_SOURCED[0].source_ref);
  const again = readBundle(JSON.stringify(writeBundle(back, T0))), copy = copyBundle(again, T0);
  assert.equal(again.tasks.filter((t) => t.source_ref).length, 31);
  assert.equal(copy.checklist.filter((c) => c.source_ref?.council === AUCKLAND).length, CONSENT_SOURCED.filter((c) => c.source_ref.council).length);
});

test('the wording never claims a rule is met or a list is complete, and names no blog or supplier', () => {
  const words = [...CONSENT_SOURCED.map((c) => c.title), ...STAGES.flatMap((s) => s.starter), ...COMPLETION_STARTER].join('\n');
  assert.doesNotMatch(words, /\b(complies|compliant|approved by|signed off|complete list|guaranteed)\b/i);
  const page = readFileSync(new URL('architecture/js/app.js', root), 'utf8') + readFileSync(new URL('architecture/index.html', root), 'utf8');
  assert.match(page, /Check your council’s current checklist\./);
  assert.match(page, /Other councils differ/);
  assert.match(page, /assembl starter, not sourced/);
  assert.doesNotMatch(page, /this list is complete|the list is complete|design complies|is compliant/i);
});
