/* assembly · teacher and reviewer layer. Reads data.js (standards, strands) and teacher-data.js (captured from each
   machine by build_teacher.js), draws the coverage chart as inline SVG, keeps reviews in localStorage, and renders
   an A4 one-pager per machine with a QR code drawn by the small encoder below (byte mode, versions 1–10, no library). */
(()=>{
const D=window.STUDY,T=window.TEACHER,K=window.StudyKit,$=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const M=T.machines;
const SUBJ_LABEL={science:"Science",biochem:"Chemistry and biology",maths:"Maths and statistics",english:"English",social:"Social studies",digital:"Digital technologies"};
const subjOf=id=>K.subject(id);
$("lock").innerHTML=K.lockup;$("foot").innerHTML=K.lockup+`<span>assembly is made by assembl in Aotearoa.</span>`;

// ---- what each machine covers, from data.js
const stdsFor=id=>["l1","l2","l3"].flatMap(l=>D.levels[l].standards.filter(s=>s.machine===id).map(s=>({...s,level:l.toUpperCase()})));
const strandsFor=id=>["y9","y10"].flatMap(y=>D.levels[y].areas.flatMap(a=>a.topics.filter(t=>t.machine===id).map(t=>({year:y==="y9"?"Year 9":"Year 10",area:a.name,t:t.t}))));
const yearsOf=m=>{const ys=m.tags.filter(t=>/^Year/.test(t));return ys.length>1?`Years ${ys[0].replace("Year ","")}–${ys[ys.length-1].replace("Year ","")}`:(ys[0]||"")};
const order=Object.keys(M).sort((a,b)=>subjOf(a).localeCompare(subjOf(b))||M[a].title.localeCompare(M[b].title));
const short=t=>t.length>92?t.slice(0,90).replace(/\s\S*$/,"")+"…":t;
const rule=src=>String(src||"").replace(/^\(\)\s*=>\s*/,"").replace(/^\(s\)\s*=>\s*/,"").replace(/^function\s*\([^)]*\)\s*/,"").trim();
const pretty=src=>{let r=rule(src);if(/^`[^`]*`$/.test(r))r=r.slice(1,-1);return r.replace(/\$\{([^{}]*)\}/g,"⟨$1⟩")};
const fb=(v,isFn)=>isFn?`<code>${esc(pretty(v))}</code>`:esc(v);

// ======================= the long page
function renderAll(){
  const kupuTotal=order.reduce((n,id)=>n+(M[id].kupu||[]).length,0),chTotal=order.reduce((n,id)=>n+(M[id].challenges||[]).length,0);
  let o=`<section class="hero" aria-labelledby="h-top">
    <div class="eyebrow">For teachers and reviewers</div>
    <h1 id="h-top">Review the <span class="swash">machines.</span></h1>
    <p>Everything a reviewer needs in one place: which NZQA standards and refreshed-curriculum strands each machine covers, the challenge questions with their answers and marking rules, every kupu Māori with its Te Aka reference, a coverage chart that shows the gaps, and a form for your comments. Students see none of this.</p>
    <div class="cta"><a class="btn primary" href="#h-rev">Write a review</a><a class="btn" href="#h-cov">See the gaps</a><a class="btn" href="/study/year9/">Year 9 studio</a><a class="btn" href="/study/print/">Student Print Lab</a><a class="btn" href="accessibility-report.md">Accessibility report</a></div>
    <div class="notice"><span aria-hidden="true">ⓘ</span><span><b>Independent and unofficial.</b> Standard numbers and exam dates are copied from NZQA's published 2026 timetable; strands follow the refreshed New Zealand Curriculum. assembly is not made by or endorsed by NZQA or the Ministry of Education. Data captured ${esc(T.built)}.</span></div>
    <div class="notice"><span aria-hidden="true">＋</span><span><b>Separate making studios.</b> The Year 9 studio adds short study sprints, deterministic app building, on-device pixel analysis and AI source judgement. The Print Lab adds a parametric display model, drawings and geometry exports. They are not included in the NZQA mapping totals below; check current school assessment conditions and slicer results with students.</span></div>
  </section>
  <div class="kpis" aria-label="Totals"><div class="kpi"><b>${order.length}</b><span>machines</span></div><div class="kpi"><b>${chTotal}</b><span>challenge questions with marking rules</span></div><div class="kpi"><b>${kupuTotal}</b><span>kupu Māori, each with a Te Aka link</span></div><div class="kpi"><b>${["l1","l2","l3"].reduce((n,l)=>n+D.levels[l].standards.filter(s=>s.machine).length,0)} of ${["l1","l2","l3"].reduce((n,l)=>n+D.levels[l].standards.length,0)}</b><span>external NCEA standards with a machine</span></div></div>`;
  o+=renderMachines()+renderChallenges()+renderKupu()+renderCoverage()+renderReviews();
  $("main").innerHTML=o;
  wireReviews();
}
function renderMachines(){
  return `<section class="block" aria-labelledby="h-mach" id="s-mach"><h2 id="h-mach">Every machine, and what it covers</h2>
  <p class="lede">Standards are the external NCEA achievement standards mapped to the machine in the exam index; strands are the Year 9–10 topics from the refreshed curriculum that link to it. “Steps” are the stages a student walks through; each ends in a “Test yourself” step with the challenges listed below.</p>
  <table class="mtab"><thead><tr><th scope="col">Machine</th><th scope="col">NZQA standards</th><th scope="col">Curriculum strands (Years 9–10)</th><th scope="col">Size</th><th scope="col">Actions</th></tr></thead><tbody>
  ${order.map(id=>{const m=M[id],st=stdsFor(id),sr=strandsFor(id);
    return `<tr style="--acc:${K.accentFor(id)}"><td data-l="Machine"><div class="nm"><i aria-hidden="true">${K.glyph(id)}</i>${esc(m.title)}</div><div class="sub">${esc(SUBJ_LABEL[subjOf(id)])}${yearsOf(m)?" · "+esc(yearsOf(m)):""}${m.built?"":' · <span class="pill warn">not built yet</span>'}</div></td>
    <td data-l="NZQA standards">${st.length?`<ul>${st.map(s=>`<li><span class="num">${esc(s.level)} ${esc(s.num)}</span> ${esc(s.title)}</li>`).join("")}</ul>`:`<span class="none">none mapped${m.tags.some(t=>/NCEA/.test(t))?` (tagged ${esc(m.tags.filter(t=>/NCEA/.test(t)).join(", "))})`:""}</span>`}</td>
    <td data-l="Curriculum strands">${sr.length?`<ul>${sr.map(s=>`<li><span class="num">${esc(s.year)} · ${esc(s.area)}</span> ${esc(short(s.t))}</li>`).join("")}</ul>`:`<span class="none">none mapped</span>`}</td>
    <td data-l="Size" class="cnt">${m.built?`${(m.steps||[]).length} steps<br>${(m.challenges||[]).length} challenges<br>${(m.kupu||[]).length} kupu`:"—"}</td>
    <td data-l="Actions"><div class="acts"><a class="btn" href="${esc(m.href)}">Open</a><a class="btn" href="teacher.html?machine=${esc(id)}">One-pager</a><a class="btn" href="#h-rev" data-review="${esc(id)}">Review</a></div></td></tr>`}).join("")}
  </tbody></table></section>`}
function renderChallenges(){
  return `<section class="block" aria-labelledby="h-chal" id="s-chal"><h2 id="h-chal">Challenge questions, answers and marking</h2>
  <p class="lede">Each challenge is marked by the machine itself against its current state, so there is no single “answer” string: the <b>passes when</b> line is the exact rule the machine runs, pulled from the machine's code, and the feedback lines are what the student reads. Where a feedback line is computed from the state, its rule is shown instead, with the computed parts in ⟨angle brackets⟩. Exam lines and traps for every step sit above the questions.</p>
  <p class="legend">Reading the rules: <code style="font:12px var(--as-mono)">s</code> is the machine's state; names such as <code style="font:12px var(--as-mono)">fmt</code> format numbers. Tolerances (for example <code style="font:12px var(--as-mono)">Math.abs(x−0.2)&lt;0.001</code>) show how exact a student needs to be.</p>
  ${order.map(id=>{const m=M[id];if(!m.built)return "";
    if(m.shell==="own")return `<details class="card mach" style="--acc:${K.accentFor(id)}"><summary><b>${esc(m.title)}</b><small>adaptive · no fixed challenge set</small></summary><div class="in"><p>${esc(m.desc)}</p><p class="legend">The reading machine generates comprehension questions from its passages and adapts level and speed to the reader, so its questions are not a fixed list. Each answer carries its own explanation and a “Prove it” line pointing at the evidence in the text. Open the machine to review a passage set.</p></div></details>`;
    const steps=m.steps.filter(s=>s.exam||s.trap);
    return `<details class="card mach" style="--acc:${K.accentFor(id)}" id="ch-${esc(id)}"><summary><b>${esc(m.title)}</b><small>${m.challenges.length} challenges · ${m.steps.length} steps${m.badge?" · "+esc(m.badge.label):""}</small></summary><div class="in">
      ${steps.length?`<table class="steps-t"><thead><tr><th scope="col">Step</th><th scope="col">Say it in the exam</th><th scope="col">Common trap</th></tr></thead><tbody>${steps.map((s,i)=>`<tr><td>${m.steps.indexOf(s)+1}. ${esc(s.lab)}</td><td data-l="Exam line">${esc(s.exam)}</td><td data-l="Trap">${esc(s.trap)}</td></tr>`).join("")}</tbody></table>`:""}
      ${m.challenges.map((c,n)=>`<div class="q"><span class="qn" aria-hidden="true">${n+1}</span><div class="qq"><span class="sr">Question ${n+1}. </span>${esc(c.q)}</div>
        <dl><dt>Passes when</dt><dd><code>${esc(rule(c.check))}</code></dd><dt>On a pass</dt><dd>${fb(c.ok,c.okIsFn)}</dd><dt>When not yet</dt><dd>${fb(c.no,c.noIsFn)}</dd></dl></div>`).join("")}
      ${m.papers?.length?`<p class="legend">Practice links in the machine: ${m.papers.map(p=>`<a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.label)} ↗</a>`).join(" · ")}</p>`:""}
      ${m.truth?`<p class="legend"><span class="truth">Simulated</span>${esc(m.truth)}</p>`:""}
    </div></details>`}).join("")}</section>`}
function renderKupu(){
  const withK=order.filter(id=>(M[id].kupu||[]).length);
  const moe=n=>/MoE|Te Taura Whiri/.test(n||"");
  return `<section class="block" aria-labelledby="h-kupu" id="s-kupu"><h2 id="h-kupu">Kupu Māori in the machines</h2>
  <p class="lede">Each term below sits beside the idea it names inside a machine. Every one was looked up in Te Aka Māori Dictionary and its entry opened; the link goes to that entry. “Evidence” records whether the Te Aka entry cites one of the Ministry of Education's Māori-medium curriculum dictionaries. The full research notes, including the terms that were looked for and deliberately not added and the questions for a reviewer with cultural standing, are in <a href="te-reo-notes.md">te-reo-notes.md</a>.</p>
  <div class="card"><h3>Sources</h3><ul class="srcs">
    <li><a href="https://maoridictionary.co.nz/" target="_blank" rel="noopener">Te Aka Māori Dictionary</a> (John C Moorfield), which follows Te Taura Whiri i te Reo Māori's orthographic conventions, including macrons. Its entries cite their sources; the two below are the Ministry dictionaries referred to in the evidence column.</li>
    <li><i>Te Reo Pūtaiao</i>, the Ministry of Education's Māori-medium science dictionary (2009), Te Aka source code RP.</li>
    <li><i>Te Reo Pāngarau</i>, the Ministry's Māori-medium mathematics dictionary (2010), Te Aka source code TRP.</li>
    <li><i>Te Reo o Ngā Toi Puoro</i> (Ministry of Education, 2015) and <i>He Pātaka Kupu</i> (Te Taura Whiri, 2008) where an entry cites them.</li>
    <li>Terms with only a general Te Aka entry are marked “Te Aka entry”. A Māori-medium teacher could confirm which terms kura actually use.</li>
  </ul></div>
  ${withK.map(id=>{const m=M[id];return `<details class="card mach" style="--acc:${K.accentFor(id)}"><summary><b>${esc(m.title)}</b><small>${m.kupu.length} kupu · ${m.kupu.filter(k=>moe(k.evidence)).length} with a Ministry dictionary citation</small></summary><div class="in">
    <table class="ktab"><thead><tr><th scope="col">Kupu</th><th scope="col">English</th><th scope="col">Te Aka</th><th scope="col">Evidence</th></tr></thead><tbody>
    ${m.kupu.map(k=>`<tr><td><b lang="mi">${esc(k.mi)}</b>${k.note?`<small>${esc(k.note)}</small>`:""}</td><td>${esc(k.en)}${k.chip&&k.chip.length?`<small>Readout label when “Reo” is on: ${esc(k.chip.join(", "))}</small>`:""}</td><td>${k.ta?`<a class="ta" href="${K.teAka(k.ta)}" target="_blank" rel="noopener" aria-label="${esc(k.mi)} in Te Aka Māori Dictionary, entry ${esc(k.ta)} (opens in a new tab)">Te Aka ${esc(k.ta)} ↗</a>`:'<span class="none">no id</span>'}</td><td><span class="ev ${moe(k.evidence)?"moe":"ta"}">${esc(k.evidence||"Te Aka entry")}</span></td></tr>`).join("")}
    </tbody></table></div></details>`}).join("")}
  ${T.notFound?.length?`<details class="card gaps"><summary>Terms looked for but not added (${T.notFound.length} notes)</summary><ul>${T.notFound.map(n=>`<li>${esc(n)}</li>`).join("")}</ul></details>`:""}
  </section>`}

// ---- coverage: strands by area and year, standards by subject and level
const AREA_KEY={"Mathematics and Statistics":"maths","Science":"science","English":"english","Social sciences":"social"};
const subjKey=s=>/math/i.test(s)?"maths":/english|media|classical|drama|art hist|history|geograph|social|econom|business|accounting|legal|religious/i.test(s)?(/english|media|classical/i.test(s)?"english":"social"):/biology|chem/i.test(s)?"biochem":/digital|techno/i.test(s)?"digital":"science";
const ACC={science:"#2F8FD8",biochem:"#12A386",maths:"#7B61FF",english:"#F2603F",social:"#2FA65A",digital:"#D9468F"};
function bars(rows,title,id){
  // rows: [{label, sub, n, total, key}] → one SVG, a track per row, in the subject's accent
  const W=720,rh=30,pad=10,lw=250,bw=W-lw-90,H=pad*2+rows.length*rh+22;
  let o=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="${id}-t" aria-describedby="${id}-d"><title id="${id}-t">${esc(title)}</title><desc id="${id}-d">${rows.map(r=>`${r.label} ${r.sub}: ${r.n} of ${r.total}`).join("; ")}</desc>`;
  rows.forEach((r,i)=>{const y=pad+i*rh,f=r.total?r.n/r.total:0,c=ACC[r.key]||"#2F8FD8";
    o+=`<text x="0" y="${y+19}" class="t-big" style="font-size:13px">${esc(r.label)}</text><text x="${lw-8}" y="${y+19}" text-anchor="end" class="t-lab" style="font-size:11.5px">${esc(r.sub)}</text>
      <rect x="${lw}" y="${y+6}" width="${bw}" height="16" rx="8" fill="var(--as-soft)"/>${r.n?`<rect x="${lw}" y="${y+6}" width="${Math.max(16,bw*f).toFixed(1)}" height="16" rx="8" fill="${c}"/>`:""}
      <text x="${lw+bw+10}" y="${y+19}" class="t-ink" style="font-size:12.5px;font-variant-numeric:tabular-nums">${r.n} of ${r.total}${r.n?"":" · gap"}</text>`});
  o+=`<text x="${lw}" y="${H-4}" class="t-lab" style="font-size:11px">Filled = has a machine. Grey = no machine yet.</text></svg>`;return o}
function grouped(subjects,title,id){
  // one row per subject; three short tracks for L1, L2 and L3, each sized to that level's number of standards
  const W=720,rh=26,pad=12,lw=236,gap=14,cw=(W-lw-gap*2)/3,H=pad+18+subjects.length*rh+22,LV=["L1","L2","L3"],maxT=Math.max(1,...subjects.flatMap(r=>r.lv.map(x=>x.total)));
  let o=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="${id}-t" aria-describedby="${id}-d"><title id="${id}-t">${esc(title)}</title><desc id="${id}-d">${subjects.map(r=>`${r.label}: ${r.lv.map((x,i)=>LV[i]+" "+x.n+" of "+x.total).join(", ")}`).join("; ")}</desc>`;
  LV.forEach((l,i)=>{o+=`<text x="${lw+i*(cw+gap)}" y="${pad}" class="t-lab" style="font-size:11.5px">NCEA ${l}</text>`});
  subjects.forEach((r,ri)=>{const y=pad+18+ri*rh,c=ACC[r.key]||"#2F8FD8";
    o+=`<text x="0" y="${y+16}" class="t-big" style="font-size:12.5px"${r.label.length>30?` textLength="${lw-10}" lengthAdjust="spacingAndGlyphs"`:""}>${esc(r.label)}</text>`;
    r.lv.forEach((x,i)=>{const bx=lw+i*(cw+gap);if(!x.total){o+=`<text x="${bx}" y="${y+16}" class="t-lab" style="font-size:11px;fill:var(--as-line2)">–</text>`;return}
      const tw=Math.max(30,(cw-44)*x.total/maxT);
      o+=`<rect x="${bx}" y="${y+5}" width="${tw.toFixed(1)}" height="14" rx="7" fill="var(--as-soft)"/>${x.n?`<rect x="${bx}" y="${y+5}" width="${Math.max(14,tw*x.n/x.total).toFixed(1)}" height="14" rx="7" fill="${c}"/>`:""}<text x="${(bx+tw+6).toFixed(1)}" y="${y+16}" class="t-ink" style="font-size:11.5px;font-variant-numeric:tabular-nums${x.n?"":";fill:var(--rose)"}">${x.n} of ${x.total}</text>`})});
  o+=`<text x="${lw}" y="${H-4}" class="t-lab" style="font-size:11px">Filled = has a machine. Grey = no machine yet. Track length = number of external standards.</text></svg>`;return o}
function renderCoverage(){
  const srows=[],sgaps=[];
  ["y9","y10"].forEach(y=>D.levels[y].areas.forEach(a=>{const n=a.topics.filter(t=>t.machine&&M[t.machine]&&M[t.machine].built).length;srows.push({label:a.name,sub:y==="y9"?"Year 9":"Year 10",n,total:a.topics.length,key:AREA_KEY[a.name]||"science"});a.topics.filter(t=>!(t.machine&&M[t.machine]&&M[t.machine].built)).forEach(t=>sgaps.push(`${y==="y9"?"Year 9":"Year 10"} · ${a.name}: ${t.t}`))}));
  const by={},ngaps=[];
  ["l1","l2","l3"].forEach((l,i)=>D.levels[l].standards.forEach(s=>{const r=by[s.subject]=by[s.subject]||{label:s.subject,key:subjKey(s.subject),lv:[{n:0,total:0},{n:0,total:0},{n:0,total:0}]};r.lv[i].total++;
    if(s.machine&&M[s.machine]&&M[s.machine].built)r.lv[i].n++;else ngaps.push(`${l.toUpperCase()} ${s.num} · ${s.subject}: ${s.title}`)}));
  const subjects=Object.values(by).sort((a,b)=>(b.lv.reduce((x,y)=>x+y.n,0)-a.lv.reduce((x,y)=>x+y.n,0))||a.label.localeCompare(b.label));
  const lvl=l=>{const S=D.levels[l].standards;return `${S.filter(s=>s.machine&&M[s.machine]&&M[s.machine].built).length} of ${S.length}`};
  return `<section class="block" aria-labelledby="h-cov" id="s-cov"><h2 id="h-cov">Coverage: where there is a machine, and where there is not</h2>
  <p class="lede">Two views of the same question. Years 9–10 are counted by curriculum topic within each learning area; NCEA is counted by external achievement standard within each subject and level. A standard or topic counts as covered only when its machine exists and is linked from the exam index. The grey tracks are the gaps: every Level 2 and Level 3 standard, and most Level 1 subjects.</p>
  <div class="kpis"><div class="kpi"><b>${lvl("l1")}</b><span>Level 1 external standards covered</span></div><div class="kpi"><b>${lvl("l2")}</b><span>Level 2 external standards covered</span></div><div class="kpi"><b>${lvl("l3")}</b><span>Level 3 external standards covered</span></div><div class="kpi"><b>${srows.reduce((a,r)=>a+r.n,0)} of ${srows.reduce((a,r)=>a+r.total,0)}</b><span>Year 9–10 topics covered</span></div></div>
  <div class="card cov"><h3>Years 9–10, refreshed curriculum, by learning area</h3><div class="chart" tabindex="0" aria-label="Chart: Year 9 and 10 topics with a machine. Scrolls sideways on small screens.">${bars(srows,"Year 9 and 10 topics with a machine, by learning area","cov1")}</div>
    <details class="gaps"><summary>Topics without a machine (${sgaps.length})</summary><ul>${sgaps.map(g=>`<li>${esc(g)}</li>`).join("")}</ul></details></div>
  <div class="card cov"><h3>NCEA external standards, by subject and level</h3><div class="chart" tabindex="0" aria-label="Chart: NCEA external standards with a machine, by subject and level. Scrolls sideways on small screens.">${grouped(subjects,"NCEA external standards with a machine, by subject and level","cov2")}</div>
    <details class="gaps"><summary>Standards without a machine (${ngaps.length})</summary><ul>${ngaps.map(g=>`<li>${esc(g)}</li>`).join("")}</ul></details></div>
  </section>`}

// ---- reviews, kept on this device, exported as one text block
const RK="teacherReviews";
const loadR=()=>{try{const v=JSON.parse(localStorage.getItem(RK)||"[]");return Array.isArray(v)?v:[]}catch(e){return memR}};let memR=[];
const saveR=list=>{memR=list;try{localStorage.setItem(RK,JSON.stringify(list))}catch(e){}};
const CHECKS=[["accuracy","Subject accuracy"],["curriculum","Curriculum and standard fit"],["exam","Exam language and marking"],["reo","Te reo Māori terms"],["access","Accessibility"],["age","Age and tone"]];
function renderReviews(){
  return `<section class="block" aria-labelledby="h-rev" id="s-rev"><h2 id="h-rev">Review a machine</h2>
  <p class="lede">Write as much or as little as you like. Reviews are saved in this browser only (nothing is sent). When you are done, build the email text, copy it, and paste it into an email to assembl.</p>
  <form class="card rev" id="revForm" novalidate>
    <div><label for="rvM">Machine</label><select id="rvM" required>${order.map(id=>`<option value="${esc(id)}">${esc(M[id].title)}</option>`).join("")}</select></div>
    <div><label for="rvN">Your name and role (optional)</label><input id="rvN" type="text" autocomplete="name" placeholder="e.g. HOD Science, Year 10 teacher"></div>
    <div><label for="rvS">School or organisation (optional)</label><input id="rvS" type="text" autocomplete="organization"></div>
    <fieldset><legend>Overall, is it classroom-ready?</legend><div class="stars" role="radiogroup" aria-label="Rating out of five">${[1,2,3,4,5].map(n=>`<label><input type="radio" name="rvR" value="${n}"${n===4?" checked":""}><span aria-hidden="true">${n}</span><span class="sr">${n} out of 5</span></label>`).join("")}</div></fieldset>
    <fieldset class="full"><legend>What you checked</legend><div class="checks">${CHECKS.map(([k,l])=>`<label><input type="checkbox" name="rvC" value="${k}">${l}</label>`).join("")}</div></fieldset>
    <div class="full"><label for="rvT">Comments: what is right, what is wrong, what you would change</label><textarea id="rvT" required></textarea></div>
    <div class="full sheet-bar"><button class="btn primary" type="submit">Save on this device</button><p class="status" id="rvStatus" role="status"></p></div>
  </form>
  <div class="card"><h3>Saved reviews <span id="rvCount"></span></h3><ul class="saved" id="rvList"></ul>
    <div class="sheet-bar" style="margin-top:10px"><button class="btn" type="button" id="rvBuild">Build the email text</button><button class="btn" type="button" id="rvCopy" hidden>Copy</button><button class="btn" type="button" id="rvClear" hidden>Delete all saved reviews</button></div>
    <div class="export" id="rvExport" hidden style="margin-top:10px"><label for="rvOut" class="sr">Email text</label><textarea id="rvOut" readonly></textarea></div></div>
  </section>`}
function wireReviews(){
  const list=()=>{const L=loadR();$("rvCount").textContent=L.length?`· ${L.length} on this device`:"· none yet";
    $("rvList").innerHTML=L.length?L.map((r,i)=>`<li><div><b>${esc(M[r.m]?.title||r.m)}</b> · ${r.rating}/5 <span class="meta">· ${esc(r.who||"anonymous")}${r.school?", "+esc(r.school):""} · ${esc(new Date(r.t).toLocaleDateString("en-NZ",{timeZone:"Pacific/Auckland",day:"numeric",month:"short",year:"numeric"}))}${r.checks.length?" · checked: "+esc(r.checks.map(k=>(CHECKS.find(c=>c[0]===k)||[k,k])[1].toLowerCase()).join(", ")):""}</span></div><button class="btn" type="button" data-del="${i}" aria-label="Delete this review of ${esc(M[r.m]?.title||r.m)}">Delete</button><p>${esc(r.text)}</p></li>`).join(""):`<li><span class="none">Nothing saved yet.</span></li>`;
    $("rvClear").hidden=!L.length;
    $("rvList").querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>{const L2=loadR();L2.splice(+b.dataset.del,1);saveR(L2);list();$("rvStatus").textContent="Deleted.";$("rvBuild").focus()})};
  list();
  $("revForm").addEventListener("submit",e=>{e.preventDefault();const text=$("rvT").value.trim();if(!text){$("rvStatus").textContent="Add a comment first.";$("rvT").focus();return}
    const r={m:$("rvM").value,who:$("rvN").value.trim(),school:$("rvS").value.trim(),rating:+(document.querySelector("input[name=rvR]:checked")||{value:0}).value,checks:[...document.querySelectorAll("input[name=rvC]:checked")].map(i=>i.value),text,t:Date.now()};
    const L=loadR();L.push(r);saveR(L);$("rvT").value="";document.querySelectorAll("input[name=rvC]").forEach(i=>i.checked=false);list();$("rvStatus").textContent=`Saved your review of ${M[r.m]?.title||r.m}.`;$("rvExport").hidden=true;$("rvCopy").hidden=true});
  $("rvBuild").onclick=()=>{const L=loadR();if(!L.length){$("rvStatus").textContent="No reviews saved yet.";return}
    const txt=[`assembly machine reviews · ${L.length} review${L.length===1?"":"s"} · exported ${new Date().toLocaleDateString("en-NZ",{timeZone:"Pacific/Auckland",day:"numeric",month:"long",year:"numeric"})}`,`Page: ${location.origin+location.pathname}`,"",
      ...L.map((r,i)=>[`${i+1}. ${M[r.m]?.title||r.m} (${r.m}) · ${r.rating}/5`,`   Reviewer: ${r.who||"anonymous"}${r.school?", "+r.school:""}`,`   Checked: ${r.checks.length?r.checks.map(k=>(CHECKS.find(c=>c[0]===k)||[k,k])[1]).join(", "):"not stated"}`,`   Standards: ${stdsFor(r.m).map(s=>s.level+" "+s.num).join(", ")||"none mapped"}`,"   Comments:",...r.text.split("\n").map(l=>"   "+l),""].join("\n"))].join("\n");
    $("rvOut").value=txt;$("rvExport").hidden=false;$("rvCopy").hidden=false;$("rvOut").focus();$("rvStatus").textContent="Email text built below. Copy it and paste it into an email."};
  $("rvCopy").onclick=()=>{const b=$("rvCopy");const done=()=>{b.textContent="Copied";setTimeout(()=>b.textContent="Copy",1500)};const sel=()=>{$("rvOut").select();b.textContent="Selected: press copy"};try{navigator.clipboard.writeText($("rvOut").value).then(done,sel)}catch(e){sel()}};
  $("rvClear").onclick=()=>{if(confirm("Delete every saved review from this browser? This cannot be undone."))  {saveR([]);list();$("rvExport").hidden=true;$("rvCopy").hidden=true;$("rvStatus").textContent="All saved reviews deleted."}};
  document.querySelectorAll("[data-review]").forEach(a=>a.addEventListener("click",()=>{$("rvM").value=a.dataset.review;setTimeout(()=>$("rvM").focus(),50)}));
}

// ======================= the one-pager
function renderSheet(id){
  const m=M[id],st=stdsFor(id),sr=strandsFor(id),acc=K.accentFor(id);
  const url=new URL(m.href,location.href).href;
  const first=(m.steps||[]).find(s=>s.exam)||{},trapStep=(m.steps||[]).find(s=>s.trap)||{};
  const qs=(m.challenges||[]).slice(0,3);
  document.title=`assembly · ${m.title} · teacher one-pager`;
  $("nav").innerHTML=`<a href="teacher.html">All machines</a><a href="teacher.html#h-rev">Reviews</a>`;
  $("main").innerHTML=`<div class="sheet-bar noprint"><a class="btn" href="teacher.html">← All machines</a><button class="btn primary" type="button" id="printBtn">Print this one-pager</button><a class="btn" href="${esc(m.href)}">Open the machine</a><a class="btn" href="teacher.html#h-rev">Review it</a><span class="legend">A4, one page. The QR code opens the machine at ${esc(url)}.</span></div>
  <article class="sheet" style="--acc:${acc}" aria-labelledby="sh-t">
    <header><span>${K.lockup}</span><span class="ey">Teacher one-pager · ${esc(SUBJ_LABEL[subjOf(id)])}${yearsOf(m)?" · "+esc(yearsOf(m)):""}</span></header>
    <h1 id="sh-t">${esc(m.title)}</h1>
    <div class="meta">${st.map(s=>`<span class="pill ex">NCEA ${esc(s.level)} · ${esc(s.num)} ${esc(s.title)}</span>`).join("")}${sr.map(s=>`<span class="pill">${esc(s.year)} · ${esc(s.area)}</span>`).join("")}${!st.length&&!sr.length?'<span class="pill">No standard or strand mapped yet</span>':""}</div>
    <div class="two">
      <div class="box"><h2>What it teaches</h2><p>${esc(m.desc)}</p>${m.footer?`<p>${esc(m.footer)}</p>`:""}${m.built?`<p class="legend">${(m.steps||[]).length} steps${m.steps?.length?": "+esc(m.steps.map(s=>s.lab).join(" → ")):""}.</p>`:""}</div>
      <div class="box qr"><div id="qr" aria-hidden="true"></div><div><h2>Scan to open</h2><p class="u">${esc(url)}</p><p>Works on any phone. No sign-in, no account; progress is saved on the student's device.</p></div></div>
    </div>
    <div class="two">
      <div class="box exam"><h2>Say it in the exam${first.lab?` · step: ${esc(first.lab)}`:""}</h2><p>${esc(first.exam||"This machine has no exam line.")}</p></div>
      <div class="box trap"><h2>Common trap${trapStep.lab?` · step: ${esc(trapStep.lab)}`:""}</h2><p>${esc(trapStep.trap||"No trap recorded.")}</p></div>
    </div>
    <div class="box"><h2>Three challenge questions (the machine marks them)</h2>${qs.length?`<ol class="qs">${qs.map(c=>`<li><span>${esc(c.q)}</span><small>Passes when: <code style="font:11.5px var(--as-mono)">${esc(rule(c.check))}</code></small></li>`).join("")}</ol>`:`<p>${m.shell==="own"?"Questions are generated from each passage and adapt to the reader.":"No challenges yet."}</p>`}</div>
    ${m.kupu?.length?`<div class="box"><h2>Kupu Māori in this machine (${m.kupu.length})</h2><p lang="mi">${m.kupu.map(k=>esc(k.mi)).join(" · ")}</p><p class="legend">Each term is linked to its Te Aka Māori Dictionary entry inside the machine.</p></div>`:""}
    <footer><span><span class="truth">Simulated</span>${esc(m.truth||"A simplified model for learning. Check model answers with your teacher.")}</span><span>assembly is made by assembl in Aotearoa. Not made by or endorsed by NZQA or the Ministry of Education. Standard numbers and titles are copied from NZQA; check the current assessment specifications.</span></footer>
  </article>`;
  $("qr").innerHTML=QR.svg(url);
  $("printBtn").onclick=()=>window.print();
}

// ======================= a small QR encoder: byte mode, ECC level L or M, versions 1–10
const QR=(()=>{
  const EXP=new Uint8Array(512),LOG=new Uint8Array(256);
  for(let i=0,x=1;i<255;i++){EXP[i]=x;LOG[x]=i;x<<=1;if(x&256)x^=0x11d}for(let i=255;i<512;i++)EXP[i]=EXP[i-255];
  const mul=(a,b)=>a&&b?EXP[LOG[a]+LOG[b]]:0;
  function rs(data,n){let g=[1];for(let i=0;i<n;i++){const ng=new Array(g.length+1).fill(0);for(let j=0;j<g.length;j++){ng[j]^=g[j];ng[j+1]^=mul(g[j],EXP[i])}g=ng}
    const r=new Array(n).fill(0);for(const d of data){const f=d^r[0];r.shift();r.push(0);if(f)for(let j=0;j<n;j++)r[j]^=mul(g[j+1],f)}return r}
  // [total codewords, {L:[ec per block, blocks, data per block, more blocks, data per block]}] for versions 1–10
  const TAB=[null,[26,{L:[7,1,19],M:[10,1,16]}],[44,{L:[10,1,34],M:[16,1,28]}],[70,{L:[15,1,55],M:[26,1,44]}],[100,{L:[20,1,80],M:[18,2,32]}],[134,{L:[26,1,108],M:[24,2,43]}],
    [172,{L:[18,2,68],M:[16,4,27]}],[196,{L:[20,2,78],M:[18,4,31]}],[242,{L:[24,2,97],M:[22,2,38,2,39]}],[292,{L:[30,2,116],M:[22,3,36,2,37]}],[346,{L:[18,2,68,2,69],M:[26,4,43,1,44]}]];
  const ALIGN=[null,[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50]];
  const blocksOf=spec=>{const b=[];for(let i=0;i<spec[1];i++)b.push(spec[2]);for(let i=0;i<(spec[3]||0);i++)b.push(spec[4]);return b};
  function encode(text,ecl){
    const bytes=[...new TextEncoder().encode(text)];let v=1;
    for(;v<=10;v++){const cap=blocksOf(TAB[v][1][ecl]).reduce((a,b)=>a+b,0)*8;if(4+(v<10?8:16)+bytes.length*8<=cap)break}
    if(v>10)throw new Error("too long for this encoder");
    const spec=TAB[v][1][ecl],blocks=blocksOf(spec),ecn=spec[0],dataLen=blocks.reduce((a,b)=>a+b,0);
    const bits=[];const put=(val,n)=>{for(let i=n-1;i>=0;i--)bits.push((val>>i)&1)};
    put(4,4);put(bytes.length,v<10?8:16);bytes.forEach(b=>put(b,8));put(0,Math.min(4,dataLen*8-bits.length));while(bits.length%8)bits.push(0);
    const data=[];for(let i=0;i<bits.length;i+=8)data.push(parseInt(bits.slice(i,i+8).join(""),2));
    for(let p=0xEC;data.length<dataLen;p^=0xEC^0x11)data.push(p);
    // split, EC per block, interleave
    const db=[],eb=[];let k=0;blocks.forEach(n=>{const d=data.slice(k,k+n);k+=n;db.push(d);eb.push(rs(d,ecn))});
    const out=[];const maxD=Math.max(...blocks);for(let i=0;i<maxD;i++)db.forEach(d=>{if(i<d.length)out.push(d[i])});for(let i=0;i<ecn;i++)eb.forEach(e=>out.push(e[i]));
    return {v,ecl,codewords:out}}
  function matrix(text,ecl){
    const {v,codewords}=encode(text,ecl||"L"),N=17+4*v;
    const mod=Array.from({length:N},()=>new Uint8Array(N)),fn=Array.from({length:N},()=>new Uint8Array(N));
    const set=(x,y,d)=>{mod[y][x]=d?1:0;fn[y][x]=1};
    const finder=(cx,cy)=>{for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){const x=cx+dx,y=cy+dy;if(x<0||y<0||x>=N||y>=N)continue;const d=Math.max(Math.abs(dx),Math.abs(dy));set(x,y,d!==2&&d!==4)}};
    finder(3,3);finder(N-4,3);finder(3,N-4);
    for(let i=0;i<N;i++){if(!fn[6][i])set(i,6,i%2===0);if(!fn[i][6])set(6,i,i%2===0)}
    const al=ALIGN[v];al.forEach(cx=>al.forEach(cy=>{if((cx===6&&cy===6)||(cx===6&&cy===N-7)||(cx===N-7&&cy===6))return;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)set(cx+dx,cy+dy,Math.max(Math.abs(dx),Math.abs(dy))!==1)}));
    // reserve format areas (and version areas) as function modules; filled after masking
    const res=(x,y)=>{if(!fn[y][x])set(x,y,0)};for(let i=0;i<=8;i++){res(8,i);res(i,8);if(i<8){res(N-1-i,8);res(8,N-1-i)}}
    if(v>=7){let rem=v;for(let i=0;i<12;i++)rem=(rem<<1)^((rem>>>11)*0x1F25);const vb=(v<<12)|rem;for(let i=0;i<18;i++){const b=(vb>>i)&1,a=N-11+i%3,c=Math.floor(i/3);set(a,c,b);set(c,a,b)}}
    // data
    let i=0;const total=codewords.length*8;
    for(let right=N-1;right>=1;right-=2){if(right===6)right=5;for(let vert=0;vert<N;vert++)for(let j=0;j<2;j++){const x=right-j,up=((right+1)&2)===0,y=up?N-1-vert:vert;if(!fn[y][x]&&i<total){mod[y][x]=(codewords[i>>>3]>>>(7-(i&7)))&1;i++}}}
    const MASK=[(x,y)=>(x+y)%2===0,(x,y)=>y%2===0,(x,y)=>x%3===0,(x,y)=>(x+y)%3===0,(x,y)=>(Math.floor(x/3)+Math.floor(y/2))%2===0,(x,y)=>(x*y)%2+(x*y)%3===0,(x,y)=>((x*y)%2+(x*y)%3)%2===0,(x,y)=>((x+y)%2+(x*y)%3)%2===0];
    const fmtBits=mask=>{const data=((ecl==="M"?0:1)<<3)|mask;let rem=data;for(let i=0;i<10;i++)rem=(rem<<1)^((rem>>>9)*0x537);return ((data<<10)|rem)^0x5412};
    const drawFmt=bits=>{const g=i=>(bits>>>i)&1;for(let i=0;i<=5;i++)set(8,i,g(i));set(8,7,g(6));set(8,8,g(7));set(7,8,g(8));for(let i=9;i<15;i++)set(14-i,8,g(i));
      for(let i=0;i<8;i++)set(N-1-i,8,g(i));for(let i=8;i<15;i++)set(8,N-15+i,g(i));set(8,N-8,1)};
    const apply=m=>{for(let y=0;y<N;y++)for(let x=0;x<N;x++)if(!fn[y][x]&&MASK[m](x,y))mod[y][x]^=1};
    const penalty=()=>{let p=0;const run=(get)=>{for(let a=0;a<N;a++){let last=-1,r=0,hist=[0,0,0,0,0,0,0];for(let b=0;b<N;b++){const c=get(a,b);if(c===last){r++;if(r===5)p+=3;else if(r>5)p++}else{hist.shift();hist.push(r);if(hist[1]===hist[2]&&hist[2]===hist[4]&&hist[3]===3*hist[2]&&hist[2]>0&&(hist[0]>=4||hist[5]>=4))p+=40;last=c;r=1}}}};
      run((y,x)=>mod[y][x]);run((x,y)=>mod[y][x]);
      for(let y=0;y<N-1;y++)for(let x=0;x<N-1;x++){const c=mod[y][x];if(c===mod[y][x+1]&&c===mod[y+1][x]&&c===mod[y+1][x+1])p+=3}
      let dark=0;mod.forEach(r=>r.forEach(c=>dark+=c));const k=Math.floor(Math.abs(dark*20-N*N*10)/(N*N));p+=k*10;return p};
    let best=0,bp=Infinity;
    for(let m=0;m<8;m++){apply(m);drawFmt(fmtBits(m));const p=penalty();if(p<bp){bp=p;best=m}apply(m)}
    apply(best);drawFmt(fmtBits(best));
    return {size:N,version:v,mask:best,modules:mod}}
  function svg(text,opt){opt=opt||{};const q=matrix(text,opt.ecl||"L"),N=q.size,Q=opt.quiet===undefined?4:opt.quiet;
    let d="";for(let y=0;y<N;y++)for(let x=0;x<N;x++)if(q.modules[y][x])d+=`M${x+Q} ${y+Q}h1v1h-1z`;
    return `<svg viewBox="0 0 ${N+2*Q} ${N+2*Q}" shape-rendering="crispEdges" role="img" aria-label="QR code: ${esc(text)}"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#000"/></svg>`}
  return {matrix,svg,encode}})();
window.TeacherQR=QR;

// ======================= routing
const want=new URLSearchParams(location.search).get("machine");
if(want&&M[want])renderSheet(want);else{renderAll();if(want)$("main").insertAdjacentHTML("afterbegin",`<p class="notice">No machine called “${esc(want)}”. Here is the full list.</p>`)}
// mark the nav item for the section in view
const links=[...document.querySelectorAll("#nav a[href^='#']")];
if(links.length&&"IntersectionObserver" in window){const io=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting)links.forEach(a=>a.setAttribute("aria-current",a.getAttribute("href")==="#"+e.target.id?"true":"false"))})},{rootMargin:"-30% 0px -60% 0px"});
  links.forEach(a=>{const t=document.getElementById(a.getAttribute("href").slice(1));t&&io.observe(t)})}
})();
