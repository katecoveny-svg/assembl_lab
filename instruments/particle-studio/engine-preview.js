// Particle Studio · "In the engine": the exported form, rendered by the real shared engine (/lab/pc/engine.js), so the designer sees
// exactly what the site will show. The form it draws is decoded from the bytes just written, not from the studio's memory.
import { createEngine } from "/lab/pc/engine.js";

export function createEnginePreview(canvas, { reduceMotion = false } = {}) {
  let engine = null, timer = null, which = "a", forms = null;
  function show(a, b = null) {
    dispose(); forms = { a, b };
    const n = Math.max(a.n, b?.n || 0);
    engine = createEngine(canvas, { budget: Math.max(1024, n), reduceMotion, sway: true });
    engine.resize(); engine.setLift(0.5, 0.45);
    const place = { scale: 0.62, offset: [0, 0.02, 0] };
    engine.assembleFrom(a, { ...place, ms: 2600 }); engine.start();
    setTimeout(() => engine?.scan(2400, -0.05, 1.2), reduceMotion ? 0 : 2800);
    if (b) { which = "a"; timer = setInterval(() => { if (!engine) return; which = which === "a" ? "b" : "a"; engine.setForm(forms[which], { ...place, ms: 2400 }); }, 4600); }
    return engine;
  }
  function dispose() { clearInterval(timer); timer = null; if (engine) { engine.dispose(); engine = null; } }
  return { show, dispose, get engine() { return engine; } };
}
