// A synthetic drawing set for the intake agent's tests. Invented, small, and made here from nothing: no real project, client, address
// or drawing is in it. makePdf writes a valid PDF by hand (Helvetica text at given positions, plus drawn boxes) so pdf.js can read it.
const enc = new TextEncoder();
const esc = (s) => String(s).replace(/[\\()]/g, (c) => `\\${c}`);
const f2 = (n) => (Math.round(n * 100) / 100).toString();

/** pages: [{ w, h, text: [{ x, y, size, s }] (y from the top), boxes: [{ x, y, w, h }] }] -> Uint8Array of a PDF */
export function makePdf(pages) {
  const objs = []; // 1-based object bodies
  const add = (body) => { objs.push(body); return objs.length; };
  const catalog = add(''), tree = add(''), font = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const kids = [];
  for (const p of pages) {
    let c = '0.2 w\n';
    for (const b of p.boxes ?? []) c += `${f2(b.x)} ${f2(p.h - b.y - b.h)} ${f2(b.w)} ${f2(b.h)} re S\n`;
    for (const t of p.text ?? []) c += `BT /F1 ${t.size ?? 8} Tf ${f2(t.x)} ${f2(p.h - t.y)} Td (${esc(t.s)}) Tj ET\n`;
    const stream = add(`<< /Length ${enc.encode(c).length} >>\nstream\n${c}endstream`);
    const page = add(`<< /Type /Page /Parent ${tree} 0 R /MediaBox [0 0 ${p.w} ${p.h}] /Resources << /Font << /F1 ${font} 0 R >> >> /Contents ${stream} 0 R >>`);
    kids.push(page);
  }
  objs[catalog - 1] = `<< /Type /Catalog /Pages ${tree} 0 R >>`;
  objs[tree - 1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(' ')}] /Count ${kids.length} >>`;
  let out = '%PDF-1.4\n'; const at = [];
  objs.forEach((b, i) => { at.push(enc.encode(out).length); out += `${i + 1} 0 obj\n${b}\nendobj\n`; });
  const xref = enc.encode(out).length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${at.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return enc.encode(out);
}

// A1 landscape in points (841 x 594 mm)
export const A1 = { w: 2384, h: 1684 }, A4 = { w: 595, h: 842 };
/**
 * a drawing sheet with a title block at the bottom right. layout "under": each label sits above its value (the common one);
 * "right": each label sits to the left of its value.
 */
export function sheet({ number, title, scale = '1:100 @ A1', rev = 'B', date = '12/08/2026', layout = 'under', extra = [], noText = false, size = A1 }) {
  const boxes = [{ x: 40, y: 40, w: size.w - 80, h: size.h - 80 }, { x: size.w - 700, y: size.h - 330, w: 660, h: 290 }];
  if (noText) return { ...size, boxes: [...boxes, { x: 300, y: 300, w: 900, h: 600 }], text: [] }; // a scan stands in as a picture: drawn lines, no text
  const X = size.w - 680, Y = size.h - 300, text = [{ x: 200, y: 400, size: 24, s: `${title} plan view` }, ...extra];
  if (layout === 'under') {
    text.push({ x: X, y: Y, size: 7, s: 'DRAWING NO.' }, { x: X, y: Y + 30, size: 26, s: number },
      { x: X + 260, y: Y, size: 7, s: 'REV' }, { x: X + 260, y: Y + 30, size: 14, s: rev },
      { x: X + 340, y: Y, size: 7, s: 'DATE' }, { x: X + 340, y: Y + 30, size: 12, s: date },
      { x: X, y: Y + 90, size: 7, s: 'TITLE' }, { x: X, y: Y + 125, size: 20, s: title },
      { x: X, y: Y + 200, size: 7, s: 'SCALE' }, { x: X, y: Y + 230, size: 12, s: scale },
      { x: X + 340, y: Y + 200, size: 7, s: 'PROJECT' }, { x: X + 340, y: Y + 230, size: 10, s: 'Example house, invented' });
  } else {
    text.push({ x: X, y: Y, size: 8, s: 'DRAWING NO.' }, { x: X + 150, y: Y, size: 24, s: number },
      { x: X, y: Y + 60, size: 8, s: 'TITLE' }, { x: X + 150, y: Y + 60, size: 18, s: title },
      { x: X, y: Y + 120, size: 8, s: 'SCALE' }, { x: X + 150, y: Y + 120, size: 12, s: scale },
      { x: X, y: Y + 160, size: 8, s: 'REV' }, { x: X + 150, y: Y + 160, size: 12, s: rev },
      { x: X, y: Y + 200, size: 8, s: 'DATE' }, { x: X + 150, y: Y + 200, size: 12, s: date });
  }
  return { ...size, boxes, text };
}
/** the cover sheet: its own title block plus a drawing register (number, title, scale, rev, date per row) */
export function cover(rows, opts = {}) {
  const s = sheet({ number: 'A-000', title: 'Cover sheet and drawing register', scale: 'NTS', rev: 'B', date: '12/08/2026', ...opts });
  s.text.push({ x: 200, y: 200, size: 18, s: 'DRAWING REGISTER' }, { x: 200, y: 250, size: 8, s: 'No.' }, { x: 320, y: 250, size: 8, s: 'Title' }, { x: 900, y: 250, size: 8, s: 'Scale' }, { x: 1100, y: 250, size: 8, s: 'Rev' }, { x: 1200, y: 250, size: 8, s: 'Date' });
  rows.forEach((r, i) => {
    const y = 290 + i * 34;
    s.text.push({ x: 200, y, size: 10, s: r.number }, { x: 320, y, size: 10, s: r.title }, { x: 900, y, size: 10, s: r.scale ?? '1:100' }, { x: 1100, y, size: 10, s: r.rev ?? 'B' }, { x: 1200, y, size: 10, s: r.date ?? '12/08/2026' });
  });
  return s;
}

export const REGISTER = [
  { number: 'A-000', title: 'Cover sheet and drawing register', scale: 'NTS' },
  { number: 'A-101', title: 'Site plan', scale: '1:200' },
  { number: 'A-102', title: 'Ground floor plan' },
  { number: 'A-103', title: 'First floor plan' },
  { number: 'A-201', title: 'Elevations', scale: '1:100' },
  { number: 'A-301', title: 'Sections', scale: '1:50' },
  { number: 'S-100', title: 'Topographic survey', scale: '1:500', rev: 'A' },
];

/**
 * The set: one drawing PDF (cover with register, four sheets read from text, one scanned sheet with no text, one sheet the register
 * does not list), plus a one-page notes PDF, and the other kinds of file. S-100 is on the register and is not in the files.
 * Returns { files: [{ path, bytes }], expect }.
 */
export function syntheticSet() {
  const drawings = makePdf([
    cover(REGISTER),
    sheet({ number: 'A-101', title: 'Site plan', scale: '1:200', rev: 'C' }),
    sheet({ number: 'A-102', title: 'Ground floor plan', layout: 'right' }),
    sheet({ number: 'A-103', title: 'First floor plan', scale: '1:100 @ A1', date: '14 Aug 2026' }),
    sheet({ number: 'A-201', title: 'Elevations north and south', scale: '1:100', rev: 'A' }),
    sheet({ number: 'A-301', title: 'Sections', noText: true }),
    sheet({ number: 'A-501', title: 'Details', scale: '1:5, 1:10', layout: 'right', rev: 'D' }),
  ]);
  const notes = makePdf([{ ...A4, boxes: [], text: [{ x: 60, y: 100, size: 14, s: 'Site visit notes' }, { x: 60, y: 130, size: 10, s: 'Access is from the lower road. Bring boots.' }] }]);
  const ascii = (s) => enc.encode(s);
  return {
    files: [
      { path: 'Set/Drawings/Architectural.pdf', bytes: drawings },
      { path: 'Set/Notes/site visit.pdf', bytes: notes },
      { path: 'Set/Photos/site-north.jpg', bytes: new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1]) },
      { path: 'Set/Photos/site-south.png', bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]) },
      { path: 'Set/Models/example.ifc', bytes: ascii('ISO-10303-21;\nHEADER;\nENDSEC;\nDATA;\nENDSEC;\nEND-ISO-10303-21;\n') },
      { path: 'Set/Survey/levels.csv', bytes: ascii('point,easting,northing,level\n1,0,0,10.0\n') },
      { path: 'Set/Survey/boundary.xml', bytes: ascii('<?xml version="1.0"?><LandXML version="1.2"></LandXML>') },
      { path: 'Set/Notes/brief.docx', bytes: new Uint8Array([0x50, 0x4b, 3, 4, 0, 0]) },
      { path: 'Set/old/archive.zip', bytes: new Uint8Array([0x50, 0x4b, 3, 4, 0, 0]) },
      { path: 'Set/.DS_Store', bytes: new Uint8Array([0, 0, 0, 1]) },
      { path: 'Set/weird.dat', bytes: new Uint8Array([1, 2, 3]) },
    ],
    expect: { sheets: 7, numbers: ['A-000', 'A-101', 'A-102', 'A-103', 'A-201', null, 'A-501'], missing: ['S-100', 'A-301'], unlisted: ['A-501'], noText: 1, register: REGISTER.length },
  };
}
