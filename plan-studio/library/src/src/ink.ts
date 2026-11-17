// Ink line drawings of Aotearoa buildings and native planting, drawn as SVG paths that draw themselves when they
// come into view (stroke-dashoffset on pathLength="1"). Secondary to the assets: thin, low-contrast, decorative and
// hidden from assistive technology. Reduced motion shows them finished.
import { reducedMotion } from './util';

type P = string[];
const f = (n: number) => Math.round(n * 10) / 10;
const M = (x: number, y: number) => `M${f(x)} ${f(y)}`;
const L = (x: number, y: number) => `L${f(x)} ${f(y)}`;
const Q = (cx: number, cy: number, x: number, y: number) => `Q${f(cx)} ${f(cy)} ${f(x)} ${f(y)}`;

/** a seeded random, so a drawing is the same on every visit */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function rect(p: P, x: number, y: number, w: number, h: number) {
  p.push(`${M(x, y)}${L(x + w, y)}${L(x + w, y + h)}${L(x, y + h)}Z`);
}

/** a double-hung sash window with glazing bars */
function sash(p: P, x: number, y: number, w: number, h: number) {
  rect(p, x, y, w, h);
  rect(p, x + 4, y + 4, w - 8, h - 8);
  p.push(`${M(x + 4, y + h / 2)}${L(x + w - 4, y + h / 2)}`);
  p.push(`${M(x + w / 2, y + 4)}${L(x + w / 2, y + h - 4)}`);
  p.push(`${M(x - 4, y + h + 3)}${L(x + w + 4, y + h + 3)}`);
}

/** villa with a front gable bay window and a bullnose verandah */
function villa(p: P, fine: P, ox: number, gy: number) {
  const gx0 = ox + 30, gx1 = ox + 220, eave = gy - 220;
  // gable bay
  p.push(`${M(gx0 - 14, eave + 6)}${L((gx0 + gx1) / 2, eave - 86)}${L(gx1 + 14, eave + 6)}`);
  p.push(`${M(gx0 - 4, eave + 2)}${L((gx0 + gx1) / 2, eave - 76)}${L(gx1 + 4, eave + 2)}`);
  p.push(`${M((gx0 + gx1) / 2, eave - 86)}${L((gx0 + gx1) / 2, eave - 104)}`);
  p.push(`${M(gx0, eave + 4)}${L(gx0, gy)}`, `${M(gx1, eave + 4)}${L(gx1, gy)}`);
  // bay window: three sashes under a little hood
  const bx = gx0 + 22, bw = gx1 - gx0 - 44;
  p.push(`${M(bx - 10, eave + 52)}${L(bx + bw + 10, eave + 52)}`);
  for (let i = 0; i < 3; i++) sash(p, bx + (i * bw) / 3 + 3, eave + 60, bw / 3 - 6, 104);
  // weatherboards on the bay, around the window
  for (let y = eave + 14; y < gy - 4; y += 9) {
    if (y > eave + 48 && y < eave + 172) {
      fine.push(`${M(gx0 + 1, y)}${L(bx - 12, y)}`, `${M(bx + bw + 12, y)}${L(gx1 - 1, y)}`);
    } else fine.push(`${M(gx0 + 1, y)}${L(gx1 - 1, y)}`);
  }
  // main hipped roof behind
  const mx1 = ox + 560;
  p.push(`${M(gx1 + 6, eave - 44)}${L(gx1 + 70, eave - 92)}${L(mx1 - 40, eave - 92)}${L(mx1 + 16, eave - 30)}`);
  rect(p, ox + 430, eave - 128, 26, 40);
  p.push(`${M(ox + 426, eave - 128)}${L(ox + 460, eave - 128)}`);
  // verandah: bullnose roof, posts with fretwork brackets, a frieze rail
  const vy = eave + 34;
  p.push(`${M(gx1, eave - 38)}${Q(gx1 + 6, vy, gx1 + 40, vy)}${L(mx1 + 20, vy)}`);
  p.push(`${M(gx1, eave - 30)}${Q(gx1 + 4, vy - 8, gx1 + 34, vy - 8)}${L(mx1 + 8, vy - 8)}`);
  p.push(`${M(gx1 + 30, vy + 14)}${L(mx1 + 14, vy + 14)}`);
  for (const px of [gx1 + 44, ox + 360, ox + 460, mx1 + 10]) {
    p.push(`${M(px - 3, vy)}${L(px - 3, gy)}`, `${M(px + 3, vy)}${L(px + 3, gy)}`);
    p.push(`${M(px - 3, vy + 34)}${Q(px - 26, vy + 30, px - 30, vy + 14)}`, `${M(px + 3, vy + 34)}${Q(px + 26, vy + 30, px + 30, vy + 14)}`);
    fine.push(`${M(px - 10, vy + 22)}${Q(px - 14, vy + 18, px - 16, vy + 14)}`, `${M(px + 10, vy + 22)}${Q(px + 14, vy + 18, px + 16, vy + 14)}`);
  }
  // front door with a fanlight and two sash windows
  rect(p, ox + 395, gy - 116, 40, 116);
  rect(p, ox + 395, gy - 136, 40, 16);
  sash(p, ox + 300, gy - 128, 44, 90);
  sash(p, ox + 486, gy - 128, 44, 90);
  for (let y = vy + 24; y < gy - 4; y += 9) fine.push(`${M(gx1 + 50, y)}${L(ox + 292, y)}`);
  // steps and deck edge
  p.push(`${M(ox + 380, gy - 8)}${L(ox + 452, gy - 8)}`, `${M(gx1 - 6, gy - 16)}${L(mx1 + 24, gy - 16)}`);
}

/** nīkau palm: ringed trunk, crownshaft, arching fronds with leaflets */
function nikau(p: P, fine: P, x: number, gy: number, h: number, seed = 3) {
  const r = rng(seed);
  const top = gy - h * 0.66;
  p.push(`${M(x - 7, gy)}${Q(x - 6, (gy + top) / 2, x - 4, top)}`, `${M(x + 7, gy)}${Q(x + 6, (gy + top) / 2, x + 4, top)}`);
  for (let y = gy - 12; y > top + 6; y -= 12) fine.push(`${M(x - 6, y)}${Q(x, y + 3, x + 6, y)}`);
  const cs = top - h * 0.14;
  p.push(`${M(x - 4, top)}${Q(x - 11, (top + cs) / 2, x - 3, cs)}`, `${M(x + 4, top)}${Q(x + 11, (top + cs) / 2, x + 3, cs)}`);
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI * 0.95 + (i / (n - 1)) * Math.PI * 0.9 + (r() - 0.5) * 0.12;
    const len = h * (0.36 + r() * 0.08);
    const ex = x + Math.cos(a) * len, ey = cs + Math.sin(a) * len * 0.55 + len * 0.42;
    const cx = x + Math.cos(a) * len * 0.5, cy = cs + Math.sin(a) * len * 0.62 - len * 0.12;
    p.push(`${M(x, cs)}${Q(cx, cy, ex, ey)}`);
    for (let t = 0.18; t < 0.96; t += 0.075) {
      const bx = (1 - t) * (1 - t) * x + 2 * (1 - t) * t * cx + t * t * ex;
      const by = (1 - t) * (1 - t) * cs + 2 * (1 - t) * t * cy + t * t * ey;
      const tx = 2 * (1 - t) * (cx - x) + 2 * t * (ex - cx), ty = 2 * (1 - t) * (cy - cs) + 2 * t * (ey - cy);
      const tl = Math.hypot(tx, ty) || 1;
      const nx = -ty / tl, ny = tx / tl;
      const ll = len * 0.15 * (1 - Math.abs(t - 0.5));
      fine.push(`${M(bx, by)}${L(bx + nx * ll + (tx / tl) * ll * 0.5, by + ny * ll + (ty / tl) * ll * 0.5 + ll * 0.4)}`);
      fine.push(`${M(bx, by)}${L(bx - nx * ll + (tx / tl) * ll * 0.5, by - ny * ll + (ty / tl) * ll * 0.5 + ll * 0.4)}`);
    }
  }
}

/** harakeke: a fan of long blades, a few tips folding over, and two flower stalks */
function harakeke(p: P, fine: P, x: number, gy: number, h: number, seed = 7) {
  const r = rng(seed);
  const n = 13;
  for (let i = 0; i < n; i++) {
    const s = (i / (n - 1)) * 2 - 1;
    const bx = x + s * h * 0.08;
    const tipx = x + s * h * (0.45 + r() * 0.2), tipy = gy - h * (0.7 + (1 - Math.abs(s)) * 0.3) + r() * h * 0.12;
    const fold = Math.abs(s) > 0.55 && r() > 0.4;
    const ex = fold ? tipx + s * h * 0.18 : tipx, ey = fold ? tipy + h * 0.22 : tipy;
    (i % 2 ? fine : p).push(`${M(bx, gy)}${Q(bx + s * h * 0.1, tipy + h * 0.1, ex, ey)}`);
  }
  for (const s of [-0.2, 0.25]) {
    const sx = x + s * h * 0.3, top = gy - h * 1.35;
    p.push(`${M(x + s * 8, gy)}${Q(sx, gy - h * 0.7, sx + s * 10, top)}`);
    for (let t = 0; t < 4; t++) fine.push(`${M(sx + s * 10 * (t / 4), top + 8 + t * 10)}${L(sx + s * 10 * (t / 4) + 7, top + 2 + t * 10)}`);
  }
}

/** ponga: a fibrous trunk under a crown of arching fronds */
function ponga(p: P, fine: P, x: number, gy: number, h: number, seed = 11) {
  const r = rng(seed);
  const top = gy - h * 0.55;
  p.push(`${M(x - 6, gy)}${L(x - 5, top)}`, `${M(x + 6, gy)}${L(x + 5, top)}`);
  for (let y = gy - 6; y > top; y -= 7) fine.push(`${M(x - 5, y)}${L(x + 5, y - 3)}`);
  for (let i = 0; i < 8; i++) {
    const s = (i / 7) * 2 - 1;
    const len = h * (0.42 + r() * 0.1);
    const ex = x + s * len, ey = top + h * 0.08 + Math.abs(s) * h * 0.22;
    const cx = x + s * len * 0.45, cy = top - h * 0.2;
    p.push(`${M(x, top)}${Q(cx, cy, ex, ey)}`);
    for (let t = 0.15; t < 0.95; t += 0.09) {
      const bx = (1 - t) * (1 - t) * x + 2 * (1 - t) * t * cx + t * t * ex;
      const by = (1 - t) * (1 - t) * top + 2 * (1 - t) * t * cy + t * t * ey;
      const ll = h * 0.05 * (1 - t * 0.6);
      fine.push(`${M(bx, by)}${L(bx + 1.5, by + ll)}`, `${M(bx, by)}${L(bx - 1.5 * Math.sign(s || 1), by - ll * 0.6)}`);
    }
  }
}

/** a one-room bach with a corrugated tank and a flue */
function bach(p: P, fine: P, x: number, gy: number, w: number) {
  const h = w * 0.36, ridge = gy - h - w * 0.2;
  p.push(`${M(x - 8, gy - h + 2)}${L(x + w * 0.5, ridge)}${L(x + w + 8, gy - h + 2)}`);
  rect(p, x, gy - h, w, h);
  rect(p, x + w * 0.16, gy - h * 0.72, w * 0.18, h * 0.72);
  sash(p, x + w * 0.52, gy - h * 0.78, w * 0.3, h * 0.42);
  for (let y = gy - h + 8; y < gy - 2; y += 7) fine.push(`${M(x + 1, y)}${L(x + w * 0.15, y)}`, `${M(x + w * 0.35, y)}${L(x + w * 0.5, y)}`, `${M(x + w * 0.84, y)}${L(x + w - 1, y)}`);
  p.push(`${M(x + w * 0.74, ridge + w * 0.07)}${L(x + w * 0.74, ridge - w * 0.06)}`, `${M(x + w * 0.78, ridge + w * 0.09)}${L(x + w * 0.78, ridge - w * 0.06)}`);
  // tank
  const tx = x + w + 26, tw = w * 0.26, th = w * 0.3;
  p.push(`${M(tx, gy - th)}${Q(tx + tw / 2, gy - th - 9, tx + tw, gy - th)}${L(tx + tw, gy)}${L(tx, gy)}Z`);
  for (let y = gy - th + 6; y < gy; y += 5) fine.push(`${M(tx + 1, y)}${Q(tx + tw / 2, y + 2, tx + tw - 1, y)}`);
  // deck
  p.push(`${M(x - 20, gy - 6)}${L(x + w * 0.4, gy - 6)}`);
}

export interface Drawing {
  viewBox: string;
  build: (p: P, fine: P) => void;
}

export const DRAWINGS: Record<string, Drawing> = {
  hero: {
    viewBox: '0 0 760 440',
    build: (p, fine) => {
      villa(p, fine, 20, 420);
      nikau(p, fine, 660, 420, 330);
      harakeke(p, fine, 600, 420, 64);
      harakeke(p, fine, 40, 420, 46, 19);
      p.push(`${M(0, 420)}${L(760, 420)}`);
    },
  },
  horizon: {
    viewBox: '0 0 1200 200',
    build: (p, fine) => {
      p.push(`${M(0, 186)}${L(1200, 186)}`);
      bach(p, fine, 520, 186, 150);
      ponga(p, fine, 300, 186, 170);
      harakeke(p, fine, 410, 186, 56, 23);
      nikau(p, fine, 930, 186, 200, 5);
      harakeke(p, fine, 1020, 186, 44, 29);
    },
  },
  planting: {
    viewBox: '0 0 300 260',
    build: (p, fine) => {
      p.push(`${M(0, 246)}${L(300, 246)}`);
      nikau(p, fine, 200, 246, 236, 13);
      harakeke(p, fine, 90, 246, 70, 31);
    },
  },
};

/** fill every <svg data-ink="name"> on the page and draw it in when it comes into view */
export function mountInk(root: ParentNode = document) {
  const svgs = [...root.querySelectorAll<SVGSVGElement>('svg[data-ink]')];
  const io = 'IntersectionObserver' in window && !reducedMotion()
    ? new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('drawn');
            io!.unobserve(e.target);
          }
        }
      }, { threshold: 0.25 })
    : null;
  for (const svg of svgs) {
    const d = DRAWINGS[svg.dataset.ink!];
    if (!d) continue;
    const p: P = [], fine: P = [];
    d.build(p, fine);
    svg.setAttribute('viewBox', d.viewBox);
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const NS = 'http://www.w3.org/2000/svg';
    const add = (list: P, cls: string, delay0: number) => {
      const g = document.createElementNS(NS, 'g');
      g.setAttribute('class', cls);
      list.forEach((dd, i) => {
        const path = document.createElementNS(NS, 'path');
        path.setAttribute('d', dd);
        path.setAttribute('pathLength', '1');
        path.style.setProperty('--d', `${delay0 + (i / list.length) * 1.6}s`);
        g.append(path);
      });
      svg.append(g);
    };
    add(p, 'ink-main', 0);
    add(fine, 'ink-fine', 0.5);
    if (io) io.observe(svg);
    else svg.classList.add('drawn', 'static');
  }
}
