// assembl capture · coverage ring: one band per height ring, 36 segments of 10°, filled as keyframes land.
// Seen from above: the start is at the top, and the marker shows where the camera is now.
import { BINS } from "./keyframes.js";

const NS = "http://www.w3.org/2000/svg";

function arc(cx, cy, r0, r1, a0, a1) {
  const p = (r, a) => [cx + r * Math.sin(a), cy - r * Math.cos(a)];
  const [x0, y0] = p(r1, a0), [x1, y1] = p(r1, a1), [x2, y2] = p(r0, a1), [x3, y3] = p(r0, a0);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r1} ${r1} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}A${r0} ${r0} 0 ${large} 0 ${x3.toFixed(2)} ${y3.toFixed(2)}Z`;
}

export class CoverageRing {
  constructor(container, rings, { size = 168 } = {}) {
    this.svg = document.createElementNS(NS, "svg");
    this.svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
    this.svg.setAttribute("class", "ac-ring");
    this.svg.setAttribute("role", "img");
    const c = size / 2, band = 11, gap = 4, outer = c - 6;
    this.segs = rings.map((ring, ri) => {
      const r1 = outer - ri * (band + gap), r0 = r1 - band;
      const g = document.createElementNS(NS, "g");
      g.setAttribute("class", "ac-ring-band");
      const segs = [];
      for (let k = 0; k < BINS; k++) {
        const a0 = (k / BINS) * 2 * Math.PI + 0.012, a1 = ((k + 1) / BINS) * 2 * Math.PI - 0.012;
        const path = document.createElementNS(NS, "path");
        path.setAttribute("d", arc(c, c, r0, r1, a0, a1));
        path.setAttribute("class", "ac-seg");
        g.appendChild(path);
        segs.push(path);
      }
      this.svg.appendChild(g);
      return { g, segs, r0, r1 };
    });
    const start = document.createElementNS(NS, "path");
    start.setAttribute("d", `M${c} 1.5v7`);
    start.setAttribute("class", "ac-ring-start");
    this.svg.appendChild(start);
    this.marker = document.createElementNS(NS, "circle");
    this.marker.setAttribute("r", "4.2");
    this.marker.setAttribute("class", "ac-ring-marker");
    this.svg.appendChild(this.marker);
    this.c = c;
    container.appendChild(this.svg);
    this.update({ cover: rings.map(() => new Uint8Array(BINS)), current: 0, azimuthDeg: null });
  }

  update({ cover, current, azimuthDeg, estimated = false }) {
    this.segs.forEach((s, ri) => {
      s.g.classList.toggle("is-current", ri === current);
      s.segs.forEach((p, k) => p.classList.toggle("is-on", !!cover[ri][k]));
    });
    const pct = cover.map((c) => Math.round((100 * c.reduce((a, b) => a + b, 0)) / BINS));
    this.svg.setAttribute("aria-label", `Coverage${estimated ? " (estimated)" : ""}: ${pct.map((p, i) => `ring ${i + 1} ${p}%`).join(", ")}`);
    if (azimuthDeg == null) { this.marker.setAttribute("visibility", "hidden"); return; }
    const s = this.segs[current], r = (s.r0 + s.r1) / 2, a = (azimuthDeg * Math.PI) / 180;
    this.marker.setAttribute("visibility", "visible");
    this.marker.setAttribute("cx", (this.c + r * Math.sin(a)).toFixed(2));
    this.marker.setAttribute("cy", (this.c - r * Math.cos(a)).toFixed(2));
  }
}
