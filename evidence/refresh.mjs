// Run manually in Node 20+; atomic replacement only after every source validates.
import {writeFile,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {quakeRecords,schoolRecords,GEONET_URL,SCHOOL_URL,SCHOOL_RESOURCE} from './adapters/index.mjs';
const receipts=[];
async function read(url,accept='application/json') {
 const response=await fetch(url,{headers:{Accept:accept},signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error(`Public source HTTP ${response.status}`);
 const raw=await response.text();
 receipts.push({url,retrievedAt:new Date().toISOString(),sha256:createHash('sha256').update(raw).digest('hex')});
 return JSON.parse(raw);
}
const resource=(await read(`https://catalogue.data.govt.nz/api/3/action/resource_show?id=${SCHOOL_RESOURCE}`)).result;
const pkg=(await read(`https://catalogue.data.govt.nz/api/3/action/package_show?id=${resource.package_id}`)).result;
const schools=await read(SCHOOL_URL),schoolTime=receipts.at(-1).retrievedAt;
const quakes=await read(GEONET_URL,'application/vnd.geo+json;version=2'),quakeTime=receipts.at(-1).retrievedAt;
const records=[...quakeRecords(quakes,quakeTime),...schoolRecords(schools,resource,pkg,schoolTime)];
const output=new URL('./data/snapshot.json',import.meta.url),temp=new URL('./data/snapshot.tmp',import.meta.url);
await writeFile(temp,JSON.stringify({schemaVersion:1,receipts,records},null,2)+'\n');
await rename(temp,output);
console.log(`Verified ${records.length} public records; snapshot replaced.`);
