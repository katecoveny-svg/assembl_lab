# SimReady models used in the study machines

These GLB files are NVIDIA SimReady assets, converted for the browser by CodePawl, and are used under the
Creative Commons Attribution 4.0 International licence (CC BY 4.0).

- Original assets: NVIDIA, "SimReady Assets", https://huggingface.co/datasets/nvidia/simready-assets (CC BY 4.0)
- Browser-optimised GLB conversion (meshopt geometry, 1024 px WebP textures, physics joints): CodePawl,
  https://huggingface.co/datasets/codepawl/simready-glb (CC BY 4.0)
- Licence text: https://creativecommons.org/licenses/by/4.0/

| File | Asset | Used in |
|---|---|---|
| engineComponent_cylinder_piston_a01.glb | Cylinder and piston (base + head, one sliding joint) | The engine machine · pressure, force and work |
| engineComponent_crankshaft_b01.glb | Crankshaft | The engine machine · torque and power |
| brakeSystem_brakes_assembly_b01.glb | Disc brake assembly (disc + caliper, one joint) | The engine machine · friction, kinetic energy and heat |
| suspension_strut_assembly_a01.glb | Coil-over strut | The engine machine · springs and stored energy |

Changes made: none to the files themselves. In the page the parts are shown see-through, clipped by a cut plane and
moved by the machine's model (the piston slides, the crank and disc turn); the models carry no engineering data that the
machine uses, so every number on screen is the machine's own simplified physics, labelled "Simulated".

Each file is under 2 MB and loads only when its step is opened. Credit line shown on the page: "3D parts: NVIDIA SimReady
(CC BY 4.0), browser GLBs by CodePawl."
