# Minimal catalogue integration — proposed only

No shared catalogue or navigation file is changed in this commit. Reconcile with the phone/vinyl/bike rollout after review.

1. Add `heart` to `window.STUDY.machines` in `study/data.js` with a record such as:

```js
heart: {
  title: 'Heart Pump Lab', href: 'm/heart.html',
  desc: 'Trace two linked pumps, compare heart rate and forward stroke volume, and explain your A/B evidence.',
  blurb: 'Two pumps, one circulation. Explore valves and compare forward output.',
  tags: ['Science', 'Biology', 'Circulation'], icon: 'heart'
}
```

Do not add NCEA standard, assessment, homeostasis or specialist-endorsed tags. Year-level placement requires teacher review; this record deliberately makes no year-coverage claim.

2. In `study/kit.js`, map `MSUB.heart` to `biochem`, `MTINT.heart` to `blush`, and add an appropriate original heart glyph if the catalogue needs one. The heart module itself does not depend on these shared maps.
3. In `study/index.html`, add `heart` to `THREE_PREVIEWS` and its existing Blender-render preview label condition. Frame `study/m/heart/assets/heart_hero.png` into an 800×500 catalogue image at `study/thumbnails/heart.jpg` and update the thumbnail manifest using the rollout's current convention. Use the actual Blender render, not a browser screenshot.
4. Reconcile machine counts in the Study intro and `lab/catalogue.js` only after combining all concurrent additions. Do not blindly change 35 to 36 while other workers may add entries.
5. Preserve open access and the absence of grading/tracking for this module. Do not attach global assistant scripts or learner-text submission without a separate privacy review and authorization. The Back link already targets `/study/index.html` via a relative path.

Integration validation: open the catalogue card, load the 3D module, switch to diagram and back, retain A/B through topic/step and browser Back navigation, and repeat the tests in `QA.md`. No push or deployment is part of this handoff.
