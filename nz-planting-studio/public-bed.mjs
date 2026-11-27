// Only the public garden's plants and painted surfaces cross between the two sites.
// The fragment stays in the browser and works with partitioned or unavailable storage.
const fields = ['x', 'z', 'rotY', 'scale', 'phase', 'hue'];
const ranges = [[-28,28], [-28,28], [-8,8], [.1,4], [0,1], [-1,1]];
const mixes = new Map([['coastal_native',0], ['bush_understory',1], ['pollinator_border',4]]);
const years = [1, 4, 7, 12];
const stride = 55; // uint32 id, uint8 species, int16 bed, six float64 placements.
const maxPlants = 3000;
const maxPayload = 230000;
const inRange = (value, lo, hi) => Number.isFinite(value) && value >= lo && value <= hi;

function check(allowed) {
  if (!allowed) throw Error('This planting selection could not be restored.');
}
function base64url(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8000) {
    binary += String.fromCharCode(...bytes.subarray(i,i+8000));
  }
  return btoa(binary).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
}
function unbase64(text) {
  check(/^[-_a-zA-Z0-9]*$/.test(text));
  return Uint8Array.from(atob(text.replaceAll('-','+').replaceAll('_','/')), c => c.charCodeAt(0));
}
function surfaces(engine) {
  return [engine.splatDataA,engine.splatDataB,engine.splatDataC];
}
async function unpackSurfaces(encoded, expectedBytes) {
  // Bound decompression before allocating or writing any user-supplied data.
  const reader = new Blob([unbase64(encoded)]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();
  const bytes = new Uint8Array(expectedBytes);
  let offset = 0;
  try {
    while (true) {
      const {done,value} = await reader.read();
      if (done) break;
      check(offset + value.length <= bytes.length);
      bytes.set(value,offset);
      offset += value.length;
    }
  } finally {
    await reader.cancel();
  }
  check(offset === expectedBytes);
  return bytes;
}

export async function encodeBed(studio, month, year) {
  const engine = studio.engine, plants = engine.plants;
  const species = [...new Set(plants.map(p => p.speciesId))];
  const mix = studio.state.selectedCompositionId;
  check(plants.length <= maxPlants && species.length <= 96 && species.every(id => /^\w{1,48}$/.test(id)));
  check(mixes.has(mix) && inRange(month,0,11.95) && years.includes(year));
  const bytes = new Uint8Array(plants.length * stride), view = new DataView(bytes.buffer);
  plants.forEach((plant,i) => {
    const offset = i * stride;
    view.setUint32(offset,plant.id,true);
    view.setUint8(offset + 4,species.indexOf(plant.speciesId));
    view.setInt16(offset + 5,plant.bedId ?? -1,true);
    fields.forEach((field,j) => view.setFloat64(offset + 7 + j*8,plant[field],true));
  });
  const total = Math.round(studio.getQuote().grandTotalInclGst * 100);
  // A brush stroke also paints mulch. The actual ground texture determines the
  // surface quantities in the estimate. Snapshot it atomically with the plants.
  const ground = new Blob(surfaces(engine)).stream().pipeThrough(new CompressionStream('gzip'));
  const packed = new Uint8Array(await new Response(ground).arrayBuffer());
  const payload = ['b1',mix,Math.round(month*100),year,total,species.join('~'),base64url(bytes),base64url(packed)].join('.');
  check(payload.length <= maxPayload);
  return payload;
}

export async function decodeBed(payload, engine) {
  check(typeof payload === 'string' && payload.length <= maxPayload);
  const parts = payload.split('.');
  check(parts.length === 8 && parts[0] === 'b1');
  const [,mix,m,y,q,ids,rows,ground] = parts;
  check(mixes.has(mix) && [q,m,y].every(v => /^\d+$/.test(v)));
  const year = Number(y), month = Number(m)/100, total = Number(q);
  const species = ids ? ids.split('~') : [];
  check(years.includes(year) && inRange(month,0,11.95) && Number.isSafeInteger(total));
  check(species.length <= 96 && species.every(id => engine.speciesMeshes.has(id)));
  const bytes = unbase64(rows);
  check(bytes.length <= stride*maxPlants && bytes.length % stride === 0);
  const view = new DataView(bytes.buffer), plants = [], seen = new Set();
  const bedIds = new Set(engine.beds.map(b => b.id));
  for (let i = 0; i < bytes.length; i += stride) {
    const id = view.getUint32(i,true), si = view.getUint8(i+4), bedId = view.getInt16(i+5,true);
    check(id > 0 && id <= 10000000 && !seen.has(id) && si < species.length && (bedId === -1 || bedIds.has(bedId)));
    seen.add(id);
    const plant = {id, speciesId:species[si], bedId:bedId === -1 ? null : bedId};
    fields.forEach((field,j) => {
      const value = view.getFloat64(i + 7 + j*8,true);
      check(inRange(value,...ranges[j]));
      plant[field] = value;
    });
    plants.push(plant);
  }
  const expectedBytes = surfaces(engine).reduce((n,map) => n+map.length,0);
  return {mix,month,year,total,plants,ground:await unpackSurfaces(ground,expectedBytes)};
}

export async function restoreBed(studio, payload) {
  const engine = studio.engine, saved = await decodeBed(payload,engine);
  const previousPlants = engine.plants, maps = surfaces(engine);
  const previousGround = maps.map(map => map.slice());
  let offset = 0;
  maps.forEach(map => {
    map.set(saved.ground.subarray(offset, offset+map.length));
    offset += map.length;
  });
  engine.plants = saved.plants;
  try {
    check(Math.round(studio.getQuote().grandTotalInclGst*100) === saved.total);
  } catch (err) {
    engine.plants = previousPlants;
    maps.forEach((map,i) => map.set(previousGround[i]));
    throw err;
  }
  for (const texture of [engine.splatTexA,engine.splatTexB,engine.splatTexC]) texture.needsUpdate = true;
  engine.nextPlantId = saved.plants.reduce((n,p) => Math.max(n,p.id+1),1);
  engine.syncInstances();
  engine.undoStack.length = 0;
  engine.redoStack.length = 0;
  const range = document.getElementById('season-slider');
  range.value = saved.month;
  range.dispatchEvent(new Event('input',{bubbles:true}));
  document.querySelector('.yr-btn[data-year="'+saved.year+'"]')?.click();
  document.querySelectorAll('#cards-rail .card')[mixes.get(saved.mix)]?.click();
  studio.setSunHour(9.65);
  const gy = studio.terrainEngine.getHeight(-5.5,-10.2);
  studio.setCamera(-9.8,gy+3,3.1,-3.75,gy+1.18,-9.55);
  studio.updateStatsUI();
  return {count:saved.plants.length, year:saved.year, total:saved.total};
}
