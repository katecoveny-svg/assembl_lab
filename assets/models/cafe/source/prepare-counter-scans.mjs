// node prepare-counter-scans.mjs /path/to/prepared-original-GLBs /path/to/downloads
// Original geometry is retained in separate 2K masters; browser copies are simplified.
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {weld,simplify,textureCompress} from '@gltf-transform/functions';
import {MeshoptSimplifier} from 'meshoptimizer';
import sharp from 'sharp';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const [input,sources]=process.argv.slice(2);
if(!input||!sources)throw Error('Supply original GLB and downloaded source directories.');
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
await MeshoptSimplifier.ready;
const count=doc=>doc.getRoot().listMeshes().reduce((s,m)=>s+m.listPrimitives().reduce((n,p)=>n+p.getIndices().getCount()/3,0),0);
const info=p=>{const b=readFileSync(p);return {bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')};};
const records=[];
for(const [asset,name] of [['3DCookie001','cookie'],['3DPastry001','croissant']]){
 const original=resolve(input,asset+'-original.glb');
 const master=fileURLToPath(new URL(name+'-master.glb',import.meta.url));
 const browser=fileURLToPath(new URL(name+'-browser.glb',import.meta.url));
 if(original===master||original===browser)throw Error('Source and derivatives must be different files.');
 const doc=await io.read(original), sourceTriangles=count(doc);
 await doc.transform(textureCompress({encoder:sharp,targetFormat:'jpeg',resize:[2048,2048],quality:95}));
 await io.write(master,doc);
 await doc.transform(weld(),simplify({simplifier:MeshoptSimplifier,ratio:.12,error:.003,lockBorder:true}),textureCompress({encoder:sharp,targetFormat:'jpeg',resize:[1024,1024],quality:92}));
 await io.write(browser,doc);
 const source=JSON.parse(readFileSync(resolve(sources,asset,'SOURCE.json')));
 records.push({asset,author:'ambientCG',source:source.source,licence:'CC0-1.0',licenceUrl:'https://docs.ambientcg.com/license/',verified:'2026-11-11',sourceArchiveSha256:source.sha256,original:info(original),master:{file:name+'-master.glb',triangles:sourceTriangles,...info(master)},browser:{file:name+'-browser.glb',triangles:count(doc),...info(browser)},changes:'Unchanged source geometry in 2K master. Browser preserves UVs, colour, normal and occlusion; meshoptimizer error limit 0.003, locked borders, 1K JPEG quality 92. No geometry compression. Source approximate dimensions retained at placement.',use:'Static display props, separate from simulated menu and stock.'});
}
writeFileSync(new URL('counter-scans-source.json',import.meta.url),JSON.stringify(records,null,2)+'\n');
console.log(JSON.stringify(records,null,2));
