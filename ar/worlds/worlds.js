// assembl AR worlds: the registry. Plain data, no three.js, so the gallery, the launcher, the "View in AR" button and the
// build tool can all read it cheaply.
//
// Each world has two ways in:
//   table   a diorama on a table or the floor, about 40 to 80 cm across (pinch to resize on iPhone)
//   inside  "Step inside": places open as a doorway you walk through into the life-size world (Android); objects stand
//           in your room at real size, or giant for small things. Real size stays real size (no pinch).
// Files (made offline by ar/tools/build_worlds.py and committed): ar/worlds/files/<id>-<mode>.usdz for AR Quick Look and
// <id>-<mode>.glb for Scene Viewer. Android with WebXR runs the live world instead, with the same model code as the page.

export const SIMREADY = '3D assets: NVIDIA SimReady (CC BY 4.0), via codepawl/simready-glb';
export const HOST = 'lab.assembl.co.nz';
export const MODES = {
  table: { id: 'table', name: 'On your table', short: 'Table' },
  inside: { id: 'inside', name: 'Step inside', short: 'Inside' }
};

// scale: how many metres in AR for one metre of the world. extent: the world's real footprint in metres.
// labels: truth chips shown on the card, the launcher and in AR. notice: a line that must stay visible in AR.
export const WORLDS = [
  {
    id: 'f1', name: 'Race car', line: 'An open-wheel race car, parked in your driveway at real size.',
    kind: 'object', from: '/study/m/windtunnel.html', fromName: 'The wind tunnel machine',
    labels: ['Example'], credit: 'Made in Blender for assembly study.',
    table: { scale: 1 / 8, note: '1:8 model, about 70 cm long' },
    inside: { scale: 1, note: 'Real size, about 5.6 m long', verb: 'Real size' },
    why: 'A real-size race car in a driveway or a school hall is the moment people film. It is a single object, so it places cleanly and stays sharp.'
  },
  {
    id: 'claw', name: 'Claw machine', line: 'A real-size claw machine that grabs a prize in front of you.',
    kind: 'object', from: '/study/m/claw.html', fromName: 'The claw machine',
    labels: ['Example'], credit: 'Made in Blender for assembly study.',
    table: { scale: 1 / 4, note: '1:4 model, about 55 cm tall' },
    inside: { scale: 1, note: 'Real size, 2.2 m tall', verb: 'Real size' },
    why: 'Everyone knows a claw machine. Watching the claw drop and grab at real size, close enough to look through the glass, is instantly readable.'
  },
  {
    id: 'heart', name: 'Heart pump', line: 'A beating heart, cut open, big enough to walk around.',
    kind: 'object', from: '/study/m/heart.html', fromName: 'Heart Pump Lab',
    labels: ['Example', 'Teaching model'], credit: 'Made in Blender for assembly study. A teaching model, not medical advice.',
    table: { scale: 3, note: 'Three times real size, about 55 cm tall' },
    inside: { scale: 14, note: 'Giant: 14 times real size, about 2.5 m tall', verb: 'Giant' },
    why: 'A heart is small and hidden. Making it giant and letting you walk round the valves turns a diagram into a place.'
  },
  {
    id: 'earth', name: 'Earth and Moon', line: 'The Earth turning beside you, with the Moon going round.',
    kind: 'object', from: '/study/m/earthspace.html', fromName: 'The Earth and space machine',
    labels: ['Example', 'Not to scale'], credit: 'Earth imagery: NASA Blue Marble and Black Marble (public domain). Model made in Blender for assembly study.',
    table: { scale: 0.13, note: 'A globe about 26 cm across, with the Moon going round' },
    inside: { scale: 1.5, note: 'Giant: an Earth 3 m across', verb: 'Giant' },
    why: 'A globe taller than you, turning slowly with Aotearoa on it, is a calm and striking thing to stand next to.'
  },
  {
    id: 'dairy', name: 'Milk powder plant', line: 'Tankers queue, silos fill and the dryer runs. One simulated day.',
    kind: 'place', from: '/dairy/plant/', fromName: 'Dairy plant floor',
    labels: ['Simulated', 'Example plant, not a real site'], credit: SIMREADY, simready: true,
    table: { scale: 1 / 300, note: 'The whole site, about 65 cm across' },
    inside: { scale: 1, note: 'Life size: walk through a doorway onto the tanker bays', verb: 'Life size' },
    why: 'Tankers moving in and out on a table read like a living model railway, and the doorway drops you onto a bay beside a 20 m tanker.'
  },
  {
    id: 'ed', name: 'Emergency department', line: 'Patients arrive, are triaged and wait for beds. Simulated.',
    kind: 'place', from: '/ed/floor/', fromName: 'Emergency department floor',
    labels: ['Simulated', 'Not any real hospital'], credit: SIMREADY, simready: true,
    notice: 'In an emergency, call 111. This is a simulation, not medical advice.',
    table: { scale: 1 / 160, note: 'The whole department, about 65 cm across' },
    inside: { scale: 1, note: 'Life size: walk through a doorway into the cubicles', verb: 'Life size' },
    why: 'Most people only see an ED from a chair. Standing among the cubicles shows why the queue forms in the waiting room.'
  },
  {
    id: 'dc', name: 'Grocery warehouse', line: 'Forklifts and pickers fill a day of store orders. Simulated.',
    kind: 'place', from: '/store/dc/', fromName: 'Grocery distribution centre',
    labels: ['Simulated', 'Example DC, not a real site'], credit: SIMREADY, simready: true,
    table: { scale: 1 / 150, note: 'The whole warehouse, about 65 cm across' },
    inside: { scale: 1, note: 'Life size: walk through a doorway into the racking aisles', verb: 'Life size' },
    why: 'Racking taller than a house and forklifts going past are things most people never stand next to.'
  },
  {
    id: 'cafe', name: 'Café', line: 'A neighbourhood café: counter, kitchen pass and tables.',
    kind: 'place', from: '/cafe/', fromName: 'Café twin',
    labels: ['Example café'], credit: 'Made in Blender for assembl lab. People are plain figures, not likenesses.',
    table: { scale: 1 / 30, note: 'The whole venue, about 60 cm across' },
    inside: { scale: 1, note: 'Life size: walk through a doorway to the counter', verb: 'Life size' },
    why: 'A café is a place many teenagers work in first. Standing behind the counter at real size makes the job feel real.'
  }
];

export const world = id => WORLDS.find(w => w.id === id) || null;
export const modeOf = m => (m === 'inside' || m === 'life' || m === 'real' ? 'inside' : 'table');

// Short, shareable links: lab.assembl.co.nz/ar/w/dairy/?mode=table (Vercel rewrites /ar/w/:id/ to the launcher).
export function worldURL(id, mode = 'table', origin = null) {
  const base = origin || (typeof location !== 'undefined' && !/^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(location.hostname) && location.protocol === 'https:' ? location.origin : 'https://' + HOST);
  return `${base}/ar/w/${id}/?mode=${modeOf(mode)}`;
}
export const shortLink = (id, mode) => `${HOST}/ar/w/${id}/?mode=${modeOf(mode)}`;
// prebuilt files, relative to the site root
export const fileURL = (id, mode, ext) => `/ar/worlds/files/${id}-${modeOf(mode)}.${ext}`;
export const posterURL = id => `/ar/worlds/posters/${id}.webp`;
