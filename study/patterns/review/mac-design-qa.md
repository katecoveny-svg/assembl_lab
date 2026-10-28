# Mac integration and primary renderer review

Working preview only. Not visually approved; no publication or deployment.

Integrated the verified Library ZIP (SHA256 036db59523bee62eb6d55e29dffde2738b1c7b3dcd39d25f3f5e95e831b50bac; cloud source fdffb28974ca9145901439e31426a66be5713b99) onto current main f3083289675e8fb4fb0ed74104e600c0f2042dcb. All changes stay under study/patterns. package.json and the proposed shared preview script were intentionally excluded to avoid competing with other owners. The cloud report is retained beside this file.

Ordinary Mac IAB at localhost:8774 confirmed Liquid and Sculpture canvas data-renderer=webgl, with Garden canvas2d. Both primary GPU paths rendered; this is not fallback evidence. Phone viewport 375x812 measured document width and scrollWidth both 375. Glass/Chrome selection, paused drag, switching all three modes and Save worked. A real Sculpture PNG downloaded at 2160x3840 and its pixels were inspected; the source frame was 375x739, honestly disclosed by the export UI.

Bounded refinement: rounder sculpture cross-sections, more geometry segments, reduced overexposure, stronger glass transmission and camera framing; less high-frequency Liquid warping and fewer bright contour lines. No original engines.js changes. All 19 tests and eight module syntax checks pass; git diff --check passes.

## Remaining visual gaps

- Sculpture still has visible surface intersections and broad synthetic reflections; it does not match the reference's deep polished refraction. The desktop composition can still feel narrow. Further art/geometry work is warranted before visual approval.
- Liquid has broad flowing colour but is still procedural contour marbling, not the reference's fine wet pigment texture/droplets.
- Garden is readable layered stylised petals, not the deeply folded luminous reference material.

Mac evidence directory (outside source): ../three-modes-incoming/ relative to the worktree. Inspected captures: liquid-mac-phone.jpg, sculpture-mac-phone-before.jpg, sculpture-mac-phone.jpg, sculpture-chrome-mac-phone.jpg, sculpture-mac-desktop.jpg, garden-mac-phone.jpg. liquid-mac-desktop.jpg records the initial pre-refinement Liquid rendering.

Unverified here: physical touch/iPhone, reduced-motion OS setting, native sharing delivery, physical print, low-end GPU performance. Original-engine exhaustive UI coverage remains the supplied cloud pass, supported by unchanged engines.js and passing runtime tests; this Mac pass focused on the newly available GPU paths. No elevated DevTools, credentials, provider calls, permissions or deployment actions were used.

## Focused geometry refinement

Replaced the four independently intersecting ribbons with one closed trefoil strand. Its two-turn toroidal path separates the apparent crossings in depth; material switching now applies to the same continuous object. The cross-section is bounded and rounded, and the phone camera frames the whole shape above the dock. Glass has lower roughness and less diffuse tint; chrome roughness was softened to avoid razor-sharp synthetic light cards.

Ordinary IAB inspected the new Glass and Chrome at 375x812 and Chrome after dragging. The previously obvious cut-throughs between separate moving meshes are absent in these inspected views. New captures in the same external evidence directory: sculpture-continuous-glass-phone.jpg, sculpture-continuous-chrome-phone.jpg and sculpture-continuous-desktop.jpg. Previous sculpture-mac-phone.jpg and sculpture-chrome-mac-phone.jpg are retained as before evidence. This is a simpler single-object composition than the reference, deliberately prioritising coherent geometry. Glass still reads closer to pale polished resin than deep photographic refraction; independent visual acceptance remains required. No release claim.

All 19 existing tests still pass after this pass. No other creative modes or original engines changed.
