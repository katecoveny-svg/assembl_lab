// The intake agent's rules, with no page in them, so they can be tested on their own.
// It sorts dropped files by kind, reads a drawing set's own text (title blocks and the drawing register) and builds the sheet
// index and the missing list. It reads text first and only text: nothing here calls a model. A sheet whose text cannot be read is
// marked so (status "unread"), and a person decides whether a model reads it (intake.js, a paid step).
//
// A page arrives as { page, w, h, items }: w and h in PDF points, items = [{ s, x, y, w, h }] where x is the left edge, y the
// baseline measured from the top of the page, and h the type size (what intake-pdf.js makes from pdf.js text).
// Every field read carries how it was read ("label", "pattern", "size", "model") so the page can say it. Nothing is made up: what
// is not printed is null, and the sheet says which fields it could not read.

// ---- files: what each one is -----------------------------------------------------------------------------------------------
const MAP = {
  pdf: 'pdf',
  ifc: 'model', ifczip: 'model', rvt: 'model', rfa: 'model', nwc: 'model', nwd: 'model', glb: 'model', gltf: 'model', obj: 'model', skp: 'model', '3dm': 'model', fbx: 'model', dae: 'model', stl: 'model',
  dwg: 'cad', dxf: 'cad', dgn: 'cad',
  jpg: 'image', jpeg: 'image', png: 'image', webp: 'image', heic: 'image', heif: 'image', tif: 'image', tiff: 'image', gif: 'image',
  csv: 'table', tsv: 'table', xlsx: 'table', xls: 'table', ods: 'table',
  doc: 'document', docx: 'document', txt: 'document', md: 'document', rtf: 'document', odt: 'document', pages: 'document', eml: 'document', msg: 'document',
  landxml: 'geodata', las: 'geodata', laz: 'geodata', xyz: 'geodata', shp: 'geodata', kml: 'geodata', kmz: 'geodata', geojson: 'geodata', gpx: 'geodata', e57: 'geodata',
  zip: 'archive', '7z': 'archive', rar: 'archive',
  mp4: 'video', mov: 'video', m4v: 'video',
};
/** the kinds, in the order the list shows them. word: plural, in plain words. */
export const KINDS = [
  { id: 'pdf', word: 'Drawings and PDFs' }, { id: 'model', word: 'Models' }, { id: 'cad', word: 'CAD drawings' }, { id: 'image', word: 'Pictures' },
  { id: 'geodata', word: 'Survey data' }, { id: 'table', word: 'Tables' }, { id: 'document', word: 'Notes and documents' }, { id: 'archive', word: 'Zip files, not opened' },
  { id: 'video', word: 'Video' }, { id: 'other', word: 'Other files' }, { id: 'ignored', word: 'Left out (system files)' },
];
export const kindWord = (id) => KINDS.find((k) => k.id === id)?.word ?? 'Other files';
export const ext = (name) => (String(name ?? '').toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? '');
const ascii = (b, n = 64) => String.fromCharCode(...b.subarray(0, Math.min(n, b.length)));
const SYSTEM_FILE = /(^|\/)(\.ds_store|thumbs\.db|desktop\.ini|\.localized|~\$[^/]*|\._[^/]*)$|(^|\/)__macosx(\/|$)/i;

/**
 * What a dropped file is. head: its first bytes (Uint8Array). Returns { kind, ext, problem }.
 * problem is a plain sentence when the file is not what its ending says, or is empty. The file is still listed; a PDF with a
 * problem is not read.
 */
export function classify(path, size, head = new Uint8Array(0)) {
  const name = String(path ?? '').split('/').pop(), e = ext(name);
  if (SYSTEM_FILE.test(String(path ?? ''))) return { kind: 'ignored', ext: e, problem: '' };
  if (!size) return { kind: MAP[e] ?? 'other', ext: e, problem: 'It is empty.' };
  let kind = MAP[e] ?? 'other';
  if (e === 'xml') kind = /<LandXML/i.test(ascii(head, 400)) ? 'geodata' : 'other';
  let problem = '';
  if (e === 'pdf' && !ascii(head, 1024).includes('%PDF-')) problem = 'It does not start the way a PDF does, so it was not read.';
  if ((e === 'jpg' || e === 'jpeg') && !(head[0] === 0xff && head[1] === 0xd8)) problem = 'It does not start the way a JPEG does.';
  if (e === 'png' && !(head[0] === 0x89 && head[1] === 0x50)) problem = 'It does not start the way a PNG does.';
  if (e === 'ifc' && !/ISO-10303-21/.test(ascii(head, 80))) problem = 'It does not start the way an IFC file does.';
  return { kind, ext: e, problem };
}

/** the dropped files sorted: [{ kind, word, files: [...] }] in the list's order, empty kinds left out. Each file { path, name, size, kind, problem }. */
export function sortFiles(files) {
  return KINDS.map((k) => ({ kind: k.id, word: k.word, files: files.filter((f) => f.kind === k.id).sort((a, b) => a.path.localeCompare(b.path, 'en', { numeric: true })) })).filter((g) => g.files.length);
}

// ---- numbers, dates, scales ---------------------------------------------------------------------------------------------------
// A sheet number: one to three letters, then two to four digits (A-101, A101, S-100, AR-0101) or digits with a point (A1.01).
// "A1" to "A4" are paper sizes, so a letter and one digit is not a sheet number.
const NUMBER = /^[A-Z]{1,3}[-_. ]?(?:\d{2,4}|\d{1,2}\.\d{1,2})[A-Z]?$/;
export const isSheetNumber = (s) => NUMBER.test(String(s ?? '').trim().toUpperCase());
/** one form of a number for comparing: upper case, no dash, point, underscore or space (A-101, A101 and a-101 are one sheet) */
export const normNumber = (s) => String(s ?? '').toUpperCase().replace(/[-_. ]/g, '');

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const real = (y, m, d) => { const t = new Date(Date.UTC(y, m - 1, d)); return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d; };
const iso = (y, m, d) => (real(y, m, d) ? `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` : null);
const year = (y) => (y < 100 ? 2000 + y : y);
/** a printed date as YYYY-MM-DD, day first (New Zealand), or null. 05/06/26 is the 5th of June 2026. */
export function parseDate(s) {
  const t = String(s ?? '').trim();
  let m = t.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2}|\d{4})$/);
  if (m) return iso(year(+m[3]), +m[2], +m[1]);
  m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return iso(+m[1], +m[2], +m[3]);
  m = t.match(/^(\d{1,2})(?:st|nd|rd|th)?[ .\-]([A-Za-z]{3,9})[ .\-,]*(\d{2}|\d{4})$/);
  if (m) { const mo = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase()); return mo >= 0 ? iso(year(+m[3]), mo + 1, +m[1]) : null; }
  return null;
}
const DATE_ANY = /\b(\d{1,2}[/.\-]\d{1,2}[/.\-](?:\d{4}|\d{2})|\d{4}-\d{2}-\d{2}|\d{1,2}(?:st|nd|rd|th)?[ .\-][A-Za-z]{3,9}[ .\-,]*(?:\d{4}|\d{2}))\b/;
/** the first printed date in a string, or null */
export const findDate = (s) => { const m = String(s ?? '').match(DATE_ANY); return m && parseDate(m[1]) ? m[1] : null; };
const SCALE_ANY = /\b1\s*:\s*\d{1,4}(?:\s*(?:@|at)\s*A[0-4])?/gi;
/** every scale printed in a string ("1:100 @ A1", "1:20"), joined, or null; NTS ("not to scale") counts */
export function findScale(s) {
  const t = String(s ?? ''), found = [...t.matchAll(SCALE_ANY)].map((m) => m[0].replace(/\s*:\s*/, ':').replace(/\s*(?:@|at)\s*/i, ' @ ').trim());
  if (/\b(NTS|N\.T\.S\.?|NOT TO SCALE|AS SHOWN)\b/i.test(t)) found.push(/\bAS SHOWN\b/i.test(t) ? 'As shown' : 'NTS');
  return found.length ? [...new Set(found)].join(', ') : null;
}

const PAPER = [['A0', 841, 1189], ['A1', 594, 841], ['A2', 420, 594], ['A3', 297, 420], ['A4', 210, 297]];
/** a page's paper size from its size in points: { size: 'A1' | null, w_mm, h_mm } (either way round, within 3 percent) */
export function paperOf(w, h) {
  const mm = [w, h].map((v) => Math.round(v * 25.4 / 72)), [lo, hi] = [Math.min(...mm), Math.max(...mm)];
  const hit = PAPER.find(([, a, b]) => Math.abs(lo - a) <= a * 0.03 && Math.abs(hi - b) <= b * 0.03);
  return { size: hit ? hit[0] : null, w_mm: mm[0], h_mm: mm[1] };
}

// ---- reading a page's text -------------------------------------------------------------------------------------------------------
/** cells: text items on one baseline that sit next to each other are one cell ("DRAWING" "NO." -> "DRAWING NO.") */
export function cellsOf(items) {
  const list = [...items].filter((i) => String(i.s ?? '').trim()).sort((a, b) => a.y - b.y || a.x - b.x), out = [];
  for (const it of list) {
    const last = out[out.length - 1], tol = Math.max(it.h, 1) * 0.5;
    if (last && Math.abs(last.y - it.y) <= tol && it.x - last.x2 <= Math.max(it.h, last.h) * 0.9 && it.x >= last.x - 1) {
      last.s = `${last.s}${it.x - last.x2 > it.h * 0.15 ? ' ' : ''}${it.s.trim()}`; last.x2 = it.x + it.w; last.h = Math.max(last.h, it.h); continue;
    }
    out.push({ s: it.s.trim(), x: it.x, x2: it.x + it.w, y: it.y, h: it.h });
  }
  return out;
}
/** the number of characters of real text on a page: under TEXT_MIN, the sheet has no text of its own (a scan or a picture) */
export const TEXT_MIN = 25;
export const charsOf = (items) => items.reduce((n, i) => n + String(i.s ?? '').replace(/\s+/g, '').length, 0);

const LABELS = {
  number: /^(?:DRAWING|DWG|SHEET)\s*(?:NO|NUMBER|NUM|#)\.?$|^DRAWING\s*REF(?:ERENCE)?\.?$/i,
  title: /^(?:DRAWING\s+|SHEET\s+|DWG\s+)?TITLE$/i,
  scale: /^SCALES?(?:\s*@\s*A\d)?$/i,
  rev: /^REV(?:ISION)?\.?$/i,
  date: /^(?:ISSUE\s+)?DATE(?:\s+ISSUED)?$|^ISSUED$/i,
};
const clean = (s) => String(s ?? '').trim().replace(/[:：]\s*$/, '').trim();
const isLabel = (s) => Object.values(LABELS).some((re) => re.test(clean(s))) || /^(PROJECT|CLIENT|DRAWN|CHECKED|STATUS|JOB|PROJECT NO\.?|DRAWN BY|CHECKED BY|APPROVED|ADDRESS|SITE|NORTH)$/i.test(clean(s));

/** the value that goes with a label cell: to its right on the same line, else just under it. Returns the cell or null. */
function valueFor(label, cells, pageW = 0) {
  const rowTol = Math.max(label.h, 1) * 0.6, right = cells.filter((c) => c !== label && Math.abs(c.y - label.y) <= rowTol && c.x >= label.x2 - 1 && !isLabel(c.s)).sort((a, b) => a.x - b.x)[0];
  if (right && right.x - label.x2 < Math.max(label.h * 12, pageW * 0.08)) return right;
  const under = cells.filter((c) => c !== label && c.y > label.y + rowTol * 0.5 && c.y - label.y <= Math.max(label.h, c.h) * 3.6 && c.x < label.x2 + label.h && c.x2 > label.x - label.h && !isLabel(c.s)).sort((a, b) => a.y - b.y || a.x - b.x)[0];
  return under ?? null;
}
/** a wrapped title: the cells straight under its first line, in line with it, close together, that are not labels or other fields */
function wrapTitle(first, cells) {
  let text = first.s, last = first;
  for (;;) {
    const next = cells.filter((c) => c.y > last.y && c.y - last.y <= Math.max(last.h, c.h) * 1.7 && Math.abs(c.x - first.x) <= first.h * 0.6 && !isLabel(c.s) && !findDate(c.s) && !findScale(c.s) && !isSheetNumber(c.s)).sort((a, b) => a.y - b.y)[0];
    if (!next || next.h < first.h * 0.75) return text;
    text = `${text} ${next.s}`; last = next;
  }
}

/**
 * The title block of one page, from its own text. Returns { number, title, scale, rev, date, date_iso, how: {field: 'label' | 'pattern' | 'size'}, unread: [field names not found] }.
 * Each field is the text as printed, or null. A label ("DRAWING NO.", "SCALE") is trusted most; a pattern (a sheet number or a scale
 * somewhere in the title block) next; the title may be taken as the largest text in the block ("size") when there is no label.
 */
export function readTitleBlock(page) {
  const { w, h, items } = page, cells = cellsOf(items), out = { number: null, title: null, scale: null, rev: null, date: null, date_iso: null, how: {}, unread: [] };
  if (!cells.length) { out.unread = ['number', 'title', 'scale', 'rev', 'date']; return out; }
  // the title block is at the bottom right or down the right edge; labels are looked for there first, then anywhere
  const inBlock = (c) => (c.x >= w * 0.55 && c.y >= h * 0.55) || c.x >= w * 0.82;
  const block = cells.filter(inBlock), pools = [block, cells];
  for (const field of ['number', 'title', 'scale', 'rev', 'date']) {
    for (const pool of pools) {
      const lab = pool.find((c) => LABELS[field].test(clean(c.s)));
      if (!lab) continue;
      const v = valueFor(lab, cells, w);
      if (!v) continue;
      let text = clean(v.s);
      if (field === 'title') text = clean(wrapTitle(v, cells));
      if (field === 'scale') text = findScale(v.s) ?? text;
      if (field === 'date') { if (!findDate(v.s)) continue; text = findDate(v.s); }
      if (field === 'number' && !/\d/.test(text)) continue;
      if (field === 'rev' && text.length > 6) continue;
      if (text) { out[field] = text; out.how[field] = 'label'; break; }
    }
  }
  const pool = block.length ? block : cells;
  if (!out.number) { // the biggest sheet-number-shaped cell in the block
    const c = pool.filter((x) => isSheetNumber(x.s)).sort((a, b) => b.h - a.h)[0];
    if (c) { out.number = clean(c.s).toUpperCase(); out.how.number = 'pattern'; }
  }
  if (!out.scale) { const sc = findScale(pool.map((c) => c.s).join(' | ')); if (sc) { out.scale = sc; out.how.scale = 'pattern'; } }
  if (!out.date) { const d = findDate(pool.map((c) => c.s).join(' | ')); if (d) { out.date = d; out.how.date = 'pattern'; } }
  if (!out.title) { // the largest text in the block that is not a label, a number, a date or a scale
    const c = pool.filter((x) => /[A-Za-z]{3,}/.test(x.s) && !isLabel(x.s) && !findDate(x.s) && !findScale(x.s) && !isSheetNumber(x.s)).sort((a, b) => b.h - a.h || a.y - b.y)[0];
    if (c) { out.title = clean(wrapTitle(c, cells)); out.how.title = 'size'; }
  }
  out.date_iso = out.date ? parseDate(out.date) : null;
  out.unread = ['number', 'title', 'scale', 'rev', 'date'].filter((f) => !out[f]);
  return out;
}

// ---- the drawing register ---------------------------------------------------------------------------------------------------------
const REG_HEAD = /(?:drawing|sheet|plan)\s*(?:register|list|schedule|index)|register of drawings|list of drawings|drawing issue/i;
const REV = /^(?:P\d{1,2}|[A-Z]|\d{1,2})$/;
const SCALE_CELL = /^(?:1\s*:\s*\d{1,4}(?:\s*@\s*A\d)?(?:\s*,\s*1\s*:\s*\d{1,4})*|NTS|N\.T\.S\.?|AS SHOWN)$/i;
/** rows of a register on one page: a row is a line whose left-most cell is a sheet number. [{ number, title, rev, date, scale }] */
export function registerRows(page) {
  const cells = cellsOf(page.items), rows = [];
  const lines = [];
  for (const c of [...cells].sort((a, b) => a.y - b.y || a.x - b.x)) {
    const l = lines[lines.length - 1];
    if (l && Math.abs(l.y - c.y) <= Math.max(c.h, l.h) * 0.6) l.cells.push(c); else lines.push({ y: c.y, h: c.h, cells: [c] });
  }
  for (const l of lines) {
    const cs = l.cells.sort((a, b) => a.x - b.x);
    if (cs.length < 2 || !isSheetNumber(cs[0].s)) continue;
    const rest = cs.slice(1), date = rest.find((c) => findDate(c.s)), scale = rest.find((c) => SCALE_CELL.test(c.s)), rev = [...rest].reverse().find((c) => REV.test(c.s) && c !== date && c !== scale);
    const title = rest.filter((c) => c !== date && c !== scale && c !== rev).map((c) => c.s).join(' ').trim();
    if (!title) continue;
    rows.push({ number: clean(cs[0].s).toUpperCase(), title, rev: rev?.s ?? null, date: date ? findDate(date.s) : null, scale: scale?.s ?? null });
  }
  return rows;
}
/**
 * The drawing register from a set of pages [{ file, page, w, h, items }]. A page counts as a register when it says so in a
 * heading and has two rows or more, or has five rows or more with a sheet number first on each. Returns
 * { found, rows: [{ number, title, rev, date, scale, file, page }], from: [{ file, page }] }. The first row for a number wins.
 */
export function readRegister(pages) {
  const rows = [], from = [], seen = new Set();
  for (const p of pages) {
    const r = registerRows(p), text = p.items.map((i) => i.s).join(' ');
    if (!((REG_HEAD.test(text) && r.length >= 2) || r.length >= 5)) continue;
    from.push({ file: p.file, page: p.page });
    for (const row of r) { const k = normNumber(row.number); if (!seen.has(k)) { seen.add(k); rows.push({ ...row, file: p.file, page: p.page }); } }
  }
  return { found: rows.length > 0, rows, from };
}

// ---- a sheet record, and the checks on it -----------------------------------------------------------------------------------------------
export const FROM = ['text', 'model', 'none'];
const str = (v) => v === null || typeof v === 'string';
/** '' when the record is a sheet record as the page keeps it, otherwise what is wrong. Records that fail are not kept. */
export function sheetProblem(r) {
  if (!r || typeof r !== 'object') return 'not a record';
  if (typeof r.file !== 'string' || !r.file) return 'file: missing';
  if (!Number.isInteger(r.page) || r.page < 1) return 'page: not a page number';
  for (const f of ['number', 'title', 'scale', 'rev', 'date', 'date_iso']) if (!str(r[f] ?? null)) return `${f}: not text`;
  if (r.date_iso != null && !/^\d{4}-\d{2}-\d{2}$/.test(r.date_iso)) return 'date_iso: not a date';
  if (!FROM.includes(r.from)) return 'from: not one of text, model, none';
  if (!['read', 'partly', 'unread'].includes(r.status)) return 'status: not one of read, partly, unread';
  if (r.number && r.number.length > 24) return 'number: too long to be a sheet number';
  if (r.title && r.title.length > 160) return 'title: too long';
  if (!Array.isArray(r.unread)) return 'unread: not a list';
  if (r.file_sha != null && !/^[0-9a-f]{64}$/.test(r.file_sha)) return 'file_sha: not a fingerprint';
  return '';
}

/** one sheet record from a page's text read. file: the file's path as dropped. */
export function sheetFrom(file, page, tb, paper) {
  const read = ['number', 'title', 'scale', 'rev', 'date'].filter((f) => tb[f]).length;
  return {
    id: `${file}#${page}`, file, page, number: tb.number, title: tb.title, scale: tb.scale, rev: tb.rev, date: tb.date, date_iso: tb.date_iso ?? null,
    from: read ? 'text' : 'none', how: tb.how, paper: paper?.size ?? null, w_mm: paper?.w_mm ?? null, h_mm: paper?.h_mm ?? null,
    status: tb.number && tb.title ? 'read' : read ? 'partly' : 'unread', unread: tb.unread, no_text: false, note: '',
  };
}
/** a sheet with no text of its own: nothing could be read from it, and a model may be asked (with a person's say) */
export function sheetNoText(file, page, paper) {
  return { id: `${file}#${page}`, file, page, number: null, title: null, scale: null, rev: null, date: null, date_iso: null, from: 'none', how: {}, paper: paper?.size ?? null, w_mm: paper?.w_mm ?? null, h_mm: paper?.h_mm ?? null, status: 'unread', unread: ['number', 'title', 'scale', 'rev', 'date'], no_text: true, note: 'No text on this sheet. It is a picture, so its title block has not been read.' };
}

/**
 * What a model returned for one sheet (the /api/plan-read "sheet" mode), put on that sheet's record. Returns { sheet, register } or
 * throws when the reply is not a valid sheet read. Fields from a model are marked how: "model" and are checked by a person.
 */
export function applyModelRead(sheet, read, model = '') {
  if (!read || typeof read !== 'object' || typeof read.is_drawing_sheet !== 'boolean') throw new Error('The reply was not a sheet read.');
  for (const f of ['number', 'title', 'scale', 'rev', 'date']) if (!str(read[f])) throw new Error(`The reply's ${f} was not text.`);
  const next = { ...sheet, how: { ...sheet.how }, unread: [...sheet.unread] };
  if (!read.is_drawing_sheet) { next.note = 'A model says this is not a drawing sheet.'; next.status = 'unread'; next.from = 'model'; next.model = model || 'a model'; return { sheet: next, register: [] }; }
  for (const f of ['number', 'title', 'scale', 'rev', 'date']) {
    const v = typeof read[f] === 'string' ? clean(read[f]) : '';
    if (v && !next[f]) { next[f] = f === 'number' ? v.toUpperCase() : v; next.how[f] = 'model'; }
  }
  next.date_iso = next.date ? parseDate(next.date) : null;
  next.unread = ['number', 'title', 'scale', 'rev', 'date'].filter((f) => !next[f]);
  next.from = 'model'; next.model = model || 'a model'; next.no_text = true;
  next.status = next.number && next.title ? 'read' : next.unread.length < 5 ? 'partly' : 'unread';
  next.note = 'Read by a model from a picture of the sheet. Check it against the sheet.';
  const bad = sheetProblem(next);
  if (bad) throw new Error(`The sheet read did not fit: ${bad}.`);
  const register = Array.isArray(read.register) ? read.register.filter((r) => r && typeof r.number === 'string' && isSheetNumber(r.number)).map((r) => ({ number: clean(r.number).toUpperCase(), title: typeof r.title === 'string' ? clean(r.title) : '', rev: typeof r.rev === 'string' ? clean(r.rev) : null, date: null, scale: null, file: sheet.file, page: sheet.page, how: 'model' })) : [];
  return { sheet: next, register };
}

// ---- the index and the missing list -----------------------------------------------------------------------------------------------------
/**
 * Put the sheets and the register together.
 *   sheets    every sheet record (one per page of every drawing PDF)
 *   register  { found, rows } as readRegister gives it
 * Returns { sheets (in set order, with dup marked), missing: [{ number, title, rev, from }], unlisted: [sheet ids], unreadable: n, found }.
 * "missing" is a register entry with no sheet of that number in the files. A sheet whose number could not be read might be that sheet,
 * so the count of unreadable sheets is returned beside the list, and the page says so.
 */
export function buildIndex(sheets, register) {
  const by = new Map();
  for (const s of sheets) if (s.number) { const k = normNumber(s.number); (by.get(k) ?? by.set(k, []).get(k)).push(s); }
  const out = sheets.map((s) => ({ ...s, dup: !!s.number && by.get(normNumber(s.number)).length > 1 }));
  const rows = register?.rows ?? [];
  const regKeys = new Set(rows.map((r) => normNumber(r.number)));
  const missing = rows.filter((r) => !by.has(normNumber(r.number))).map((r) => ({ number: r.number, title: r.title, rev: r.rev ?? null, from: `${r.file}, page ${r.page}` }));
  const unlisted = register?.found ? sheets.filter((s) => s.number && !regKeys.has(normNumber(s.number))).map((s) => s.id) : [];
  const unreadable = sheets.filter((s) => !s.number).length;
  return { sheets: out, missing, unlisted, unreadable, found: !!register?.found };
}
