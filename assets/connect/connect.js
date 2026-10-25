/* assembl Connect: the one shared "Your data" uploader for the industry twins.
   Inlined into each twin's page at build time (the /*CONNECT*\/ marker), so pages stay self-contained.

   What it does, in order, for every file dropped on it:
     1. reads CSV (the twin's own parser, so rows are byte-identical to before) or XLSX (a small zip + sheet XML reader);
     2. works out which contract table the file is, from the twin's header matching and, when that is not enough, from
        the shape of the values;
     3. shows a mapping screen generated from the twin's contract/*.schema.json, remembers the mapping per twin and table
        in localStorage, and applies it next time the same columns arrive;
     4. leaves out personal columns (by name and by the shape of the values) before anything is kept, and says so;
     5. runs the twin's own validate() so each row is typed exactly as the twin expects, lists the rows set aside and why;
     6. emits one typed event, assembl:yourdata, with {twin, table, rows, mapping, asOf, dropped:{columns, rows}}.
   The twin listens for that event and does with the rows exactly what its old importer did.

   Nothing leaves the browser tab: no upload, no network, no keys. */
(function () {
  "use strict";
  const EV = "assembl:yourdata";
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = n => Number(n).toLocaleString("en-NZ");
  const norm = h => String(h).toLowerCase().replace(/&/g, "_").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  const ymd = d => d.toISOString().slice(0, 10);
  const today = () => ymd(new Date());

  // ---------- personal information: column names (the union of every twin's rule, plus rego, VIN, licence and device ids) and value shapes
  const PII_NAME = /(^|_)(customer|cust|client|guest|booker|first|last|sur|full|given|family|staff|employee|emp|attendant|cleaner|contact|holder|account_holder|cashier|operator|picker|driver|member|trade|owner|salesperson|sales_person|advisor|adviser|technician|tech|user)?_?name($|_)|^name$|phone|mobile|(^|_)cell(_|$)|(^|_)tel$|telephone|e_?mail|address|street|suburb|(^|_)city(_|$)|postcode|post_code|passport|licen[cs]e|(^|_)rego(_|$)|(^|_)plate|registration_no|^reg_no$|^reg$|^vin$|chassis|card_?(no|num|number)|pan$|birth|^dob$|date_of_birth|nationality|(^|_)ird(_|$)|bank|tax_code|signature|ip_address|device_id|mac_address|^salesperson$|advisor_name|^customer$|^contact$|^owner$/;
  const SHAPES = [
    ["emails", /^[^\s@]+@[^\s@]+\.[^\s@]+$/],
    ["phone numbers", s => /^(\+|0|\(0)\d[\d\s().-]{6,}\d$/.test(s) && s.replace(/\D/g, "").length >= 8 && !/^\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}/.test(s)],
    ["VINs", s => /^[A-HJ-NPR-Z0-9]{17}$/i.test(s) && /\d/.test(s) && /[A-Z]/i.test(s)],
    ["rego plates", /^[A-Z]{3}\d{3}$|^[A-Z]{2}\d{4}$|^[A-Z]{2,3}-\d{3,4}$|^\d{3}[A-Z]{3}$/i],
    ["driver licence numbers", /^[A-Z]{2}\d{6}$/],
    ["street addresses", /^\d+[a-z]?\s+\S.*\s(street|st|road|rd|avenue|ave|drive|dr|place|pl|crescent|cres|lane|ln|way|terrace|tce|highway|hwy)\.?$/i]];
  const STRONG = new Set(["emails", "phone numbers", "VINs"]);
  function valueShape(values) { const vals = values.map(v => String(v ?? "").trim()).filter(Boolean).slice(0, 200); if (vals.length < 3) return null;
    for (const [what, re] of SHAPES) { const hits = vals.filter(v => typeof re === "function" ? re(v) : re.test(v)).length; if (hits >= vals.length * 0.6) return what; } return null; }
  // columns to leave out: unmapped columns that look personal by name or by value; mapped columns whose values are plainly emails, phones or VINs
  function personalColumns(parsed, map) {
    const mapped = new Map(Object.entries(map).map(([k, i]) => [i, k])), out = [];
    parsed.headers.forEach((h, i) => { const col = () => parsed.rows.map(r => r[i]);
      if (!mapped.has(i)) { if (PII_NAME.test(norm(h))) out.push({ header: h, index: i, reason: "column name" }); else { const s = valueShape(col()); if (s) out.push({ header: h, index: i, reason: `values look like ${s}` }); } }
      else { const s = valueShape(col()); if (s && STRONG.has(s)) out.push({ header: h, index: i, reason: `values look like ${s}`, wasMapped: mapped.get(i) }); } });
    return out;
  }
  const NEVER = ["Customer, guest or staff names (a staff ID or payroll number is enough)", "Email addresses, phone numbers and postal addresses", "Dates of birth, passport, driver licence and IRD numbers",
    "Rego plates, VINs and chassis numbers", "Card numbers, bank details and signatures", "Device, IP or MAC addresses, and anything from CCTV or Wi-Fi tracking"];

  // ---------- XLSX: unzip with DecompressionStream, read the first sheet and the shared strings. No library.
  const td = new TextDecoder();
  const unxml = s => String(s).replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16))).replace(/&amp;/g, "&");
  async function unzip(buf) {
    const u8 = new Uint8Array(buf), dv = new DataView(buf); let eocd = -1;
    for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error("not a zip file");
    const n = dv.getUint16(eocd + 10, true); let p = dv.getUint32(eocd + 16, true); const entries = {};
    for (let i = 0; i < n && p + 46 <= u8.length; i++) { if (dv.getUint32(p, true) !== 0x02014b50) break;
      const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lho = dv.getUint32(p + 42, true);
      entries[td.decode(u8.subarray(p + 46, p + 46 + nl))] = { method, csize, lho }; p += 46 + nl + el + cl; }
    return async function read(name) { const e = entries[name]; if (!e) return null; const q = e.lho, nl = dv.getUint16(q + 26, true), el = dv.getUint16(q + 28, true);
      const data = u8.subarray(q + 30 + nl + el, q + 30 + nl + el + e.csize);
      if (e.method === 0) return td.decode(data); if (e.method !== 8) throw new Error("unsupported zip compression " + e.method);
      return await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).text(); };
  }
  const colIndex = ref => { let n = 0; for (const ch of ref.replace(/\d+/g, "")) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; };
  const pad = n => String(n).padStart(2, "0");
  function serialToText(v) { const ms = Math.round((v - 25569) * 864e5), d = new Date(ms); if (isNaN(d)) return String(v);
    const s = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; return v % 1 ? `${s} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}` : s; }
  async function readXlsx(buf) {
    if (typeof DecompressionStream === "undefined") throw new Error("This browser cannot open .xlsx files here. In Excel choose File → Save As → CSV UTF-8 and drop that file instead.");
    const read = await unzip(buf);
    const wb = await read("xl/workbook.xml") || "", rels = await read("xl/_rels/workbook.xml.rels") || "";
    let sheetPath = "xl/worksheets/sheet1.xml", sheetName = "Sheet1";
    const first = wb.match(/<sheet\b[^>]*\/?>/); if (first) { const nm = first[0].match(/\bname="([^"]*)"/), rid = first[0].match(/\br:id="([^"]*)"/); if (nm) sheetName = unxml(nm[1]);
      if (rid) { const rel = rels.match(new RegExp(`<Relationship\\b[^>]*\\bId="${rid[1]}"[^>]*>`)); const tg = rel && rel[0].match(/\bTarget="([^"]*)"/); if (tg) sheetPath = tg[1].startsWith("/") ? tg[1].slice(1) : "xl/" + tg[1]; } }
    const sheet = await read(sheetPath); if (!sheet) throw new Error("The workbook has no readable first sheet.");
    const sst = []; const ss = await read("xl/sharedStrings.xml"); if (ss) for (const m of ss.matchAll(/<si>([\s\S]*?)<\/si>/g)) sst.push(unxml([...m[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(x => x[1]).join("")));
    const dateXf = []; const st = await read("xl/styles.xml"); if (st) { const custom = {}; for (const m of st.matchAll(/<numFmt\b[^>]*numFmtId="(\d+)"[^>]*formatCode="([^"]*)"/g)) custom[m[1]] = unxml(m[2]);
      const isDate = id => (id >= 14 && id <= 22) || (id >= 27 && id <= 36) || (id >= 45 && id <= 47) || (id >= 50 && id <= 58) || (custom[id] != null && /[dmyh]/i.test(custom[id].replace(/\[[^\]]*\]|"[^"]*"|\\./g, "")) && !/[#0]/.test(custom[id].replace(/\[[^\]]*\]|"[^"]*"/g, "")));
      const xfs = st.match(/<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/); if (xfs) for (const m of xfs[1].matchAll(/<xf\b[^>]*>/g)) { const id = m[0].match(/\bnumFmtId="(\d+)"/); dateXf.push(!!id && isDate(+id[1])); } }
    const rows = [];
    for (const rm of sheet.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) { const row = [];
      for (const cm of rm[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) { const a = cm[1], inner = cm[2] || "", r = a.match(/\br="([A-Z]+)\d*"/), t = (a.match(/\bt="(\w+)"/) || [])[1], s = (a.match(/\bs="(\d+)"/) || [])[1];
        const ci = r ? colIndex(r[1]) : row.length; let v = "";
        if (t === "inlineStr") v = unxml([...inner.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(x => x[1]).join(""));
        else { const vm = inner.match(/<v>([\s\S]*?)<\/v>/); const raw = vm ? unxml(vm[1]) : "";
          if (t === "s") v = sst[+raw] ?? ""; else if (t === "b") v = raw === "1" ? "TRUE" : "FALSE"; else if (t === "str" || t === "e") v = raw;
          else if (raw !== "") { const num = Number(raw); v = isNaN(num) ? raw : (s != null && dateXf[+s] ? serialToText(num) : String(num)); } }
        while (row.length < ci) row.push(""); row[ci] = v; }
      if (row.some(x => String(x).trim() !== "")) rows.push(row); }
    const headers = (rows.shift() || []).map(h => String(h).trim()); const w = headers.length;
    return { headers, rows: rows.map(r => { const o = r.slice(0, w); while (o.length < w) o.push(""); return o.map(x => x == null ? "" : String(x)); }), delim: "xlsx", sheet: sheetName };
  }

  // ---------- the schema (contract/*.schema.json) → tables, fields, synonyms, descriptions. The twin's CONTRACT adds the field type used by validate().
  function fieldsFromSchema(schema, contract) { const T = {};
    Object.entries(schema.$defs || {}).forEach(([t, def]) => { const req = new Set(def.required || []), c = contract && contract[t];
      T[t] = { n: def.title || (c && c.n) || t, fields: Object.entries(def.properties || {}).map(([k, p]) => { const d = p.description || "", m = d.match(/Also recognised as:\s*([^.]*)\./), cf = c && c.fields.find(f => f.k === k);
        return { k, req: req.has(k), t: cf ? cf.t : p.format === "date" ? "date" : p.format === "date-time" ? "datetime" : p.type === "boolean" ? "bool" : p.type === "integer" ? "int" : p.type || "string",
          syn: cf ? cf.syn : m ? m[1].split(/,\s*/).filter(Boolean) : [], desc: d.replace(/\s*Also recognised as:.*$/, "").trim(), enum: p.enum }; }) }; });
    return T; }
  const sampleValue = (f, i) => { const k = f.k.toLowerCase();
    if (f.enum) return f.enum[i % f.enum.length]; if (f.t === "bool") return i % 3 ? "No" : "Yes"; if (f.t === "month") return `2026-${pad(1 + i % 9)}`;
    if (f.t === "date") return `${pad(1 + i % 28)}/0${1 + i % 9}/2026`; if (f.t === "datetime") return `${pad(1 + i % 28)}/0${1 + i % 9}/2026 ${pad(7 + i % 12)}:${pad((i * 7) % 60)}`;
    if (f.t === "number" || f.t === "int") return /pct|share|rate$/.test(k) ? String(5 + i % 40) : /qty|count|hours|minutes|days|units|covers|guests|rooms|nights/.test(k) ? String(1 + i % 9) : (120 + i * 37.5).toFixed(2);
    if (/_id$|^id$|txn|ref|_no$|number|sku|hash|jobid|^wip/.test(k)) return `${f.k.replace(/[^a-z]/gi, "").slice(0, 3).toUpperCase()}${1001 + i}`; return `${f.k.replace(/_/g, " ")} ${1 + i % 4}`; };
  const q = v => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
  const toCSV = (h, rs) => [h.join(","), ...rs.map(r => r.map(q).join(","))].join("\n");

  // ---------- the module
  function mount(o) {
    const M = o.model, twin = o.twin, TABLES = Object.keys(M.CONTRACT); let SCHEMA = {};
    // the schema can be inlined at build (o.schema) or fetched from the site (o.schemaUrl); until it arrives the twin's CONTRACT, which generates it, stands in
    const useSchema = js => { SCHEMA = fieldsFromSchema(js || { $defs: {} }, M.CONTRACT); TABLES.forEach(t => { if (!SCHEMA[t]) SCHEMA[t] = { n: M.CONTRACT[t].n, fields: M.CONTRACT[t].fields.map(f => ({ ...f, desc: "" })) }; }); };
    useSchema(o.schema);
    const FILES = [], el = o.el, more = o.more || el, LS = `assembl.connect.${twin}.`;
    const store = { get(t) { try { return JSON.parse(localStorage.getItem(LS + t) || "{}"); } catch (e) { return {}; } },
      set(t, v) { try { localStorage.setItem(LS + t, JSON.stringify(v)); } catch (e) { } } };
    const sig = headers => headers.map(norm).join("|");
    const emit = detail => window.dispatchEvent(new CustomEvent(EV, { detail: { twin, ...detail } }));

    el.innerHTML = `<label class="drop cn-drop ${esc(o.dropClass || "")}" id="drop" for="fileIn"><b>Drop CSV or Excel exports here, or choose files</b><span class="note">${esc(o.hint || "")} Columns are matched to the contract automatically; you confirm the mapping, and it is remembered for next time.</span>
        <span class="cn-priv">Read in this browser tab only · nothing is uploaded · personal columns are left out before anything is kept</span>
        <input type="file" id="fileIn" accept=".csv,.txt,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" multiple style="position:absolute;width:1px;height:1px;opacity:0"></label>
      <div class="cn-bar"><button class="btn" type="button" id="loadSamples">Load the sample exports</button><button class="btn ghost" type="button" id="resetData">Back to simulated</button><span class="note" id="dataState">${esc(o.emptyState || "No files yet. Every figure is simulated, a source or an estimate.")}</span></div>
      <div id="files" class="cn-files"></div>`;
    more.innerHTML = `<details class="cn-more"><summary>Export a sample: the exact shape we need (made-up numbers, no personal information)</summary>
        <p class="note">Twenty invented rows per table, with the contract's own column names, generated in this page from the schema. ${esc(o.sampleHint || "")}</p>
        <div class="chips cn-chips" id="cnSampleChips"></div>
        <div class="cn-bar"><button class="btn" type="button" id="cnDownload">Download the 20-row sample</button><button class="btn ghost" type="button" id="cnDownloadFull">Download the full sample export</button><button class="btn ghost" type="button" id="copySample">Copy the full sample</button><span class="note" id="copyState"></span></div>
        <textarea id="sampleText" class="cn-text" readonly aria-label="Sample CSV"></textarea></details>
      <details class="cn-more"><summary>What we will never ask for</summary><div class="cn-never"><ul>${NEVER.concat(o.never || []).map(x => `<li>${esc(x)}</li>`).join("")}</ul>
        <p class="note">Columns like these are left out before anything is kept, by their name and by the shape of their values, and the panel says which ones. If a figure needs to count people, an ID or a one-way hash is enough.${o.adapters ? " Recognised vendor exports go through the adapters in <code>adapters/</code> first, which drop the same columns and refuse to pass anything personal on." : ""}</p></div></details>
      <details class="cn-more"><summary>The data contract: ${TABLES.length} table${TABLES.length > 1 ? "s" : ""}</summary><div id="contractView" class="scroll cn-contract"></div></details>`;
    const $ = id => el.querySelector("#" + id) || more.querySelector("#" + id);

    // contract view, from the schema
    const contractView = () => $("contractView").innerHTML = TABLES.map(t => `<h3>${esc(SCHEMA[t].n)} <span>${t}</span></h3><table><thead><tr><th>Field</th><th>Type</th><th>Required</th><th>What it is · also recognised as</th></tr></thead><tbody>${SCHEMA[t].fields.map(f => `<tr><td class="cn-mono">${f.k}</td><td>${f.t}</td><td>${f.req ? "Yes" : "–"}</td><td class="note">${esc(f.desc)}${f.syn.length ? ` <i>${esc(f.syn.slice(0, 6).join(", "))}</i>` : ""}</td></tr>`).join("")}</tbody></table>`).join("") +
      `<p class="note">Source of truth: <code>contract/${esc(o.schemaFile || "schema.json")}</code>, generated from the twin's model so the page and the schema cannot drift.</p>`;
    contractView();
    if (o.schemaUrl && typeof fetch === "function") fetch(o.schemaUrl).then(r => r.ok ? r.json() : null).then(js => { if (js && js.$defs) { useSchema(js); contractView(); render(); } }).catch(() => { });

    // ---- reading files
    async function readFile(file) { const name = file.name || "file";
      if (/\.xlsx$/i.test(name)) { try { const parsed = await readXlsx(await file.arrayBuffer()); return addParsed(name, parsed, false); } catch (e) { return addError(name, e.message); } }
      if (/\.xls$/i.test(name)) return addError(name, "Old .xls workbooks cannot be read here. In Excel choose File → Save As → CSV UTF-8 (or .xlsx) and drop that instead.");
      return addParsed(name, M.parseCSV(await file.text()), false); }
    function addError(name, msg) { const f = { id: FILES.length, name, error: msg }; FILES.push(f); render(); return f; }
    function addText(name, text, auto) { return addParsed(name, M.parseCSV(text), auto); }
    // the vendor route (dealer): a recognised vendor export is converted by the adapter first, with its own privacy gate. A file already in the
    // contract's shape (the twin's own exports) goes straight through: the adapter wins only when the direct read is incomplete, rejects rows,
    // or the file carries filled personal columns, which a contract-shaped export never does.
    function viaAdapter(name, parsed) { const A = o.adapters; if (!A) return null; const cands = A.detect(parsed.headers); if (!cands.length) return null;
      const det = M.detectTable(parsed.headers); let direct = false;
      if (det.complete) { const v = M.validate(parsed, det.map, det.t); const piiFilled = parsed.headers.some((h, i) => PII_NAME.test(norm(h)) && parsed.rows.some(r => String(r[i] ?? "").trim() !== ""));
        direct = v.ok && v.accepted >= v.read * 0.99 && !piiFilled; }
      if (direct) return null;
      for (const c of cands) { try { const r = A.convertText(c.adapter, c.kind, toCSV(parsed.headers, parsed.rows), { salt: adapterSalt(), asAt: today() }); if (!r || !r.rows.length) continue;
        if (!M.CONTRACT[r.table]) return { note: `Recognised as ${c.adapter} ${c.kind} (${r.table}): this file supplements another table and is not a contract table on its own. Drop the main export too.`, skip: true, dropped: r.dropped };
        const dropped = r.dropped || [];
        return { parsed: M.parseCSV(r.csv), note: `Recognised as a vendor export (${c.adapter}, ${c.kind}): converted to ${r.table} by adapters/${c.adapter} (${fmt(r.rowsIn)} rows in, ${fmt(r.rowsOut)} out)${r.notes && r.notes.length ? " · " + r.notes.slice(0, 2).join("; ") : ""}.${dropped.length ? ` The adapter left out ${dropped.map(d => `${d.header} (${d.reason})`).join(", ")} before anything was kept.` : ""}`, dropped, adapter: c }; } catch (e) { continue; } }
      return null; }
    let salt = null; const adapterSalt = () => salt || (salt = "tab-" + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2));
    function addParsed(name, parsed0, auto) { let parsed = parsed0, adapterNote = null, adapterDropped = [];
      const via = viaAdapter(name, parsed0); if (via) { if (via.skip) return addError(name, via.note); parsed = via.parsed; adapterNote = via.note; adapterDropped = via.dropped.map(d => ({ header: d.header, reason: d.reason + " (adapter)" })); }
      const det = detect(parsed), f = { id: FILES.length, name, parsed, table: det.t, map: det.map, complete: det.complete, byValues: det.byValues, report: null, used: false, saved: null, adapterNote, adapterDropped, sheet: parsed.sheet, delim: parsed.delim };
      const saved = store.get(f.table)[sig(parsed.headers)] || findSaved(parsed.headers, f); if (saved) { f.table = saved.table || f.table; f.map = {}; Object.entries(saved.map).forEach(([k, h]) => { const i = parsed.headers.indexOf(h); if (i >= 0) f.map[k] = i; }); f.saved = saved.savedAt; f.complete = true; }
      FILES.push(f); if (auto && f.complete) apply(f, true); render(); return f; }
    function findSaved(headers, f) { for (const t of TABLES) { const s = store.get(t)[sig(headers)]; if (s) return { ...s, table: t }; } return null; }
    // detection: the twin's header matching first; when a required field is still missing, try the unmapped columns by the shape of their values
    const looksLike = { number: v => v === "" || !isNaN(+String(v).replace(/[()$,\s]|NZD/gi, "")), int: v => v === "" || !isNaN(+v), date: v => v === "" || /^\d{4}-\d{1,2}-\d{1,2}$|^\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}$/.test(v), datetime: v => v === "" || /^\d{4}-\d{1,2}-\d{1,2}|^\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}/.test(v), bool: v => v === "" || /^(y|yes|n|no|true|false|0|1)$/i.test(v) };
    function detect(parsed) { const d = M.detectTable(parsed.headers), nonPii = parsed.headers.filter(h => !PII_NAME.test(norm(h))).length || 1;
      let best = null; for (const t of TABLES) { const map = t === d.t ? { ...d.map } : M.autoMap(parsed.headers, t), fs = M.CONTRACT[t].fields, used = new Set(Object.values(map)); let added = 0;
        for (const f of fs) { if (map[f.k] != null || !f.req || !looksLike[f.t]) continue;
          const cand = parsed.headers.map((h, i) => i).filter(i => !used.has(i) && !PII_NAME.test(norm(parsed.headers[i])) && parsed.rows.slice(0, 50).every(r => looksLike[f.t](String(r[i] ?? "").trim())) && parsed.rows.slice(0, 50).some(r => String(r[i] ?? "").trim() !== ""));
          if (cand.length === 1) { map[f.k] = cand[0]; used.add(cand[0]); added++; } }
        const req = fs.filter(f => f.req), hit = req.filter(f => map[f.k] != null).length, complete = hit === req.length;
        // required fields found, how much of the file the table explains, and a bonus for a complete match; the twin's own pick wins ties
        const score = hit / req.length + 1.5 * Object.keys(map).length / nonPii + (complete ? 0.15 : 0) - added * 0.01 + (t === d.t ? 1e-6 : 0);
        if (!best || score > best.score) best = { t, map, complete, score, byValues: added }; }
      return best; }

    // ---- validate, strip, emit
    function apply(f, quiet, more) {
      const personal = personalColumns(f.parsed, f.map), drop = new Set(personal.map(p => p.index));
      personal.forEach(p => { if (p.wasMapped) delete f.map[p.wasMapped]; });
      const keep = f.parsed.headers.map((h, i) => i).filter(i => !drop.has(i)), pos = new Map(keep.map((i, j) => [i, j]));
      const stripped = { headers: keep.map(i => f.parsed.headers[i]), rows: f.parsed.rows.map(r => keep.map(i => r[i])), delim: f.parsed.delim }, map = {};
      Object.entries(f.map).forEach(([k, i]) => { if (pos.has(i)) map[k] = pos.get(i); });
      const r = M.validate(stripped, map, f.table); r.pii = []; f.report = r; f.dropped = f.adapterDropped.concat(personal.map(p => ({ header: p.header, reason: p.reason + (p.wasMapped ? `, so it was unmapped from ${p.wasMapped}` : "") })));
      f.rejected = (r.reasons || []).map(x => ({ field: x.k, count: x.n, example: x.ex }));
      const mapping = {}; Object.entries(f.map).forEach(([k, i]) => mapping[k] = f.parsed.headers[i]);
      if (r.ok) { FILES.forEach(x => { if (x !== f && x.table === f.table) x.used = false; }); f.used = true;
        if (!/^sample-/.test(f.name)) { const s = store.get(f.table); s[sig(f.parsed.headers)] = { map: mapping, savedAt: today() }; store.set(f.table, s); }
        emit({ table: f.table, action: "use", rows: r.rows, mapping, asOf: r.range ? r.range[1] : today(), range: r.range, file: f.name, read: r.read, accepted: r.accepted, dropped: { columns: f.dropped, rows: f.rejected, rowCount: r.rejected }, warnings: r.warnings, more: !!more }); }
      else { const was = f.used; f.used = false; if (was) emit({ table: f.table, action: "clear", rows: null, mapping, asOf: today(), file: f.name, dropped: { columns: f.dropped, rows: f.rejected, rowCount: r.rejected }, more: !!more }); }
      if (!quiet) render(); }
    function clear(f, more) { if (f.used) { f.used = false; emit({ table: f.table, action: "clear", rows: null, mapping: {}, asOf: today(), file: f.name, dropped: { columns: [], rows: [] }, more: !!more }); } }
    function loadSamples() { const todo = TABLES.filter(t => !FILES.some(f => f.name === `sample-${t}.csv`)); todo.forEach((t, i) => { const f = addParsed(`sample-${t}.csv`, M.parseCSV(o.sample(t)), false); if (f.complete) apply(f, true, i < todo.length - 1); }); render(); }
    function reset() { FILES.length = 0; render(); emit({ table: null, action: "reset", rows: null, mapping: {}, asOf: today(), dropped: { columns: [], rows: [] } }); }

    // ---- render
    function render() { $("files").innerHTML = FILES.map(f => { if (f.error) return `<div class="cn-file" data-id="${f.id}"><header><b>${esc(f.name)}</b><span class="status">Not read</span></header><div class="report"><span class="bad">${esc(f.error)}</span></div><div class="cn-bar"><button class="btn ghost" type="button" data-act="remove">Remove</button></div></div>`;
      const fs = SCHEMA[f.table].fields, r = f.report, mapped = new Set(Object.values(f.map)), unm = f.parsed.headers.map((h, i) => i).filter(i => !mapped.has(i) && !PII_NAME.test(norm(f.parsed.headers[i])));
      const opts = sel => `<option value="">— not in file —</option>` + f.parsed.headers.map((h, i) => `<option value="${i}" ${sel === i ? "selected" : ""}>${esc(h)}</option>`).join("");
      const freeFields = fs.filter(x => f.map[x.k] == null);
      return `<div class="cn-file" data-id="${f.id}"><header><b>${esc(f.name)}</b><span class="note">${fmt(f.parsed.rows.length)} rows · ${f.parsed.headers.length} columns · ${f.delim === "xlsx" ? `Excel sheet “${esc(f.sheet)}”` : `delimiter “${f.delim === "\t" ? "tab" : f.delim}”`}</span><span class="status ${f.used ? "on" : ""}">${f.used ? "In use" : r ? "Not used" : f.saved ? "Mapping remembered" : "Check the mapping"}</span></header>
        ${f.adapterNote ? `<div class="report"><span class="note">${esc(f.adapterNote)}</span></div>` : ""}
        <div class="cn-row"><label>This file is <select data-k="table">${TABLES.map(t => `<option value="${t}" ${t === f.table ? "selected" : ""}>${esc(SCHEMA[t].n)} (${t})</option>`).join("")}</select></label>
          ${f.saved ? `<span class="note">Mapping remembered from ${esc(f.saved)} on this device · <button type="button" class="cn-link" data-act="forget">forget it</button></span>` : f.byValues ? `<span class="note">${f.byValues} column${f.byValues > 1 ? "s" : ""} matched by the shape of the values: check them below.</span>` : ""}</div>
        <div class="cn-maps">${fs.map(x => `<label class="${x.req ? "req" : ""}" title="${esc(x.desc)}"><span>${x.k}<small>${x.t}</small></span><select data-f="${x.k}">${opts(f.map[x.k])}</select></label>`).join("")}</div>
        ${unm.length ? `<div class="cn-unm"><span class="note">Columns in your file not matched yet:</span>${unm.map(i => `<label><span>${esc(f.parsed.headers[i])}</span><select data-col="${i}"><option value="">leave out</option>${freeFields.map(x => `<option value="${x.k}">→ ${x.k}</option>`).join("")}</select></label>`).join("")}</div>` : ""}
        <div class="cn-bar"><button class="btn solid" type="button" data-act="use">Check and use this file</button><button class="btn ghost" type="button" data-act="remove">Remove</button></div>
        ${r ? `${!r.missing.length && r.read ? `<div class="cn-split" role="img" aria-label="${fmt(r.accepted)} rows used, ${fmt(r.read - r.accepted)} set aside"><i style="width:calc(${r.accepted / r.read * 100}% - 2px)" title="${fmt(r.accepted)} rows used"></i>${r.read > r.accepted ? `<i class="x" style="width:max(4px,calc(${(r.read - r.accepted) / r.read * 100}% - 2px))" title="${fmt(r.read - r.accepted)} rows set aside"></i>` : ""}</div>` : ""}
        <div class="report">${r.missing.length ? `<span class="bad">Missing required columns: ${r.missing.join(", ")}. Map them above.</span>` : `<span class="ok">${fmt(r.accepted)} of ${fmt(r.read)} rows used${r.range ? ` · ${r.range[0]} to ${r.range[1]}` : ""}.</span>`}
          ${f.rejected.length ? `<span class="bad">${fmt(r.rejected)} row${r.rejected === 1 ? "" : "s"} set aside: ${f.rejected.map(x => `${fmt(x.count)} × ${esc(x.example)}`).join("; ")}.</span>` : ""}
          ${(r.warnings || []).map(w => `<span class="warn">${esc(w)}.</span>`).join("")}
          ${f.dropped.length ? `<span class="ok">Left out as personal information before anything was kept: ${f.dropped.map(d => `${esc(d.header)} (${esc(d.reason)})`).join(", ")}.</span>` : `<span class="note">No personal columns found in this file.</span>`}
          ${(r.ignored || []).length ? `<span class="note">Not used: ${r.ignored.map(esc).join(", ")}.</span>` : ""}
          ${/^sample-/.test(f.name) ? `<span class="note">${esc(o.sampleNote || "Sample data made up in this page. It is not any business's.")}</span>` : ""}</div>` : ""}</div>`; }).join("");
      if (o.onRender) o.onRender(); }
    el.addEventListener("change", e => { const card = e.target.closest(".cn-file"); if (!card) return; const f = FILES[+card.dataset.id]; if (!f || f.error) return;
      if (e.target.dataset.k === "table") { clear(f); f.table = e.target.value; f.map = M.autoMap(f.parsed.headers, f.table); f.report = null; f.saved = null; f.byValues = 0; render(); return; }
      if (e.target.dataset.f) { const v = e.target.value; if (v === "") delete f.map[e.target.dataset.f]; else { Object.keys(f.map).forEach(k => { if (f.map[k] === +v) delete f.map[k]; }); f.map[e.target.dataset.f] = +v; } f.report = null; render(); return; }
      if (e.target.dataset.col) { const k = e.target.value; if (k) { f.map[k] = +e.target.dataset.col; f.report = null; render(); } } });
    el.addEventListener("click", e => { const b = e.target.closest("button[data-act]"); if (!b) return; const f = FILES[+b.closest(".cn-file").dataset.id]; if (!f) return;
      if (b.dataset.act === "use") apply(f); else if (b.dataset.act === "forget") { const s = store.get(f.table); delete s[sig(f.parsed.headers)]; store.set(f.table, s); f.saved = null; render(); }
      else { clear(f); FILES.splice(FILES.indexOf(f), 1); FILES.forEach((x, i) => x.id = i); render(); } });
    const readFiles = list => Promise.all([...list].map(readFile));
    $("fileIn").onchange = e => readFiles(e.target.files).then(() => { e.target.value = ""; });
    const drop = $("drop"); ["dragenter", "dragover"].forEach(k => drop.addEventListener(k, e => { e.preventDefault(); drop.classList.add("over"); })); ["dragleave", "drop"].forEach(k => drop.addEventListener(k, e => { e.preventDefault(); drop.classList.remove("over"); }));
    drop.addEventListener("drop", e => readFiles(e.dataTransfer.files));
    $("loadSamples").onclick = loadSamples; $("resetData").onclick = reset;

    // ---- samples: 20 rows in the contract's exact shape (values borrowed from the twin's own invented export where it has them), plus the full export
    let sampleT = o.firstSample || TABLES[0];
    function sample20(t) { const fs = SCHEMA[t].fields, c = M.CONTRACT[t]; let src = null; try { const p = M.parseCSV(o.sample(t)), map = M.autoMap(p.headers, t); src = { p, map }; } catch (e) { }
      const rows = []; if (src) for (let i = 0; i < src.p.rows.length && rows.length < 20; i++) { const one = { headers: src.p.headers, rows: [src.p.rows[i]] }; const v = M.validate(one, src.map, t); if (!v.ok) continue;
        rows.push(fs.map((f, j) => src.map[f.k] != null ? src.p.rows[i][src.map[f.k]] : f.req ? sampleValue(f, i) : "")); }
      for (let i = rows.length; i < 20; i++) rows.push(fs.map(f => sampleValue(f, i)));
      return toCSV(fs.map(f => f.k), rows); }
    $("cnSampleChips").innerHTML = TABLES.map(t => `<button type="button" data-t="${t}" aria-pressed="${t === sampleT}">${t}</button>`).join("");
    const showSample = () => { const txt = o.sample(sampleT), lines = txt.split("\n"); $("sampleText").value = lines.length > 400 ? lines.slice(0, 400).join("\n") + `\n… ${fmt(lines.length - 400)} more rows (Load the sample exports uses all of them)` : txt;
      more.querySelectorAll("#cnSampleChips button").forEach(b => b.setAttribute("aria-pressed", b.dataset.t === sampleT ? "true" : "false")); $("copyState").textContent = ""; };
    $("cnSampleChips").onclick = e => { const b = e.target.closest("button"); if (b) { sampleT = b.dataset.t; showSample(); } };
    $("cnSampleChips").closest("details").addEventListener("toggle", e => { if (e.target.open) showSample(); });
    const download = (name, text) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "text/csv" })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); $("copyState").textContent = `${name} saved to your downloads.`; };
    $("cnDownload").onclick = () => download(`${twin}-${sampleT}-sample-20.csv`, sample20(sampleT));
    $("cnDownloadFull").onclick = () => download(`sample-${sampleT}.csv`, o.sample(sampleT));
    $("copySample").onclick = async () => { try { await navigator.clipboard.writeText(o.sample(sampleT)); $("copyState").textContent = "Copied. Paste it into a .csv file and drop it above."; } catch (e) { $("sampleText").select(); $("copyState").textContent = "Selected: press Ctrl+C or ⌘C to copy."; } };

    return { files: FILES, addText, addParsed, loadSamples, reset, render, sample20, readXlsx, schema: SCHEMA, personalColumns: parsed => personalColumns(parsed, {}) };
  }
  window.ASSEMBL_CONNECT = { mount, readXlsx, personalColumns, fieldsFromSchema, PII_NAME, EVENT: EV };
})();
