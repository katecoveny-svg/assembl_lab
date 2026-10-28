const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
function load(file){const name=path.resolve(file),m=new Module(name,module);m.filename=name;m.paths=module.paths;const req=m.require.bind(m);m.require=id=>id==='./creative-export-style'?load('lib/creative-export-style.ts'):req(id);m._compile(ts.transpileModule(fs.readFileSync(name,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,name);return m.exports;}
const {defaultDesign,designSchema,fingerprint,snapshotOf,exportHtml}=load('lib/creative.ts');
const d=defaultDesign();assert.ok(designSchema.safeParse(d).success);
const old=structuredClone(d);delete old.frame.artwork;assert.ok(designSchema.safeParse(old).success);
for(const src of ['javascript:alert(1)','https://outside.example/a.png','/api/media?id=not-an-id','data:image/svg+xml,<svg/>'])assert.equal(designSchema.safeParse({...d,frame:{...d.frame,artwork:{src,alt:'bad'}}}).success,false);
const edited=structuredClone(d);edited.frame.artwork={src:'/cinematic/loyalty.png',alt:'Loyalty concept'};assert.notEqual(fingerprint(d),fingerprint(edited));assert.deepEqual(snapshotOf(edited).frame.artwork,edited.frame.artwork);
const asset='data:image/png;base64,iVBORw0KGgo=';
for(const mode of ['site','deck']){const html=exportHtml(d,mode,asset);assert.ok(html.includes(asset));assert.ok(!html.includes('src="/api/media?'));assert.ok(html.includes(d.frame.artwork.alt));}
console.log('Passed: legacy design compatibility, asset URL restrictions, artwork approval fingerprint, snapshot restoration and standalone visual exports.');
