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
