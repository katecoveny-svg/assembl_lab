# Vendored code for the architecture operations page

## supabase-js.mjs

Supabase's own JavaScript client, as one ES module file. The page loads it only for sign-in and shared records.

- Package: `@supabase/supabase-js`
- Version: **2.119.2**, pinned (with its own parts at the same version: auth-js, postgrest-js, storage-js, realtime-js, functions-js)
- Licence: MIT, Supabase Inc. The licence text is in `supabase-js.LICENSE.txt`.
- Built: 22 November 2026, with esbuild 0.25.12
- sha256 of the built file: `4d812f6f7303b92b97194f9c98e5ef090a3da1519ba8a6f6ed5f6669a60978a6`

The site has no build step. This file was built once, outside the repository, and copied in.

### How it was made

```sh
mkdir vendor-build && cd vendor-build
npm init -y
npm install --save-exact @supabase/supabase-js@2.119.2
echo "export { createClient } from '@supabase/supabase-js';" > entry.mjs
npx esbuild@0.25.12 entry.mjs --bundle --format=esm --platform=browser --target=es2020 --minify \
  --legal-comments=none \
  "--banner:js=/* @supabase/supabase-js 2.119.2 (MIT licence, Supabase Inc). One file, built with esbuild 0.25.12. See README.md beside this file. Do not edit by hand. */" \
  --outfile=supabase-js.mjs
```

It exports one thing: `createClient`. Nothing in it was edited by hand.

### To update

Change the version in the two places above, build again, replace the file, and update the version, date and sha256 here.
Then run `node --test tests/architecture/*.test.mjs` and sign in on a preview before it goes live.

## web-ifc/

web-ifc's IFC reader, for the small 3D view of a kept IFC on the Models cards (js/model-view.js). Loaded only when a
model is drawn: never with the page. The Models counts and floor areas do not use it (js/ifc-summary.js reads those).

- Package: `web-ifc`, by That Open Company and contributors (https://github.com/ThatOpen/engine_web-ifc)
- Version: **0.0.79**, pinned: the same version the 3D page is built with (plan-studio/twins)
- Licence: MPL-2.0. The licence text is in `web-ifc/LICENSE.md`. Nothing in these files was changed; the source code
  form is the package itself, at that version, on npm and GitHub.
- `web-ifc/web-ifc-api.mjs`: the package's `IfcAPI`, bundled into one ES module with esbuild 0.25.12, 22 November 2026.
  sha256 `3417b7fb9e3efcd9085f697c71af7a7ea8929b156493d884478c6dd0ab0f5559`
- `web-ifc/web-ifc.wasm`: the package's own single-thread `web-ifc.wasm`, copied as it is.
  sha256 `5f28f448c35c47b87010a51a8812b4301a58330b6affdb1485f23f6aef6f9e07`
  (byte for byte the same as the wasm the 3D page serves as base64 text in plan-studio/twins/drop/twin/)

### How it was made

```sh
mkdir vendor-build && cd vendor-build
npm init -y
npm install --save-exact web-ifc@0.0.79
echo "export { IfcAPI } from 'web-ifc';" > entry.mjs
npx esbuild@0.25.12 entry.mjs --bundle --format=esm --platform=browser --target=es2020 --minify --legal-comments=none \
  "--banner:js=/* web-ifc 0.0.79 (MPL-2.0, That Open Company and contributors). The IfcAPI only, built with esbuild. See README.md beside this file. Do not edit by hand. */" \
  --outfile=web-ifc-api.mjs
cp node_modules/web-ifc/web-ifc.wasm node_modules/web-ifc/LICENSE.md .
```

The page starts it single-threaded (`Init(() => wasmUrl, true)`), so no worker pool and no cross-origin isolation are
needed. To update: change the version here and in the 3D page together, build again, replace both files, update the
sha256 lines, then run `node --test tests/architecture/*.test.mjs` and look at a model drawn on a preview.

The 3D view also uses the lab's own three.js (r170, MIT) at `/assets/vendor/three/three.module.min.js`; nothing new.
