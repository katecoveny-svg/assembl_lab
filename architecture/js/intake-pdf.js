// pdf.js glue for the intake agent. pdf.js is passed in (the page loads the copy in vendor/pdfjs; the tests load the same file), so
// this file holds no import of it. It turns each page of a PDF into { page, w, h, items, chars } (intake-rules.js's page shape)
// and, in a browser only, draws a page to a picture for the one paid read of a sheet that has no text.
import { charsOf, paperOf } from './intake-rules.js';

/** where the vendored pdf.js lives, relative to this file */
export const PDFJS_URL = new URL('../vendor/pdfjs/pdf.min.mjs', import.meta.url).href;
export const PDFJS_WORKER = new URL('../vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).href;

let loaded = null;
/** pdf.js, loaded once and only when a PDF is dropped (it is about 1.7 MB and the page does not need it before that) */
export function loadPdfjs() {
  loaded ??= import(PDFJS_URL).then((lib) => { lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER; return lib; }).catch((e) => { loaded = null; throw e; });
  return loaded;
}

/** open a PDF: { count, page(n) -> page record, draw(n, maxSide) -> data URL (browser only), close() } */
export async function openPdf(lib, data) {
  const bytes = data instanceof Uint8Array ? data.slice() : new Uint8Array(data), doc = await lib.getDocument({ data: bytes, isEvalSupported: false, verbosity: 0 }).promise;
  return {
    count: doc.numPages,
    async page(n) {
      const pg = await doc.getPage(n), vp = pg.getViewport({ scale: 1 }), tc = await pg.getTextContent(), items = [];
      for (const t of tc.items) {
        if (typeof t.str !== 'string' || !t.str.trim()) continue;
        const [x, y] = vp.convertToViewportPoint(t.transform[4], t.transform[5]); // y from the top of the page, rotation applied
        items.push({ s: t.str, x, y, w: t.width, h: t.height || Math.abs(t.transform[3]) || 1 });
      }
      pg.cleanup();
      return { page: n, w: vp.width, h: vp.height, items, chars: charsOf(items), paper: paperOf(vp.width, vp.height) };
    },
    /** the page as a JPEG data URL, the longer side maxSide pixels. Needs a canvas, so browser only. */
    async draw(n, maxSide = 2400, quality = 0.82) {
      const pg = await doc.getPage(n), v1 = pg.getViewport({ scale: 1 }), scale = Math.min(4, maxSide / Math.max(v1.width, v1.height)), vp = pg.getViewport({ scale });
      const canvas = document.createElement('canvas'); canvas.width = Math.ceil(vp.width); canvas.height = Math.ceil(vp.height);
      const g = canvas.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, canvas.width, canvas.height);
      await pg.render({ canvasContext: g, viewport: vp }).promise;
      pg.cleanup();
      return canvas.toDataURL('image/jpeg', quality);
    },
    close: () => doc.destroy(),
  };
}

/** every page of a PDF read for its text: [{ page, w, h, items, chars, paper }]. onPage(n, count) is called after each page. */
export async function readPages(lib, data, onPage = () => {}) {
  const pdf = await openPdf(lib, data), pages = [];
  try { for (let n = 1; n <= pdf.count; n++) { pages.push(await pdf.page(n)); onPage(n, pdf.count); } } finally { await pdf.close(); }
  return pages;
}
