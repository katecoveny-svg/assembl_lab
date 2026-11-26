# Reference matrix

| Upstream | Useful technique | Not a reason to install it |
| --- | --- | --- |
| [Leonxlnx / Room at Dawn](https://github.com/Leonxlnx/room-at-dawn) | Analyse the directional baked lighting, occlusion and position-specific reflections. Match a real shot. | Do not transplant its exact bake, vertex maps, camera coordinates, or cinematic blur. |
| [EZ-Tree](https://github.com/dgreenheck/ez-tree) | Seeded branch skeleton, taper, grouped leaves and structural detail levels. | Generic temperate presets are not a pōhutukawa or nīkau. Confirm texture redistribution rights. |
| [Quick_Grass](https://github.com/simondevyoutube/Quick_Grass) | Grass blade clumps, grounded deformation and camera-bounded density. | Reference GLSL is not a drop-in TSL shader. |
| [N8AO](https://github.com/N8python/n8ao), [realism-effects](https://github.com/0beqz/realism-effects) | Use subtle, scaled contact shading for grounded edges; compare it against an unmodified shot. | Not a fix for wrong foliage, false light, or unsupported WebGPU/WebGL2 dependencies. |
| [three-gpu-pathtracer](https://github.com/gkjohnson/three-gpu-pathtracer) | Distinct still/film capture branch with stable model and camera. | Do not require it for the public handheld walkthrough. |
| [threejs-water-free](https://github.com/baditaflorin/threejs-water-free), [beautiful-water](https://github.com/VictorZakharov/beautiful-water), [WaterThreeJS](https://github.com/skywalkerqqq/water-three-js) | Separate long swell and local detail; shallow-water colour and reflections; use a common height evaluator for motion and buoyancy. | Do not stack multiple engines or present procedural movement as tide data. |
| [Three.js r187 Compute Birds](https://github.com/mrdoob/three.js/blob/r187/examples/webgpu_compute_birds.html) | Isolate flock motion from drawing and profile the expensive cases. | Never use as a source for New Zealand species shape, material, or calls. |

Use the pinned local archive collection where present. Read the specific repo and asset terms before reuse; prefer original interpretations over copying entire examples. If borrowing code snippets keep licence and attribution with the code.
