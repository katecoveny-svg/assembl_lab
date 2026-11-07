/* {{TITLE}}: the geometry, built from code at real size (1 unit = 1 cm), and pose(state). Nothing is keyframed. */
import {SPEC} from './model.js';

const D2R = Math.PI / 180;
const r = SPEC.crank / 10;
const l = SPEC.rod / 10;

export function build(kit) {
  const {THREE, COLOURS: C} = kit;
  const base = new THREE.Mesh(new THREE.BoxGeometry(22, 0.6, 8), kit.mat(C.blush));
  base.position.set(5, -4.3, 0);
  kit.part('base', base, {sub: 'frame', explode: [0, -6, 0], order: 0, cut: 'all'});

  const guide = new THREE.Group();
  const rail = kit.mat(C.paleRose);
  for (const y of [1.1, -1.1]) {
    const g = new THREE.Mesh(new THREE.BoxGeometry(12, 0.4, 3), rail);
    g.position.set(l + 4, y, 0);
    guide.add(g);
  }
  kit.part('guide', guide, {sub: 'frame', explode: [0, 8, 0], order: 1, cut: 'all'});

  const crank = new THREE.Group();
  crank.add(new THREE.Mesh(new THREE.CylinderGeometry(r + 0.8, r + 0.8, 0.6, 48).rotateX(Math.PI / 2), kit.mat(C.mauve)));
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.6, 24).rotateX(Math.PI / 2), kit.mat(C.mist));
  pin.position.set(0, r, 0.6);
  crank.add(pin);
  kit.part('crank', crank, {sub: 'motion', explode: [0, 0, 8], order: 2});
  kit.anchor('crank', crank, [0, r, 0.9]);

  const rod = new THREE.Mesh(new THREE.BoxGeometry(l, 0.5, 0.4).translate(l / 2, 0, 0), kit.mat(C.mist));
  const rodHolder = new THREE.Group();
  rodHolder.add(rod);
  kit.part('rod', rodHolder, {sub: 'motion', explode: [0, 4, 6], order: 3});
  kit.anchor('rod', rod, [l / 2, 0.25, 0.2]);

  const slider = new THREE.Mesh(new THREE.BoxGeometry(3, 1.8, 2.6), kit.mat(C.roseMauve));
  const sliderHolder = new THREE.Group();
  sliderHolder.add(slider);
  kit.part('slider', sliderHolder, {sub: 'motion', explode: [6, 6, 0], order: 4});
  kit.anchor('slider', slider, [0, 0.9, 0]);

  return {
    pose(s) {
      const th = s.theta * D2R;
      // the crank turns about z; its pin is at (r cos θ, r sin θ) with the slider out along +x
      crank.rotation.z = th - Math.PI / 2;
      const px = r * Math.cos(th);
      const py = r * Math.sin(th);
      const sx = px + Math.sqrt(l * l - py * py);
      rod.position.set(px, py, 0.9);
      rod.rotation.z = Math.atan2(-py, sx - px);
      slider.position.set(sx, 0, 0.9);
      kit.hot('slider', s.theta < 180);
    },
  };
}
