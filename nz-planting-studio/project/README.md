# Aotearoa Planting Studio (Three.js r187 WebGPU + TSL)

Interactive 3D New Zealand landscape & planting designer built on **Three.js r187 WebGPU (`three/webgpu`)** and **TSL (`three/tsl`)** with automatic WebGL 2 fallback.

## Quick Start

1. **Instant Launch (No Build Needed):** Open `aotearoa-planting-studio-v2.html` directly in Chrome, Edge, or Safari (uses native WebGPU when available, automatic WebGL 2 fallback otherwise).
2. **Developer Mode (Vite):**
   ```bash
   cd project
   npm install
   npm run dev
   ```
   Open `http://localhost:5173`.

## Controls
- **Left-drag**: Paint active NZ planting mix, individual plant/flower, NZ surface material, or erase.
- **Right-drag / Scroll**: Orbit, pan, and zoom smoothly while painting.
- **Keys `1`–`6`**: Switch tools (Mix / Plant / Draw Bed / Surface / Erase / Orbit).
- **`[` / `]`**: Adjust brush radius.
- **`Ctrl+Z` / `Ctrl+Shift+Z`**: Undo / Redo.

## Assembl Lab release

This version preserves the supplied v2 planting renderer, procedural wildlife and tools.
Live address lookup and browser-stored API keys are intentionally disabled on the public site.
GeoJSON and self-contained GLB imports are local previews, not survey-scaled or suitable for
set-out. Large models can be resized. This is not linked to a Plan Studio project.
