// roof-solar · a very small slippy map to pick a point: drag to move, buttons or wheel to zoom, click to choose.
// Tiles: OpenStreetMap standard tile layer. © OpenStreetMap contributors, ODbL (https://www.openstreetmap.org/copyright).
// The tiles are a picture to point at; no address or point is sent anywhere by choosing on it except as the page then says.
const TILE = 256, clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const lonToX = (lon, z) => ((lon + 180) / 360) * 2 ** z;
export const latToY = (lat, z) => { const r = (lat * Math.PI) / 180; return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z; };
export const xToLon = (x, z) => (x / 2 ** z) * 360 - 180;
export const yToLat = (y, z) => { const n = Math.PI - (2 * Math.PI * y) / 2 ** z; return (180 / Math.PI) * Math.atan(Math.sinh(n)); };

export function mapLite(el, { lat = -41.2, lon = 173.5, zoom: z0 = 5, onPick } = {}) {
  el.classList.add("ml"); el.innerHTML = `<div class="ml-tiles"></div><div class="ml-pin" hidden></div><div class="ml-ctl"><button type="button" data-z="1" aria-label="Zoom in">+</button><button type="button" data-z="-1" aria-label="Zoom out">−</button></div><p class="ml-credit">© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors</p>`;
  const tiles = el.querySelector(".ml-tiles"), pin = el.querySelector(".ml-pin"); let c = { lat, lon, z: z0 }, mark = null;
  const size = () => ({ w: el.clientWidth || 300, h: el.clientHeight || 240 });
  function draw() {
    const { w, h } = size(), cx = lonToX(c.lon, c.z) * TILE, cy = latToY(c.lat, c.z) * TILE, x0 = Math.floor((cx - w / 2) / TILE), x1 = Math.floor((cx + w / 2) / TILE), y0 = Math.floor((cy - h / 2) / TILE), y1 = Math.floor((cy + h / 2) / TILE), n = 2 ** c.z, keep = new Set();
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      if (ty < 0 || ty >= n) continue; const wx = ((tx % n) + n) % n, id = `${c.z}/${wx}/${ty}`; keep.add(id + "@" + tx);
      let im = tiles.querySelector(`[data-k="${id}@${tx}"]`); if (!im) { im = document.createElement("img"); im.dataset.k = id + "@" + tx; im.alt = ""; im.draggable = false; im.width = im.height = TILE; im.src = `https://tile.openstreetmap.org/${id}.png`; tiles.appendChild(im); }
      im.style.transform = `translate(${Math.round(tx * TILE - cx + w / 2)}px,${Math.round(ty * TILE - cy + h / 2)}px)`;
    }
    for (const im of [...tiles.children]) if (!keep.has(im.dataset.k)) im.remove();
    if (mark) { const px = lonToX(mark.lon, c.z) * TILE - cx + w / 2, py = latToY(mark.lat, c.z) * TILE - cy + h / 2; pin.hidden = false; pin.style.transform = `translate(${px}px,${py}px)`; }
  }
  function move(dx, dy) { const cx = lonToX(c.lon, c.z) * TILE - dx, cy = latToY(c.lat, c.z) * TILE - dy; c.lon = xToLon(cx / TILE, c.z); c.lat = clamp(yToLat(cy / TILE, c.z), -84, 84); draw(); }
  let down = null; el.addEventListener("pointerdown", (e) => { if (e.target.closest(".ml-ctl")) return; down = { x: e.clientX, y: e.clientY, moved: 0 }; el.setPointerCapture(e.pointerId); });
  el.addEventListener("pointermove", (e) => { if (!down) return; const dx = e.clientX - down.x, dy = e.clientY - down.y; down.moved += Math.abs(dx) + Math.abs(dy); down.x = e.clientX; down.y = e.clientY; move(dx, dy); });
  el.addEventListener("pointerup", (e) => { if (!down) return; const d = down; down = null; if (d.moved < 6) { const r = el.getBoundingClientRect(), { w, h } = size(), cx = lonToX(c.lon, c.z) * TILE, cy = latToY(c.lat, c.z) * TILE, x = (cx + (e.clientX - r.left) - w / 2) / TILE, y = (cy + (e.clientY - r.top) - h / 2) / TILE; mark = { lat: yToLat(y, c.z), lon: xToLon(x, c.z) }; draw(); onPick?.(mark.lat, mark.lon, c.z); } });
  el.addEventListener("wheel", (e) => { e.preventDefault(); zoom(e.deltaY < 0 ? 1 : -1); }, { passive: false });
  el.querySelector(".ml-ctl").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) zoom(+b.dataset.z); });
  function zoom(d) { c.z = clamp(c.z + d, 4, 19); draw(); }
  new ResizeObserver(draw).observe(el); draw();
  return { set(lat, lon, z) { c = { lat, lon, z: z ?? c.z }; mark = { lat, lon }; draw(); }, get zoom() { return c.z; } };
}
