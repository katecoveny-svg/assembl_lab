// node pack_daylight.mjs /absolute/bake/output (requires sharp)
import sharp from 'sharp';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const source = resolve(process.argv[2]);
const output = fileURLToPath(new URL('../daylight/', import.meta.url));
const record = JSON.parse(await readFile(resolve(source,'bake-record.json'),'utf8'));
await mkdir(output,{recursive:true});
for (const map of record.maps) {
  const [width,height]=map.size;
  const raw=await readFile(resolve(source,map.name+'.rgba'));
  if(raw.length!==width*height*4) throw new Error('Invalid RGBM size: '+map.name);
  const packed=await sharp(raw,{raw:{width,height,channels:4}}).webp({lossless:true,effort:6}).toBuffer();
  // Verify alpha remains numeric transport, not altered by a colour transform.
  const decoded=await sharp(packed).raw().toBuffer();
  if(!raw.equals(decoded)) throw new Error('RGBM pixels changed: '+map.name);
  map.file=map.name+'.webp';
  await writeFile(resolve(output,map.file),packed);
  map.bytes=packed.length; map.sha256=createHash('sha256').update(packed).digest('hex');
}
record.totalBytes=record.maps.reduce((n,m)=>n+m.bytes,0);
await writeFile(resolve(output,'manifest.json'),JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({maps:record.maps.length,bytes:record.totalBytes}));
