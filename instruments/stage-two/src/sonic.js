export function sonic({
  T,
  $,
  canvas,
  scene,
  orbit,
  on,
  status,
  range,
  button,
  snapshot,
  resumeAnimation,
}) {
  $("intro").textContent =
    "Pluck a colour. Weave a rhythm. Let the ribbons answer.";
  $("note").textContent = "Sound begins only when you press Play.";
  $("medium").textContent = "ORIGINAL SYNTHESIS / PROCEDURAL RIBBONS";
  $("hint").textContent = "Drag ribbons to pluck · switch to Orbit to turn";
  $("explanation").textContent =
    "Each ribbon is a procedural mesh. A pluck sends a decaying wave across its vertices; the same event triggers a synthesised note. The demo uses an original repeating rhythm, with visuals driven by the audio clock. This is deformation, not a cloth-physics simulation. No microphone, recordings or uploads.";
  let state = { tempo: 86, tension: 1.1, colour: 0 },
    context,
    master,
    muted = false,
    playing = false,
    beat = 0,
    nextBeat = 0,
    mode = "pluck",
    dead = false,
    starting = false;
  const voices = new Set(),
    pulses = [],
    notes = [130.81, 164.81, 196, 261.63, 293.66, 329.63, 392, 523.25];
  const palettes = [
    [
      "#e87564",
      "#f3b876",
      "#e7c84d",
      "#a5c8a7",
      "#75b9b2",
      "#8c9bcc",
      "#b3a0ca",
      "#d397ac",
    ],
    [
      "#295969",
      "#487e87",
      "#7cb6b0",
      "#b7d7b2",
      "#edcc85",
      "#edaa70",
      "#d87f64",
      "#bd6683",
    ],
  ];
  const group = new T.Group();
  group.rotation.set(-0.16, 0, 0.07);
  scene.add(group);
  const ribbons = notes.map((_, i) => {
    const g = new T.PlaneGeometry(5, 0.23, 100, 3);
    const m = new T.MeshStandardMaterial({
      color: palettes[0][i],
      roughness: 0.32,
      metalness: 0.18,
      side: T.DoubleSide,
    });
    const mesh = new T.Mesh(g, m);
    mesh.position.y = (i - 3.5) * 0.37;
    group.add(mesh);
    return { mesh, base: g.attributes.position.array.slice() };
  });
  const ring = new T.Mesh(
    new T.TorusGeometry(2.9, 0.012, 6, 100),
    new T.MeshBasicMaterial({ color: 0xc9c5d3 }),
  );
  ring.rotation.y = 0.5;
  group.add(ring);
  function stop() {
    playing = false;
    for (const v of voices) {
      try {
        v.osc.stop();
      } catch {}
      v.osc.disconnect();
      v.gain.disconnect();
    }
    voices.clear();
    if (context?.state === "running") context.suspend().catch(() => {});
    play.textContent = "▶ Play rhythm";
    play.setAttribute("aria-pressed", "false");
  }
  async function start() {
    if (starting) return;
    starting = true;
    try {
      if (!context) {
        context = new AudioContext();
        master = context.createGain();
        master.gain.value = muted ? 0 : 0.2;
        master.connect(context.destination);
        context.onstatechange = () => {
          if (playing && context.state !== "running") {
            stop();
            status("Audio interrupted. Press Play to restart.");
          }
        };
      }
      await context.resume();
      if (dead || document.hidden) {
        stop();
        if (dead) context.close();
        return;
      }
      if (context.state !== "running") throw Error("Audio is unavailable");
      resumeAnimation();
      playing = true;
      nextBeat = context.currentTime;
      beat = 0;
      play.textContent = "Ⅱ Stop rhythm";
      play.setAttribute("aria-pressed", "true");
      status("Playing original synthesised notes.");
    } catch (e) {
      stop();
      status("Sound could not start. Press Play to retry.");
    } finally {
      starting = false;
    }
  }
  const play = button("▶ Play rhythm", () => (playing ? stop() : start()));
  const mute = button("Mute", () => {
    muted = !muted;
    if (master && context)
      master.gain.setTargetAtTime(muted ? 0 : 0.2, context.currentTime, 0.025);
    mute.textContent = muted ? "Unmute" : "Mute";
    mute.setAttribute("aria-pressed", String(muted));
  });
  const gesture = button("Gesture: Pluck", () => {
    mode = mode === "pluck" ? "orbit" : "pluck";
    orbit.enabled = mode === "orbit";
    gesture.textContent = "Gesture: " + (mode === "pluck" ? "Pluck" : "Orbit");
  });
  orbit.enabled = false;
  const tempoUI = range(
      "Tempo",
      50,
      140,
      1,
      state.tempo,
      (v) => (state.tempo = v),
    ),
    tensionUI = range(
      "Ribbon tension",
      0.3,
      2,
      0.05,
      state.tension,
      (v) => (state.tension = v),
    );
  button("Change colours", () => {
    snapshot();
    state.colour = 1 - state.colour;
    recolour();
  });
  function recolour() {
    ribbons.forEach((r, i) =>
      r.mesh.material.color.set(palettes[state.colour][i]),
    );
  }
  function pluck(i, x = 0, strength = 1) {
    pulses.push({ i, x, strength, age: 0 });
    if (pulses.length > 48) pulses.shift();
    if (!playing || context?.state !== "running" || voices.size >= 16) return;
    const osc = context.createOscillator(),
      gain = context.createGain(),
      t = context.currentTime;
    osc.type = "sine";
    osc.frequency.setValueAtTime(notes[i], t);
    osc.frequency.exponentialRampToValueAtTime(notes[i] * 0.998, t + 0.6);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.22 * strength, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    osc.connect(gain);
    gain.connect(master);
    const v = { osc, gain };
    voices.add(v);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
      voices.delete(v);
    };
    osc.start();
    osc.stop(t + 1);
  }
  const ray = new T.Raycaster(),
    pointer = new T.Vector2();
  let dragging = false,
    previous = -1;
  function touch(e) {
    const r = canvas.getBoundingClientRect();
    pointer.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      (-(e.clientY - r.top) / r.height) * 2 + 1,
    );
    ray.setFromCamera(pointer, orbit.object);
    const hit = ray.intersectObjects(ribbons.map((r) => r.mesh))[0];
    if (hit) {
      const i = ribbons.findIndex((r) => r.mesh === hit.object);
      if (i !== previous) {
        const p = hit.object.worldToLocal(hit.point.clone());
        pluck(i, p.x, 1);
        previous = i;
      }
    }
  }
  on(canvas, "pointerdown", (e) => {
    if (mode !== "pluck") return;
    snapshot();
    dragging = true;
    previous = -1;
    canvas.setPointerCapture(e.pointerId);
    touch(e);
  });
  on(canvas, "pointermove", (e) => {
    if (dragging) touch(e);
  });
  on(canvas, "pointerup", () => (dragging = false));
  on(canvas, "pointercancel", () => (dragging = false));
  on(canvas, "keydown", (e) => {
    const i = Number(e.key) - 1;
    if (i >= 0 && i < 8) {
      e.preventDefault();
      if (!e.repeat) snapshot();
      pluck(i);
    }
  });
  $("hint").textContent = "Drag ribbons to pluck · keys 1–8 · switch to Orbit";
  function setState(s) {
    pulses.splice(0, pulses.length, ...(s.pulses || []).map((p) => ({ ...p })));
    state = { tempo: s.tempo, tension: s.tension, colour: s.colour };
    tempoUI(state.tempo);
    tensionUI(state.tension);
    recolour();
  }
  return {
    getState: () => ({ ...state, pulses: pulses.map((p) => ({ ...p })) }),
    setState,
    reset() {
      stop();
      pulses.length = 0;
      setState({ tempo: 86, tension: 1.1, colour: 0 });
    },
    pause: stop,
    update(dt, t) {
      if (
        playing &&
        context?.state === "running" &&
        context.currentTime >= nextBeat
      ) {
        const phrase = [0, 4, 2, 6, 1, 5, 3, 7, 0, 2, 5, 4, 1, 6, 3, 5];
        pluck(phrase[beat % phrase.length], Math.sin(beat) * 1.6, 0.7);
        beat++;
        nextBeat = context.currentTime + 60 / state.tempo / 2;
      }
      for (const p of pulses) p.age += dt;
      while (pulses[0]?.age > 3) pulses.shift();
      ribbons.forEach(({ mesh, base }, i) => {
        const a = mesh.geometry.attributes.position;
        for (let j = 0; j < a.count; j++) {
          const x = base[j * 3],
            y = base[j * 3 + 1];
          let z = 0.32 * Math.sin(x * 1.4 + i * 0.45 + t * 0.3);
          for (const p of pulses)
            if (p.i === i)
              z +=
                Math.sin((x - p.x) * 6 - p.age * 15 * state.tension) *
                Math.exp(-p.age * 2.4) *
                0.5 *
                p.strength *
                Math.sin(((x + 2.5) / 5) * Math.PI);
          a.setXYZ(j, x, y + 0.1 * Math.sin(x * 1.6 + i * 0.6), z);
        }
        a.needsUpdate = true;
        mesh.geometry.computeVertexNormals();
      });
      $("metrics").textContent = playing
        ? `${state.tempo} BPM · ${voices.size} voices`
        : "SILENT · PRESS PLAY FOR SOUND";
    },
    dispose() {
      dead = true;
      stop();
      master?.disconnect();
      if (context && context.state !== "closed")
        context.close().catch(() => {});
    },
  };
}
