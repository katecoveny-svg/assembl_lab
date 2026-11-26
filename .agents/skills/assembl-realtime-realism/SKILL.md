---
name: assembl-realtime-realism
description: Improve or audit the live Assembl Three.js tools at human eye level, using Room at Dawn lighting, believable Aotearoa foliage, water and motion, with desktop, phone and WebGL2 visual checks. Use for architecture and planting walkthroughs, Auckland Live, Tides, Manu and browser 3D previews.
---

# Assembl real-time realism

Start in the tool the person actually links to. Confirm its public route, served renderer and source commit. Identify which view they mean and capture one matched eye-level frame and one overview. Do not work in the legacy editor because it sounds like the current tool. Keep user-facing previews visual first and clear about what is real, approximate, or illustrative.

## 1. Fix the cause before changing the renderer

- Keep the measured IFC/GLB, transforms, walk and pick layers, registered site data, and live-data calculations unchanged unless specifically asked. Site overlays may be optional and labelled. Note the source and capture dates; a fresh lookup does not make historic photography current.
- Match exposure, lens, camera, time, exact model and planting seed across before/after. Turn off movement, depth of field and motion blur for the diagnostic frame. If a sign or view is blurry, compare actual buffer size and pixel ratio first, then texture/bake size, contrast, roughness and specular glare.
- Work from form to materials to light. Use measured scale and suitably licenced source materials. Colour maps are sRGB; normals, roughness, occlusion and other data maps are linear. Do not use a stronger colour grade to disguise an inaccurate silhouette or add fake geometry to compensate for weak lighting.

## 2. Room at Dawn, translated rather than copied

Use [Room at Dawn](https://github.com/Leonxlnx/room-at-dawn) for its browser lighting structure: directional baked bounce where the exact geometry is stable, subdued grounding at contacts, and a reflection capture placed for the space. Keep background sky grading separate from the light it casts or the reflections it supplies. Keep glass directional and readable rather than turning it into a white mirror. Use a small procedural contact term or local fill if the geometry is changing; only add a vertex bake when the mesh IDs, order and counts have been verified against the bake. The reference’s cinematic blur is not a target for a live walkthrough; reserve it for optional film or still capture.

## 3. Choose one suitable technique per symptom

- **Native planting:** match botanical form before scatter. Anchor leaves to branch shoots, model crown gaps and stems, check real leaf scale, edge and underside, and group plants in site-appropriate drifts rather than uniform noise. Pair lighting-driven colour variation with restrained transmission and darker crown interiors. Derive rooted breeze with different stiffness for trunks, fronds and grasses. Keep native species recognisable both at eye level and from overhead.
- **Ground and shallow water:** keep water level, visual waves and buoyancy distinct. For a port or tide tool, use the same rendered wave surface for vessel following; do not claim a simulated swell or prediction is a live observation. Real-time water can borrow scale separation, view-angle reflection, shoreline foam and a bounded high-detail region; do not replace a working simulation wholesale for appearance.
- **Renderer:** prefer one Three.js version and its existing WebGPU/TSL path with WebGL2 fallback. Add effects only if they solve the matched-frame problem. Reserve path tracing for deliberate still or film export unless tested on both device tiers. Bird compute examples are motion references, not species meshes, and should not block the other tools.
- See [reference matrix](references/reference-matrix.md) for repo URLs, scope and reuse checks. These are a menu of techniques, not dependencies to install together.

## 4. Release only measured improvement

Use the native browser, not a still composited later. A/B the agreed visual, check the full interaction (e.g. walk/paint/undo/drag), try changed sun angles, and compare desktop plus phone-sized view and forced WebGL2 where supported. Test reduced motion, keyboard and touch; state when a physical phone was not checked. Track exceptions separately: SDK errors, shader compilation, first frame, frame time, geometry or draw-call budgets, network size and optional service failures. Leave a dated fallback. Test the canonical production link with a fresh session and keep an easy rollback. A technical pass is not proof of photography-grade output. Hold if the agreed view is still worse or if publishing would disclose unapproved assets.
