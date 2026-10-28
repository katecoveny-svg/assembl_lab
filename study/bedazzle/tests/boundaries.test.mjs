import { test } from "node:test";
import assert from "node:assert/strict";
import { constrainCursor, insideBoundary, overlaps } from "../boundaries.js";
for (const mode of ["brush", "board"])
  for (const size of [0.11, 0.16, 0.23])
    for (const shape of ["round", "square", "marquise"]) {
      test(`${mode} ${shape} ${size}: all corners and size/mode transitions stay placeable`, () => {
        for (const [dx, dy] of [
          [1, 1],
          [-1, 1],
          [-1, -1],
          [1, -1],
        ]) {
          let position = { x: 0, y: 0 };
          for (const [x, y] of [
            [dx, 0],
            [0, dy],
            [dx, dy],
            [-dx, -dy],
          ])
            for (let i = 0; i < 80; i++) {
              position = constrainCursor(
                mode,
                { x: position.x + x * 0.1, y: position.y + y * 0.1 },
                size,
                shape,
              );
              assert.ok(
                insideBoundary(mode, { ...position, size, shape }),
                JSON.stringify(position),
              );
              if (mode === "brush")
                assert.ok(
                  1 -
                    position.x ** 2 / 1.25 ** 2 -
                    position.y ** 2 / 1.75 ** 2 >
                    0,
                );
            }
          // A previous board/large coordinate must be projected before Enter on a brush or new size.
          const projected = constrainCursor(
            mode,
            { x: dx * 1.6, y: dy * 1.9 },
            size,
            shape,
          );
          assert.ok(insideBoundary(mode, { ...projected, size, shape }));
          assert.ok(
            Number.isFinite(projected.x) && Number.isFinite(projected.y),
          );
        }
      });
    }
test("reported x=1, y=1.1 brush crash projects inside with statement marquise margin", () => {
  const p = constrainCursor("brush", { x: 1, y: 1.1 }, 0.23, "marquise");
  assert.ok(insideBoundary("brush", { ...p, size: 0.23, shape: "marquise" }));
  assert.ok(1 - p.x ** 2 / 1.25 ** 2 - p.y ** 2 / 1.75 ** 2 > 0);
});

test("marquise tips cannot overlap through a permissive distance tolerance", () => {
  const a = { x: 0, y: 0, size: 0.16, shape: "marquise" };
  assert.equal(overlaps(a, { ...a, y: 0.44 }), true);
  assert.equal(overlaps(a, { ...a, y: 0.4481 }), false);
  for (const shape of ["round", "square", "marquise"])
    for (const size of [0.11, 0.16, 0.23]) {
      const r = size * (shape === "marquise" ? 1.4 : 1.1),
        stone = { x: 0, y: 0, size, shape };
      assert.equal(overlaps(stone, { ...stone, y: r * 2 - 1e-8 }), true);
      assert.equal(overlaps(stone, { ...stone, y: r * 2 + 1e-8 }), false);
    }
});
