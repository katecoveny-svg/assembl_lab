// live-bridge.ts
import * as THREE2 from "./served-three-adapter.mjs";

// linzSiteContext.ts
import * as THREE from "./served-three-adapter.mjs";
var finitePair = (v) => Array.isArray(v) && v.length >= 2 && typeof v[0] === "number" && typeof v[1] === "number" && Number.isFinite(v[0]) && Number.isFinite(v[1]) && v[0] > 8e5 && v[0] < 29e5 && v[1] > 35e5 && v[1] < 7e6;
var line = (a) => Array.isArray(a) && a.length >= 2 && a.length <= 16e3 && a.every(finitePair);
function polygonRings(p) {
  if (!p || !Array.isArray(p.coordinates)) return [];
  return (p.type === "Polygon" ? p.coordinates : p.type === "MultiPolygon" ? p.coordinates.flat(1) : []).filter(line);
}
async function readSiteContext(lat, lon, signal, fetcher = fetch) {
  try {
    const r = await fetcher("/api/garden-site", { method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.any([signal, AbortSignal.timeout(14e3)]), cache: "no-store", body: JSON.stringify({ mode: "context", lat, lon }) });
    if (!r.ok) return null;
    const a = await r.json();
    if (a.crs !== "EPSG:2193" || !("roads" in a)) return null;
    const roads = [];
    for (const row of Array.isArray(a.roads?.lines) ? a.roads.lines.slice(0, 50) : []) {
      const name = typeof row?.name === "string" ? row.name.trim().slice(0, 100) : "", g = row?.geometry;
      if (name && g?.type === "LineString" && line(g.coordinates)) roads.push({ name, geometry: g });
      else if (name && g?.type === "MultiLineString" && Array.isArray(g.coordinates)) roads.push({ name, geometry: { type: "MultiLineString", coordinates: g.coordinates.filter(line).slice(0, 30) } });
    }
    return {
      fetched: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
      parcel: polygonRings(a.parcel),
      parcelStatus: a.parcelStatus === "unavailable" ? "unavailable" : "read",
      roofs: (Array.isArray(a.buildings) ? a.buildings : []).slice(0, 60).flatMap(polygonRings),
      property: (Array.isArray(a.property?.outlines) ? a.property.outlines : []).slice(0, 8).flatMap(polygonRings),
      roads,
      roadStatus: a.roads?.status === "available" ? "read" : "unavailable",
      roofStatus: Array.isArray(a.buildings) ? "read" : "unavailable"
    };
  } catch (e) {
    if (signal.aborted) throw e;
    return null;
  }
}
function siteContextStatus(c) {
  if (!c) return "The combined LINZ parcel, roof and road view was unavailable. None of those layers is guessed.";
  return `Read ${c.fetched} (lookup date): ${c.parcel.length ? "primary parcel (50772)" : c.parcelStatus === "unavailable" ? "primary parcel unavailable" : "no primary parcel mapped here"}, ${c.roofStatus === "read" ? c.roofs.length + " roof outline rings (101290)" : "roof outlines unavailable"}, ${c.roadStatus === "read" ? [...new Set(c.roads.map((r) => r.name))].length + " named road(s) (123110)" : "named roads unavailable"}${c.property.length ? ", property outlines (122657)" : ""}. LINZ Data Service, CC BY 4.0. Mapped context, not a survey, current building height, road formation or legal access.`;
}
function clipLine(a, b, cx, cz, half) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  let t0 = 0, t1 = 1;
  for (const [p, q] of [[-dx, a[0] - (cx - half)], [dx, cx + half - a[0]], [-dz, a[1] - (cz - half)], [dz, cz + half - a[1]]]) {
    if (!p) {
      if (q < 0) return null;
      continue;
    }
    const t = q / p;
    if (p < 0) t0 = Math.max(t0, t);
    else t1 = Math.min(t1, t);
    if (t0 > t1) return null;
  }
  return [[a[0] + dx * t0, a[1] + dz * t0], [a[0] + dx * t1, a[1] + dz * t1]];
}
function clearLinzScene(root2) {
  for (const ob of [...root2.children]) {
    root2.remove(ob);
    ob.traverse((o) => {
      const x = o;
      if ("geometry" in x && !x.isSprite) x.geometry?.dispose();
      if (x.material && !Array.isArray(x.material)) {
        x.material.map?.dispose();
        x.material.dispose();
      }
    });
  }
}
function drawLinzScene(root2, c, transform, yAt, square, showParcel = false) {
  clearLinzScene(root2);
  if (!c) return;
  const { cx, cz, size } = square, half = size / 2 - 1;
  const collected = (rings, lift) => {
    const out = [], marks = [];
    for (const r of rings) for (let i = 1; i < r.length && out.length < 9e4; i++) {
      const s = clipLine(transform(...r[i - 1]), transform(...r[i]), cx, cz, half);
      if (!s) continue;
      const [a, b] = s, L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (L < 0.1) continue;
      const steps = Math.min(140, Math.ceil(L / 1.5));
      marks.push({ length: L, centre: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] });
      let previous = null;
      for (let j = 0; j <= steps; j++) {
        const t = j / steps, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t, y = yAt(x, z);
        const v = Number.isFinite(y) ? [x, y + lift, z] : null;
        if (v && previous) out.push(...previous, ...v);
        previous = v;
      }
    }
    return { out, marks };
  };
  const show = (label, data2, color) => {
    if (!data2.length) return;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(data2, 3));
    const ob = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9, fog: false, toneMapped: false }));
    ob.name = label;
    root2.add(ob);
  };
  if (showParcel) show("Primary parcels \xB7 LINZ 50772", collected(c.parcel, 0.16).out, 16761220);
  show("Existing roof outlines \xB7 LINZ 101290", collected(c.roofs, 0.18).out, 16769698);
  show("Property boundaries \xB7 LINZ 122657", collected(c.property, 0.24).out, 12082037);
  const roadData = [], labelPositions = /* @__PURE__ */ new Map();
  for (const road of c.roads) {
    const r = road.geometry, stats = collected(r.type === "LineString" ? [r.coordinates] : r.coordinates, 0.19);
    roadData.push(...stats.out);
    for (const mark of stats.marks) if (mark.length > (labelPositions.get(road.name)?.length ?? 0)) labelPositions.set(road.name, mark);
  }
  show("Named road centrelines \xB7 LINZ 123110", roadData, 10414079);
  for (const [name, m] of [...labelPositions].sort((a, b) => b[1].length - a[1].length).slice(0, 10)) {
    const canvas = document.createElement("canvas");
    canvas.height = 80;
    canvas.width = 512;
    const x2 = canvas.getContext("2d");
    if (!x2) continue;
    x2.font = "bold 36px system-ui";
    const w = Math.min(500, Math.ceil(x2.measureText(name).width) + 36);
    x2.fillStyle = "#221b21ed";
    x2.beginPath();
    x2.roundRect((512 - w) / 2, 14, w, 52, 9);
    x2.fill();
    x2.fillStyle = "#e5f8ff";
    x2.textAlign = "center";
    x2.textBaseline = "middle";
    x2.fillText(name, 256, 41, 480);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, fog: false }));
    const [x, z] = m.centre, y = yAt(x, z);
    if (!Number.isFinite(y)) {
      tex.dispose();
      label.material.dispose();
      continue;
    }
    label.name = name;
    label.position.set(x, y + 2.1, z);
    label.scale.set(13, 2.03, 1);
    root2.add(label);
  }
}

// ../twin/linz/nztm.js
var F = 1 / 298.257222101;
var LON0 = 173 * Math.PI / 180;
var E2 = 2 * F - F * F;
var EP2 = E2 / (1 - E2);
function gridConvergence(latDeg, lonDeg) {
  const lat = latDeg * Math.PI / 180, w = lonDeg * Math.PI / 180 - LON0;
  return Math.atan(Math.tan(w) * Math.sin(lat)) * 180 / Math.PI;
}

// live-bridge.ts
var $ = (sel) => document.querySelector(sel);
var safe = (p) => Number.isFinite(p?.lat) && Number.isFinite(p?.lon) && p.lat < -33 && p.lat > -48 && p.lon > 165 && p.lon < 180;
var root = null;
var scene;
var data = null;
var chosen = null;
var lastGround = null;
var loaded = null;
var read = null;
var box = null;
var note = null;
var sw = null;
var above = null;
var activeRegisteredGround = null;
var monitor;
var unavailable = false;
function addUI() {
  if (box?.isConnected) return;
  const facts = $("#siteFacts");
  if (!facts) return;
  box = document.createElement("section");
  box.id = "linz-site-context";
  box.style.cssText = "border-top:1px solid var(--line);padding-top:12px;margin-top:10px";
  box.innerHTML = '<h3>Map layers on this site</h3><label class="small"><input id="linz-context-visible" type="checkbox" checked> Show LINZ site context</label> <button class="pill" type="button" id="linz-context-view" disabled>View site from above</button><p class="small" id="linz-context-status" role="status">Pick a New Zealand address in Site facts to see the parcel, existing roofs and named roads.</p><p class="small" aria-label="Map layer colours"><span style="color:#9d6329">Amber \xB7 roof and parcel</span> <span style="color:#a44e65">Rose \xB7 property boundary</span> <span style="color:#28657d">Blue \xB7 named road centreline</span></p><p class="small">Sources: <a href="https://data.linz.govt.nz/layer/50772-nz-primary-parcels/" target="_blank" rel="noopener noreferrer">Primary Parcels</a> \xB7 <a href="https://data.linz.govt.nz/layer/101290-nz-building-outlines/" target="_blank" rel="noopener noreferrer">Building Outlines</a> \xB7 <a href="https://data.linz.govt.nz/layer/123110-nz-addresses-roads/" target="_blank" rel="noopener noreferrer">Named Roads</a> \xB7 <a href="https://data.linz.govt.nz/layer/122657-nz-property-boundaries/" target="_blank" rel="noopener noreferrer">Property Boundaries</a></p>';
  const factsOut = facts.querySelector("#sfOut");
  if (factsOut) factsOut.before(box);
  else facts.append(box);
  note = box.querySelector("#linz-context-status");
  sw = box.querySelector("#linz-context-visible");
  for (const selector of ["#sgNote", "#mgNote"]) {
    const privacy = $(selector);
    if (privacy?.textContent?.includes("server is not asked")) privacy.textContent = "This browser reads LINZ elevation files directly. Only the coordinates go to the Lab site lookup for the parcel, roofs and roads. Your model file is not sent.";
  }
  sw?.addEventListener("change", () => {
    if (root) root.visible = !!sw?.checked;
  });
  above = box.querySelector("#linz-context-view");
  above?.addEventListener("click", () => {
    const app = window.__twin, g = activeRegisteredGround;
    if (!g || !app?.camera || !app.controls?.target) return;
    if (sw && !sw.checked) {
      sw.checked = true;
      if (root) root.visible = true;
    }
    const { cx, cz, size } = g.square, y = g.yAt(cx, cz);
    if (!Number.isFinite(y)) return;
    const narrow = innerWidth < 680, r = size * (narrow ? 0.82 : 0.66);
    app.camera.position.set(cx + r * 0.35, y + r, cz + r * 0.41);
    app.controls.target.set(cx, y, cz);
    app.controls.update();
    if (narrow) document.querySelector("#c")?.scrollIntoView({ block: "nearest" });
  });
}
function update() {
  if (!note || !chosen) return;
  if (!loaded) {
    const own = !!$("#siteGround [hidden] #sgWhere");
    note.textContent = own ? "This sample carries its own survey. The site overlay will not replace it or assume that it matches this address. Use your own plan or a model that can be placed at that address." : read ? "Reading LINZ map layers for the chosen site\u2026" : "Registering the ground first. The map layers only appear when the model is placed on this address.";
    return;
  }
  const tail = data && !lastGround ? " Waiting for ground registered to this address before drawing these layers in 3D." : "";
  const why = unavailable || !data ? " Saved plans with their own survey are not automatically realigned." : "";
  note.textContent = siteContextStatus(data) + tail + why;
}
function same(a, b) {
  return !!a && !!b && Math.abs(a.lat - b.lat) < 5e-6 && Math.abs(a.lon - b.lon) < 5e-6;
}
function change(p) {
  if (!safe(p) || same(chosen, p)) return;
  chosen = p;
  loaded = null;
  data = null;
  unavailable = false;
  lastGround = null;
  if (root) clearLinzScene(root);
  read?.abort();
  read = null;
  update();
}
function lookup(p) {
  const ac = new AbortController();
  read = ac;
  update();
  readSiteContext(p.lat, p.lon, ac.signal).then((r) => {
    if (ac.signal.aborted) return;
    loaded = p;
    data = r;
    unavailable = !r;
    sync();
    update();
  }).catch(() => {
    if (!ac.signal.aborted) {
      loaded = p;
      unavailable = true;
      update();
    }
  });
}
function planGround(raw) {
  const T = raw?.applied?.terrain, s = raw?.store;
  if (!T?.heights || !s?.point || !s?.placement) return null;
  const [cx, cz] = T.centre, P = s.placement, { lat, lon } = s.point;
  const yStep = T.size / (T.n - 1);
  const th = P.turnDeg * Math.PI / 180, gam = gridConvergence(lat, lon) * Math.PI / 180;
  const nX = Math.sin(th), nZ = -Math.cos(th), eX = Math.cos(th), eZ = Math.sin(th);
  const A0 = { e: s.point.e + P.east, n: s.point.n + P.north };
  return {
    point: { lat, lng: lon },
    square: { cx, cz, size: T.size },
    store: s,
    applied: raw.applied,
    toScene: (e, n) => {
      const de = (e - A0.e) * Math.cos(gam) + (n - A0.n) * Math.sin(gam), dn = -(e - A0.e) * Math.sin(gam) + (n - A0.n) * Math.cos(gam);
      return [cx + de * eX + dn * nX, cz + de * eZ + dn * nZ];
    },
    yAt: (x, z) => {
      const cx0 = (x - cx + T.size / 2) / yStep, cz0 = (z - cz + T.size / 2) / yStep, i = Math.floor(cx0), j = Math.floor(cz0);
      if (i < 0 || j < 0 || i >= T.n - 1 || j >= T.n - 1) return NaN;
      const fx = cx0 - i, fz = cz0 - j, k = j * T.n + i, H = T.heights;
      return H[k] * (1 - fx) * (1 - fz) + H[k + 1] * fx * (1 - fz) + H[k + T.n] * (1 - fx) * fz + H[k + T.n + 1] * fx * fz;
    }
  };
}
function sync() {
  addUI();
  const w = window, app = w.__twin;
  if (!app?.scene || !w.__twin?.built || !box) return;
  if (scene !== app.scene) {
    if (root) {
      clearLinzScene(root);
      scene?.remove(root);
    }
    scene = app.scene;
    root = new THREE2.Group();
    root.name = "linz_map_layers_50772_101290_123110";
    root.visible = !!sw?.checked;
    scene.add(root);
    lastGround = null;
  }
  const m = w.__site?.ground?.(), raw = m ?? w.__ground;
  const g = m ?? planGround(raw), point = g?.point ? { lat: g.point.lat, lon: g.point.lng } : null;
  if (point && !chosen) change(point);
  if (!point || !same(point, chosen) || !g || !root) {
    activeRegisteredGround = null;
    if (above) above.disabled = true;
    if (lastGround && root) {
      clearLinzScene(root);
      lastGround = null;
      update();
    }
    return;
  }
  activeRegisteredGround = g;
  if (above) above.disabled = !data;
  if (!read && !loaded && chosen) lookup(chosen);
  if (data && raw !== lastGround) {
    lastGround = raw;
    try {
      drawLinzScene(root, data, g.toScene, g.yAt, g.square, !g.applied?.features?.length);
      update();
    } catch {
      clearLinzScene(root);
      if (note) note.textContent = siteContextStatus(data) + " Unable to draw the overlay in this viewer.";
    }
  }
}
addEventListener("assembl:site-facts", (ev) => {
  const p = { lat: ev.detail?.lat, lon: ev.detail?.lon };
  if (!safe(p)) return;
  change(p);
  const held = window.__ground?.store?.point;
  if (held && !same(held, p)) {
    const input = $("#sgWhere"), go = $("#sgGo");
    if (input && go && !go.disabled && !go.closest("[hidden]")) {
      input.value = `${p.lat}, ${p.lon}`;
      go.click();
    }
  }
}, false);
function start() {
  if (monitor == null) monitor = window.setInterval(() => {
    if (!document.hidden) sync();
  }, 400);
  sync();
}
addEventListener("pagehide", () => {
  if (monitor != null) {
    clearInterval(monitor);
    monitor = void 0;
  }
  read?.abort();
  read = null;
});
addEventListener("pageshow", start);
start();
