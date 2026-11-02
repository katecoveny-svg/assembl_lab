/* build-teacher-data.cjs: builds study/teacher-data.js for study/teacher.html.
   Loads every machine page in headless Chromium, wraps StudyKit.mount to capture each machine's config
   (steps, exam lines, traps, challenges with their check rules, kupu list), reads the kupu evidence tables
   in te-reo-notes.md, and writes window.TEACHER. Serve study/ locally first, then run from the repo root:
     (cd study && python3 -m http.server 8765) &   BASE=http://127.0.0.1:8765/ node scripts/build-teacher-data.cjs
   Machines that share a page (gradient3 = m/gradient.html?level=3) are captured from their own URL.
   It writes nothing else and never publishes. */
const fs=require("fs"),path=require("path");
const {chromium}=require("playwright");
const ROOT=path.resolve(__dirname,"..","study"), BASE=process.env.BASE||"http://127.0.0.1:8765/";
const D=(()=>{const w={};new Function("window",fs.readFileSync(path.join(ROOT,"data.js"),"utf8"))(w);return w.STUDY})();

// ---- te-reo-notes.md: the evidence column per machine file and kupu
function readNotes(){
  const md=fs.readFileSync(path.join(ROOT,"te-reo-notes.md"),"utf8");
  const out={}, notFound=[], sources=[];
  let cur=null;
  for(const line of md.split("\n")){
    const h=line.match(/^### .*?\((\w+)\.js\)/);
    if(h){cur=h[1];out[cur]={};continue}
    if(/^## /.test(line))cur=null;
    if(cur&&/^\| \*\*/.test(line)){
      const c=line.split("|").map(s=>s.trim());
      const mi=c[1].replace(/\*\*/g,""),en=c[2],src=c[3],ev=c[4],steps=c[5],chip=c[6];
      const ta=(src.match(/word\/(\d+)/)||[])[1];
      out[cur][mi]={en,ta,evidence:ev,steps,chip};
    }
  }
  // section 4: terms looked for but not added
  const s4=md.split(/^## 4\./m)[1]?.split(/^## /m)[0]||"";
  s4.split("\n").filter(l=>/^- /.test(l)).forEach(l=>notFound.push(l.replace(/^- /,"").replace(/\*\*/g,"")));
  return {evidence:out,notFound};
}

// the check rules for machines that wrap their challenges (sky maps CH through ()=>c.check())
const isFile=f=>{try{return fs.statSync(f).isFile()}catch(e){return false}};
function checksFromSource(file){
  if(!isFile(file))return [];
  const src=fs.readFileSync(file,"utf8");
  const m=src.match(/const CH=\[([\s\S]*?)\n\];/);if(!m)return [];
  const out=[];const re=/check:(\(\)=>|\(\w*\)=>|function\s*\([^)]*\)\s*)([\s\S]*?),ok:/g;let r;
  while((r=re.exec(m[1])))out.push((r[1]+r[2]).trim());
  return out;
}
const HOOK=`(()=>{let K;Object.defineProperty(window,"StudyKit",{configurable:true,get(){return K},set(v){K=v;if(v&&v.mount&&!v.__wrapped){const m=v.mount;v.mount=function(cfg){
  const fnsrc=f=>typeof f==="function"?f.toString():f;
  const txt=h=>{const d=document.createElement("div");d.innerHTML=h||"";return d.textContent.trim()};
  const cap={id:cfg.id,title:cfg.title,eyebrow:cfg.eyebrow,crumb:cfg.crumb,badge:cfg.badge||null,papers:cfg.papers||[],truth:cfg.truth||"",footer:txt(cfg.footer||""),mainLabel:cfg.mainLabel||"",
    kupu:(cfg.kupu||[]).map(k=>({mi:k.mi,en:k.en,ta:k.ta,note:k.note||"",chip:[].concat(k.chip||[])})),
    steps:cfg.steps.map(st=>({k:st.k,lab:st.lab,cap:txt(st.cap),exam:st.exam||"",trap:st.trap||"",big:txt(st.big||""),kupu:(st.kupu||[]).map(x=>typeof x==="string"?x:x.mi)})),
    challenges:(cfg.challenges||[]).map(c=>{let q="";try{q=txt(c.q)}catch(e){q="(question depends on the current state)"}return {q,check:fnsrc(c.check),ok:fnsrc(c.ok),no:fnsrc(c.no),okIsFn:typeof c.ok==="function",noIsFn:typeof c.no==="function"}}),
    controls:(cfg.controls||[]).map(c=>({type:c.type,id:c.id||c.type,label:c.label||""}))};
  window.__TEACHER_CAP=cap;return m.call(this,cfg)};v.__wrapped=true}}})})();`;

(async()=>{
  const notes=readNotes();
  const browser=await chromium.launch({args:["--use-gl=swiftshader","--enable-webgl","--ignore-gpu-blocklist"]});
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  await page.addInitScript(HOOK);
  const machines={};
  for(const [id,m] of Object.entries(D.machines)){
    const rel=m.href.split(/[?#]/)[0],html=path.join(ROOT,rel.endsWith("/")?rel+"index.html":rel),file=html.replace(/\.html$/,".js");
    const rec={id,title:m.title,href:m.href,desc:m.desc,blurb:m.blurb||"",tags:m.tags,built:isFile(html)};
    if(rec.built){
      await page.evaluate(()=>{window.__TEACHER_CAP=null}).catch(()=>{});
      try{await page.goto(BASE+m.href,{waitUntil:"load",timeout:30000})}catch(e){console.log("  (slow load, reading what mounted)",id)}
      await page.waitForFunction(()=>window.__TEACHER_CAP,null,{timeout:4000}).catch(()=>{});
      const cap=await page.evaluate(()=>window.__TEACHER_CAP||null);
      if(cap){
        if(cap.challenges.some(c=>/^\(\)\s*=>\s*\w+\.check\(\)$/.test(c.check))){const src=checksFromSource(file);cap.challenges.forEach((c,i)=>{if(src[i])c.check=src[i]})}
        delete cap.id;Object.assign(rec,cap,{shell:"kit"});
      } else {
        // the reading machine has its own shell: read its kupu list and describe the adaptive questions
        const src=isFile(file)?fs.readFileSync(file,"utf8"):"";const km=src.match(/const RKUPU=(\[[\s\S]*?\]);/);
        rec.shell="own";rec.kupu=km?new Function("return "+km[1])().map(k=>({mi:k.mi,en:k.en,ta:k.ta,note:"",chip:[]})):[];
        rec.steps=[];rec.challenges=[];rec.papers=[];
      }
    }
    const ev=notes.evidence[id]||{};
    (rec.kupu||[]).forEach(k=>{const e=ev[k.mi];if(e){k.evidence=e.evidence;k.stepsNote=e.steps}});
    machines[id]=rec;
    console.log(id,rec.built?`${rec.shell} · ${rec.steps?rec.steps.length:0} steps · ${rec.challenges?rec.challenges.length:0} challenges · ${rec.kupu?rec.kupu.length:0} kupu`:"NOT BUILT");
  }
  await browser.close();
  const out={built:new Date().toLocaleDateString("en-NZ",{timeZone:"Pacific/Auckland",day:"numeric",month:"long",year:"numeric"}),machines,notFound:notes.notFound};
  fs.writeFileSync(path.join(ROOT,"teacher-data.js"),"window.TEACHER="+JSON.stringify(out)+";");
  console.log("wrote teacher-data.js",fs.statSync(path.join(ROOT,"teacher-data.js")).size,"bytes");
})().catch(e=>{console.error(e);process.exit(1)});
