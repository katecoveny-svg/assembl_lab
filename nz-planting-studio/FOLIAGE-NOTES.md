# Native foliage in the live Aotearoa Planting Studio

The public entry remains `index.html`. Its bundled Three.js 187 renderer calls `native-foliage.mjs` for original procedural species that have close-up silhouettes and uses the existing legacy atlas for the remaining ornamentals and groundcover. There is no new CDN, asset download, API key, renderer dependency or separate 3D page. Do not modify the retired V2 project to change the live renderer.

## Reference work

- [Dan Greenheck’s EZ-Tree](https://github.com/dgreenheck/ez-tree) (MIT): seeded branch skeleton, branch taper, distinct foliage geometry and silhouettes maintained over detail levels. This release uses original simple, browser-friendly parametric branch geometry, not copied code or presets. Camera-distance/pool-specific LOD is the follow-on for much larger planting plans.
- [Andre Elias’s stylized-scene](https://github.com/dedekpo/stylized-scene) (MIT): foil for the wind design rather than the visual style. Directional broad gusts and faster per-plant/leaf phase differences work well together. Existing TSL flow maps are retained; new meshes use different stiffness for trees, grasses, and soft-leaved plants, with roots and woody axes anchored.
- [SeedThree](https://github.com/SkyeShark/SeedThree) (MIT): demonstrates species parameters, branch/frond variation, and portable procedural outputs. No runtime packages or source assets were vendored.
- [Three.js InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html): one pool per species retains the existing paint interaction and limits draw calls. [TSL documentation](https://github.com/mrdoob/three.js/wiki/Three.js-Shading-Language) documents node materials and the shared WebGPU/WebGL workflow.
- Morphology sources used as observational reference, not copied images: [Harakeke](https://www.nzflora.info/factsheet/taxon/Phormium-tenax.html), [miniature toetoe](https://www.nzpcn.org.nz/flora/species/chionochloa-flavicans/), [Nīkau](https://www.nzpcn.org.nz/flora/species/rhopalostylis-sapida/) and [Pōhutukawa](https://www.nzpcn.org.nz/flora/species/metrosideros-excelsa/). Keep the Studio's named cultivars and indicative growth ranges separate from actual field specimens.
- Small screens, touch-primary entry, and the explicit lack of WebGPU select a lower tessellation of the same forms. The remaining realism gains are better large-scale terrain contact/ground dress, a camera-dependent performance tier for plans with many trees, and licensed photographic bark and close-up leaf normals per species. This release uses procedural grain and a soft backlight term, not measured or photographic textures and not a field ID guide.

Wind observes reduced-motion at startup and has an accessible toggle. Plants keep the original brush, season, cost, placement, WebGPU and WebGL path. Foliage module output is deterministic per taxon, but each scene instance has a different angle, scale, and wind phase/colour tint.

## Coastal house and garden opening

The close pōhutukawa uses branchlets with attached leaf meshes and seasonal stamens. The brush uses instanced jointed oioi stems. Both have rooted wind weights and smaller phone geometries. Bracts and culm colour follow the [NZ Plant Conservation Network species description](https://www.nzpcn.org.nz/flora/species/apodasmia-similis/). The local sky texture is a tone-mapped derivative of the public Pavilion’s [Kloofendal 38d Partly Cloudy Pure Sky, Poly Haven, CC0](https://polyhaven.com/a/kloofendal_38d_partly_cloudy_puresky).
