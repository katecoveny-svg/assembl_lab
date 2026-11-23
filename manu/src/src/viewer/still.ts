import { createViewer, type AnchorId } from './viewer';

// Harness for the stills (scripts/stills.py): one bird, the three-quarter view, a quiet bird
// looking a little toward the camera, and its anchor points as fractions of the frame.
const q = new URLSearchParams(location.search);
const canvas = document.querySelector<HTMLCanvasElement>('canvas')!;
const ids: AnchorId[] = ['bill', 'eye', 'forehead', 'crown', 'ear', 'throat', 'breast', 'shoulder', 'wing', 'tail', 'feet'];
createViewer(canvas, { bird: q.get('bird')!, flora: q.get('flora') as 'kowhai', perchUrl: q.get('perch')!, still: true, paused: false })
  .then(async (v) => {
    // let it settle into its pose for a moment, then stop it
    await new Promise((r) => setTimeout(r, 2500));
    v.setPaused(true);
    await new Promise((r) => setTimeout(r, 300));
    if (q.has('close')) {
      // harness only: close on the head and breast, for checking the plumage surface
      const h = v.bird.headPosition(v.camera.position.clone());
      v.camera.position.set(h.x + 0.95, h.y + 0.02, h.z + 0.45);
      v.camera.lookAt(h.x, h.y - 0.12, h.z);
      v.camera.updateMatrixWorld();
    }
    v.render();
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const a = v.anchors(ids).map((p) => ({ id: p.id, x: +(p.x / w).toFixed(4), y: +(p.y / h).toFixed(4), front: p.front }));
    Object.assign(window, { __still: { ready: true, anchors: a } });
  })
  .catch((e) => Object.assign(window, { __still: { ready: true, error: String(e) } }));
