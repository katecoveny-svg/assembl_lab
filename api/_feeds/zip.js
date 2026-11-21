// Minimal ZIP reader for .docx and .xlsx files (stored or deflated entries only). No dependencies, no node: modules:
// it reads a Uint8Array with a DataView and inflates with the Web DecompressionStream, which Cloudflare Workers and Node 20+ both have.
// unzip() is async because inflating is; every entry is inflated up front so read(name) can stay synchronous for the callers.
const td = new TextDecoder("utf-8");

async function inflateRaw(u8) {
  const out = new Blob([u8]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(out).arrayBuffer());
}

export async function unzip(buf) {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  let eocd = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error("not a zip file");
  const count = dv.getUint16(eocd + 10, true); let p = dv.getUint32(eocd + 16, true);
  const text = {};
  for (let n = 0; n < count; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) throw new Error("bad zip directory");
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nameLen = dv.getUint16(p + 28, true),
      extraLen = dv.getUint16(p + 30, true), commentLen = dv.getUint16(p + 32, true), lh = dv.getUint32(p + 42, true);
    const name = td.decode(u8.subarray(p + 46, p + 46 + nameLen));
    const start = lh + 30 + dv.getUint16(lh + 26, true) + dv.getUint16(lh + 28, true);
    const raw = u8.subarray(start, start + csize);
    if (method !== 0 && method !== 8) throw new Error(`zip: unsupported compression method ${method}`);
    text[name] = td.decode(method === 0 ? raw : await inflateRaw(raw));
    p += 46 + nameLen + extraLen + commentLen;
  }
  return { names: Object.keys(text), read: (name) => (name in text ? text[name] : null) };
}

const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
export const unxml = (s) => s.replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e) => e[0] === "#" ? String.fromCodePoint(parseInt(e.slice(e[1] === "x" ? 2 : 1), e[1] === "x" ? 16 : 10)) : (ENT[e] ?? m));

// .docx → array of non-empty paragraph strings (table cells are paragraphs too)
export async function docxParagraphs(buf) {
  const xml = (await unzip(buf)).read("word/document.xml") || "";
  const out = [];
  for (const p of xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || []) {
    const t = (p.match(/<w:t[^>]*>[^<]*<\/w:t>/g) || []).map((x) => unxml(x.replace(/<[^>]+>/g, ""))).join("").trim();
    if (t) out.push(t);
  }
  return out;
}

// .xlsx → { sheetNames, rows(name) → array of arrays of cell strings }
export async function xlsx(buf) {
  const z = await unzip(buf);
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
