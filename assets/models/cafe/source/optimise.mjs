// Run after build_cafe.py and before write_contract.mjs.
// Dependencies: @gltf-transform/core/functions/extensions 4.5.1, sharp 0.34.x.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { textureCompress } from '@gltf-transform/functions';
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const file = new URL('../cafe-venue.glb', import.meta.url);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(file.pathname);
await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'jpeg', quality: 88, resize: [1024,1024] }));
await io.write(file.pathname, doc);
const reportURL = new URL('../build-report.json', import.meta.url);
const report = JSON.parse(readFileSync(reportURL));
const bytes = readFileSync(file);
report.source_glb_bytes = report.glb_bytes;
report.glb_bytes = bytes.length;
report.glb_sha256 = createHash('sha256').update(bytes).digest('hex');
report.texture_optimisation = 'glTF Transform 4.5.1; JPEG 88, 1024 maximum; no geometry compression';
writeFileSync(reportURL, JSON.stringify(report, null, 1)+'\n');
