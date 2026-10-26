// assembl capture · capture presets. General-purpose: a host (a dealer listing tool, the study app, …)
// picks one and may override labels and hints with `extends`, without touching the core.
//
//   capture.start(el, { preset: "walkaround" })
//   capture.start(el, { preset: "my-car", presets: { "my-car": { extends: "walkaround", label: "Car walk-around", subjectNoun: "car" } } })

export const BASE_PRESETS = {
  walkaround: {
    id: "walkaround",
    label: "Walk around something large",
    example: "a car, a boat, a statue",
    subjectNoun: "subject",
    mode: "walkaround",            // dataset mode
    objectMotion: "camera-moves",
    prepareMode: "exterior",       // prepare.js mode used after training
    spacingDeg: 9,                 // a keyframe every ~9° of travel round the subject
    perRingTarget: 40,
    rings: [
      { id: "middle", label: "Chest height", hint: "Phone at chest height, aimed at the middle. Walk slowly all the way round.", pitch: [-20, 12] },
      { id: "low", label: "Lower ring", hint: "Crouch to knee height and tilt the phone up a little. Walk round again.", pitch: [-6, 40] },
      { id: "high", label: "Higher ring", hint: "Hold the phone above your head and tilt it down. Walk round once more.", pitch: [-70, -8] },
    ],
    distance: { minM: 1.2, maxM: 5, typicalM: 2.0, hint: "Stay about 1.5–2.5 m away the whole time." },
    maxRotRateDeg: 45,             // turning faster than this blurs frames: "slower"
    minSharpRel: 0.6,              // keep frames at least 60 % as sharp as the recent median
    maxFrames: 240,
    sizeField: { label: "Overall length", unit: "m", key: "knownLengthM", factor: 1, step: 0.001, placeholder: "e.g. 4.395" },
    tips: ["Overcast light or full shade is best; hard sun and reflections make blotches.", "Keep the whole subject in view where you can.", "Dark, plain clothes: you will be reflected in glossy surfaces."],
  },
  "object-ring": {
    id: "object-ring",
    label: "Circle an object on a table",
    example: "a rock, a shell, a model engine",
    subjectNoun: "object",
    mode: "object",
    objectMotion: "camera-moves",
    prepareMode: "object",
    spacingDeg: 10,
    perRingTarget: 36,
    rings: [
      { id: "middle", label: "Low ring", hint: "Phone a little above the table, tilted down slightly. Move all the way round the object.", pitch: [-45, 0] },
      { id: "high", label: "High ring", hint: "Raise the phone and look down at about 45°. Go round again.", pitch: [-80, -30] },
    ],
    distance: { minM: 0.15, maxM: 0.9, typicalM: 0.35, hint: "Keep the object filling about half the screen." },
    maxRotRateDeg: 40,
    minSharpRel: 0.65,
    maxFrames: 160,
    sizeField: { label: "Longest side", unit: "cm", key: "knownSizeM", factor: 0.01, step: 0.1, placeholder: "e.g. 12" },
    tips: ["Put the object on a patterned cloth or newspaper: the pattern helps the computer place each photo.", "Even light, no hard shadows.", "Don't move the object between photos."],
  },
  "object-turntable": {
    id: "object-turntable",
    label: "Turn an object by hand",
    example: "for a laptop camera or a phone on a stand",
    subjectNoun: "object",
    mode: "object",
    objectMotion: "object-turns",
    prepareMode: "object",
    spacingDeg: 10,
    perRingTarget: 36,
    rings: [
      { id: "middle", label: "First turn", hint: "Turn the object a little at a time, all the way round. Keep hands out of view between turns.", pitch: null },
      { id: "high", label: "Second turn", hint: "Tip the camera (or the object's base) to see it from higher up, then turn it round again.", pitch: null },
    ],
    distance: null,
    maxRotRateDeg: 25,
    minSharpRel: 0.65,
    maxFrames: 120,
    imageChange: 0.045,            // mean absolute change (0–1) that counts as "it has turned"
    sizeField: { label: "Longest side", unit: "cm", key: "knownSizeM", factor: 0.01, step: 0.1, placeholder: "e.g. 12" },
    tips: ["Use a plain wall or a sheet of paper behind the object: a busy background confuses pose solving when the object turns.", "Put it on a patterned mat that turns with it."],
    caution: "Turning the object (instead of moving the camera) is the least reliable mode: the background stays still while the object moves. Results Require validation.",
  },
};

/** Resolve a preset id (with host additions and `extends`). */
export function resolvePreset(id = "walkaround", hostPresets = {}) {
  const all = { ...BASE_PRESETS, ...hostPresets };
  const seen = new Set();
  const build = (key) => {
    const p = all[key];
    if (!p) throw new Error(`Unknown capture preset "${key}"`);
    if (seen.has(key)) throw new Error(`Preset cycle at "${key}"`);
    seen.add(key);
    const base = p.extends ? build(p.extends) : {};
    return { ...base, ...p, id: key, rings: p.rings || base.rings, sizeField: { ...(base.sizeField || {}), ...(p.sizeField || {}) } };
  };
  return build(id);
}
