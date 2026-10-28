// A real Gaussian-splat capture on a lit plinth (three.js + Spark from the page's import map), rendered on demand.
// Hero mode: the camera drifts slowly around the front three-quarter (the capture's best side) and the subject sits off-centre for the type.
// The drift is ambient: pause() stops it, and reduced motion starts it paused. Dragging turns the plinth by hand.
export async function mountSplat(host, o) {
  const { url, onProgress, tones, shift = 0, angle = 0, range = .42, dist = 8.6 } = o;
  const T = tones || { drum: "#3A1A35", top: ["#5A3552", "#3E1C39"], ring: "#916A70" };
  const [THREE, Spark] = await Promise.all([import("three"), import("@sparkjsdev/spark")]);
  const canvas = document.createElement("canvas"); canvas.className = "splat-cv"; canvas.setAttribute("aria-hidden", "true"); host.prepend(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: "high-performance", preserveDrawingBuffer: !!o.capture });
  renderer.setClearColor(0x000000, 0);
  const coarse = matchMedia("(pointer: coarse)").matches;
  renderer.setPixelRatio(o.dpr || Math.min(devicePixelRatio || 1, coarse ? 1.5 : 2));
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, .05, 100);
  let dirty = 3, paused = !!o.paused, vis = true, raf = 0, last = performance.now(), drag = null, t = 0, yaw = 0;
  const kick = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  const spark = new Spark.SparkRenderer({ renderer, onDirty: () => { dirty = Math.max(dirty, 2); kick(); } }); scene.add(spark);
  const turn = new THREE.Group(); scene.add(turn);
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(2.75, 2.86, .2, 128, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(T.drum) })); drum.position.y = -.1; scene.add(drum);
  const top = new THREE.Mesh(new THREE.CircleGeometry(2.75, 128).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: radialTexture(THREE, T.top) })); top.position.y = -.006; scene.add(top);
  const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(T.ring), transparent: true, opacity: .6 });
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.62, 2.665, 160).rotateX(-Math.PI / 2), ringMat); ring.position.y = -.003; turn.add(ring);
  for (let i = 0; i < 72; i++) { const t = new THREE.Mesh(new THREE.PlaneGeometry(.016, i % 6 ? .06 : .15).rotateX(-Math.PI / 2), ringMat); const a = i / 72 * Math.PI * 2; t.position.set(Math.cos(a) * 2.53, -.002, Math.sin(a) * 2.53); t.rotation.y = -a; turn.add(t); }
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 2.7).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: radialTexture(THREE, ["rgba(12,2,10,.6)", "rgba(12,2,10,0)"], true), transparent: true, depthWrite: false })); shadow.position.y = .002; turn.add(shadow);

  let W = 2, H = 2;
  function fit() { const r = host.getBoundingClientRect(); W = Math.max(2, r.width); H = Math.max(2, r.height); renderer.setSize(W, H, false); camera.aspect = W / H; camera.fov = W / H < 1 ? 38 : 28; camera.updateProjectionMatrix(); place(); dirty = 3; }
  // the camera on a slow arc around the plinth; setViewOffset slides the subject sideways without changing the perspective
  function place() { const narrow = W / H < 1, d = narrow ? dist * 1.18 : dist, a = angle + Math.sin(t * .09) * range + yaw, h = (narrow ? 2.5 : 1.9) + Math.sin(t * .13) * .18;
    camera.position.set(Math.cos(a) * d, h, Math.sin(a) * d); camera.lookAt(0, narrow ? .7 : .52, 0);
    const sx = narrow ? 0 : shift; if (sx) camera.setViewOffset(W, H, -W * sx, 0, W, H); else camera.clearViewOffset(); }
  addEventListener("resize", fit); fit();

  const res = await fetch(url); if (!res.ok) throw new Error(`capture ${res.status}`);
  const total = +res.headers.get("content-length") || 0, reader = res.body.getReader(), parts = []; let got = 0;
  for (;;) { const { done, value } = await reader.read(); if (done) break; parts.push(value); got += value.length; onProgress && onProgress(got, total); }
  const bytes = new Uint8Array(got); let off = 0; for (const p of parts) { bytes.set(p, off); off += p.length; }
  const mesh = new Spark.SplatMesh({ fileBytes: bytes, fileName: url.split("/").pop() }); turn.add(mesh); await mesh.initialized; dirty = 4;

  new IntersectionObserver((es) => { vis = es.some((e) => e.isIntersecting); if (vis) kick(); }).observe(host);
  canvas.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: yaw }; canvas.setPointerCapture(e.pointerId); kick(); });
  canvas.addEventListener("pointermove", (e) => { if (!drag) return; yaw = drag.y - (e.clientX - drag.x) * .006; place(); dirty = 2; kick(); });
  const end = () => { drag = null; }; canvas.addEventListener("pointerup", end); canvas.addEventListener("pointercancel", end);
  function frame(now) { raf = 0; const dt = Math.min(.05, (now - last) / 1000); last = now; if (!vis) return;
    if (!paused) { t += dt; place(); dirty = Math.max(dirty, 1); }
    if (dirty > 0) { renderer.render(scene, camera); dirty--; }
    if (!paused || dirty > 0 || drag) kick(); }
  kick();
  return { pause(p) { paused = p; kick(); }, setTime(x) { t = x; place(); dirty = 3; kick(); }, render() { place(); renderer.render(scene, camera); }, canvas, splats: mesh.packedSplats?.numSplats ?? mesh.numSplats ?? 0 };
}
function radialTexture(THREE, [inner, outer], soft) {
  const c = document.createElement("canvas"); c.width = c.height = 256; const x = c.getContext("2d"), g = x.createRadialGradient(128, 128, soft ? 8 : 26, 128, 128, 128);
  g.addColorStop(0, inner); g.addColorStop(1, outer); x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
}
