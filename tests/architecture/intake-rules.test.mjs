// The intake agent's rules (architecture/js/intake-rules.js): sorting files, numbers, dates, scales, title blocks, the register,
// the checks on a sheet record, and the missing list. All from invented text; no PDF is opened here.
import test from 'node:test';
import assert from 'node:assert/strict';
import { classify, sortFiles, kindWord, isSheetNumber, normNumber, parseDate, findDate, findScale, paperOf, readTitleBlock, registerRows, readRegister, sheetProblem, sheetFrom, sheetNoText, applyModelRead, buildIndex, charsOf, TEXT_MIN } from '../../architecture/js/intake-rules.js';

const enc = (s) => new TextEncoder().encode(s);
const it = (s, x, y, h = 10, w = s.length * h * 0.5) => ({ s, x, y, w, h });

test('files are sorted by kind from their ending and their first bytes', () => {
  const k = (p, n, head) => classify(p, n, head).kind;
  assert.equal(k('a/b/sheet.PDF', 10, enc('%PDF-1.7')), 'pdf');
  assert.equal(k('m.ifc', 10, enc('ISO-10303-21;')), 'model'); assert.equal(k('m.rvt', 10), 'model'); assert.equal(k('m.skp', 10), 'model');
  assert.equal(k('x.dwg', 10), 'cad'); assert.equal(k('p.HEIC', 10), 'image'); assert.equal(k('p.jpg', 10, new Uint8Array([0xff, 0xd8])), 'image');
  assert.equal(k('t.csv', 10), 'table'); assert.equal(k('n.docx', 10), 'document'); assert.equal(k('s.las', 10), 'geodata');
  assert.equal(k('z.zip', 10), 'archive'); assert.equal(k('what.dat', 10), 'other'); assert.equal(k('no-ending', 10), 'other');
  assert.equal(k('s.xml', 100, enc('<?xml version="1.0"?><LandXML version="1.2">')), 'geodata');
  assert.equal(k('s.xml', 100, enc('<?xml version="1.0"?><note/>')), 'other');
});
test('system files are left out, wherever they are', () => {
  for (const p of ['.DS_Store', 'a/Thumbs.db', 'a/b/desktop.ini', '__MACOSX/a/b.pdf', 'dir/~$draft.docx', 'dir/._sheet.pdf']) assert.equal(classify(p, 10, enc('x')).kind, 'ignored', p);
  assert.notEqual(classify('dir/my.pdf', 10, enc('%PDF-')).kind, 'ignored');
});
test('a file that is not what its ending says, or is empty, is listed with a plain problem', () => {
  assert.match(classify('a.pdf', 20, enc('<html>not a pdf</html>')).problem, /does not start the way a PDF does/);
  assert.match(classify('a.pdf', 0).problem, /empty/);
  assert.match(classify('a.ifc', 20, enc('hello')).problem, /IFC/);
  assert.equal(classify('a.pdf', 20, enc('%PDF-1.4')).problem, '');
});
test('the sorted list keeps the kinds in order, leaves empty kinds out, and orders names naturally', () => {
  const files = ['b/10.pdf', 'b/2.pdf', 'a/x.jpg'].map((path) => ({ path, name: path.split('/').pop(), size: 1, kind: path.endsWith('pdf') ? 'pdf' : 'image' }));
  const s = sortFiles(files);
  assert.deepEqual(s.map((g) => g.kind), ['pdf', 'image']); assert.deepEqual(s[0].files.map((f) => f.name), ['2.pdf', '10.pdf']);
  assert.equal(kindWord('pdf'), 'Drawings and PDFs'); assert.equal(kindWord('zzz'), 'Other files');
});

test('sheet numbers: letters then digits, in the common forms; paper sizes and plain words are not numbers', () => {
  for (const n of ['A-101', 'A101', 'a-101', 'S-100', 'AR-0101', 'A1.01', 'A 201', 'SK-01', 'A-101A']) assert.ok(isSheetNumber(n), n);
  for (const n of ['A1', 'A3', 'PLAN', '101', 'Site plan', '1:100', '', null, 'ABCD-101']) assert.ok(!isSheetNumber(n), String(n));
  assert.equal(normNumber('A-101'), normNumber('a101')); assert.equal(normNumber('A1.01'), 'A101');
});
test('dates are read day first and only when they are real dates', () => {
  assert.equal(parseDate('12/08/2026'), '2026-08-12'); assert.equal(parseDate('05.06.26'), '2026-06-05'); assert.equal(parseDate('14 Aug 2026'), '2026-08-14');
  assert.equal(parseDate('3rd March 2026'), '2026-03-03'); assert.equal(parseDate('2026-08-12'), '2026-08-12');
  assert.equal(parseDate('31/02/2026'), null); assert.equal(parseDate('13/13/2026'), null); assert.equal(parseDate('soon'), null);
  assert.equal(findDate('ISSUED 12/08/2026 for consent'), '12/08/2026'); assert.equal(findDate('no date here 1:100'), null);
});
test('scales: every printed scale, NTS counts, and nothing is invented', () => {
  assert.equal(findScale('1:100 @ A1'), '1:100 @ A1'); assert.equal(findScale('1:5, 1:10'), '1:5, 1:10'); assert.equal(findScale('NTS'), 'NTS');
  assert.equal(findScale('Drawn by AB 1 : 50'), '1:50'); assert.equal(findScale('1:100 at A3'), '1:100 @ A3');
  assert.equal(findScale('Site plan'), null);
});
test('paper size comes from the page size in points, either way round', () => {
  assert.equal(paperOf(2384, 1684).size, 'A1'); assert.equal(paperOf(1684, 2384).size, 'A1'); assert.equal(paperOf(595, 842).size, 'A4'); assert.equal(paperOf(1191, 842).size, 'A3');
  assert.equal(paperOf(700, 700).size, null);
});

// a small title block on a 1000 x 700 page, labels above values
const block = (over = {}) => ({ w: 1000, h: 700, items: [
  it('Some drawing text', 100, 200, 12),
  it('DRAWING NO.', 700, 560, 7), it(over.number ?? 'A-101', 700, 590, 20),
  it('TITLE', 700, 620, 7), it(over.title ?? 'Ground floor plan', 700, 645, 14),
  it('SCALE', 880, 560, 7), it(over.scale ?? '1:100 @ A1', 880, 585, 10),
  it('REV', 880, 620, 7), it(over.rev ?? 'C', 880, 640, 10),
  it('DATE', 940, 620, 7), it(over.date ?? '12/08/2026', 940, 640, 10),
] });
test('a title block is read by its labels, and each field says it was read by label', () => {
  const r = readTitleBlock(block());
  assert.equal(r.number, 'A-101'); assert.equal(r.title, 'Ground floor plan'); assert.equal(r.scale, '1:100 @ A1'); assert.equal(r.rev, 'C'); assert.equal(r.date, '12/08/2026'); assert.equal(r.date_iso, '2026-08-12');
  assert.deepEqual(Object.values(r.how), ['label', 'label', 'label', 'label', 'label']); assert.deepEqual(r.unread, []);
});
test('a field that is not printed stays null and is listed as unread; it is not guessed', () => {
  const p = block(); p.items = p.items.filter((i) => !['REV', 'C', 'DATE', '12/08/2026'].includes(i.s));
  const r = readTitleBlock(p);
  assert.equal(r.rev, null); assert.equal(r.date, null); assert.equal(r.date_iso, null); assert.deepEqual(r.unread, ['rev', 'date']);
});
test('a wrapped title is joined; a label with no value beside or under it is skipped', () => {
  const p = block(); p.items.push(it('and sections', 700, 662, 14));
  assert.equal(readTitleBlock(p).title, 'Ground floor plan and sections');
  const q = { w: 1000, h: 700, items: [it('DRAWING NO.', 700, 560, 7)] };
  assert.equal(readTitleBlock(q).number, null);
});
test('without labels, the number and scale are found by their shape, and the title by its size (and it says so)', () => {
  const p = { w: 1000, h: 700, items: [it('A-204', 760, 600, 24), it('Roof plan', 760, 640, 16), it('1:200', 760, 665, 9), it('Details noted', 100, 100, 9)] };
  const r = readTitleBlock(p);
  assert.equal(r.number, 'A-204'); assert.equal(r.how.number, 'pattern'); assert.equal(r.scale, '1:200'); assert.equal(r.how.scale, 'pattern'); assert.equal(r.title, 'Roof plan'); assert.equal(r.how.title, 'size');
});
test('a sheet number mentioned in a note away from the title block is not taken for the sheet number', () => {
  const p = { w: 1000, h: 700, items: [it('Refer to A-301 for the stair', 100, 100, 12), it('DRAWING NO.', 700, 560, 7), it('A-102', 700, 590, 20)] };
  assert.equal(readTitleBlock(p).number, 'A-102');
});
test('a page with no text reads nothing and says every field is unread', () => {
  const r = readTitleBlock({ w: 1000, h: 700, items: [] });
  assert.equal(r.number, null); assert.equal(r.unread.length, 5); assert.equal(charsOf([]), 0); assert.ok(TEXT_MIN > 0);
});

const regPage = (rows, head = 'DRAWING REGISTER') => ({ file: 'a.pdf', page: 1, w: 1000, h: 700, items: [it(head, 50, 40, 16), ...rows.flatMap((r, i) => [it(r[0], 50, 100 + i * 20), it(r[1], 130, 100 + i * 20), ...(r[2] ? [it(r[2], 500, 100 + i * 20)] : []), ...(r[3] ? [it(r[3], 560, 100 + i * 20)] : [])])] });
test('register rows: a line that starts with a sheet number, with its title, revision and date', () => {
  const rows = registerRows(regPage([['A-101', 'Site plan', 'C', '12/08/2026'], ['A-102', 'Ground floor plan', 'B']]));
  assert.deepEqual(rows.map((r) => [r.number, r.title, r.rev, r.date]), [['A-101', 'Site plan', 'C', '12/08/2026'], ['A-102', 'Ground floor plan', 'B', null]]);
});
test('a register page needs a heading and two rows, or five rows; a sheet that only mentions numbers is not a register', () => {
  const two = regPage([['A-101', 'Site plan'], ['A-102', 'Plan']]);
  assert.equal(readRegister([two]).found, true);
  const noHead = regPage([['A-101', 'Site plan'], ['A-102', 'Plan']], 'NOTES');
  assert.equal(readRegister([noHead]).found, false);
  const five = regPage(['A-101', 'A-102', 'A-103', 'A-104', 'A-105'].map((n) => [n, `Sheet ${n}`]), 'NOTES');
  assert.equal(readRegister([five]).found, true);
  assert.equal(readRegister([]).found, false);
});
test('the first row for a number wins and carries where it was read', () => {
  const a = regPage([['A-101', 'Site plan'], ['A-102', 'Plan']]), b = { ...regPage([['A-101', 'Different'], ['A-103', 'Third']]), file: 'b.pdf', page: 4 };
  const r = readRegister([a, b]);
  assert.equal(r.rows.find((x) => x.number === 'A-101').title, 'Site plan'); assert.deepEqual(r.rows.map((x) => x.number), ['A-101', 'A-102', 'A-103']); assert.equal(r.rows[2].file, 'b.pdf'); assert.equal(r.from.length, 2);
});

const good = () => sheetFrom('x.pdf', 3, readTitleBlock(block()), { size: 'A1', w_mm: 594, h_mm: 841 });
test('a sheet record is checked, and a bad one is refused', () => {
  assert.equal(sheetProblem(good()), '');
  assert.match(sheetProblem({ ...good(), page: 0 }), /page/); assert.match(sheetProblem({ ...good(), file: '' }), /file/); assert.match(sheetProblem({ ...good(), from: 'guess' }), /from/);
  assert.match(sheetProblem({ ...good(), title: 5 }), /title/); assert.match(sheetProblem({ ...good(), status: 'ok' }), /status/); assert.match(sheetProblem({ ...good(), number: 'X'.repeat(30) }), /too long/);
  assert.match(sheetProblem({ ...good(), date_iso: '12/08/2026' }), /date_iso/); assert.match(sheetProblem(null), /not a record/); assert.match(sheetProblem({ ...good(), unread: 'rev' }), /unread/);
});
test('a model read is checked, marked as the model\'s, and an invalid reply is thrown away', () => {
  const s = sheetNoText('x.pdf', 6, { size: 'A1', w_mm: 594, h_mm: 841 });
  assert.equal(s.status, 'unread'); assert.equal(s.no_text, true);
  const ok = applyModelRead(s, { is_drawing_sheet: true, number: 'a-301', title: 'Sections', scale: '1:50', rev: null, date: '12/08/2026', register: [], confidence: 0.8, notes: '' }, 'openai gpt-x');
  assert.equal(ok.sheet.number, 'A-301'); assert.equal(ok.sheet.from, 'model'); assert.equal(ok.sheet.how.number, 'model'); assert.equal(ok.sheet.status, 'read'); assert.deepEqual(ok.sheet.unread, ['rev']); assert.equal(ok.sheet.date_iso, '2026-08-12');
  assert.match(ok.sheet.note, /Check it/);
  assert.equal(s.number, null, 'the input record is not changed');
  assert.throws(() => applyModelRead(s, { number: 'A-1' }), /not a sheet read/); assert.throws(() => applyModelRead(s, null), /not a sheet read/);
  assert.throws(() => applyModelRead(s, { is_drawing_sheet: true, number: 5, title: null, scale: null, rev: null, date: null }), /number/);
  assert.throws(() => applyModelRead(s, { is_drawing_sheet: true, number: 'A'.repeat(40), title: null, scale: null, rev: null, date: null }), /too long/);
  const no = applyModelRead(s, { is_drawing_sheet: false, number: 'A-9', title: null, scale: null, rev: null, date: null, register: [] });
  assert.equal(no.sheet.number, null, 'a photo is not given a number'); assert.match(no.sheet.note, /not a drawing sheet/);
});
test('a model read never overwrites a field that was read from the sheet\'s own text', () => {
  const s = { ...good(), no_text: false };
  const r = applyModelRead(s, { is_drawing_sheet: true, number: 'Z-999', title: 'Other', scale: null, rev: null, date: null, register: [] }, 'm');
  assert.equal(r.sheet.number, 'A-101'); assert.equal(r.sheet.title, 'Ground floor plan'); assert.equal(r.sheet.how.number, 'label');
});
test('register rows from a model are kept only when they are sheet numbers', () => {
  const s = sheetNoText('x.pdf', 1, null);
  const r = applyModelRead(s, { is_drawing_sheet: true, number: 'A-000', title: 'Cover', scale: null, rev: null, date: null, register: [{ number: 'A-101', title: 'Site plan', rev: 'B' }, { number: 'hello', title: 'x', rev: null }] }, 'm');
  assert.deepEqual(r.register.map((x) => x.number), ['A-101']); assert.equal(r.register[0].how, 'model');
});

test('the missing list: register entries with no sheet of that number, and sheets the register does not list', () => {
  const sheets = ['A-101', 'a102', 'A-501'].map((n, i) => ({ ...good(), id: `f#${i}`, number: n, page: i + 1 }));
  const reg = { found: true, rows: [{ number: 'A-101', title: 'x', file: 'f', page: 1 }, { number: 'A-102', title: 'y', file: 'f', page: 1 }, { number: 'S-100', title: 'Topographic survey', rev: 'A', file: 'f', page: 1 }] };
  const idx = buildIndex(sheets, reg);
  assert.deepEqual(idx.missing.map((m) => m.number), ['S-100']); assert.equal(idx.missing[0].rev, 'A'); assert.match(idx.missing[0].from, /f, page 1/);
  assert.deepEqual(idx.unlisted, ['f#2']); assert.equal(idx.unreadable, 0); assert.equal(idx.found, true);
});
test('sheets whose number could not be read are counted beside the missing list, never silently dropped', () => {
  const sheets = [{ ...good(), id: 'f#1', number: 'A-101' }, { ...sheetNoText('f', 2, null) }];
  const idx = buildIndex(sheets, { found: true, rows: [{ number: 'A-101', title: 'a', file: 'f', page: 1 }, { number: 'A-102', title: 'b', file: 'f', page: 1 }] });
  assert.deepEqual(idx.missing.map((m) => m.number), ['A-102']); assert.equal(idx.unreadable, 1);
});
test('with no register there is nothing to be missing, and nothing is called unlisted', () => {
  const idx = buildIndex([{ ...good(), id: 'a#1' }], { found: false, rows: [] });
  assert.deepEqual(idx.missing, []); assert.deepEqual(idx.unlisted, []); assert.equal(idx.found, false);
});
test('a number that appears twice is marked as a duplicate on both sheets', () => {
  const a = { ...good(), id: 'a#1', file: 'a' }, b = { ...good(), id: 'b#1', file: 'b' };
  assert.deepEqual(buildIndex([a, b], null).sheets.map((s) => s.dup), [true, true]);
});
