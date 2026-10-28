import test from "node:test";
import assert from "node:assert/strict";
import { defaults, cage, validateProject } from "../src/model.js";
const g = cage("cloud");
const valid = {
  format: "assembl-squishy-project",
  version: 1,
  design: { ...defaults },
  pose: Array.from(g.attributes.position.array),
  view: { position: [2, 1.3, 5.8], target: [0, 0, 0] },
};
g.dispose();
test("valid project is cloned, all fields strict and finite", () => {
  assert.deepEqual(validateProject(valid), valid);
  for (const mutate of [
    (p) => (p.extra = 1),
    (p) => (p.version = 2),
    (p) => (p.design.spring = NaN),
    (p) => (p.design.mix = 1.1),
    (p) => (p.design.colorA = "red"),
    (p) => (p.design.shape = "toString"),
    (p) => p.pose.pop(),
    (p) => (p.pose[0] = Infinity),
    (p) => (p.pose[0] = 7),
    (p) => (p.view.position = [0, 0, 0]),
    (p) => (p.view.extra = true),
    (p) => (p.design.extra = true),
  ]) {
    const p = structuredClone(valid);
    mutate(p);
    assert.throws(() => validateProject(p));
  }
});
