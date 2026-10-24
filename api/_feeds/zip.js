// Minimal ZIP reader for .docx and .xlsx files (stored or deflated entries only). No dependencies.
import { inflateRawSync } from "node:zlib";

export function unzip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error("not a zip file");
  const count = buf.readUInt16LE(eocd + 10); let p = buf.readUInt32LE(eocd + 16);
  const files = {};
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("bad zip directory");
    const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20), nameLen = buf.readUInt16LE(p + 28),
      extraLen = buf.readUInt16LE(p + 30), commentLen = buf.readUInt16LE(p + 32), local = buf.readUInt32LE(p + 42);
    const name = buf.slice(p + 46, p + 46 + nameLen).toString("utf8");
    files[name] = { method, csize, local };
    p += 46 + nameLen + extraLen + commentLen;
  }
  return {
    names: Object.keys(files),
    read(name) {
      const f = files[name]; if (!f) return null;
      const lh = f.local, start = lh + 30 + buf.readUInt16LE(lh + 26) + buf.readUInt16LE(lh + 28);
      const raw = buf.slice(start, start + f.csize);
      return (f.method === 0 ? raw : inflateRawSync(raw)).toString("utf8");
    },
  };
}

const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
export const unxml = (s) => s.replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e) => e[0] === "#" ? String.fromCodePoint(parseInt(e.slice(e[1] === "x" ? 2 : 1), e[1] === "x" ? 16 : 10)) : (ENT[e] ?? m));

// .docx → array of non-empty paragraph strings (table cells are paragraphs too)
export function docxParagraphs(buf) {
  const xml = unzip(buf).read("word/document.xml") || "";
  const out = [];
  for (const p of xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || []) {
    const t = (p.match(/<w:t[^>]*>[^<]*<\/w:t>/g) || []).map((x) => unxml(x.replace(/<[^>]+>/g, ""))).join("").trim();
    if (t) out.push(t);
  }
  return out;
}

// .xlsx → { sheetNames, rows(name) → array of arrays of cell strings }
export function xlsx(buf) {
  const z = unzip(buf);
  const wb = z.read("xl/workbook.xml") || "", rels = z.read("xl/_rels/workbook.xml.rels") || "";
  const ss = ((z.read("xl/sharedStrings.xml") || "").match(/<si>[\s\S]*?<\/si>/g) || []).map((si) => unxml((si.match(/<t[^>]*>[^<]*<\/t>/g) || []).map((x) => x.replace(/<[^>]+>/g, "")).join("")));
  const relMap = Object.fromEntries([...rels.matchAll(/<Relationship [^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)].map((m) => [m[1], m[2]]));
  const relMap2 = Object.fromEntries([...rels.matchAll(/<Relationship [^>]*Target="([^"]+)"[^>]*Id="([^"]+)"/g)].map((m) => [m[2], m[1]]));
  const sheets = [...wb.matchAll(/<sheet [^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)].map((m) => ({ name: unxml(m[1]), target: relMap[m[2]] || relMap2[m[2]] }));
  const colIdx = (ref) => { let n = 0; for (const ch of ref.replace(/\d+/g, "")) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
  return {
    sheetNames: sheets.map((s) => s.name),
    rows(name) {
      const s = sheets.find((x) => x.name === name); if (!s) return null;
      const path = s.target.startsWith("/") ? s.target.slice(1) : "xl/" + s.target.replace(/^\.\.\//, "");
      const xml = z.read(path) || "";
      return (xml.match(/<row[^>]*>[\s\S]*?<\/row>/g) || []).map((row) => {
        const cells = [];
        for (const c of row.match(/<c [^>]*?(?:\/>|>[\s\S]*?<\/c>)/g) || []) {
          const ref = (c.match(/ r="([A-Z]+\d+)"/) || [])[1]; const t = (c.match(/ t="(\w+)"/) || [])[1];
          let v = (c.match(/<v>([^<]*)<\/v>/) || [])[1] ?? (c.match(/<t[^>]*>([^<]*)<\/t>/) || [])[1] ?? "";
          if (t === "s" && v !== "") v = ss[+v] ?? ""; else v = unxml(v);
          cells[ref ? colIdx(ref) : cells.length] = v;
        }
        return Array.from(cells, (x) => x ?? "");
      });
    },
  };
}
