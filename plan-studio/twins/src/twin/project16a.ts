import * as THREE from 'three/webgpu';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { strToU8, zipSync } from 'fflate';
import siteJson from './site16a.json';
import planJson from './plan16a.json';
import { Site, toV3, inPoly, type SiteData } from './site';
import { buildHome, HomeFrame, northDeckPolygon, southDeckPolygon, type BuildingSpec, type Drawn, type Placement } from './homes';
import { syntheticCapture } from './scan';
import { planting, type Placement as PlantAt, type Species } from './plants';
import { PALETTES } from './furniture';
import { setInteriorLights } from './fitout';
import { fillSlots } from './library';
import { exportIFC, loadIFC } from './ifc';
import type { App, Built, Key, Layer, Project } from './app';

type Pt = [number, number];
const BASE = import.meta.env.BASE_URL;

export const project16a: Project = {
  key: 'two-timber-homes-16a',
  title: 'Two timber homes (16A)',
  kicker: 'plan to twin',
  lat: -36.87,
  lon: 174.8,
  chips: [
    { text: 'Generated from the plans', tone: 'ok', title: 'Walls, openings and rooms from the plan model; decks and stairs scaled from RC-06; roof from the written pitch' },
    { text: 'Survey traced, not survey-grade', tone: 'warn', title: 'Boundary from surveyed bearings; ground from traced contours and spot levels' },
    { text: 'Levels fitted ±0.2 m', tone: 'warn', title: 'Drawing datum fitted to survey from four boundary levels on the sections' },
  ],
  async build(app: App): Promise<Built> {
    const data = siteJson as unknown as SiteData;
    const site = new Site(data);
    const plan = planJson as unknown as { buildings: BuildingSpec[] };
    const q = app.quality;
    const keys = [
      { key: '16C', spec: plan.buildings[0] },
      { key: '16D', spec: plan.buildings[1] },
    ];
    const frames: Record<string, HomeFrame> = {};
    const placements: Record<string, Placement> = {};
    const decks: Record<string, { north: Pt[]; south: Pt[] }> = {};
    // 1. decks and pads first: the cut ground depends on them
    for (const { key } of keys) {
      const u = data.units[key];
      const pl: Placement = { origin: u.origin, u: u.u, v: u.v, ffl: u.ffl, bearing: u.bearing };
      placements[key] = pl;
      const f = new HomeFrame(pl);
      frames[key] = f;
      const drawn = data.drawn[key] as Drawn;
      const nd = northDeckPolygon(f, drawn, site.yardLimits(key));
      const sd = southDeckPolygon(drawn);
      decks[key] = { north: nd, south: sd };
      const pts: Pt[] = [];
      for (const [uu, vv] of [
        [-0.6, -0.6],
        [11.4, -0.6],
        [11.4, 6.6],
        [-0.6, 6.6],
      ] as Pt[])
        pts.push(f.en(uu, vv));
      for (const [uu, vv] of nd) for (const d of [-0.3, 0.3]) for (const e of [-0.3, 0.3]) pts.push(f.en(uu + d, vv + e));
      site.addPad(key, pts, pl.ffl - 0.45);
    }
    // 2. homes on the cut ground, fitted out with the chosen finishes palette
    const palKey = new URLSearchParams(location.search).get('palette') ?? 'cedar-charcoal';
    const fin = PALETTES[palKey] ?? PALETTES['cedar-charcoal'];
    const homes = new THREE.Group();
    homes.name = 'proposed_homes';
    const homeObjs: Record<string, THREE.Object3D> = {};
    for (const { key, spec } of keys) {
      const h = buildHome({ key, spec, drawn: data.drawn[key] as Drawn, placement: placements[key], limits: site.yardLimits(key), ground: site.ground, quality: q, finishes: fin });
      homeObjs[key] = h;
      homes.add(h);
    }
    app.log('Placing library pieces…');
    await fillSlots(homes);
    const fitouts: THREE.Object3D[] = [];
    homes.traverse((o) => {
      if (o.name === 'fit_out') fitouts.push(o);
    });
    app.onSun.push((night) => setInteriorLights(fitouts, night));

    // 3. survey layer
    const terrain = site.terrain(q);
    const retaining = site.retaining(q);
    const existing = site.existingDwelling(q);
    const lines = site.lines();
    const ground = new THREE.Group();
    ground.name = 'survey_ground';
    ground.add(terrain, retaining);
    // 4. checks
    homes.updateMatrixWorld(true);
    const check = site.check([homes]);
    const perHome = keys.map(({ key }) => {
      const c = site.check([homeObjs[key]]);
      const by = c.breaches.length ? site.envelope(c.worst.at.x, -c.worst.at.z).by : '';
      return { key, n: c.breaches.length, worst: c.worst.over, margin: c.margin, by };
    });
    const pin = new THREE.Group();
    pin.name = 'envelope_breaches';
    for (const b of check.breaches.slice(0, 400)) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xc0392b }));
      s.position.copy(b);
      pin.add(s);
    }
    // where is the tightest point?
    const w = check.worst;
    const env = site.envelope(w.at.x, -w.at.z);
    const runs = (retaining.userData.runs ?? []) as { key: string; length: number; maxH: number }[];

    // 5. support for walking: floors and decks, else the cut ground
    const support = (p: THREE.Vector3) => {
      const e = p.x;
      const n = -p.z;
      for (const { key } of keys) {
        const pl = placements[key];
        const du = (e - pl.origin[0]) * pl.u[0] + (n - pl.origin[1]) * pl.u[1];
        const dv = (e - pl.origin[0]) * pl.v[0] + (n - pl.origin[1]) * pl.v[1];
        if (du >= 0 && du <= 10.8 && dv >= 0 && dv <= 6) return pl.ffl;
        if (inPoly([du, dv], decks[key].north) || inPoly([du, dv], decks[key].south)) return pl.ffl - 0.05;
      }
      return site.ground(e, n);
    };

    // 6. camera keys
    const at = (key: string, u: number, v: number, h: number) => {
      const [e, n] = frames[key].en(u, v);
      return toV3(e, n, placements[key].ffl + h);
    };
    const onGround = (e: number, n: number, h = 1.6) => toV3(e, n, site.ground(e, n) + h);
    const B = data.boundary;
    const path: Key[] = [
      { label: 'Aerial', eye: toV3(-14, -46, 78), look: toV3(22, -14, 48) },
      { label: 'Driveway', eye: onGround(43, -30.5), look: onGround(22, -12, 1.2) },
      { label: 'Path to 16C', eye: onGround(9.5, -16), look: at('16C', 3, 6, 1.2) },
      { label: '16C south side', eye: at('16C', -2.2, 10.5, 1.2), look: at('16C', 5.2, 5.2, 1.0) },
      { label: '16C living', eye: at('16C', 4.9, 4.9, 1.6), look: at('16C', 5.3, -1.5, 1.4) },
      { label: '16C north deck', eye: at('16C', 1.2, -2.0, 1.55), look: at('16C', 10.5, 0.2, 1.4) },
      { label: 'Rear boundary', eye: toV3(B.NE[0] - 6, B.NE[1] + 6, 58), look: at('16D', 9, 0, 1) },
    ];

    // 7. panels
    const checks = document.createElement('section');
    checks.className = 'card';
    const margin = check.margin;
    checks.innerHTML = `<h3>Checks</h3>
      <p><b>Height in relation to boundary and 8 m height.</b> ${perHome
        .map((h) =>
          h.n
            ? `<span class="bad">${h.key}: roof above the envelope at ${h.n} sampled points, up to ${(h.worst * 1000).toFixed(0)} mm (${h.by}).</span>`
            : `${h.key}: inside the envelope, tightest margin ${h.margin.toFixed(2)} m.`,
        )
        .join(' ')} RC-06 itself marks small areas "exceeding HIRB" at the north-east corners. This check samples the roof surfaces against HIRB from surveyed ground at each side and rear boundary; it is indicative, not a compliance assessment, and depends on the fitted datum (±0.2 m).</p>
      <p><b>Levels.</b> Drawing RLs sit ${data.datumOffset.toFixed(2)} m above survey datum (fitted, sd 0.22 m). 16C floor RL ${data.units['16C'].ffl.toFixed(2)}, 16D floor RL ${data.units['16D'].ffl.toFixed(2)} (drawings 507.700 and 507.320).</p>
      <p><b>Placement.</b> Long sides at bearings ${data.units['16C'].bearing.toFixed(1)}° and ${data.units['16D'].bearing.toFixed(1)}°. The Plan to 4D model treats the sheet top as north; it is rotated ${(90 - data.units['16C'].bearing).toFixed(0)}° from true north.</p>
      <p><b>Earthworks (assumed).</b> Ground cut to 0.45 m below each floor under the homes and decks (subfloor clearance). Retaining: ${runs.map((r) => `${r.key} ${r.length} m, up to ${r.maxH} m high`).join('; ') || 'none'}.</p>`;

    // 7b. planting: the plan model's proposals (moved from its sheet frame onto the true site), plus the surveyed trees
    const plantLayer = () => {
      const pj = (planJson as unknown as { planting: Record<string, unknown> }).planting;
      const list: PlantAt[] = [];
      const f = frames['16C'];
      const blocked = (e: number, n: number) => {
        if (!inPoly([e, n], site.lot)) return true;
        if (data.impervious.polys.some((p) => inPoly([e, n], p))) return true;
        for (const { key } of keys) {
          const pl = placements[key];
          const du = (e - pl.origin[0]) * pl.u[0] + (n - pl.origin[1]) * pl.u[1];
          const dv = (e - pl.origin[0]) * pl.v[0] + (n - pl.origin[1]) * pl.v[1];
          if (du > -1.2 && du < 12 && dv > -1.2 && dv < 8.2) return true;
          if (inPoly([du, dv], decks[key].north)) return true;
        }
        const ex = data.existing.outline;
        if (inPoly([e, n], ex)) return true;
        return false;
      };
      const add = (sp: Species, mx: number, mz: number, sc = 1) => {
        const [e, n] = f.en(mx + 12, mz + 5.5);
        if (blocked(e, n)) return;
        list.push({ sp, x: e, y: site.ground(e, n) - 0.02, z: -n, s: sc });
      };
      const map: Record<string, Species> = { harakeke: 'harakeke', tikouka: 'tikouka', tussock: 'tussock', hebe: 'hebe', toetoe: 'tussock' };
      for (const [k, arr] of Object.entries(pj)) {
        if (k === 'note' || !Array.isArray(arr)) continue;
        for (const it of arr as unknown[]) {
          if (Array.isArray(it)) add(map[k], it[0], it[1]);
          else {
            const o = it as { at: [number, number]; s?: number };
            add(map[k], o.at[0], o.at[1], o.s ?? 1);
          }
        }
      }
      // a native edge along each north deck's retaining wall and beside the south decks (proposed, not drawn)
      for (const { key } of keys) {
        const fr = frames[key];
        const nd = decks[key].north;
        for (let i = 0; i < 9; i++) {
          const u = -0.6 + i * 1.4;
          const [e, n] = fr.en(u, 7.9 + (i % 2) * 0.5);
          if (!blocked(e, n) || inPoly([e, n], site.lot)) {
            const sp: Species = i % 3 === 0 ? 'harakeke' : i % 3 === 1 ? 'carex' : 'fern';
            if (inPoly([e, n], site.lot) && !data.impervious.polys.some((p) => inPoly([e, n], p))) list.push({ sp, x: e, y: site.ground(e, n) - 0.02, z: -n, s: 0.9 });
          }
        }
        void nd;
      }
      const g = planting(list, 'Proposed planting from the plan model (not on the drawings), moved onto the surveyed site; positions shifted where they would sit on a building, deck or the drive.');
      const trees = planting(
        data.trees.map(([e, n]) => ({ sp: 'coprosma' as Species, x: e, y: site.existing(e, n), z: -n, s: 3.2 })),
        'Existing tree on the survey; species not recorded, drawn as a generic native canopy.',
        'survey',
      );
      trees.name = 'existing_trees';
      g.add(trees);
      app.log(`Planting: ${list.length} proposed plants and ${data.trees.length} surveyed trees.`);
      return g;
    };

    const finPanel = document.createElement('section');
    finPanel.className = 'card';
    finPanel.innerHTML = `<h3>Finishes and fit-out</h3><label class="slider">Palette <select id="palette">${Object.entries(PALETTES)
      .map(([k, v]) => `<option value="${k}" ${k === palKey ? 'selected' : ''}>${v.name}</option>`)
      .join('')}</select></label><p class="small">Rooms are furnished from their names in the plan model: beds and wardrobes, sofa and rug, dining setting, kitchen joinery, bathroom fixtures. Pieces from the Kōwhai Studio library are used where they fit; the rest are assembl's own. All proposed, not drawn.</p><div class="row wrap"><button class="pill" id="evening">See it at dusk</button></div>`;
    finPanel.querySelector('#palette')!.addEventListener('change', (e) => {
      const u = new URL(location.href);
      u.searchParams.set('palette', (e.target as HTMLSelectElement).value);
      location.href = u.toString();
    });
    finPanel.querySelector('#evening')!.addEventListener('click', () => {
      const d = document.getElementById('sundate') as HTMLInputElement;
      const t = document.getElementById('suntime') as HTMLInputElement;
      d.value = `${new Date().getFullYear()}-12-21`;
      t.value = '21.5';
      t.dispatchEvent(new Event('input'));
    });

    // 8. layers
    const layers: Layer[] = [
      { id: 'homes', label: 'Proposed homes', note: 'generated from the plan model', visible: true, object: homes, model: true },
      { id: 'ground', label: 'Survey ground', note: 'cut to pads, with retaining', visible: true, object: ground },
      { id: 'existing', label: 'Existing dwelling', note: 'massing only', visible: true, object: existing },
      { id: 'planting', label: 'Native planting', note: 'proposed in the plan model; trees from the survey', visible: true, make: plantLayer },
      { id: 'lines', label: 'Boundary, contours, services', visible: true, object: lines, traced: false },
      { id: 'envelope', label: 'Planning envelope', note: 'HIRB 2.5 m + 45°, 8 m', visible: false, make: () => {
        const g = site.envelopeMesh();
        g.add(pin);
        return g;
      }, traced: false },
      {
        id: 'capture',
        label: 'Site capture (simulated)',
        note: 'splats generated from the survey, not a scan',
        visible: false,
        traced: false,
        make: () => syntheticCapture(site, { density: q === 'hq' ? 1.4 : 0.8 }),
      },
      {
        id: 'ifc',
        label: 'Plan to 4D IFC (overlay)',
        note: 'aligned to true north',
        visible: false,
        model: true,
        make: async () => {
          const txt = await (await fetch(`${BASE}twin/16a-plan-to-4d-ifc.txt`)).text();
          const res = await loadIFC(new TextEncoder().encode(txt), `${BASE}twin/web-ifc.wasm.b64.txt`, (d, t) => app.log(`Reading IFC… ${d} of ${t}`), false);
          const g = new THREE.Group();
          g.name = 'plan_to_4d_ifc';
          const f = frames['16C'];
          const [e, n] = f.en(12, 5.5);
          g.position.set(e, placements['16C'].ffl - 1.2, -n);
          g.rotation.y = f.rotationY;
          res.root.traverse((o) => {
            const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
            if (m && !m.userData.overlay) {
              m.transparent = true;
              m.opacity = Math.min(m.opacity, 0.55);
              m.color.lerp(new THREE.Color(0x7aa6c2), 0.5);
              m.userData.overlay = true;
            }
          });
          g.add(res.root);
          g.updateMatrixWorld(true);
          // where does the model's 16D land against the survey placement?
          const [e2, n2] = f.en(13, 5.5);
          const o2 = data.units['16D'].origin;
          const dev = Math.hypot(e2 - o2[0], n2 - o2[1]);
          app.log(`IFC overlaid: ${res.elements} elements, ${res.schema}. Aligned on 16C; its 16D lands ${dev.toFixed(2)} m from the surveyed position.`);
          g.userData = { kind: 'overlay', name: 'Plan to 4D IFC', source: 'scaled', note: `Rotated ${(90 - placements['16C'].bearing).toFixed(1)}° to true north and placed on 16C; 16D lands ${dev.toFixed(2)} m from the survey placement.` };
          return g;
        },
      },
    ];

    // 9. exports
    const readme = () =>
      [
        'Two timber homes (16A): generated twin',
        '',
        'Generated in three.js r187 from the plan model (assembl.plan-model.v1) and the draft resource-consent drawings, placed on ground traced from the topographical survey.',
        '',
        'Coordinates: metres; x east, y = RL (Auckland 1946 MSL), z = −north; origin at the lot north-west corner.',
        `Drawing RLs = survey RL + ${data.datumOffset.toFixed(3)} m (fitted; see site-twin.json derivation).`,
        '',
        'Every element carries its provenance in glTF extras / IFC: written (on the drawings), scaled (measured from the drawings), assumed, proposed (by assembl), survey.',
        '',
        'Not for construction. The survey was traced from a printed copy and is not survey-grade. Verify all dimensions and levels.',
      ].join('\n');
    const exports: Built['exports'] = [
      {
        label: 'Homes (GLB)',
        note: 'Both homes as one self-contained GLB with PBR textures and element data, zipped',
        run: async () => {
          const glb = (await new GLTFExporter().parseAsync(homes, { binary: true, onlyVisible: true })) as ArrayBuffer;
          const z = zipSync({ 'two-timber-homes-16a.glb': new Uint8Array(glb), 'README.txt': strToU8(readme()) }, { level: 6 });
          return { name: 'two-timber-homes-16a-glb.zip', blob: new Blob([z as BlobPart], { type: 'application/zip' }) };
        },
      },
      {
        label: 'Homes and walls (IFC)',
        note: 'IFC4 with walls, doors, windows, roof, decks, piles and retaining walls, zipped',
        run: async () => {
          const g = new THREE.Group();
          g.add(homes.clone(true), retaining.clone(true));
          g.updateMatrixWorld(true);
          const ifc = exportIFC(g, { project: 'Two timber homes (16A)', building: 'Units 16C and 16D', author: 'assembl' });
          const z = zipSync({ 'two-timber-homes-16a.ifc': strToU8(ifc), 'README.txt': strToU8(readme()) }, { level: 6 });
          return { name: 'two-timber-homes-16a-ifc.zip', blob: new Blob([z as BlobPart], { type: 'application/zip' }) };
        },
      },
      {
        label: 'Site data (JSON)',
        note: 'Boundary, terrain grid, contours, placement, datum fit and the envelope check',
        run: async () => {
          const out = { ...data, check: { breaches: check.breaches.length, tightestMargin: +margin.toFixed(3), tightestAt: [w.at.x, w.at.y, w.at.z], governedBy: env.by, perHome }, retaining: runs };
          return { name: 'two-timber-homes-16a-site.json', blob: new Blob([JSON.stringify(out, null, 1)], { type: 'application/json' }) };
        },
      },
    ];

    const lbl = (key: string) => at(key, 5.4, 3, 4.2);
    const ex = data.existing.west.rect;
    const exC: Pt = [(ex[0][0] + ex[2][0]) / 2, (ex[0][1] + ex[2][1]) / 2];
    return {
      layers,
      focus: toV3(22, -16, 48),
      radius: 34,
      view: { eye: toV3(-8, -52, 72), look: toV3(20, -12, 49) },
      path,
      section: [placements['16D'].ffl - 0.5, placements['16C'].ffl + 4],
      labels: [
        { text: '16C', at: lbl('16C') },
        { text: '16D', at: lbl('16D') },
        { text: 'Existing 16A · 16B', at: toV3(exC[0] + 3, exC[1], 54.2) },
      ],
      probe: (p) => {
        const e = p.x;
        const n = -p.z;
        const ex0 = site.existing(e, n);
        const pr = site.ground(e, n);
        const en = site.envelope(e, n);
        const rows: [string, string][] = [['Surveyed ground here', `RL ${ex0.toFixed(2)}${Math.abs(pr - ex0) > 0.01 ? ` (cut to ${pr.toFixed(2)})` : ''}`]];
        if (inPoly([e, n], site.lot)) rows.push(['Envelope here', `RL ${en.H.toFixed(2)}, ${en.by}; ${(en.H - p.y).toFixed(2)} m above this point`]);
        return rows;
      },
      support,
      panels: [finPanel, checks],
      exports,
      sources: [
        'Draft resource-consent set, issue A, 12 May 2025, by the project architect: RC-02 survey, RC-04 site plan, RC-05 area plan, RC-06 plans, RC-07 sections, RC-08/09 elevations. Marked "for information only".',
        'Topographical survey 1983/TO (1:200; Mt Eden 2000; levels LINZ MSL Auckland 1946), as reproduced on RC-02.',
        'Plan model "two-units" (assembl.plan-model.v1) from Plan to 4D: walls, openings, partitions, rooms.',
        'Auckland Unitary Plan H4 Mixed Housing Suburban rules as summarised on RC-03: 8 m height; HIRB 2.5 m + 45°; 1 m side and rear yards.',
        'Materials are procedural PBR from the assembl objects library. Cladding, roofing and joinery finishes follow the RC-08/09 keys (VT, RS, DW, TD); colours are assumed.',
      ],
      north: new THREE.Vector2(0, -1),
    };
  },
};
