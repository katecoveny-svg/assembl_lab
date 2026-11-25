// Read the public 16C scene and export a small, roof-off derivative for the homepage.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const zlib = require('node:zlib');

function readPublicSection() {
  const home = window.__twin.scene.getObjectByName('proposed_homes').getObjectByName('unit_16C');
  if (!home) throw new Error('Published unit_16C is missing');
  home.updateWorldMatrix(true, true);
  const inverse = home.matrixWorld.clone().invert();
  const keep = new Set(['walls', 'partitions', 'floor_finish', 'spaces', 'north_deck', 'south_deck', 'fit_out', 'deck_stair']);
  const pos = [], normal = [], color = [], indices = [], tags = {}, materials = {}, surfaceRuns = [];
  let layerName;
  function extract(mesh) {
    if (!mesh.isMesh || !mesh.visible) return;
    const geometry = mesh.geometry;
    const positions = geometry.attributes.position;
    const normals = geometry.attributes.normal;
    const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    if (!positions || !normals || !material.visible || (material.transparent && material.opacity < 0.6)) return;
    const transform = inverse.clone().multiply(mesh.matrixWorld);
    const point = home.position.clone(), direction = point.clone();
    const mapped = new Map();
    const tone = material.color?.clone(), name = material.name;
    if (tone && material.map && Math.min(tone.r, tone.g, tone.b) > 0.58) {
      const lower = name.toLowerCase();
      tone.setHex(/cedar|timber|deck|wood|ply|oak/.test(lower) ? 0xaf9270 : /floor|carpet/.test(lower) ? 0xb9a58e : 0xd1c9be);
    }
    function vertex(i) {
      if (mapped.has(i)) return mapped.get(i);
      point.fromBufferAttribute(positions, i).applyMatrix4(transform);
      direction.fromBufferAttribute(normals, i).transformDirection(transform);
      const output = pos.length / 3;
      pos.push(...point.toArray());
      normal.push(...direction.toArray());
      color.push(...(tone ? [tone.r, tone.g, tone.b] : [0.5, 0.48, 0.45]));
      mapped.set(i, output);
      return output;
    }
    const triangle = [point.clone(), point.clone(), point.clone()];
    for (let i = 0; i < (geometry.index?.count ?? positions.count); i += 3) {
      const ids = [i, i + 1, i + 2].map(j => geometry.index ? geometry.index.getX(j) : j);
      ids.forEach((id, k) => triangle[k].fromBufferAttribute(positions, id).applyMatrix4(transform));
      const [a,b,c] = triangle;
      if (b.sub(a).cross(c.sub(a)).y < -0.000001) continue;
      indices.push(...ids.map(vertex));
    }
    if (mapped.size) {
      const end = pos.length / 3;
      const prior = surfaceRuns.at(-1);
      if (prior && prior[1] === name && prior[2] === layerName) prior[0] = end;
      else surfaceRuns.push([end, name, layerName]);
    }
    materials[name] = (materials[name] || 0) + mapped.size;
  }
  for (const layer of home.children) {
    if (!keep.has(layer.name)) continue;
    const start = indices.length;
    layerName = layer.name;
    layer.traverse(extract);
    tags[layer.name] = [start, indices.length - start];
  }
  return { name: home.name, pos, normal, color, indices, tags, materials, surfaceRuns };
}

function pack(section) {
  const vertices = section.pos.length / 3;
  const buf = Buffer.alloc(8 + vertices * 12 + section.indices.length * 4);
  buf.writeUInt32LE(vertices);
  buf.writeUInt32LE(section.indices.length, 4);
  let at = 8;
  for (let i = 0; i < vertices; i++) {
    for (const axis of [0,1,2]) at = buf.writeInt16LE(Math.round(section.pos[i*3+axis] * 1000), at);
    for (const axis of [0,1,2]) at = buf.writeInt8(Math.round(section.normal[i*3+axis] * 127), at);
    for (const axis of [0,1,2]) at = buf.writeUInt8(Math.min(255, Math.round(Math.sqrt(section.color[i*3+axis]) * 255)), at);
  }
  for (const index of section.indices) at = buf.writeUInt32LE(index, at);
  return zlib.gzipSync(buf, { level: 9 });
}

async function main() {
  const [output, url = 'https://lab.assembl.co.nz/plan-studio/twins/16a/'] = process.argv.slice(2);
  if (!output) throw new Error('Pass an output directory, followed optionally by a local 16A URL.');
  const browser = await chromium.launch({ channel: 'chrome' });
  try {
    const page = await browser.newPage();
    await page.goto(url);
    await page.waitForFunction(() => window.__twin?.status?.textContent.startsWith('Ready'), null, { timeout: 60000 });
    const section = await page.evaluate(readPublicSection);
    const model = pack(section);
    await fs.mkdir(output, { recursive: true });
    await fs.writeFile(path.join(output, 'section16c.bin.gz'), model);
    await fs.writeFile(path.join(output, 'section16c-surfaces.json'), JSON.stringify(section.surfaceRuns));
    const manifest = { name: section.name, verts: section.pos.length / 3, triangles: section.indices.length / 3,
      bytes: model.length, tags: section.tags, materials: section.materials };
    await fs.writeFile(path.join(output, 'section-source.json'), JSON.stringify(manifest, null, 2));
    console.log(section.name, manifest.verts, manifest.triangles, model.length);
  } finally {
    await browser.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
