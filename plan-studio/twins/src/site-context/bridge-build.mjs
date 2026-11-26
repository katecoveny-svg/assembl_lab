import {fileURLToPath,pathToFileURL} from 'node:url';
const {build}=await import(process.env.ESBUILD_MODULE?pathToFileURL(process.env.ESBUILD_MODULE):'esbuild');
const file=rel=>fileURLToPath(new URL(rel,import.meta.url));
await build({entryPoints:[file('./live-bridge.ts')],outfile:file('../../drop/linz-context.mjs'),
  absWorkingDir:file('./'),format:'esm',target:'es2022',bundle:true,plugins:[{name:'served-three',setup(b){
    b.onResolve({filter:/^three\/webgpu$/},()=>({path:'./served-three-adapter.mjs',external:true}));
  }}]});
