// Plan of the simulated emergency department floor, in metres: where every bed, curtain, sofa and desk stands, and
// where a patient in each state of the model waits, sits or lies. The model itself is /ed/sim.js, unchanged: the same
// 44 cubicles, 4 resus bays, 14 minors chairs and 40 waiting seats as the department page.
//   x: east (+), from minors and the waiting room (west) to resus and the ambulance bay (east)   z: south (+)   y: up
// The plan is fictional, laid out the way large ED floors commonly are, at real bed and corridor sizes.
export const HALL = { x0: -38, x1: 38, z0: -24, z1: 20, h: 3.6 };
export const CUB_X = i => -10 + 3.25 * i;                               // eleven cubicles a row
// four rows: z is the bed's centre; head is the side the bed's head (and the curtain's back) faces (-1 north, +1 south)
export const CUB_ROWS = [{ z: -20.4, head: -1 }, { z: -12.6, head: 1 }, { z: -7.9, head: -1 }, { z: -0.1, head: 1 }];
export const CUBICLES = []; CUB_ROWS.forEach((r, ri) => { for (let i = 0; i < 11; i++) CUBICLES.push({ x: CUB_X(i), z: r.z, head: r.head, row: ri }); });
export const RESUS = [{ x: 27.0, z: -19.6, head: -1 }, { x: 32.6, z: -19.6, head: -1 }, { x: 27.0, z: -9.4, head: 1 }, { x: 32.6, z: -9.4, head: 1 }];
// minors: seven treatment sofas, two patients each
export const MINOR_SOFAS = [[-33, -19.8], [-29.4, -19.8], [-25.8, -19.8], [-22.2, -19.8], [-18.6, -19.8], [-33, -9.6], [-29.4, -9.6]];
export const MINORS = MINOR_SOFAS.flatMap(([x, z]) => [{ x: x - 0.55, z }, { x: x + 0.55, z }]);
// waiting room: fifteen three-seat sofas in three rows, facing the triage desk; the first forty seats are used
export const WAIT_SOFAS = []; for (const z of [9.2, 12.9, 16.6]) for (const x of [-34.2, -30.6, -27, -23.4, -19.8]) WAIT_SOFAS.push([x, z]);
export const SEATS = WAIT_SOFAS.flatMap(([x, z]) => [-0.72, 0, 0.72].map(d => ({ x: x + d, z }))).slice(0, 40);
export const STANDING = i => ({ x: -16 + (i % 4) * 0.8, z: 7.2 + Math.floor(i / 4) * 0.8 });   // standing room once the seats are full
export const TRIAGE_DESKS = [{ x: -9.6, z: 11.8 }, { x: -9.6, z: 16.2 }];
export const TRIAGE_SPOT = i => ({ x: -11.3, z: TRIAGE_DESKS[i % 2].z });              // a walk-in being triaged
export const TRIAGE_QUEUE = i => ({ x: -13.0 - (i % 3) * 0.7, z: 14 + Math.floor(i / 3) * 0.7 });
export const STATION = [{ x: 5.6, z: 7.6 }, { x: 9.4, z: 7.6 }];                       // the doctors' and nurses' station
export const DOC_HOME = j => ({ x: 4.2 + (j % 6) * 1.2, z: 9.3 + Math.floor(j / 6) * 0.9 });
// ambulance entrance (east wall) and bay
export const AMB_DOOR = { x: HALL.x1, z0: 6, z1: 12 };
export const HANDOVER = i => ({ x: 35.6 - (i % 3) * 1.5, z: 7.2 + Math.floor(i / 3) * 1.7 }); // stretchers being triaged
export const CANOPY = { x0: 40, x1: 56, z0: 1.5, z1: 19, h: 4.6 };
export const AMB_SLOT = j => j < 4 ? { x: 48, z: 4.2 + j * 4.3, yaw: -Math.PI / 2 } : { x: 60 + (j - 4) * 7.6, z: 24, yaw: -Math.PI / 2 };
export const WALK_IN = { x: -22, z: HALL.z1 + 1.5 }, WARD_LIFT = { x: 14.5, z: -23 };
