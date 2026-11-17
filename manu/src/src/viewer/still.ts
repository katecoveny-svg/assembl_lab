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
    v.render();
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const a = v.anchors(ids).map((p) => ({ id: p.id, x: +(p.x / w).toFixed(4), y: +(p.y / h).toFixed(4), front: p.front }));
    Object.assign(window, { __still: { ready: true, anchors: a } });
  })
  .catch((e) => Object.assign(window, { __still: { ready: true, error: String(e) } }));
