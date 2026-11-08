---
name: assembl-study-teardown
description: Build and review Assembl Study Lab cutaway machines using a shared deterministic model, brand tokens and project-local tooling.
---

# Assembl Study teardown

Use only inside this Study Lab project. Read tools/study-teardown/README.md first.
The reference is elvarofficial/teardown, reviewed at commit a91262ac1109051e014662d42ecb0b7bc1f113b1 (MIT). The project runtime is independently written; the upstream executable toolchain is NOT installed. Do not run upstream sheet.mjs or accept URL-supplied JSON configuration.

Retain the approach, not the author's pale visual theme: use existing Assembl deep plum, white, muted rose and restrained point-cloud accents, Instrument Sans, rounded controls and strong contrast. Do not globally restyle existing Study machines.

One pure model must drive geometry, readouts, diagrams and checks. Preserve curriculum explanations and existing correct controls. Label simplified/illustrative values and cite factual dimensions. Make the working component inspectable through isolate, cutaway and explode controls.

Use tools/study-teardown/new-machine.cjs for scaffolding. It rejects path traversal, symlink ancestors, existing targets and markup/script-bearing titles. No recursive deletion is permitted. Generated code is draft code: review and test before executing or publishing.

Run node --test tools/study-teardown/tests/*.test.mjs. Then run the browser verification loop, examine actual screenshots, check phone overflow, keyboard operation, reduced motion and continuous animation. A failed browser launch is a verification blocker, not a passing UI test. Never publish a machine based only on source or numerical tests.

Keep third-party dependencies pinned and reviewed; use the repository's vendored Three.js. No npm setup, global installation, telemetry, external capture scripts or paid render jobs are necessary for the project kit.
