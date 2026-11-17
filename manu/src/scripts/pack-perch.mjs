// Make the perch light enough for a school network: the Blender twig (Theo Tillberg, MIT) without
// the shoot and buds the native sprig replaces, the hairs mesh cut to one triangle (only its
// material is used, for the fine hairs made at load), meshopt geometry (filter mode, float positions), textures at most 1024 px.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, reorder, textureCompress } from '@gltf-transform/functions';
import { EXTMeshoptCompression } from '@gltf-transform/extensions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';

const [src, out] = process.argv.slice(2);
await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(src);
const root = doc.getRoot();
for (const node of root.listNodes()) {
  const name = node.getName();
  if (name === 'shoot' || name === 'buds') node.dispose();
  if (name === 'hairs') {
    const prim = node.getMesh().listPrimitives()[0];
    for (const sem of prim.listSemantics()) {
      const acc = prim.getAttribute(sem);
      const size = acc.getElementSize();
      const arr = new (acc.getArray().constructor)(3 * size);
      acc.setArray(arr);
    }
    const idx = prim.getIndices();
    if (idx) idx.setArray(new (idx.getArray().constructor)([0, 1, 2]));
  }
}
await doc.transform(
  prune(),
  dedup(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024], quality: 82 }),
  reorder({ encoder: MeshoptEncoder }),
);
// filter mode, not quantised: the twig's positions stay float, so the perch rays and the fur
// shells read them as the original did
doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });
await io.write(out, doc);
console.log('wrote', out);
