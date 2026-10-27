/* Stand-in for ez-tree's presets/index.js (the JSON presets are not shipped with the assembly downhill machine). */
export const TreePreset = {};
export function loadPreset(name) { throw new Error('ez-tree preset not bundled: ' + name); }
