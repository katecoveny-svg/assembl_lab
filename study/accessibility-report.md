# Accessibility pass: assembly study machines

Date: 24 October 2026. Scope: every machine in `m/`, the hub (`index.html`) and the new teacher page (`teacher.html`). Tested in headless Chromium with Playwright: keyboard-only runs, `prefers-reduced-motion: reduce`, and text at 200 % (a 1280 px window zoomed to 200 % is a 640 px layout; the 320 px reflow width was tested too). Zero console or page errors on every page.

## What was checked

1. **Keyboard only.** Tab through every page and record each focus stop; confirm each stop is visible and has a focus indicator; press Enter and Space on step tabs, the note deck, Check buttons, ranges (arrow keys), selects and Allen's button. Look for anything with a pointer handler that cannot be reached by keyboard.
2. **Reduced motion.** With the OS setting on: nothing animating after a check, confetti off, Allen's wiggle off, and simulations not auto-playing (the Play button reads "▶ Play").
3. **Text at 200 %.** No horizontal page scroll at 640 px or 320 px, and no element wider than the viewport.

## What was fixed

| Where | Problem | Fix |
|---|---|---|
| `kit.js` (all machines) | Pressing Enter on a note tab (Exam line / Trap / Big idea / Kupu) re-rendered the tablist and dropped keyboard focus to the page body. | After a tab is chosen the newly rendered tab is focused. Left/Right/Home/End now move between tabs, as a `role="tablist"` should. |
| `m/market.js` | Sorting needs and wants, ranking items, and choosing a person on the values continuum were tap-only on the drawing, with no control equivalent, so a keyboard user could not complete steps 1, 2 or 5. | Every item and person is now a focusable `role="button"` group with a plain-language label that reads its state ("Water bottle, $3, sorted as a need. Press to sort."). Enter and Space run the same `tapAt` code as a tap. Focus is put back on the same target after the drawing redraws. A blue focus ring (the app's `--as-focus`) is drawn on the group. Nothing changes for mouse or touch users. |
| `m/words.js` | The focus indicator on the SVG word pads and channel buttons was the yellow sun colour on a pale background (about 1.9:1), hard to see. | Changed to the app's blue focus colour (`--as-focus`). |
| `hub.html` / `index.html` | Allen in his den wiggles on click, but the picture was not focusable. | The picture is a `role="button"` with a label, responds to Enter and Space, and shows a focus ring. |
| `teacher.html` | The one-pager's "passes when" code could force a horizontal scroll at 320 px; the coverage charts shrank to unreadable text at 400 px. | Code wraps anywhere; the charts sit in a keyboard-focusable region that scrolls sideways on small screens instead of shrinking. |

Backups of every changed file are beside it as `*.before-teacher.*`.

## What was found to be already right

- All 23 machines, the hub and the teacher page: every focus stop has a visible indicator (`:focus-visible` outline in `kit.css`, or a stroke on SVG controls), Enter and Space work on steps, Check buttons and the deck, arrow keys move ranges, and no text is clipped at 200 %.
- Reduced motion: `kit.css` turns off transitions, Allen's animations, the feedback pop and confetti; `kit.js` starts simulations paused when the setting is on. No running animations were found on any machine after a check.
- The reading machine has its own shell; its buttons, inputs and progress screens are all reachable and operable by keyboard.
- The newer machines (claims, materials, text, data) draw tappable tiles in the SVG but every one of those actions is also in the control dock as a button, select or range, so keyboard users have an equivalent route. Maps and the data detective have range or select equivalents for every tap or drag on the map or graph.

## Known limits (not fixed)

- **Train your own AI** needs freehand drawing on the pad. It starts with six synthetic examples and has a "Load a lopsided dataset" button, so the test, bias and fix steps work by keyboard, but drawing a new example needs a pointer. A keyboard way to add synthetic examples would close this.
- **Text studio** has small highlight marks inside the passage (`data-p`) that only respond to a tap; the same information is in the step's control dock.
- Focus-indicator contrast on the SVG groups in the language features and market machines is drawn as a stroke, which automated checkers that only look at `outline` will not see.
- Colour-scheme: the app is deliberately always light (`color-scheme: light` in `kit.css`); dark-mode screenshots match light, by design.

## How it was tested

`/tmp/claude-0/-home-claude/c2d4aad3-a48a-54df-9b96-0e150dbed642/scratchpad/teacher/a11y.js` (Playwright) writes `a11y.json` with the focus order, missing rings, unfocusable pointer targets, keyboard operation results, running animations and overflow at 640 px and 320 px for every page.
