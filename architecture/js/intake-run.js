// The intake agent's steps, for the conductor (conductor.js). No page in this file: the page (intake.js) gives it the dropped files,
// pdf.js, a way to ask a model about one sheet, and a way to keep the result, so the whole run can be tested offline.
//
//   sort     every file by kind (name, first bytes). Zip files are not opened. System files are left out.
//   split    each PDF is opened and its pages read for text. A PDF is a drawing set when a page is A3 or bigger or has a sheet number;
//            otherwise it is a document (notes, a letter) and has no sheets. Each page of a drawing set is one sheet.
//   read     each sheet's title block (number, title, scale, revision, date) and the drawing register, from the sheet's own text.
//   keep     the files are kept with the project (the page does this; a file already kept is not kept twice).
//   model    PAID, and only after a person says go: a sheet with no text of its own is drawn to a picture and a model reads its title
//            block. Nothing else is sent. Each reply is checked against the sheet schema; an invalid reply is thrown away.
//   index    the sheet index and the missing list (register entries with no sheet in the files).
//   save     the result (files, sheets, the register, the missing list and this job) is kept with the project (the page does this).
// A sheet a model already read, in the same file (same fingerprint), is not read again: the earlier read comes back with it (prior).
import { classify, sortFiles, readRegister, readTitleBlock, sheetFrom, sheetNoText, TEXT_MIN, applyModelRead, buildIndex, normNumber } from './intake-rules.js';
import { openPdf } from './intake-pdf.js';

export const STEPS = [
  { id: 'sort', label: 'Sort the files by kind' },
  { id: 'split', label: 'Split each PDF into its sheets' },
  { id: 'read', label: 'Read the title blocks and the drawing register' },
  { id: 'keep', label: 'Keep the files with the project' },
  { id: 'model', label: 'Read sheets with no text, with a model', paid: true },
  { id: 'index', label: 'Build the sheet index and the missing list' },
  { id: 'save', label: 'Keep it with the project' },
];

/** SHA-256 in plain JS, for a page that is not a secure context (crypto.subtle is only there on https and localhost) */
export function sha256Js(bytes) {
  const K = new Uint32Array(64), H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  for (let i = 0, n = 2, c = 0; c < 64; n++) { let prime = true; for (let d = 2; d * d <= n; d++) if (n % d === 0) { prime = false; break; } if (prime) { K[c++] = Math.floor((n ** (1 / 3) % 1) * 2 ** 32); i++; } }
  const len = bytes.length, total = (len + 9 + 63) & ~63, buf = new Uint8Array(total), dv = new DataView(buf.buffer);
  buf.set(bytes); buf[len] = 0x80; dv.setUint32(total - 8, Math.floor((len * 8) / 2 ** 32)); dv.setUint32(total - 4, (len * 8) >>> 0);
  const w = new Uint32Array(64), r = (x, n) => (x >>> n) | (x << (32 - n));
  for (let o = 0; o < total; o += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
    for (let i = 16; i < 64; i++) { const a = w[i - 15], b = w[i - 2]; w[i] = (w[i - 16] + (r(a, 7) ^ r(a, 18) ^ (a >>> 3)) + w[i - 7] + (r(b, 17) ^ r(b, 19) ^ (b >>> 10))) >>> 0; }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) >>> 0, t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    H[0] += a; H[1] += b; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h;
  }
  return [...H].map((x) => x.toString(16).padStart(8, '0')).join('');
}
/** a file's fingerprint: SHA-256 as hex, so the same file is known again and a paid read is not made twice for it */
export async function sha256(bytes) {
  const subtle = globalThis.crypto?.subtle;
  if (subtle) return [...new Uint8Array(await subtle.digest('SHA-256', bytes))].map((b) => b.toString(16).padStart(2, '0')).join('');
  return sha256Js(bytes);
}
const bytesOf = async (f, a = 0, b = undefined) => new Uint8Array(await (b === undefined ? f : f.slice(a, b)).arrayBuffer());
/** a drawing PDF has a page of A3 or bigger (short side 280 mm or more), or a page whose title block gives a sheet number */
const looksLikeDrawings = (pages, sheets) => pages.some((p) => Math.min(p.paper.w_mm, p.paper.h_mm) >= 280) || sheets.some((s) => s.number);

/**
 * entries: [{ path, file }] (file: a File or anything with size, slice(a, b).arrayBuffer() and arrayBuffer()).
 * lib: pdf.js. readSheet(imageDataUrl) -> { plan, model, provider } from the model, or throws.
 * draw(pdf, page): the page as a picture (the page's canvas; a test gives a stand-in). keep(state): saves the result. Returns { defs, handlers, state }.
 */
export function intakeRun({ entries, lib, readSheet, saveFiles = async () => {}, saveRecord = async () => {}, prior = null, draw = (pdf, n) => pdf.draw(n) }) {
  const state = { files: [], sheets: [], pages: [], register: { found: false, rows: [], from: [] }, modelRegister: [], index: null, model: { asked: 0, read: 0, failed: 0, last_error: '' }, pdfs: new Map() };
  const handlers = {
    sort: async ({ log }) => {
      for (const { path, file } of entries) {
        const head = await bytesOf(file, 0, 1024), c = classify(path, file.size, head);
        state.files.push({ path, name: path.split('/').pop(), size: file.size, kind: c.kind, ext: c.ext, problem: c.problem, file });
      }
      const by = sortFiles(state.files);
      log(`${state.files.length} files: ${by.map((g) => `${g.files.length} ${g.word.toLowerCase()}`).join(', ')}.`);
      return { note: `${state.files.length} files, ${by.length} kinds` };
    },
    split: async ({ log }) => {
      const pdfs = state.files.filter((f) => f.kind === 'pdf' && !f.problem);
      let sheets = 0, docs = 0;
      for (const f of pdfs) {
        let pages;
        let data;
        try { data = await bytesOf(f.file); pages = []; const pdf = await openPdf(lib, data); try { for (let n = 1; n <= pdf.count; n++) pages.push(await pdf.page(n)); } finally { await pdf.close(); } } catch (e) {
          f.problem = `It could not be opened as a PDF (${String(e?.message ?? e).slice(0, 80)}).`; log(`${f.name}: ${f.problem}`); continue;
        }
        f.pages = pages.length; f.sha = await sha256(data);
        const rough = pages.map((p) => ({ p, tb: p.chars >= TEXT_MIN ? readTitleBlock({ w: p.w, h: p.h, items: p.items }) : null }));
        const drawings = looksLikeDrawings(pages, rough.map((r) => r.tb ?? {}));
        f.pdf = drawings ? 'drawings' : 'document';
        if (!drawings) { docs += 1; continue; }
        for (const { p, tb } of rough) {
          state.pages.push({ file: f.path, page: p.page, w: p.w, h: p.h, items: p.items });
          const sh = tb ? sheetFrom(f.path, p.page, tb, p.paper) : sheetNoText(f.path, p.page, p.paper);
          sh.file_sha = f.sha; state.sheets.push(sh);
          sheets += 1;
        }
        state.pdfs.set(f.path, f);
      }
      log(`${sheets} sheets in ${state.pdfs.size} drawing PDFs${docs ? `, ${docs} PDFs that are documents (no sheets)` : ''}.`);
      return { note: `${sheets} sheets` };
    },
    read: async ({ log }) => {
      state.register = readRegister(state.pages);
      let reused = 0;
      for (const [i, sh] of state.sheets.entries()) {
        const old = sh.no_text && prior?.sheets?.find((x) => x.id === sh.id && x.file_sha && x.file_sha === sh.file_sha && x.from === 'model' && x.model);
        if (!old) continue;
        state.sheets[i] = { ...old }; reused += 1;
        state.modelRegister.push(...(prior.register?.rows ?? []).filter((r) => r.how === 'model' && r.file === old.file && r.page === old.page));
      }
      if (reused) log(`${reused} sheet${reused === 1 ? '' : 's'} read by a model earlier, in the same file: those are not sent again.`);
      const noText = state.sheets.filter((s) => s.no_text).length, unread = state.sheets.filter((s) => s.status === 'unread' && !s.no_text).length;
      log(`${state.sheets.filter((s) => s.number).length} of ${state.sheets.length} sheets have a number. ${state.register.found ? `Register: ${state.register.rows.length} entries.` : 'No drawing register found in the text.'} ${noText} with no text${unread ? `, ${unread} with text but no title block I could read` : ''}.`);
      return { note: `${noText} with no text` };
    },
    keep: async ({ log }) => { await saveFiles(state, log); return { note: `${state.files.filter((f) => f.file_id).length} kept` }; },
    model: {
      when: () => state.sheets.some((s) => s.no_text && !s.model),
      approval: () => { const n = state.sheets.filter((s) => s.no_text && !s.model).length; return `${n} sheet${n === 1 ? ' has no text of its own' : 's have no text of their own'}. Reading ${n === 1 ? 'its' : 'their'} title block${n === 1 ? '' : 's'} sends ${n === 1 ? 'a picture of the sheet' : `${n} pictures, one sheet each`} to a model: ${n} paid request${n === 1 ? '' : 's'}. OpenAI is tried first, then Gemini, then Anthropic.`; },
      run: async ({ log, paid }) => {
        const todo = state.sheets.filter((s) => s.no_text && !s.model);
        for (const s of todo) {
          const f = state.pdfs.get(s.file);
          try {
            const pdf = await openPdf(lib, await bytesOf(f.file));
            let img; try { img = await draw(pdf, s.page); } finally { await pdf.close(); }
            paid(`${s.file.split('/').pop()}, page ${s.page}`); state.model.asked += 1;
            const r = await readSheet(img);
            const done = applyModelRead(s, r.plan, [r.provider, r.model].filter(Boolean).join(' '));
            Object.assign(s, done.sheet); state.modelRegister.push(...done.register); state.model.read += 1;
          } catch (e) { state.model.failed += 1; state.model.last_error = String(e?.message ?? e).slice(0, 200); s.note = `A model could not read this sheet (${state.model.last_error}).`; log(`Page ${s.page}: ${state.model.last_error}`); }
        }
        if (todo.length && state.model.read === 0) throw new Error(`No sheet could be read by a model (${state.model.last_error || 'no answer'}).`);
        return { note: `${state.model.read} of ${todo.length} read` };
      },
    },
    index: async ({ log }) => {
      const seen = new Set(state.register.rows.map((r) => normNumber(r.number)));
      const extra = state.modelRegister.filter((r) => !seen.has(normNumber(r.number)));
      const register = { found: state.register.found || extra.length > 0, rows: [...state.register.rows, ...extra], from: state.register.from };
      state.index = buildIndex(state.sheets, register);
      state.register = register;
      log(`${state.index.sheets.length} sheets. Missing from the files: ${state.index.missing.length}${state.index.unreadable ? ` (${state.index.unreadable} sheet${state.index.unreadable === 1 ? '' : 's'} could not be read, so ${state.index.unreadable === 1 ? 'it' : 'some'} may be listed as missing and be there)` : ''}.`);
      return { note: `${state.index.missing.length} missing` };
    },
    save: async () => { await saveRecord(state); return { note: 'Kept' }; },
  };
  return { defs: STEPS, handlers, state };
}
