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

## Assembl pilot checks, 26 November 2026

- Garden Studio: broad directional sky fill in the leaf material, separate from direct backlight and visible sky, lifted shaded leaves at matching camera and seed. Native WebGPU desktop and phone-sized plus forced WebGL2 succeeded, with triangle counts unchanged. The shot still reads as a procedural study; improving a measured frame does not meet the bar by itself. For wind borrow Room at Dawn's hierarchy (crown lean → limb → branch → leaf flutter under travelling gusts), with separated stiffness, deterministic time and reduced-motion.
- Drop a Plan Waiheke sample: current viewer already has native contact shading and daylight from openings. A same-camera warm/cool exposure trial added some texture detail but darkened the room and did not fix glass reflections. Retain the baseline. The next controlled experiment is a room-positioned specular capture and model-matched directional bounce.
- Waitematā Tides: a filtered specular/reflection pilot preserved desktop/touch drag, keyboard controls and the simulation’s notice. It only made a small desktop change and barely affected the phone frame. Retain the current water. Profile correct surrounding assets, reflections and aerial source quality before attempting more water complexity.
