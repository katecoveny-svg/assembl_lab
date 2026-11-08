/* The study helper (formerly "Allen"). The floating button opens a chat that knows the machine you're on and can work it:
   he moves controls, switches steps and presses buttons through the machine's own setters, and every change
   shows up as a line in the chat. Paste (or photograph) a past exam question and he works through it with you.
   The agent runs at /api/tutor; when it is off or out of turns he answers from the machine's own notes instead. */
(function(){
  if(window.__allenTutor)return;window.__allenTutor=true;
  const $=s=>document.querySelector(s),esc=t=>String(t??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
  const strip=h=>{const d=document.createElement("div");d.innerHTML=String(h||"");return (d.textContent||"").replace(/\s+/g," ").trim()};
  const KEY="allen-chat:"+location.pathname, CAPKEY="allen-left:"+new Date().toISOString().slice(0,10);
  const SK=()=>window.StudyKit, cur=()=>window.StudyKit&&window.StudyKit.current;
  const the=t=>"the "+String(t||"machine").replace(/^the\s+/i,"");
  const look=()=>({name:"the study helper"}), name=()=>"the study helper";   // no character: one plain helper (Nov 2026)
  let msgs=[];try{msgs=JSON.parse(sessionStorage.getItem(KEY)||"[]")}catch(e){}
  let busy=false,offline=false,left=null;try{left=localStorage.getItem(CAPKEY)}catch(e){}

  // ---------- what Allen can see: the live machine, or the study page around him
  function controlInfo(c,s){const id=c.id||c.type,base={id,type:c.type,label:c.label||id};
    try{if(c.type==="range")return {...base,min:c.min,max:c.max,step:c.step||1,value:c.get(s),shows:c.fmt?strip(c.fmt(s)):undefined};
      if(c.type==="select")return {...base,options:c.options.map(o=>({value:o[0],label:o[1]})),value:c.get(s)};
      if(c.type==="toggle")return {...base,value:!!c.get(s)};
      if(c.type==="play")return {...base,label:"Play / pause",value:!!s.playing};
      return base}catch(e){return base}}
  function readouts(){const k=cur();if(!k)return {};const {cfg,api}=k,st=api.step,map=cfg.chips?cfg.chips(api.state,st):{},out={};
    (st.chips||[]).forEach(id=>{const v=map[id];if(v)out[v[0]]=v[1]});return out}
  function stateSummary(s){const out={};let n=0;for(const [k,v] of Object.entries(s||{})){if(n>=40)break;if(typeof v==="number"&&isFinite(v)){out[k]=Math.round(v*1e4)/1e4;n++}else if(typeof v==="boolean"||(typeof v==="string"&&v.length<40)){out[k]=v;n++}}return out}
  function context(){
    const k=cur(),cat=window.STUDY&&window.STUDY.machines?Object.fromEntries(Object.entries(window.STUDY.machines).map(([id,m])=>[id,m.title])):undefined;
    if(!k)return {page:document.title,path:location.pathname,machines:cat};
    const {cfg,api,mid}=k,s=api.state,st=api.step,shown=new Set(st.controls||(cfg.controls||[]).map(c=>c.id||c.type));
    return {page:"study machine",machine:{id:mid,title:cfg.title,area:cfg.eyebrow,level:cfg.badge&&cfg.badge.label,covers:cfg.footer,truth:strip(cfg.truth)},
      step:{key:st.k,title:st.lab,says:strip(st.cap),bigIdea:strip(st.big),trap:strip(st.trap),examLine:strip(typeof st.exam==="function"?st.exam(s,st,api):st.exam)},
      steps:cfg.steps.map(x=>({key:x.k,title:x.lab})),
      controls:(cfg.controls||[]).map(c=>({...controlInfo(c,s),onThisStep:shown.has(c.id||c.type)})),
      readouts:readouts(),challenges:st.k==="test"?(cfg.challenges||[]).map((c,i)=>({n:i+1,q:strip(c.q)})):undefined,
      state:stateSummary(s),papers:(cfg.papers||[]).map(p=>p.label),
      questionBank:cfg.questionBank?cfg.questionBank.list().map((x,i)=>({n:i+1,section:x.sec,step:x.step,q:x.q.slice(0,300),addedByAllen:!!x.added})):undefined,machines:cat}}

  // ---------- what Allen can do. Each action runs through the machine's own setters and is shown in the chat.
  function act(use){const k=cur(),i=use.input||{};
    if(use.name==="suggest_machine"){const m=window.STUDY&&window.STUDY.machines&&window.STUDY.machines[i.id];if(!m)return {error:"No machine with that id."};
      line(`<a class="al-card" href="/study/${esc(m.href)}"><b>${esc(m.title)}</b><span>${esc(i.why||m.blurb||"")}</span></a>`);return {ok:true,shown:m.title}}
    if(!k)return {error:"No machine is open on this page. Use suggest_machine to point to one."};
    const {cfg,api}=k,s=api.state;
    if(use.name==="add_question"){if(!cfg.questionBank)return {error:"This machine has no practice question bank."};const q=cfg.questionBank.add(i);if(!q)return {error:"Question too short."};
      line(`<span class="al-act">Added a practice question</span>`);return {ok:true,added:q.q.slice(0,120),total:cfg.questionBank.list().length}}
    if(use.name==="go_to_step"){const n=cfg.steps.findIndex(x=>x.k===i.step);if(n<0)return {error:"Unknown step. Steps: "+cfg.steps.map(x=>x.k).join(", ")};
      api.setStep(n);line(`<span class="al-act">Went to <b>${esc(cfg.steps[n].lab)}</b></span>`);return {ok:true,step:cfg.steps[n].lab,readouts:readouts()}}
    const c=(cfg.controls||[]).find(x=>(x.id||x.type)===i.id);if(!c)return {error:"Unknown control. Controls: "+(cfg.controls||[]).map(x=>x.id||x.type).join(", ")};
    const shown=!api.step.controls||api.step.controls.includes(i.id);
    if(!shown)return {error:`"${c.label||i.id}" isn't on this step. Steps that have it: `+cfg.steps.filter(x=>!x.controls||x.controls.includes(i.id)).map(x=>x.k).join(", ")};
    if(use.name==="press_button"){if(c.type==="button"){c.onClick(s,api);api.redraw();line(`<span class="al-act">Pressed <b>${esc(c.label)}</b></span>`)}
      else if(c.type==="play"){s.playing=!s.playing;api.redraw();line(`<span class="al-act">${s.playing?"Pressed play":"Paused"}</span>`)}
      else return {error:"That control is not a button; use set_control."};return {ok:true,readouts:readouts()}}
    if(use.name==="set_control"){let v=i.value,label=c.label||i.id,shows;
      if(c.type==="range"){v=Number(v);if(!isFinite(v))return {error:"Range controls need a number."};const st=c.step||1;v=Math.min(c.max,Math.max(c.min,v));v=+(Math.round((v-c.min)/st)*st+c.min).toFixed(6);c.set(s,v,api)}
      else if(c.type==="select"){const o=c.options.find(o=>String(o[0])===String(v));if(!o)return {error:"Options: "+c.options.map(o=>o[0]).join(", ")};c.set(s,o[0],api);shows=o[1]}
      else if(c.type==="toggle"){const want=v===true||v==="true"||v===1;if(!!c.get(s)!==want)c.set(s,want,api);shows=want?"on":"off"}
      else return {error:"Use press_button for that control."};
      api.redraw();shows=shows||(c.fmt?strip(c.fmt(s)):String(c.get(s)));
      line(`<span class="al-act">Set <b>${esc(label)}</b> to <b>${esc(shows)}</b></span>`);return {ok:true,control:label,value:shows,readouts:readouts()}}
    return {error:"Unknown tool."}}

  // ---------- when the AI is off: answers from the machine's own notes, no network
  function local(kind){const k=cur();
    if(kind==="exam")return `I can't read questions while my AI help is off, but here's how to crack one yourself:\n1. **Find the command word.** Identify or describe = Achieved. Explain how or why = Merit. Discuss, justify or compare with linked reasons = Excellence.\n2. **Split it into parts** and underline the numbers and units.\n3. **Find the machine** for the idea, set it up like the question, and watch what changes.\n4. **Write one sentence per idea**, then link them with "because" and "so".`;
    if(!k)return "Open a machine and I can explain each step, give hints on the challenges, and work through exam questions with you.";
    const {cfg,api}=k,st=api.step,s=api.state;
    if(kind==="hint"&&st.k==="test"){const todo=(cfg.challenges||[]).map((c,i)=>{let ok=false;try{ok=c.check(s)}catch(e){}return {c,i,ok}}).filter(x=>!x.ok);
      if(!todo.length)return "Every challenge checks out right now. Press Check on each one to bank them.";
      const x=todo[0];let no="";try{no=typeof x.c.no==="function"?x.c.no(s):x.c.no}catch(e){}return `Challenge ${x.i+1}: ${strip(x.c.q)}\n\n${strip(no)}`}
    const ex=strip(typeof st.exam==="function"?st.exam(s,st,api):st.exam);
    return [`**${strip(st.lab)}.** ${strip(st.cap)}`,st.big&&`**Big idea:** ${strip(st.big)}`,st.trap&&`**Watch out:** ${strip(st.trap)}`,ex&&`**In the exam:** ${ex}`].filter(Boolean).join("\n\n")}

  const note=kind=>(kind?"":"My AI help isn't switched on here, so here's what this machine's own notes say.\n\n")+local(kind||"explain");
  // ---------- the widget
  const css=`.alt{position:fixed;right:max(14px,env(safe-area-inset-right,0px));bottom:max(14px,env(safe-area-inset-bottom,0px));z-index:60;font:400 15px/1.5 "Instrument Sans",system-ui,sans-serif;color:#240B21}
  .alt-fab{all:unset;cursor:pointer;display:flex;align-items:center;gap:10px;padding:6px 18px 6px 6px;border-radius:999px;background:#240B21;color:#FFFDFB;box-shadow:0 16px 36px -16px rgba(36,11,33,.75);font-weight:600}
  .alt-fab:focus-visible{outline:2px solid #916A70;outline-offset:3px}.alt-fab .av{width:46px;height:46px;border-radius:50%;overflow:hidden;background:#CFEBDF;flex:none;display:grid;place-items:center}
  .alt-fab .av>*{width:100%;height:100%}.alt-fab .av img{object-fit:cover}.alt-fab small{display:block;font:500 11px "IBM Plex Mono",monospace;opacity:.7;font-weight:400}
  .alt-p{position:absolute;right:0;bottom:70px;width:min(420px,calc(100vw - 28px));height:min(640px,calc(100dvh - 110px));display:flex;flex-direction:column;border-radius:22px;background:#FFFDFB;border:1px solid rgba(36,11,33,.12);box-shadow:0 40px 80px -40px rgba(36,11,33,.6);overflow:hidden}
  .alt-p[hidden]{display:none}
  .alt-h{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid rgba(36,11,33,.08);background:#F5F1F2}
  .alt-h .av{width:40px;height:40px;border-radius:50%;overflow:hidden;background:#CFEBDF;flex:none}.alt-h .av>*{width:100%;height:100%}.alt-h b{display:block;font-size:16px}.alt-h>div{flex:1;min-width:0}.alt-h small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .alt-h small{font:500 11px "IBM Plex Mono",monospace;color:#654A4E}.alt-h .x{all:unset;cursor:pointer;white-space:nowrap;padding:8px 10px;border-radius:10px;font-size:13px;color:#654A4E}.alt-h .x:hover{background:#ece4e8}
  .alt-log{flex:1;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:10px}
  .alt-m{max-width:88%;padding:9px 13px;border-radius:16px;white-space:pre-wrap;word-wrap:break-word}.alt-m.me{align-self:flex-end;background:#240B21;color:#FFFDFB;border-bottom-right-radius:5px}
  .alt-m.al{align-self:flex-start;background:#F5F1F2;border-bottom-left-radius:5px}.alt-m.al b{font-weight:600}.alt-m img{max-width:100%;border-radius:10px;display:block;margin-top:6px}
  .alt-line{align-self:flex-start;font:500 12px "IBM Plex Mono",monospace;color:#654A4E}.al-act{display:inline-flex;gap:6px;align-items:center;padding:4px 10px;border-radius:999px;background:#E3F2EA;color:#1F5A47}.al-act:before{content:"↻"}
  .al-card{display:block;padding:10px 12px;border-radius:12px;border:1px solid #d8c9d2;background:#fff;color:#240B21;text-decoration:none;font:400 13px "Instrument Sans",sans-serif}.al-card b{display:block;font-size:14px}.al-card span{color:#654A4E}
  .alt-chips{display:flex;gap:6px;flex-wrap:wrap;padding:0 14px 8px}.alt-chips button{all:unset;cursor:pointer;padding:7px 11px;border-radius:999px;border:1px solid rgba(36,11,33,.16);font-size:13px;background:#fff}.alt-chips button:hover{background:#F5F1F2}
  .alt-exam{margin:0 14px 8px;padding:10px;border-radius:14px;background:#F5F1F2;display:grid;gap:8px}.alt-exam[hidden]{display:none}.alt-exam textarea{font:inherit;font-size:14px;min-height:96px;padding:9px;border-radius:10px;border:1px solid rgba(36,11,33,.2);resize:vertical;background:#fff;color:inherit}
  .alt-exam .row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.alt-exam .thumb{height:46px;border-radius:8px}.alt-exam small{font-size:12px;color:#654A4E}
  .alt-f{display:flex;gap:8px;padding:10px 14px;border-top:1px solid rgba(36,11,33,.08)}.alt-f textarea{flex:1;font:inherit;font-size:15px;padding:9px 12px;border-radius:14px;border:1px solid rgba(36,11,33,.2);resize:none;height:42px;max-height:120px;color:inherit;background:#fff}
  .alt-b{all:unset;cursor:pointer;padding:9px 14px;border-radius:12px;background:#240B21;color:#FFFDFB;font-weight:600;font-size:14px;text-align:center}.alt-b.q{background:transparent;color:#240B21;border:1px solid rgba(36,11,33,.2)}.alt-b[disabled]{opacity:.45;cursor:default}
  .alt-note{padding:0 14px 10px;font:500 11px/1.5 "IBM Plex Mono",monospace;color:#654A4E}
  .alt-priv{margin:0 14px 10px;padding:12px 14px;border-radius:14px;background:#F5F1F2;border:1px solid rgba(36,11,33,.1);display:grid;gap:8px;font-size:13.5px;line-height:1.45}
  .alt-priv[hidden]{display:none}.alt-priv b{font-weight:600}.alt-priv ul{margin:0;padding-left:18px;display:grid;gap:3px}.alt-priv a{color:inherit}
  .alt-priv .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.alt-priv small{font:500 11px/1.5 "IBM Plex Mono",monospace;color:#654A4E}
  .alt-help{margin:0 14px 10px;padding:10px 14px;border-radius:14px;background:#FFF4EC;border:1px solid #F3C9B0;font-size:13.5px;line-height:1.45}.alt-help[hidden]{display:none}.alt-help b{font-weight:600}
  .alt-typing{align-self:flex-start;color:#654A4E;font-size:13px}.alt-typing:after{content:"…";animation:altdots 1.2s steps(3) infinite}
  @keyframes altdots{0%{content:"."}50%{content:".."}100%{content:"..."}}
  @media (prefers-color-scheme:dark){.alt{color:#F5F1F2}.alt-fab{background:#F5F1F2;color:#240B21}.alt-p{background:#1d1420;border-color:rgba(245,241,242,.14)}.alt-h{background:#271a2a}.alt-h small,.alt-h .x,.alt-line,.alt-note,.alt-exam small{color:#cdb8c2}
    .alt-m.al{background:#2b1f2e}.alt-m.me{background:#F5F1F2;color:#240B21}.alt-chips button,.alt-f textarea,.alt-exam textarea{background:#140e16;border-color:rgba(245,241,242,.2);color:inherit}.alt-exam,.alt-priv{background:#271a2a;border-color:rgba(245,241,242,.14)}.alt-priv small{color:#cdb8c2}.alt-help{background:#3a2418;border-color:#7a4a2e}.alt-b{background:#F5F1F2;color:#240B21}.alt-b.q{background:transparent;color:#F5F1F2;border-color:rgba(245,241,242,.3)}.al-card{background:#140e16;color:#F5F1F2;border-color:#4a3a48}.al-card span{color:#cdb8c2}.al-act{background:#1f3a31;color:#bfe8d6}}
  @media (max-width:600px){.alt-fab{padding:5px}.alt-fab .lbl{position:absolute;left:-9999px}.alt-p{position:fixed;left:8px;right:8px;bottom:76px;width:auto;height:calc(100dvh - 96px)}}
  @media (prefers-reduced-motion:reduce){.alt-typing:after{animation:none}}`;
  const style=document.createElement("style");style.textContent=css;document.head.appendChild(style);
  const avatar=()=>`<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#240B21" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5.5h16v10H9.5L5 19.5v-4H4z"/><path d="M9 9.5h6M9 12.5h4"/></svg>`;
  const w=document.createElement("div");w.className="alt";
  w.innerHTML=`<div class="alt-p" role="dialog" aria-label="Study help" hidden>
    <div class="alt-h"><span class="av" aria-hidden="true"></span><div><b class="nm"></b><small class="sub"></small></div><button class="x" type="button" data-new>New chat</button><button class="x" type="button" data-close aria-label="Close">✕</button></div>
    <div class="alt-log" aria-live="polite"></div>
    <div class="alt-priv" role="region" aria-label="Before you start" hidden>
      <b>Before you start</b>
      <ul><li>You're talking to an AI, not a person. It gives hints and guidance, not answers or marking.</li>
        <li>What you type here is sent to <b>Anthropic PBC</b> (United States) to write the reply. assembl doesn't ask for or keep your name, email, school or location, and no account is required. We count anonymous machine views and interactions to improve the tools. See <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noopener">Anthropic's privacy policy</a> for what they do with messages.</li>
        <li>Don't type personal details about you or anyone else. Just the study question.</li>
        <li>If you're not okay, talk to a person: free call or text <b>1737</b>, any time. Questions about this page: <a href="mailto:hello@assembl.co.nz">hello@assembl.co.nz</a>.</li></ul>
      <div class="row"><button class="alt-b" type="button" data-priv-ok>Okay, let's study</button><small>Shown once on this device.</small></div>
    </div>
    <div class="alt-help" hidden><b>If things are heavy right now, talk to a person.</b> Need to Talk? free call or text <b>1737</b>, any time. Youthline: 0800 376 633 or text 234. In an emergency call <b>111</b>.</div>
    <div class="alt-chips"></div>
    <div class="alt-exam" hidden><label for="alt-eq"><b>Paste a past exam question</b></label><textarea id="alt-eq" placeholder="Paste the whole question, with its parts (a), (b), (c)… You can also paste a screenshot or add a photo."></textarea>
      <div class="row"><button class="alt-b q" type="button" data-photo>Add a photo</button><input type="file" accept="image/*" hidden><img class="thumb" alt="" hidden><button class="alt-b" type="button" data-start>Work through it</button><button class="alt-b q" type="button" data-cancel>Cancel</button></div>
      <small>Past papers and marking schedules are on the NZQA site. Paste the question only, not your name or details.</small></div>
    <form class="alt-f"><label for="alt-q" style="position:absolute;left:-9999px">Message</label><textarea id="alt-q" rows="1" placeholder="Ask anything about this…" maxlength="2000"></textarea><button class="alt-b" type="submit">Send</button></form>
    <p class="alt-note">An AI, not a person. Hints and guidance, not answers or marking; it can be wrong. Don't share personal details. <span class="left"></span></p></div>
    <button class="alt-fab" type="button" aria-expanded="false"><span class="av" aria-hidden="true"></span><span class="lbl">Ask <span class="nm2"></span><small>Study help</small></span></button>`;
  document.body.appendChild(w);
  const P=w.querySelector(".alt-p"),log=w.querySelector(".alt-log"),fab=w.querySelector(".alt-fab"),form=w.querySelector(".alt-f"),q=w.querySelector("#alt-q"),chips=w.querySelector(".alt-chips"),exam=w.querySelector(".alt-exam"),eq=w.querySelector("#alt-eq"),file=exam.querySelector("input[type=file]"),thumb=exam.querySelector(".thumb");
  const priv=w.querySelector(".alt-priv"),help=w.querySelector(".alt-help");
  const PRIVKEY="allen-notice-v1";let agreed=false;try{agreed=localStorage.getItem(PRIVKEY)==="ok"}catch(e){}
  // the notice shows until it is accepted once on this device; sending is held until then
  function gate(){priv.hidden=agreed;form.hidden=!agreed;chips.hidden=!agreed;return agreed}
  priv.querySelector("[data-priv-ok]").onclick=()=>{agreed=true;try{localStorage.setItem(PRIVKEY,"ok")}catch(e){}gate();q.focus()};
  // a distress word anywhere in a student message shows the human-help line on the page as well as in Allen's reply
  const HEAVY=/\b(suicid\w*|kill (?:myself|me)|end (?:it|my life)|self[- ]?harm|hurt myself|want to die|don'?t want to (?:be here|live)|cutting myself|overdose)\b/i;
  const lookAfter=t=>{if(HEAVY.test(String(t||"")))help.hidden=false};
  let photo=null;
  function paint(){const n=name();w.querySelectorAll(".av").forEach(a=>a.innerHTML=avatar());w.querySelector(".nm").textContent="Study help";w.querySelector(".nm2").textContent="for help";
    w.querySelector(".sub").textContent=cur()?`Study help · can work ${the(cur().cfg.title)}`:"Study help · pick a machine, plan, practise";
    w.querySelector(".left").textContent=offline?"AI help is off here, so answers come from the machine's notes.":left!==null?`${left} messages left today.`:"";gate();
    const k=cur(),test=k&&k.api.step.k==="test";
    const list=k?[["explain","Explain this step"],[test?"hint":"show",test?"Hint for a challenge":"Show me on the machine"],["exam","Work through an exam question"]]:[["which","Which machine fits my exam?"],["exam","Work through an exam question"],["plan","Plan my revision week"]];
    chips.innerHTML=list.map(([k,l])=>`<button type="button" data-chip="${k}">${l}</button>`).join("");fab.setAttribute("aria-label","Open the study helper")}
  const md=t=>esc(t).replace(/\*\*(.+?)\*\*/g,"<b>$1</b>");
  function bubble(role,html){const d=document.createElement("div");d.className="alt-m "+(role==="user"?"me":"al");d.innerHTML=html;log.appendChild(d);log.scrollTop=log.scrollHeight;return d}
  function line(html){const d=document.createElement("div");d.className="alt-line";d.innerHTML=html;log.appendChild(d);log.scrollTop=log.scrollHeight}
  function replay(){log.innerHTML="";if(!msgs.length){bubble("assistant",md(cur()?`Kia ora, I'm an AI study helper. I can see ${the(cur().cfg.title)}. Tell me what you think first and I'll give you a hint, or paste an exam question and we'll work through it. I can move the controls to show you.`:`Kia ora, I'm an AI study helper. Tell me what you're studying, or paste an exam question, and I'll find the right machine and give you hints as you go.`));return}
    for(const m of msgs)for(const b of m.content){if(b.type==="text"&&!(m.role==="user"&&b.hidden))bubble(m.role,md(b.text));if(b.type==="image")bubble("user","<i>Photo of a question</i>")}}
  const save=()=>{try{sessionStorage.setItem(KEY,JSON.stringify(msgs.map(m=>({...m,content:m.content.map(b=>b.type==="image"?{type:"text",text:"[The student attached a photo of the question earlier.]",hidden:true}:b)}))))}catch(e){}};
  const wire=()=>msgs.map(m=>({role:m.role,content:m.content.map(({hidden,...b})=>b)}));
  function open(mode){P.hidden=false;fab.setAttribute("aria-expanded","true");paint();if(!log.children.length)replay();
    if(!gate()){exam.hidden=true;priv.querySelector("[data-priv-ok]").focus();return}exam.hidden=mode!=="exam";(mode==="exam"?eq:q).focus()}
  function close(){P.hidden=true;fab.setAttribute("aria-expanded","false");fab.focus()}
  fab.onclick=()=>P.hidden?open():close();w.querySelector("[data-close]").onclick=close;
  w.querySelector("[data-new]").onclick=()=>{msgs=[];save();replay()};
  addEventListener("keydown",e=>{if(e.key==="Escape"&&!P.hidden)close()});
  // anything on the page can open Allen: the corner dog, the past-papers card, a failed challenge
  document.addEventListener("click",e=>{const b=e.target.closest("[data-allen]");if(!b||w.contains(b))return;e.preventDefault();const m=b.dataset.allen;open(m==="exam"?"exam":"");if(m==="hint"||m==="explain")ask(null,m)});
  addEventListener("allen:open",e=>open(e.detail&&e.detail.mode));
  addEventListener("allen:ask",e=>{const d=e.detail||{};if(!d.text)return;open();ask(d.text,"exam",null,d.display||d.text)});

  async function send(mark){
    busy=true;form.querySelector("button").disabled=true;const typing=document.createElement("div");typing.className="alt-typing";typing.textContent="Thinking";log.appendChild(typing);log.scrollTop=log.scrollHeight;
    try{for(let round=0;round<5;round++){
      const r=await fetch("/api/tutor/",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({messages:wire(),context:context()})});
      const j=await r.json().catch(()=>({}));
      if(r.headers.get("x-tutor-left")){left=r.headers.get("x-tutor-left");try{localStorage.setItem(CAPKEY,left)}catch(e){}}
      if(!r.ok){return fail(j.error,mark)}
      const content=(j.content||[]).filter(b=>b.type==="text"||b.type==="tool_use");msgs.push({role:"assistant",content});
      content.filter(b=>b.type==="text"&&b.text.trim()).forEach(b=>bubble("assistant",md(b.text)));
      const uses=content.filter(b=>b.type==="tool_use");if(!uses.length||j.stop_reason!=="tool_use")break;
      msgs.push({role:"user",content:uses.map(u=>{let out;try{out=act(u)}catch(e){out={error:"That didn't work on this machine."}}return {type:"tool_result",tool_use_id:u.id,content:JSON.stringify(out),...(out.error?{is_error:true}:{})}})});
    }
      // stopped mid-way through using the machine: close the turn so the conversation stays well-formed
      if(msgs.length&&msgs[msgs.length-1].role==="user"&&msgs[msgs.length-1].content.every(b=>b.type==="tool_result")){const t="That's as far as I'll go in one turn. Ask me to keep going.";msgs.push({role:"assistant",content:[{type:"text",text:t}]});bubble("assistant",md(t))}
    }catch(e){fail("network",mark)}
    finally{typing.remove();busy=false;form.querySelector("button").disabled=false;save();paint()}}
  // A turn that fails is rolled back whole (student message, any half-finished tool use), so the history stays valid.
  function fail(err,mark){msgs.length=Math.min(msgs.length,mark);
    if(err==="not_configured"){offline=true;return}
    bubble("assistant",md(err==="visitor_cap"?"That's all my help for today. Come back tomorrow, or use the Big idea and Exam line cards on the machine.":err==="daily_cap"?"I've helped a lot of students today and hit my limit. Try again tomorrow.":err==="session_cap"?"That's a long session. Take a break, stretch, drink some water, then start a **New chat** when you're ready. Your notes on the machine are still there.":"I couldn't think that one through just now. Try again in a moment."))}
  async function ask(text,kind,image,display){
    if(busy||!gate())return;lookAfter(text);const prompts={explain:"Explain this step to me, simply, using the machine.",hint:"I'm stuck on a challenge. Give me a hint, not the answer.",show:"Show me the key idea of this step on the machine.",which:"Which machine should I use for my exam, and why?",plan:"Help me plan a week of revision with these machines."};
    const said=text||prompts[kind];if(!said&&!image)return;
    if(offline&&!image){bubble("user",md(said));bubble("assistant",md(note(kind)));return}
    const content=[];if(image)content.push(image);content.push({type:"text",text:said});
    try{SK()&&SK().count&&SK().count("hint")}catch(e){}
    const mark=msgs.length;msgs.push({role:"user",content});bubble("user",md(display||said));if(image)bubble("user",`<img src="data:${image.source.media_type};base64,${image.source.data}" alt="Your photo of the question">`);
    await send(mark);if(offline&&msgs.length===mark){bubble("assistant",md(note(kind)))}}
  form.onsubmit=e=>{e.preventDefault();const t=q.value.trim();if(t.length<2)return;q.value="";q.style.height="";ask(t)};
  q.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();form.requestSubmit()}});
  q.addEventListener("input",()=>{q.style.height="";q.style.height=Math.min(120,q.scrollHeight)+"px"});
  chips.onclick=e=>{const b=e.target.closest("[data-chip]");if(!b)return;const k=b.dataset.chip;if(k==="exam"){exam.hidden=false;eq.focus();return}ask(null,k)};
  // photos: shrink in the browser to at most 1600 px, so a phone picture becomes a small JPEG
  async function takePhoto(blob){if(!blob||!/^image\//.test(blob.type))return;const img=await createImageBitmap(blob).catch(()=>null);if(!img)return;
    const k=Math.min(1,1600/Math.max(img.width,img.height)),c=document.createElement("canvas");c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);c.getContext("2d").drawImage(img,0,0,c.width,c.height);
    const url=c.toDataURL("image/jpeg",.82);photo={type:"image",source:{type:"base64",media_type:"image/jpeg",data:url.split(",")[1]}};thumb.src=url;thumb.hidden=false}
  exam.querySelector("[data-photo]").onclick=()=>file.click();file.onchange=()=>takePhoto(file.files[0]);
  eq.addEventListener("paste",e=>{const it=[...(e.clipboardData&&e.clipboardData.items||[])].find(i=>i.type.startsWith("image/"));if(it){e.preventDefault();takePhoto(it.getAsFile())}});
  exam.querySelector("[data-cancel]").onclick=()=>{exam.hidden=true;photo=null;thumb.hidden=true;q.focus()};
  exam.querySelector("[data-start]").onclick=()=>{if(!gate())return;const t=eq.value.trim();if(!t&&!photo)return eq.focus();
    const text=`Here is a past exam question. Work through it with me step by step, using this machine where it helps. Let me try each part before you give the answer.\n\n---\n${t||"(The question is in the photo.)"}`;
    exam.hidden=true;eq.value="";const img=photo;photo=null;thumb.hidden=true;
    if(offline){bubble("user",md("Here's an exam question to work through:\n\n"+(t||"(photo)")));bubble("assistant",md(local("exam")));return}
    ask(text,"exam",img,"Here's an exam question to work through:\n\n"+(t||"(in the photo)"))};
  paint();addEventListener("studykit:mounted",paint);
})();
