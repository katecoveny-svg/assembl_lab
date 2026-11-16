import * as THREE from 'three/webgpu';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { strToU8, zipSync } from 'fflate';
import { buildHome, type BuildingSpec, type Placement } from './homes';
import { toFinishes } from './furniture';
import { complete, fromURL, PRESETS } from './finishes';
import { finishesPanel } from './finishesUI';
import { setInteriorLights } from './fitout';
import { fillSlots } from './library';
import { planting, type Species } from './plants';
import { twinMats } from './mats';
import { exportIFC, loadIFC } from './ifc';
import type { App, Built, Key, Layer, Project } from './app';

// The tool's front door: drop a plan model (assembl.plan-model.v1, as Plan to 4D saves it) and
// get a furnished, finished twin to render. An IFC or GLB (from Revit, ArchiCAD or Blender) is
// shown as it is, on the same stage, with the same sun, inspector, stills and fly-through.

const BASE = import.meta.env.BASE_URL;

interface PlanModel {
  schema?: string;
  job?: { title?: string; nickname?: string; what?: string };
  north?: { deg?: number };
  site?: { fall?: { at: [number, number]; y: number; slopeX: number; slopeZ: number } };
  buildings: (BuildingSpec & { origin: [number, number]; floorLevel?: number })[];
  planting?: Record<string, unknown>;
}

type Input = { kind: 'plan'; plan: PlanModel; name: string } | { kind: 'ifc' | 'glb'; bytes: ArrayBuffer; name: string };

const KEEP = 'assembl-twin-dropped-plan';

async function fromShare(id: string): Promise<{ plan: PlanModel; name: string } | null> {
  try {
    const m = await (await fetch(`https://lab.assembl.co.nz/api/twin-share?id=${encodeURIComponent(id)}`)).json();
    if (!m?.planUrl) return null;
    const plan = (await (await fetch(m.planUrl)).json()) as PlanModel;
    return plan?.buildings ? { plan, name: m.title ?? 'Shared plan' } : null;
  } catch {
    return null;
  }
}

async function chooser(app: App): Promise<{ input: Input; palette: string }> {
  // a shared link: rebuild the plan that was shared
  const sid = new URLSearchParams(location.search).get('share');
  if (sid) {
    app.log('Opening the shared plan…');
    const got = await fromShare(sid);
    if (got) return { input: { kind: 'plan', plan: got.plan, name: got.name }, palette: 'cedar-charcoal' };
    app.log('That shared plan could not be loaded; drop a file instead.');
  }
  // applying a finishes schedule reloads the page: reuse the plan model dropped before it
  if (new URLSearchParams(location.search).has('fin')) {
    try {
      const kept = JSON.parse(sessionStorage.getItem(KEEP) ?? 'null') as { plan: PlanModel; name: string } | null;
      if (kept?.plan?.buildings) return Promise.resolve({ input: { kind: 'plan', plan: kept.plan, name: kept.name }, palette: 'cedar-charcoal' });
    } catch {
      /* storage unavailable: ask again */
    }
  }
  return new Promise((resolve) => {
    const stage = app.canvas.parentElement!;
    const o = document.createElement('div');
    o.className = 'dropzone';
    o.innerHTML = `<div class="card drop-card">
      <h2>Drop a plan, get a twin</h2>
      <p>Drop a <b>plan model</b> (.json from Plan to 4D) and the houses are generated from it: walls, openings, roof, decks, then every room furnished from its name and finished in the palette you pick. Drop an <b>IFC</b> or <b>GLB</b> from Revit, ArchiCAD or Blender and it is shown as it is.</p>
      <label class="slider">Finishes <select id="dropPalette">${Object.entries(PRESETS)
        .map(([k, v]) => `<option value="${k}">${v.name}</option>`)
        .join('')}</select></label>
      <div class="row wrap"><label class="pill solid" tabindex="0">Choose a file<input type="file" id="dropFile" accept=".json,.ifc,.glb,.gltf" hidden></label><button class="pill" id="dropSample">Try the 16A plan model</button></div>
      <p class="small">Raster PDFs: calibrate and trace them in Plan to 4D first; it saves the plan model this page reads. Nothing you drop leaves your browser.</p>
    </div>`;
    stage.append(o);
    const pal = () => (o.querySelector('#dropPalette') as HTMLSelectElement).value;
    const done = (input: Input) => {
      o.remove();
      if (input.kind === 'plan')
        try {
          sessionStorage.setItem(KEEP, JSON.stringify({ plan: input.plan, name: input.name }));
        } catch {
          /* too big or blocked: finishes changes will ask for the file again */
        }
      resolve({ input, palette: pal() });
    };
    const read = async (f: File) => {
      const ext = f.name.toLowerCase().split('.').pop();
      if (ext === 'json') {
        try {
          const plan = JSON.parse(await f.text()) as PlanModel;
          if (!Array.isArray(plan.buildings)) throw new Error('no buildings in this file');
          done({ kind: 'plan', plan, name: f.name });
        } catch (e) {
          app.log(`That JSON isn't a plan model: ${(e as Error).message}`);
        }
      } else if (ext === 'ifc' || ext === 'glb') done({ kind: ext, bytes: await f.arrayBuffer(), name: f.name });
      else app.log('Drop a .json plan model, an .ifc or a .glb.');
    };
    (o.querySelector('#dropFile') as HTMLInputElement).addEventListener('change', (e) => {
      const f = (e.target as HTMLInputElement).files?.[0];
      if (f) void read(f);
    });
    o.querySelector('#dropSample')!.addEventListener('click', async () => {
      const plan = (await import('./plan16a.json')).default as unknown as PlanModel;
      done({ kind: 'plan', plan, name: '16A plan model (sample)' });
    });
    for (const ev of ['dragover', 'dragenter']) stage.addEventListener(ev, (e) => {
      e.preventDefault();
      o.classList.add('over');
    });
    stage.addEventListener('dragleave', () => o.classList.remove('over'));
    stage.addEventListener('drop', (e) => {
      e.preventDefault();
      const f = (e as DragEvent).dataTransfer?.files?.[0];
      if (f) void read(f);
    });
    app.log('Waiting for a plan.');
  });
}

export const projectPlan: Project = {
  key: 'plan-to-twin',
  title: 'Drop a plan, get a twin',
  kicker: 'plan to twin',
  lat: -36.85,
  lon: 174.76,
  chips: [
    { text: 'Generated from your plan model', tone: 'ok' },
    { text: 'Site: from the model, no survey', tone: 'warn', title: 'Ground is the plan model’s own fall plane (or flat), not a survey' },
  ],
  async build(app: App): Promise<Built> {
    const { input, palette } = await chooser(app);
    const fromQ = new URLSearchParams(location.search).has('fin') ? fromURL() : null;
    const sched = fromQ ?? { s: complete(PRESETS[palette]?.s ?? PRESETS['cedar-charcoal'].s), name: PRESETS[palette]?.name ?? 'Cedar and charcoal' };
    const fin = toFinishes(sched.s, sched.name);
    const q = app.quality;
    const M = twinMats(q);
    document.getElementById('title')!.textContent = input.kind === 'plan' ? input.plan.job?.title ?? input.name : input.name;
    const model = new THREE.Group();
    model.name = 'model';
    let centre = new THREE.Vector3();
    let radius = 20;
    let groundAt = (_e: number, _n: number) => 0;
    const fitouts: THREE.Object3D[] = [];
    let plantObj: THREE.Object3D | null = null;
    const keys: Key[] = [];

    if (input.kind === 'plan') {
      const P = input.plan;
      const fall = P.site?.fall;
      const plane = (x: number, z: number) => (fall ? fall.y + fall.slopeX * (x - fall.at[0]) + fall.slopeZ * (z - fall.at[1]) : 0);
      // pads under each footprint and its decks
      const pads: { x0: number; x1: number; z0: number; z1: number; y: number }[] = [];
      for (const b of P.buildings) {
        const L = b.levels[0];
        const W = Math.max(...L.walls.filter((w) => w.axis === 'z').map((w) => w.at));
        const D = Math.max(...L.walls.filter((w) => w.axis === 'x').map((w) => w.at));
        const ds = (L as unknown as { decks?: { u0: number; u1: number; v0: number; v1: number }[] }).decks ?? [];
        const ffl = b.floorLevel ?? 0;
        const xs = [0, W, ...ds.flatMap((d) => [d.u0, d.u1])];
        const zs = [0, D, ...ds.flatMap((d) => [d.v0, d.v1])];
        pads.push({ x0: b.origin[0] + Math.min(...xs) - 0.6, x1: b.origin[0] + Math.max(...xs) + 0.6, z0: b.origin[1] + Math.min(...zs) - 0.6, z1: b.origin[1] + Math.max(...zs) + 0.6, y: ffl - 0.45 });
      }
      groundAt = (e: number, n: number) => {
        const x = e;
        const z = -n;
        let y = plane(x, z);
        for (const p of pads) if (x > p.x0 && x < p.x1 && z > p.z0 && z < p.z1) y = Math.min(y, p.y);
        return y;
      };
      const box = new THREE.Box3();
      for (const b of P.buildings) {
        const pl: Placement = { origin: [b.origin[0], -b.origin[1]], u: [1, 0], v: [0, -1], ffl: b.floorLevel ?? 0, bearing: 90 };
        app.log(`Generating ${b.name ?? b.id}…`);
        const h = buildHome({ key: b.id, spec: b, placement: pl, limits: [], ground: groundAt, quality: q, finishes: fin });
        model.add(h);
        h.updateMatrixWorld(true);
        box.expandByObject(h);
      }
      app.log('Placing library pieces…');
      await fillSlots(model);
      model.traverse((o) => {
        if (o.name === 'fit_out') fitouts.push(o);
      });
      app.onSun.push((night) => setInteriorLights(fitouts, night));
      centre = box.getCenter(new THREE.Vector3());
      radius = Math.max(14, box.getSize(new THREE.Vector3()).length() * 0.9);
      // planting from the plan model, in its own frame
      if (P.planting) {
        const list: { sp: Species; x: number; y: number; z: number; s?: number }[] = [];
        const map: Record<string, Species> = { harakeke: 'harakeke', tikouka: 'tikouka', tussock: 'tussock', hebe: 'hebe', toetoe: 'tussock', nikau: 'nikau', fern: 'fern', ponga: 'ponga', wheki: 'wheki' };
        for (const [k, arr] of Object.entries(P.planting)) {
          if (!Array.isArray(arr) || !map[k]) continue;
          for (const it of arr as unknown[]) {
            const at = Array.isArray(it) ? (it as [number, number]) : (it as { at: [number, number] }).at;
            const s = Array.isArray(it) ? 1 : (it as { s?: number }).s ?? 1;
            list.push({ sp: map[k], x: at[0], y: groundAt(at[0], -at[1]) - 0.02, z: at[1], s });
          }
        }
        plantObj = planting(list, 'Planting from the plan model (proposed).');
      }
      // keys: aerial, then each building's front and living space
      keys.push({ label: 'Aerial', eye: centre.clone().add(new THREE.Vector3(-radius * 0.7, radius * 0.8, radius * 0.9)), look: centre.clone() });
      for (const b of P.buildings) {
        const ffl = b.floorLevel ?? 0;
        const o = new THREE.Vector3(b.origin[0], ffl, b.origin[1]);
        keys.push({ label: `${b.name ?? b.id} outside`, eye: o.clone().add(new THREE.Vector3(-3, 1.6, 14)), look: o.clone().add(new THREE.Vector3(5.4, 1.2, 3)) });
        keys.push({ label: `${b.name ?? b.id} inside`, eye: o.clone().add(new THREE.Vector3(5, 1.6, 4.9)), look: o.clone().add(new THREE.Vector3(5.3, 1.4, -1.5)) });
      }
    } else {
      // IFC or GLB as it is
      let obj: THREE.Object3D;
      if (input.kind === 'ifc') {
        const res = await loadIFC(new Uint8Array(input.bytes), `${BASE}twin/web-ifc.wasm.b64.txt`, (d, t) => app.log(`Reading IFC… ${d} of ${t}`), true);
        obj = res.root;
        app.log(`IFC read: ${res.elements} elements, ${res.schema}.`);
      } else {
        obj = (await new GLTFLoader().parseAsync(input.bytes, '')).scene;
      }
      obj.traverse((m) => {
        if ((m as THREE.Mesh).isMesh) m.castShadow = m.receiveShadow = true;
      });
      const b = new THREE.Box3().setFromObject(obj);
      obj.position.y -= b.min.y;
      model.add(obj);
      const b2 = new THREE.Box3().setFromObject(model);
      centre = b2.getCenter(new THREE.Vector3());
      radius = Math.max(10, b2.getSize(new THREE.Vector3()).length() * 0.9);
      keys.push({ label: 'Aerial', eye: centre.clone().add(new THREE.Vector3(-radius * 0.7, radius * 0.7, radius * 0.9)), look: centre.clone() });
      keys.push({ label: 'Eye level', eye: centre.clone().add(new THREE.Vector3(0, 1.6 - centre.y, radius * 0.8)), look: centre.clone() });
    }

    // ground: a lawn following the model's fall, cut to pads, fading to context
    const R = Math.max(40, radius * 2.2);
    const N = 160;
    const g = new THREE.PlaneGeometry(R * 2, R * 2, N, N);
    g.rotateX(-Math.PI / 2);
    g.translate(centre.x, 0, centre.z);
    const p = g.getAttribute('position');
    for (let i = 0; i < p.count; i++) p.setY(i, groundAt(p.getX(i), -p.getZ(i)) - 0.01);
    g.computeVertexNormals();
    const uv = g.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / M.sets.lawn.tile, -p.getZ(i) / M.sets.lawn.tile);
    const ground = new THREE.Mesh(g, M.lawn);
    ground.name = 'ground';
    ground.receiveShadow = true;
    ground.userData = { kind: 'terrain', name: 'Ground', source: 'assumed', note: 'From the plan model’s fall plane, or flat; not a survey.' };

    const layers: Layer[] = [
      { id: 'model', label: input.kind === 'plan' ? 'Generated homes, fitted out' : 'Model', visible: true, object: model, model: true },
      { id: 'ground', label: 'Ground', note: 'model fall or flat; not surveyed', visible: true, object: ground },
    ];
    if (plantObj) layers.push({ id: 'planting', label: 'Planting', note: 'from the plan model', visible: true, object: plantObj });

    const exports: Built['exports'] = [
      {
        label: 'Model (GLB)',
        run: async () => {
          const glb = (await new GLTFExporter().parseAsync(model, { binary: true, onlyVisible: true })) as ArrayBuffer;
          const z = zipSync({ 'twin.glb': new Uint8Array(glb), 'README.txt': strToU8(`Generated by assembl plan to twin from ${input.name}. Metres, Y up. Element data in glTF extras. Fit-out and finishes are proposed.`) }, { level: 6 });
          return { name: 'twin-glb.zip', blob: new Blob([z as BlobPart], { type: 'application/zip' }) };
        },
      },
      {
        label: 'Model (IFC)',
        run: async () => {
          const ifc = exportIFC(model, { project: document.getElementById('title')!.textContent ?? 'Twin', building: 'Generated', author: 'assembl' });
          const z = zipSync({ 'twin.ifc': strToU8(ifc) }, { level: 6 });
          return { name: 'twin-ifc.zip', blob: new Blob([z as BlobPart], { type: 'application/zip' }) };
        },
      },
    ];
    return {
      sharePlan: input.kind === 'plan' ? () => input.plan : undefined,
      panels: input.kind === 'plan' ? [finishesPanel(app, sched.s, input.plan.job?.title ?? input.name)] : [],
      layers,
      focus: centre,
      radius,
      view: { eye: keys[0].eye, look: keys[0].look },
      path: keys,
      section: [centre.y - 3, centre.y + 6],
      support: (pt) => groundAt(pt.x, -pt.z),
      exports,
      sources: [
        `Input: ${input.name}.`,
        input.kind === 'plan' ? 'Walls, openings, partitions, rooms, roof and decks from the plan model; fit-out from room names; finishes from the schedule. Everything not in the plan model is proposed.' : 'Shown as received; element data from the file.',
        'Furniture: Kōwhai Studio library pieces where available, otherwise assembl’s own procedural pieces.',
      ],
    };
  },
};
