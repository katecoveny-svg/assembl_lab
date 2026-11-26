// Sample the same Theatre object and interpolation engine used by the visual editor.
const {getProject}=require('@theatre/core');
const fs=require('node:fs'),path=require('node:path');
async function bake(){
 const state=JSON.parse(fs.readFileSync(process.argv[2]??path.join(__dirname,'waiheke.theatre.json'),'utf8'));
 const sheet=getProject('Waiheke',{state}).sheet('Pavilion'),camera=sheet.object('Camera',{travel:0,dining:0});
 await sheet.project.ready;
 const seconds=state.sheetsById.Pavilion.sequence.length, samples=[];
 if(!Number.isFinite(seconds)||seconds<1||seconds>120)throw Error('Expected a tour between 1 and 120 seconds');
 const n=Math.ceil(seconds*4);
 for(let i=0;i<=n;i++){
  sheet.sequence.position=seconds*i/n;const {travel,dining}=camera.value;
  if(![travel,dining].every(x=>Number.isFinite(x)&&x>=0&&x<=1))throw Error('Camera tracks use the range 0–1');
  const pair=[travel,dining].map(x=>Math.round(x*10000));
  if(i&&pair[0]<samples[i-1][0])throw Error('Walk progress must run forward');
  samples.push(pair);
 }
 if(samples[0][0]!==0||samples.at(-1)[0]!==10000)throw Error('The path must start at 0 and end at 1');
 fs.writeFileSync(path.join(__dirname,'../../pavilion/tour-score.js'),
  '// Generated from waiheke.theatre.json with @theatre/core.\nexport const tourSeconds='+seconds+';\nexport const tourKeys='+JSON.stringify(samples)+';\n');
}
bake().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)});
