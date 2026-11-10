import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { createCafeCeiling, createCafeFloorInfill } from '../daylight.mjs';

test('the ceiling closes the interior, remains open from above, and casts from both sides', () => {
  const ceiling=createCafeCeiling(); ceiling.updateMatrixWorld(true);
  const inside=new THREE.Raycaster(new THREE.Vector3(0,1.7,0),new THREE.Vector3(0,1,0));
  const above=new THREE.Raycaster(new THREE.Vector3(0,10,0),new THREE.Vector3(0,-1,0));
  assert.ok(inside.intersectObject(ceiling).length>0);
  assert.equal(above.intersectObject(ceiling).length,0);
  assert.equal(ceiling.material.shadowSide,THREE.DoubleSide);
  assert.equal(ceiling.castShadow,true);
  assert.equal(inside.intersectObject(ceiling)[0].point.y,3.25);
});

test('the missing counter floor is filled at floor height using the existing physical-scale finish', () => {
  const root=new THREE.Group(), source=new THREE.Group(); source.name='FLOOR_FRONT_OF_COUNTER';
  const mat=new THREE.MeshStandardMaterial(); mat.name='cafe_floor_honey';
  source.add(new THREE.Mesh(new THREE.PlaneGeometry(),mat)); root.add(source);
  const infill=createCafeFloorInfill(root); infill.geometry.computeBoundingBox();
  const box=infill.geometry.boundingBox;
  assert.ok(Math.abs(box.min.x-1.4)<1e-5 && Math.abs(box.max.x-9)<1e-5);
  assert.ok(Math.abs(box.min.z-.6)<1e-5 && Math.abs(box.max.z-2.1)<1e-5);
  assert.ok(Math.abs(box.min.y-.163)<1e-5);
  assert.equal(infill.material,mat);
  const uv=infill.geometry.attributes.uv;
  assert.ok(Math.abs(Math.abs(uv.getX(1)-uv.getX(0))-7.6/3)<1e-5);
});

test('the sky bake matches the current master/GLB and all seven delivery maps', () => {
  const dir=new URL('../../assets/models/cafe/',import.meta.url);
  const record=JSON.parse(readFileSync(new URL('daylight/manifest.json',dir),'utf8'));
  const hash=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
  assert.equal(hash(new URL('cafe-venue.glb',dir)),record.source_glb_sha256);
  assert.equal(hash(new URL('source/cafe.blend',dir)),record.source_sha256);
  assert.equal(record.encoding,'RGBM'); assert.equal(record.range,4); assert.equal(record.processed,true);
  assert.equal(record.maps.length,7);
  let bytes=0;
  for(const map of record.maps){
    const path=new URL('daylight/'+map.file,dir);
    assert.equal(hash(path),map.sha256); bytes+=readFileSync(path).length;
    const u=new THREE.Vector3(...map.u),v=new THREE.Vector3(...map.v),n=u.cross(v).normalize();
    const intended={floor:[0,1,0],ceiling:[0,-1,0],right:[-1,0,0],left:[1,0,0],back:[0,0,1],'counter-front':[0,0,1],'counter-top':[0,1,0]}[map.name];
    assert.ok(n.dot(new THREE.Vector3(...intended))>.999,'inward-facing receiver '+map.name);
  }
  assert.equal(bytes,record.totalBytes);
});
