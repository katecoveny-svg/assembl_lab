# Lab homepage and presentation draft

Base: f3083289675e8fb4fb0ed74104e600c0f2042dcb. Branch: codex/lab-coherent-catalogue. Local URL: http://127.0.0.1:8768/. No push, deployment or merge.

## Current-live findings

1. **Homepage — weak hierarchy:** fresh public IAB showed the house simulator occupying the hero. Creative instruments were missing from the collection and navigation. This was the current public design, not evidence of cache failure. Evidence: `output/design-audit/01-home-desktop.jpg`.
2. **Embedded phone route — crowded frame:** https://www.assembl.co.nz/lab gives its iframe 375×742 inside a 375×844 viewport. Fixed wrapper header/footer consume 102px, and Lab adds its own header. The outer document height was 844, with scrolling inside the iframe. The direct Lab CSS separately uses two narrow columns above 360px, 10px descriptions and 6–8px labels, with selected full-width cards. These are two separate problems. Evidence: `00-embed-mobile.jpg`, `00-embed-catalogue-mobile.jpg`, `01-live-catalogue-mobile.jpg`.
3. **Study — inconsistent presentation:** different assembly lockup, rounded display font, a second navigation bar, exam-led hero and five competing calls to action. Machines were below Habitat/creative promotions. All 35 machines and the newer thumbnails were live. Evidence: `02-study-desktop.jpg`.
4. **Representative Phone machine — functioning but different shell:** observed battery input, step tabs, readouts and Back. Phone uses drawing presentation at the tested narrow viewport; no claim that this draft changes that engine. Evidence: `03-phone-mobile.jpg`.
5. **Next — functioning studios, another large introduction:** a second logo/header, 14 icon tiles and long introduction before the workspace. Real Habitat rendering and controls are live. Evidence: `04-next-desktop.jpg`.
6. **Tongjiang reference — useful principles:** clear subject entry, visible real runtime model, compact controls and guided progression. Original English wording and existing assembl assets were used; no source/assets copied. Evidence: `05-reference-desktop.jpg`.

## Implemented

- New cream/navy homepage with three real runtime previews and distinct Learn, Create, Make & explore sections. No autoplay iframe or renderer on home.
- Existing 19 catalogue worlds preserved; three approved creative instruments and Habitat added, for 23 entries. Search, category filters, saved cards using the existing storage key, empty-state recovery. Learn/Create/Make sort ahead of everyday systems. Single-column phone cards with readable text and 44px controls.
- Links to all existing year panels. Years 7–8 points to three selected activities and explicitly avoids claiming a complete programme. Year deep links select and reveal the existing panel.
- Common navigation in lab/navigation.js. Shared light typography, spacing and cards applied to Study, Year 9 and Next. Study keeps Allen, his den, exam data and all 35 machines; moves machines ahead of creative side trips.
- Existing real captures reused. Year 9's old icon poster replaced with `lab/previews/year9-builder.jpg`, captured from the working App builder in this draft (Trail Kai checklist, one checked item). Next catalogue uses the actual Habitat capture.
- Study hub introduces explore → predict → try → explain as a learning approach, not a completion/assessment claim. Creative instruments retain open-ended wording.

## Ownership / untouched areas

Code files: `index.html`, `lab/navigation.js`, new `lab/catalogue-home.css`, `lab/catalogue-home.js`, `lab/presentation.css`, `study/index.html`, `study/navigation-paths.js`; one new JPEG and review evidence.

`study/kit.js` was restored byte-for-byte to base after parent assigned the learning-shell owner. No machine-specific CSS remains. No edits to kit3d, individual models, next/app.js, Living Studio, instruments, Climate lesson/embed, or parent wrapper. Shared navigation preserves the legacy branch on /study/patterns/, /study/lessons/climate/ and /study/m/climate.html to avoid interfering with their owners. Other existing pages receive only the common navigation when they already load navigation.js; this is not a claim that every tool has been restyled.

Parent wrapper exact source (read-only inspected): `katecoveny-svg/assemblnz-f0afd79d/app/lab/page.tsx` and `app/lab/lab.module.css`. Separate owner is handling it.

## Checks

- JS syntax: navigation.js, catalogue-home.js, navigation-paths.js passed; git diff --check passed.
- All 60 rendered home anchors / 45 unique destinations checked against local route files; no missing local targets. All static home asset paths exist.
- Ordinary IAB: homepage Learn link, existing Year 10 selected panel, Phone Back to Year 12 panel, filters (Create=3, Everything=23), nonexistent search/empty reset, save→Saved (1) passed.
- Keyboard: navigation Tab focused Learn with visible solid 3px outline. Phone Battery ArrowRight changed 3349→3350; Next advanced 1→2 of 9. No engine edits.
- Responsive: home, Study, Next and Year 9 document width equals viewport at 320; home/Study/Phone at 375 also no horizontal overflow. Catalogue 375 has one 339px column. Screenshots alone are not WCAG certification or physical-touch evidence.
- Habitat: actual canvas loaded, Rotate right changed camera, changing water after Test clears assessment to —; controls wrap on mobile.
- Year 9: App builder selection and Phone and jacket checkbox updated the working preview 0/3→1/3.
- No newly observed local uncaught errors. Browser log retained two earlier MutationObserver errors from initial live audit; their origin was not established, and they are not presented as fixed.
- Root has no iframe or WebGL scene to initialise; thumbnails are lazy below the hero. No new runtime libraries.

## Pending / limits

- Reduced-motion runtime emulation **blocked/pending**: IAB raw-CDP `Emulation.setEmulatedMedia` at http://127.0.0.1:8768/ was not granted authority because its permission request was dismissed/cancelled. No emulation was applied, no retry or indirect workaround. Static CSS includes reduced-motion rules. Parent can arrange an authorised check.
- Visual review remains required. No production release. Physical iPhone/Safari, low-memory hardware, sustained performance and touch dragging not newly tested.
- Local Python static server does not implement server APIs. No credentials, providers, private student data or access settings touched.
- Some initial captures immediately after viewport changes were stale/scaled and rejected; only accepted final screenshots are used in review.html. The first 01-home-mobile.jpg loading capture is not evidence.

Review board: http://127.0.0.1:8768/output/design-audit/review.html
