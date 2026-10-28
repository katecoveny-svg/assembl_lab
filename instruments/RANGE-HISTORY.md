# Range history follow-up

Base: current main `64da0c6f2e130bf283cf1fe0c71d61fc7d12592e` (the externally released first-three corrections).

The audit reproduced missing Undo for Soft Matter Spring, Reality Remix Brush size, and Reach on all three 2D fallback routes. Impossible Objects' three sliders already handled native keyboard edits; they now use the same shared mechanism for consistent gesture grouping and no-op behavior.

Every range snapshots on its first actual input change. A held key or pointer drag creates one undo step. Focusing a control or pressing a key at its boundary does not add a false undo entry. Snapshots include brush/reach size, and Soft Matter spring/material settings plus particle positions and velocities. Material preset changes also enter history, keeping their controls/colours consistent when Undo crosses a spring edit.

Validation on Chromium desktop, Pixel 7 Chromium emulation and WebKit:
- 24 new tests passed: every range on all six 3D/fallback routes with Home, End, four arrows, PageUp and PageDown; whole-state restoration; held-key/pointer grouping; boundary no-ops; and spring/material undo across quality switches.
- 46 existing interaction/export/quality tests passed; two CDP-only cases intentionally skipped outside mobile Chromium.
- No renderer, physics solver, quality defaults or export-scale changes. Existing quality state-preservation and native-print regression tests pass.

Playwright now starts or reuses its localhost server, avoiding connection-refused results after an executor reconnect. Physical devices and native print/share dialogs remain unverified. Original studio, stage-two and Bedazzle files are untouched. No merge, deployment, credentials or access changes performed.
