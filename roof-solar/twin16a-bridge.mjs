// Use constructors from the exact Vite bundle already loaded by the 16A iframe.
// Update this alias map with any new twin build; never use the measured viewer's
// different Three version to add objects to the canonical twin scene.
import { G as Group, a7 as BoxGeometry, a6 as MeshPhysicalMaterial, a as MeshStandardMaterial, L as LineBasicMaterial, c as LineSegments, B as BufferGeometry, ax as Raycaster, d as Vector3, p as Matrix4, F as Float32BufferAttribute, M as Mesh } from '/plan-studio/twins/16a/assets/twin-DxICRSSm.js';
window.__roofThree16a={ Group, BoxGeometry, MeshPhysicalMaterial, MeshStandardMaterial, LineBasicMaterial, LineSegments, BufferGeometry, Raycaster, Vector3, Matrix4, Float32BufferAttribute, Mesh };
