// Prepare the licensed, uncompressed ambientCG 3DCake001 GLB for the venue.
// node prepare-food.mjs /path/to/3DCake001.glb
// Dependencies: glTF Transform 4.5.1, meshoptimizer, sharp 0.34.x.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { simplify, weld, textureCompress } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const input = process.argv[2];
if (!input) throw new Error('Supply an uncompressed source GLB; originals are never modified.');
if (['muffin-master.glb','muffin-browser.glb'].some(name => resolve(input) === fileURLToPath(new URL(name,import.meta.url)))) {
  throw new Error('Use the original source GLB; input and generated outputs must be different files.');
}
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
await MeshoptSimplifier.ready;
const triCount = doc => doc.getRoot().listMeshes().reduce((sum,m) => sum + m.listPrimitives().reduce((n,p) => n+(p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount())/3,0),0);
const source = await io.read(input);
const sourceTris = triCount(source);
await source.transform(textureCompress({encoder:sharp,targetFormat:'jpeg',quality:95,resize:[2048,2048]}));
const masterPath=fileURLToPath(new URL('muffin-master.glb',import.meta.url));
await io.write(masterPath,source);
const model=await io.read(masterPath);
await model.transform(weld(),simplify({simplifier:MeshoptSimplifier,ratio:.075,error:.002,lockBorder:true}),
  textureCompress({encoder:sharp,targetFormat:'jpeg',quality:92,resize:[1024,1024]}));
const browserPath=fileURLToPath(new URL('muffin-browser.glb',import.meta.url));
await io.write(browserPath,model);
const info = path => {const b=readFileSync(path);return {bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')};};
const report={asset:'3DCake001',author:'Lennart Demes / ambientCG',source:'https://ambientcg.com/view?id=3DCake001',licence:'CC0-1.0',
  licenceUrl:'https://docs.ambientcg.com/license/',verified:'2026-11-10',
  sourceArchiveSha256:'671e91be00fded5c5c7e5dcaf9a6c4b6f396a2fffa9e6c02d4588ab625ab6f7b',
  input:info(input),master:{file:'muffin-master.glb',triangles:sourceTris,...info(masterPath)},
  browser:{file:'muffin-browser.glb',triangles:triCount(model),...info(browserPath)},
  changes:'Master retains source geometry with 2K JPEG maps. Browser: meshoptimizer simplification, locked borders, 1K JPEG maps. No geometry compression. Venue sets width to 100 mm; illustrative portion size, not a product specification.',
  status:'candidate; physical device performance unverified'};
writeFileSync(fileURLToPath(new URL('muffin-source.json',import.meta.url)),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
