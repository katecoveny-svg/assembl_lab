import { Vector2 } from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
export function download(blob, name) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export const dimensions = {
  square: [1080, 1080],
  portrait: [1080, 1350],
  landscape: [1600, 900],
};
export async function imageFile(
  engine,
  { format = "png", aspect = "square", transparent = false },
) {
  const e = engine,
    r = e.renderer,
    size = r.getSize(new Vector2()),
    ratio = r.getPixelRatio(),
    oldAspect = e.camera.aspect,
    alpha = r.getClearAlpha(),
    visible = e.ground.visible;
  e.busy = true;
  try {
    r.setPixelRatio(1);
    const [w, h] = dimensions[aspect];
    r.setSize(w, h, false);
    e.camera.aspect = w / h;
    e.camera.updateProjectionMatrix();
    e.ground.visible = !(transparent && format === "png");
    r.setClearAlpha(transparent && format === "png" ? 0 : 1);
    e.sync();
    e.render();
    const mime = format === "jpeg" ? "image/jpeg" : "image/png";
    const blob = await new Promise((resolve, reject) =>
      r.domElement.toBlob(
        (v) => (v ? resolve(v) : reject(Error("Image capture failed."))),
        mime,
        0.94,
      ),
    );
    if (blob.type !== mime)
      throw Error("This browser did not produce the requested format.");
    return new File(
      [blob],
      `squishy-lab-${aspect}.${format === "jpeg" ? "jpg" : "png"}`,
      { type: mime },
    );
  } finally {
    r.setPixelRatio(ratio);
    r.setSize(size.x, size.y, false);
    e.camera.aspect = oldAspect;
    e.camera.updateProjectionMatrix();
    r.setClearAlpha(alpha);
    e.ground.visible = visible;
    e.busy = false;
    e.render();
  }
}
export async function meshFile(e) {
  e.sync();
  const mesh = e.mesh.clone();
  mesh.geometry = e.mesh.geometry.clone();
  mesh.scale.setScalar(0.03);
  mesh.userData = {
    purpose: "Art mesh. Not print-validated.",
    nominalScale:
      "30 mm per scene unit; dimensions depend on shape and deformation.",
  };
  try {
    const buffer = await new GLTFExporter().parseAsync(mesh, { binary: true });
    if (
      !(buffer instanceof ArrayBuffer) ||
      new DataView(buffer).getUint32(0, true) !== 0x46546c67
    )
      throw Error("GLB encoding failed.");
    return new File([buffer], "squishy-lab-art.glb", {
      type: "model/gltf-binary",
    });
  } finally {
    mesh.geometry.dispose();
  }
}
export async function shareOrDownload(file) {
  if (navigator.canShare?.({ files: [file] }) && navigator.share) {
    try {
      await navigator.share({
        files: [file],
        title: "My Squishy Lab sculpture",
      });
      return "Shared using your device.";
    } catch (error) {
      if (error.name === "AbortError") return "Share cancelled.";
    }
  }
  download(file, file.name);
  return "Saved a file. Sharing is not available here.";
}
