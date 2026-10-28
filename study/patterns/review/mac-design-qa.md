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
