// Draco-compress a GLB's meshes for Google's Scene Viewer (Android without web AR), keeping everything else as it is.
//   npm install --no-save @gltf-transform/core@4 @gltf-transform/extensions@4 draco3dgltf@1.5
//   node ar/tools/draco_glb.mjs in.glb out.glb
// The AR Quick Look USDZ is made from the uncompressed GLB first (ar/tools/glb2usdz.py), then this shrinks the GLB.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, KHRDracoMeshCompression } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';

const [src, dst] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(), 'draco3d.encoder': await draco3d.createEncoderModule()
});
const doc = await io.read(src);
doc.createExtension(KHRDracoMeshCompression).setRequired(true).setEncoderOptions({
  method: KHRDracoMeshCompression.EncoderMethod.EDGEBREAKER, encodeSpeed: 5, decodeSpeed: 5,
  quantizationBits: { POSITION: 16, NORMAL: 10, TEXCOORD: 12, COLOR: 8, GENERIC: 12 }
});
await io.write(dst, doc);
