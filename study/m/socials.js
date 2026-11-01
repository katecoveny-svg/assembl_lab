(()=>{
// The social studies exam machine: a Blender-built exam desk for the Year 9 end-of-year paper.
// Section A skills (graphs, reading cartoons, photographs and infographics, note-taking, values continuums) and
// Section B (Government and Innovation: definitions, recall, and two paragraphs on an innovative idea).
// Every drawing here is also painted onto the desk's board in 3D (socials-scene.js), and Allen can work every control.
const fmt=(x,d=0)=>Number(x).toLocaleString("en-NZ",{maximumFractionDigits:d,minimumFractionDigits:d});
const esc=t=>String(t??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
const FONT="'Instrument Sans',Helvetica,Arial,sans-serif",MONO="'IBM Plex Mono',Menlo,monospace";
const C={paper:"#FBF7F1",card:"#FFFDFB",ink:"#240B21",muted:"#654A4E",rose:"#916A70",line:"#E4D9DE",coral:"#E8606A",lilac:"#8E6FD1",lilacL:"#C9B6EA",mint:"#3F9C86",mintL:"#A9D8C4",sky:"#4B6CC8",skyL:"#BFDDF5",peach:"#F6C7A8",peachD:"#C8704A",butter:"#F2DC8A",blush:"#F3B8C8",navy:"#2E3A7A"};
const T=(x,y,t,o={})=>`<text x="${x}" y="${y}" font-family="${o.mono?MONO:FONT}" font-size="${o.s||14}" font-weight="${o.w||400}" fill="${o.c||C.ink}" text-anchor="${o.a||"start"}"${o.rot?` transform="rotate(${o.rot} ${x} ${y})"`:""}>${esc(t)}</text>`;
const R=(x,y,w,h,f,o={})=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.r??8}" fill="${f}"${o.s?` stroke="${o.s}" stroke-width="${o.sw||1.5}"`:""}${o.d?` stroke-dasharray="${o.d}"`:""}/>`;
const wrap=(x,y,text,width,o={})=>{const per=Math.floor(width/((o.s||14)*.5));const words=String(text).split(/\s+/);const lines=[];let l="";for(const w of words){if((l+" "+w).trim().length>per){lines.push(l.trim());l=w}else l+=" "+w}if(l.trim())lines.push(l.trim());return lines.map((ln,i)=>T(x,y+i*(o.lh||(o.s||14)*1.35),ln,o)).join("")};
const RM=matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- Section A: graphs. All three data sets are invented for practice and say so.
const DATA={
 travel:{title:"How Year 9 students travel to school",unit:"Percentage of students (%)",note:"Practice data: an invented survey of 50 students.",fit:"pbar",cats:["Car","Bus","Walk","Bike","Scooter"],series:[{name:"Students",v:[42,24,18,10,6]}]},
 turnout:{title:"School council election turnout by year level",unit:"Students who voted (%)",note:"Practice data: an invented school.",fit:"mbar",cats:["Year 9","Year 10","Year 11","Year 12","Year 13"],series:[{name:"2025",v:[62,58,49,55,44]},{name:"2026",v:[71,66,60,58,52]}]},
 trips:{title:"Weekly e-scooter and bike-share trips in a town",unit:"Trips per week",note:"Practice data: an invented town.",fit:"dline",cats:["Week 1","Week 2","Week 3","Week 4","Week 5","Week 6"],series:[{name:"E-scooter",v:[120,180,260,310,420,500]},{name:"Bike-share",v:[200,210,230,240,260,270]}]}};
const GTYPES=[["pbar","Percentage bar graph"],["mbar","Multiple bar graph"],["dline","Double line graph"]];
const SERIES_COL=[C.coral,C.lilac,C.mint,C.sky,C.butter],SEG_COL=[C.coral,C.lilac,C.mint,C.sky,"#E7A64A",C.rose];
const FIT_WHY={pbar:"parts of one whole that add up to 100%",mbar:"two sets of values for the same categories",dline:"two things changing over time"};
function graphMarks(){const d=DATA[s.data],two=d.series.length>1||s.gtype==="pbar";
  const need=[["Title",s.gTitle],["Axes labelled with units",s.gAxes],["Even scale from 0",s.gEven]];if(two)need.push(["Key",s.gKey]);
  const fit=s.gtype===d.fit;return {need,got:need.filter(x=>x[1]).length+(fit?1:0),of:need.length+1,fit}}

// ---------- Section A: sources. Drawn here, not photographed; the clues are the exam's interpretation skills.
const SOURCES={
 cartoon:{name:"Cartoon",title:"“Election season… again”",clues:[
  {k:"exaggeration",x:330,y:150,n:"Exaggeration",tell:"The scroll of promises is drawn far too long. Cartoonists exaggerate to make a point: here, that politicians promise a lot."},
  {k:"label",x:330,y:96,n:"Label",tell:"The word PROMISES tells you what the scroll stands for. Labels remove any doubt about a symbol."},
  {k:"symbol",x:610,y:300,n:"Symbol",tell:"The ballot box stands for voting. Voters hold the real power at the next election."},
  {k:"calendar",x:690,y:150,n:"Detail",tell:"The calendar says 3 YEARS: New Zealand holds a general election at least every three years."},
  {k:"caption",x:400,y:398,n:"Caption",tell:"The caption sets the tone: “again” suggests the cartoonist thinks promises come round every election."}],
  message:"Voters can hold politicians to account for their promises, because there is an election at least every three years."},
 photo:{name:"Photograph",title:"Students outside Parliament",clues:[
  {k:"setting",x:640,y:120,n:"Setting",tell:"The Beehive tells you where this is: Parliament grounds in Wellington, where decisions about laws are made."},
  {k:"who",x:300,y:300,n:"Who",tell:"Young people, many in school uniform. They are too young to vote, so this is how they take part."},
  {k:"signs",x:200,y:190,n:"Signs",tell:"The signs give their message: they want young people's voices to count."},
  {k:"action",x:470,y:230,n:"Action",tell:"A peaceful gathering with a speaker: a legal way to try to influence decision-makers."},
  {k:"purpose",x:400,y:398,n:"Purpose",tell:"Ask why the photo was taken and who it was taken for. A news photo records an event; a campaign photo tries to persuade."}],
  message:"Citizens, including young people, can take part in democracy by gathering peacefully to influence decision-makers."},
 info:{name:"Infographic",title:"How a bill becomes law in Aotearoa",clues:[
  {k:"title",x:400,y:40,n:"Title",tell:"Start with the title: it tells you the topic and the question the infographic answers."},
  {k:"sequence",x:400,y:150,n:"Sequence",tell:"Arrows and numbers show order. A bill goes through stages in the House of Representatives in this order."},
  {k:"public",x:210,y:150,n:"Your part",tell:"At the select committee stage, the public can make a submission (have a say) on the bill."},
  {k:"icons",x:560,y:150,n:"Icons",tell:"Icons stand for ideas quickly: the speech bubble is debate, the tick is a vote, the pen is signing."},
  {k:"end",x:690,y:300,n:"End point",tell:"Royal assent: the Governor-General signs the bill and it becomes an Act, a law."}],
  message:"A bill passes three readings, a select committee and a committee of the whole House, then Royal assent turns it into law."}};
const STAGES=[["1","First reading","The bill is introduced and debated"],["2","Select committee","MPs study it; the public make submissions"],["3","Second reading","Debate on the main ideas; a vote"],["4","Committee of the whole House","Debated in detail, part by part"],["5","Third reading","Final debate and vote"],["6","Royal assent","The Governor-General signs: it becomes an Act"]];

// ---------- Section A: a values continuum on a real debate, with invented people.
const ISSUE="Should New Zealand lower the voting age for general elections from 18 to 16?";
const PEOPLE=[
 {id:"aroha",n:"Aroha, 16, student",st:1.7,v:"Fairness",because:"decisions made now, like on climate, will affect young people the longest"},
 {id:"patel",n:"Mr Patel, teacher",st:.9,v:"Participation",because:"voting while still at school could build a lifelong habit"},
 {id:"grace",n:"Grace, parent",st:0,v:"Responsibility",because:"some 16-year-olds are ready to vote and some aren't"},
 {id:"mele",n:"Mele, 17, student",st:-.8,v:"Being informed",because:"she'd rather learn more about how government works first"},
 {id:"tom",n:"Tom, retired",st:-1.6,v:"Tradition",because:"18 is when the law treats you as an adult for most things"}];
const where=v=>v<-1.2?"strongly disagree":v<-.3?"disagree":v<=.3?"unsure":v<=1.2?"agree":"strongly agree";

// ---------- Section B: Government. Short, checkable statements about how New Zealand is governed.
const FEATURES={
 leg:{n:"Legislature: Parliament",tag:"Makes the law",text:"Parliament is the Sovereign and the House of Representatives. Its MPs debate and pass laws, approve government spending, and question the government to hold it to account.",col:C.skyL},
 exe:{n:"Executive: the government",tag:"Puts the law into action",text:"The Prime Minister, Cabinet and other ministers, with the public service. They make decisions, propose most new laws and run government departments. Their offices are in the Beehive.",col:C.peach},
 jud:{n:"Judiciary: the courts",tag:"Interprets the law",text:"Independent judges in the courts decide cases and say what the law means. Keeping them separate from Parliament and the government is the separation of powers.",col:C.lilacL},
 hos:{n:"Head of state",tag:"A constitutional monarchy",text:"New Zealand's head of state is the King, represented here by the Governor-General, who gives Royal assent to bills. The elected government makes the real decisions.",col:C.butter},
 vote:{n:"Elections and MMP",tag:"Power comes from voters",text:"A general election is held at least every three years. Under MMP (since 1996) each voter has a party vote and an electorate vote. Citizens and permanent residents aged 18 and over can vote.",col:C.mintL},
 tiriti:{n:"Te Tiriti o Waitangi",tag:"A founding document",text:"Signed in 1840 by the British Crown and many Māori rangatira. It is a founding document of New Zealand, and its principles are referred to in many laws and in government decisions.",col:C.blush},
 rights:{n:"Rights and responsibilities",tag:"The rule of law",text:"Everyone, including the government, must follow the law. The New Zealand Bill of Rights Act 1990 protects rights such as free speech and voting. Citizens have responsibilities too, like obeying the law and jury service.",col:"#E6E0EE"}};

// ---------- Section B: Innovation. Three New Zealand examples, kept to well-documented facts.
const IDEAS={
 jet:{n:"The jet boat",who:"Bill Hamilton, a farmer and engineer from the Mackenzie Country in Canterbury",when:"in the 1950s",
  what:"a boat pushed along by a powerful jet of water squirted out of the back, instead of a propeller",
  why:"to travel up New Zealand's fast, shallow, braided rivers, where propellers hit the riverbed and broke",
  value:"his company, now HamiltonJet in Christchurch, sells waterjets around the world, and jet-boat rides became a major part of tourism",
  costs:"engineering and building costs, fuel, and the risk of a new idea not working",
  strengths:["works in very shallow water","is fast and easy to steer","created jobs, exports and a tourism industry"],
  weaknesses:["uses a lot of fuel and is noisy","can disturb wildlife and other river users","can cause serious accidents, so it needs safety rules"]},
 fence:{n:"The electric fence",who:"Bill Gallagher Senior, in the Waikato",when:"in the 1930s",
  what:"a fence that gives animals a short, safe electric shock so they learn to stay away from the wire",
  why:"the company's origin story says he built one to stop his horse rubbing against his car; farmers needed cheaper ways to control stock",
  value:"the Gallagher company in Hamilton grew into a global business selling farm and security systems, and electric fencing helped farms manage pasture",
  costs:"energisers, wire and posts, plus power, but far less than building solid fences everywhere",
  strengths:["is much cheaper than solid fencing","is easy to move when rotating paddocks","built a big exporting company"],
  weaknesses:["needs power and regular checking","can harm animals or people if badly installed","works less well for some animals"]},
 bungy:{n:"Commercial bungy jumping",who:"A J Hackett and Henry van Asch",when:"in 1988",
  what:"jumping from a high bridge attached to a stretchy cord, sold as an adventure experience",
  why:"to turn an extreme stunt, inspired by land diving on Pentecost Island in Vanuatu, into a safe, paid tourist activity",
  value:"it helped make Queenstown famous for adventure tourism, bringing visitors, jobs and spending",
  costs:"specialist equipment, safety testing, staff training and the risk of injury claims",
  strengths:["created a new tourism industry","is low-risk because of strong safety systems","put New Zealand's adventure brand on the map"],
  weaknesses:["seems risky or unnecessary to some people","depends on tourists, so it suffers when travel drops","borrowed a cultural idea, so giving credit matters"]}};
const LENSES=[["what","Describe it"],["why","Why it was created"],["value","Costs, benefits, economic value"],["eval","Strengths and weaknesses"]];

// ---------- Section B: definitions. Plain, accurate wording a Year 9 can learn.
const WORDS={
 gov:[["Democracy","A system where the people hold power, usually by electing representatives to make decisions for them."],["Government","The Prime Minister, Cabinet and ministers who run the country and make decisions."],["Parliament","The Sovereign and the House of Representatives: the body that makes laws."],["Bill","A proposed law being debated in Parliament."],["Act","A bill that has passed all its stages and received Royal assent. It is now law."],["Cabinet","The Prime Minister and senior ministers, who make the government's main decisions."],["MMP","Mixed Member Proportional: the voting system with a party vote and an electorate vote."],["Electorate","An area of the country that elects one MP."],["Referendum","A vote by the public on a single question."],["Separation of powers","Keeping the legislature, executive and judiciary separate so no one group has all the power."],["Citizen","A member of a country with rights, like voting, and responsibilities, like obeying the law."]],
 inno:[["Innovation","A new or improved idea, product, service or way of doing things that adds value."],["Invention","Something made for the very first time."],["Entrepreneur","A person who starts a business and takes risks to make an idea succeed."],["Prototype","An early model built to test an idea before making it properly."],["Patent","A legal right that stops others copying an invention for a set time (in New Zealand, up to 20 years)."],["Intellectual property","Creations of the mind, like inventions, designs and brands, that the law can protect."],["Consumer","A person who buys or uses goods and services."],["Producer","A person or business that makes goods or provides services."],["Economic value","The benefit of something measured in money: sales, jobs, exports and savings."],["Sustainability","Meeting today's needs without harming people or the environment in the future."]]};

// ---------- the two paragraphs, built part by part (the exam's three bullet points)
const PARTS=[["Description","What the idea is"],["Creator","Who created it, and when"],["Reason and purpose","Why it was created, what it is for"],["Costs, benefits, value","What it costs, who benefits, its economic value"],["Strengths","What works well"],["Weaknesses and judgement","What doesn't, and your overall view"]];
function sentence(i,I){return [
  `${I.n} is ${I.what}.`,
  `It was created by ${I.who} ${I.when}.`,
  `It was created ${I.why}.`,
  `Its main costs were ${I.costs}. However, ${I.value}.`,
  `One strength is that it ${I.strengths[0]}, and it also ${I.strengths[2]}.`,
  `However, a weakness is that it ${I.weaknesses[0]}, and it ${I.weaknesses[1]}. Overall, I think its strengths outweigh its weaknesses, because its benefits reach far more people than its problems.`][i]}
const STARTERS=["___ is a … that …","It was created by … in …","It was created because …","It cost … but it benefits … and has economic value because …","One strength is … Another is …","However, a weakness is … Overall, I think … because …"];

// ---------- the practice question bank: written for this machine in the style of the exam, never real exam questions.
const QB_KEY="socials-questions-v1";
const NOTES_PASSAGE="In the 1950s, Bill Hamilton, a farmer and engineer from the Mackenzie Country, wanted a boat that could travel up New Zealand's fast, shallow, braided rivers. Ordinary propellers hit the riverbed and broke. Hamilton's boats pushed a powerful jet of water out of the back instead, so they needed very little water underneath them. His company, now called HamiltonJet and based in Christchurch, went on to sell waterjets around the world, and jet boating became a big part of tourism in places like Queenstown.";
const QUESTIONS=[
 {sec:"A",step:"graph",q:"Use the travel-to-school data (Car 42%, Bus 24%, Walk 18%, Bike 10%, Scooter 6%) to draw a percentage bar graph. Include a title, a key and a labelled axis."},
 {sec:"A",step:"graph",q:"Draw a multiple bar graph comparing school council election turnout in 2025 and 2026 for each year level. Describe one trend you can see."},
 {sec:"A",step:"graph",q:"Draw a double line graph of weekly e-scooter and bike-share trips. Which grew faster? Use figures from the graph in your answer."},
 {sec:"A",step:"source",q:"Study the cartoon “Election season… again”. Identify two techniques the cartoonist uses and explain the cartoon's message about elections."},
 {sec:"A",step:"source",q:"Look at the photograph of students outside Parliament. Who is taking part, what are they doing, and why might they be doing it?"},
 {sec:"A",step:"source",q:"Use the infographic to explain the stages a bill goes through before it becomes a law."},
 {sec:"A",step:"inno",q:"Read this passage and take notes, then summarise it in one paragraph of no more than 80 words: "+NOTES_PASSAGE},
 {sec:"A",step:"continuum",q:ISSUE+" Place yourself on a values continuum and explain your position using one value. Then explain the view of someone who disagrees with you."},
 {sec:"B",step:"words",q:"Define these terms: democracy, Parliament, Cabinet, innovation, entrepreneur, patent."},
 {sec:"B",step:"gov",q:"Describe the three branches of government in New Zealand and what each one does."},
 {sec:"B",step:"gov",q:"Explain how often New Zealand holds general elections and how MMP gives each voter two votes."},
 {sec:"B",step:"para",q:"Write two paragraphs on an innovative idea. Describe it and who created it; explain why it was created, its purpose, costs, benefits and economic value; then evaluate its strengths and weaknesses."}];
function loadAdded(){try{const a=JSON.parse(localStorage.getItem(QB_KEY)||"[]");return Array.isArray(a)?a.filter(x=>x&&typeof x.q==="string").slice(0,30):[]}catch(e){return []}}
let ADDED=loadAdded();

// ---------- state
const s={view:"plan",playing:false,t:0,
 minsA:55,
 gtype:"pbar",data:"travel",gTitle:true,gAxes:false,gEven:true,gKey:false,
 src:"cartoon",clue:0,
 you:0,sel:"grace",
 feature:"leg",
 idea:"jet",lens:"what",str:1,weak:1,
 topic:"gov",card:0,flipped:false,known:0,
 build:2};
let API=null;const kick=()=>API&&API.redraw();
const viewNow=()=>{const st=API&&API.step;return st&&st.k!=="test"?st.k:s.view};

// ---------- drawings (800 × 420). The same markup is painted onto the board in 3D.
const frame=(title,sub)=>R(0,0,800,420,C.paper,{r:0})+T(28,40,title,{s:20,w:600})+(sub?T(28,62,sub,{s:12,c:C.muted,mono:true}):"");
function drawPlan(){const A=s.minsA,B=110-A,cx=230,cy=235,r=135;
  const arc=(a0,a1,col)=>{const p=a=>[cx+r*Math.sin(a/120*2*Math.PI),cy-r*Math.cos(a/120*2*Math.PI)];const [x0,y0]=p(a0),[x1,y1]=p(a1);return `<path d="M${cx},${cy} L${x0},${y0} A${r},${r} 0 ${a1-a0>60?1:0} 1 ${x1},${y1} Z" fill="${col}"/>`};
  return frame("Plan the two hours","Students complete 2 sections in a 2-hour exam")+arc(0,5,C.butter)+arc(5,5+A,C.skyL)+arc(5+A,115,C.peach)+arc(115,120,C.mintL)+`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${C.ink}" stroke-width="2"/>`+
  [0,15,30,45,60,75,90,105].map(m=>{const a=m/120*2*Math.PI;return `<line x1="${cx+(r-8)*Math.sin(a)}" y1="${cy-(r-8)*Math.cos(a)}" x2="${cx+r*Math.sin(a)}" y2="${cy-r*Math.cos(a)}" stroke="${C.ink}" stroke-width="2"/>`}).join("")+
  T(cx,cy-6,"120",{s:30,w:600,a:"middle"})+T(cx,cy+16,"minutes",{s:13,c:C.muted,a:"middle"})+
  [[C.butter,"Read the paper",5],[C.skyL,"Section A: Skills",A],[C.peach,"Section B: Knowledge and paragraphs",B],[C.mintL,"Check your answers",5]].map(([c,l,m],i)=>R(420,110+i*42,22,22,c,{r:6})+T(452,127+i*42,`${l}`,{s:15,w:500})+T(770,127+i*42,`${m} min`,{s:15,w:600,a:"end",mono:true})).join("")+
  T(420,300,"In the clear plastic bag:",{s:14,w:600})+["Ruler","Pencil","Blue or black pen","Coloured pencils","Rubber"].map((x,i)=>T(420+(i%3)*125,325+Math.floor(i/3)*22,"✓ "+x,{s:13,c:C.muted})).join("")+
  T(420,385,B<45?"Tip: Section B has two paragraphs. Leave it at least 45 minutes.":A<40?"Tip: graphs take time to draw neatly. Give Section A at least 40 minutes.":"A good balance. Stick to it on the day.",{s:13,w:600,c:B<45||A<40?C.coral:C.mint})}
function drawGraph(){const d=DATA[s.data],m=graphMarks();let g=frame(s.gTitle?d.title:"",s.gTitle?d.note:"No title yet");
  const X0=110,Y0=340,W=520,H=230,max=s.gtype==="pbar"?100:Math.ceil(Math.max(...d.series.flatMap(x=>x.v))*1.1/50)*50;
  const ticks=s.gEven?[0,.25,.5,.75,1].map(f=>Math.round(f*max)):[0,.1,.35,.5,1].map(f=>Math.round(f*max));
  const y=v=>Y0-v/max*H,uneven=v=>{if(s.gEven)return y(v);const f=v/max,k=[0,.1,.35,.5,1],p=[0,.25,.5,.75,1];for(let i=1;i<k.length;i++)if(f<=k[i])return Y0-(p[i-1]+(f-k[i-1])/(k[i]-k[i-1])*(p[i]-p[i-1]))*H;return Y0-H};
  const Y=s.gEven?y:uneven;
  if(s.gtype==="pbar"){const tot=d.series[0].v.reduce((a,b)=>a+b,0);let acc=0;const bw=120,bx=X0+170;
    g+=`<line x1="${X0}" y1="${Y0}" x2="${X0}" y2="${Y0-H}" stroke="${C.ink}" stroke-width="2"/>`+ticks.map(t=>`<line x1="${X0-6}" y1="${Y(t)}" x2="${X0}" y2="${Y(t)}" stroke="${C.ink}"/>`+T(X0-10,Y(t)+4,t,{s:12,a:"end",mono:true})).join("");
    d.series[0].v.forEach((v,i)=>{const pv=v/tot*100;g+=`<rect x="${bx}" y="${Y(Math.min(100,acc+pv))}" width="${bw}" height="${Y(acc)-Y(Math.min(100,acc+pv))}" fill="${SEG_COL[i]}" stroke="${C.card}" stroke-width="2"/>`;if(pv>=8)g+=T(bx+bw/2,(Y(acc)+Y(acc+pv))/2+5,fmt(pv,0)+"%",{s:13,w:600,a:"middle",c:"#fff"});acc+=pv});
    if(d.fit!=="pbar")g+=T(X0,Y0+30,d.series.length>1?"Only the first set fits in one bar: a percentage bar shows one whole.":"These values aren't parts of one whole, so a percentage bar doesn't fit.",{s:12,c:C.coral,w:600});
    if(s.gKey)g+=d.cats.map((c,i)=>R(560,120+i*28,18,18,SEG_COL[i],{r:4})+T(586,134+i*28,c,{s:13})).join("")+T(560,108,"Key",{s:13,w:600});}
  else{g+=`<line x1="${X0}" y1="${Y0}" x2="${X0+W}" y2="${Y0}" stroke="${C.ink}" stroke-width="2"/><line x1="${X0}" y1="${Y0}" x2="${X0}" y2="${Y0-H}" stroke="${C.ink}" stroke-width="2"/>`+
    ticks.map(t=>`<line x1="${X0}" y1="${Y(t)}" x2="${X0+W}" y2="${Y(t)}" stroke="${C.line}"/>`+T(X0-10,Y(t)+4,t,{s:12,a:"end",mono:true})).join("");
    const n=d.cats.length,cw=W/n;
    d.cats.forEach((c,i)=>{g+=T(X0+cw*(i+.5),Y0+20,c,{s:12,a:"middle"})});
    if(s.gtype==="mbar"){const k=d.series.length,bw=Math.min(34,(cw-16)/k);d.series.forEach((ser,j)=>ser.v.forEach((v,i)=>{const x=X0+cw*(i+.5)-k*bw/2+j*bw;g+=`<rect x="${x}" y="${Y(v)}" width="${bw-3}" height="${Y0-Y(v)}" fill="${SERIES_COL[j]}" rx="2"/>`}))}
    else d.series.forEach((ser,j)=>{const pts=ser.v.map((v,i)=>[X0+cw*(i+.5),Y(v)]);g+=`<polyline points="${pts.map(p=>p.join(",")).join(" ")}" fill="none" stroke="${SERIES_COL[j]}" stroke-width="3"/>`+pts.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="5" fill="${SERIES_COL[j]}"/>`).join("")});
    if(s.gKey&&(d.series.length>1))g+=T(660,108,"Key",{s:13,w:600})+d.series.map((ser,j)=>R(660,120+j*28,18,18,SERIES_COL[j],{r:4})+T(686,134+j*28,ser.name,{s:13})).join("")}
  if(s.gAxes){g+=T(48,Y0-H/2,d.unit,{s:13,w:600,a:"middle",rot:-90});if(s.gtype!=="pbar")g+=T(X0+W/2,Y0+44,s.data==="trips"?"Week":"Year level",{s:13,w:600,a:"middle"})}
  if(!s.gEven)g+=T(X0+8,Y0-H-8,"Uneven steps: 0, 10, 35, 50, 100",{s:11,c:C.coral,mono:true});
  return g+R(650,330,130,56,m.fit?"#E3F2EA":"#FBE4E6",{r:12})+T(715,353,`${m.got} of ${m.of}`,{s:18,w:600,a:"middle"})+T(715,373,m.fit?"right graph type":"check the graph type",{s:11,a:"middle",c:C.muted})}
function drawSource(){const S0=SOURCES[s.src],cl=S0.clues[s.clue];let g=R(0,0,800,420,"#F4EFE8",{r:0});
  if(s.src==="cartoon"){g+=`<line x1="40" y1="330" x2="760" y2="330" stroke="${C.ink}" stroke-width="2"/>`+R(260,240,120,90,"#E7DCCF",{s:C.ink})+T(320,290,"CANDIDATE",{s:12,w:600,a:"middle",mono:true})+
    `<circle cx="320" cy="200" r="24" fill="#E8C3A0" stroke="${C.ink}" stroke-width="2"/><path d="M296,236 q24,-14 48,0 v8 h-48z" fill="${C.navy}"/>`+
    `<path d="M344,190 C420,170 470,120 500,80 C520,140 540,230 560,320 C500,300 420,290 360,240" fill="#FFFDF5" stroke="${C.ink}" stroke-width="2"/>`+[110,140,170,200,230,260].map((yy,i)=>`<line x1="${470+i*10}" y1="${yy}" x2="${520+i*8}" y2="${yy+6}" stroke="${C.rose}" stroke-width="2"/>`).join("")+
    R(250,80,150,34,"#FFF",{s:C.ink})+T(325,103,"PROMISES",{s:16,w:700,a:"middle"})+`<path d="M220,170 q-40,-40 10,-60 q60,-10 60,30 q0,30 -50,24 l-24,18z" fill="#FFF" stroke="${C.ink}" stroke-width="2"/>`+T(232,138,"Trust me!",{s:13,w:600,a:"middle"})+
    R(570,270,80,60,C.skyL,{s:C.ink})+R(590,262,40,10,C.ink,{r:2})+T(610,305,"VOTE",{s:13,w:700,a:"middle"})+
    [0,1,2].map(i=>`<circle cx="${690+i*30}" cy="${280}" r="12" fill="#E8C3A0" stroke="${C.ink}" stroke-width="1.5"/><rect x="${680+i*30}" y="${293}" width="20" height="37" rx="6" fill="${[C.coral,C.lilac,C.mint][i]}" stroke="${C.ink}" stroke-width="1.5"/>`).join("")+
    R(650,110,90,70,"#FFF",{s:C.ink})+R(650,110,90,20,C.coral,{s:C.ink})+T(695,160,"3 YEARS",{s:13,w:700,a:"middle"})+T(400,398,"“Election season… again”",{s:16,w:600,a:"middle"})}
  else if(s.src==="photo"){g+=R(20,20,760,370,"#DCE6EE",{r:6})+`<path d="M560,260 v-120 q80,-60 160,0 v120z" fill="#EEE9E2" stroke="#9A9AA8"/>`+[0,1,2,3,4,5].map(i=>`<line x1="560" y1="${150+i*20}" x2="720" y2="${150+i*20}" stroke="#B9B6C2"/>`).join("")+
    R(20,260,760,130,"#C9C2B5",{r:0})+[[120,1],[180,0],[240,2],[300,1],[360,0],[420,2],[480,1],[520,0]].map(([x,c],i)=>`<circle cx="${x}" cy="${268-(i%2)*10}" r="15" fill="${["#E8C3A0","#B07650","#D9A47E"][c]}"/><rect x="${x-17}" y="${284-(i%2)*10}" width="34" height="70" rx="10" fill="${i%3?C.navy:"#3F5F8F"}"/>`).join("")+
    R(140,170,100,50,"#FFF",{s:C.ink,r:4})+T(190,192,"VOTE AT",{s:12,w:700,a:"middle"})+T(190,210,"16?",{s:14,w:700,a:"middle"})+R(330,190,110,44,"#FFF",{s:C.ink,r:4})+T(385,217,"OUR FUTURE",{s:12,w:700,a:"middle"})+
    `<rect x="460" y="210" width="22" height="16" rx="3" fill="${C.coral}"/><path d="M482,212 l20,-10 v28 l-20,-10z" fill="${C.coral}"/>`+T(400,398,"Illustration standing in for a photograph",{s:12,c:C.muted,a:"middle",mono:true})}
  else{g+=T(400,44,"How a bill becomes law in Aotearoa",{s:20,w:700,a:"middle"});
    STAGES.forEach(([n,t,d],i)=>{const x=40+(i%3)*250,yy=80+Math.floor(i/3)*165;g+=R(x,yy,220,130,i===5?C.mintL:i===1?C.butter:C.card,{s:C.line,r:14})+`<circle cx="${x+30}" cy="${yy+30}" r="16" fill="${C.ink}"/>`+T(x+30,yy+36,n,{s:15,w:700,a:"middle",c:"#fff"})+T(x+56,yy+36,t,{s:14,w:600})+wrap(x+16,yy+70,d,190,{s:13,c:C.muted});
      if(i%3<2)g+=`<path d="M${x+224},${yy+65} h20 m-8,-7 l8,7 l-8,7" fill="none" stroke="${C.ink}" stroke-width="2"/>`});
    g+=`<path d="M${40+2*250+110},${80+132} v20 h-500 v12" fill="none" stroke="${C.ink}" stroke-width="2" stroke-dasharray="4 4"/>`}
  // the clue being studied: a ring and a pin
  return g+`<circle cx="${cl.x}" cy="${cl.y}" r="34" fill="none" stroke="${C.coral}" stroke-width="4"${RM?"":` stroke-dasharray="6 5"`}/>`+R(cl.x>600?cl.x-170:cl.x+40,Math.max(12,cl.y-58),130,30,C.coral,{r:15})+T(cl.x>600?cl.x-105:cl.x+105,Math.max(12,cl.y-58)+20,(s.clue+1)+" · "+cl.n,{s:13,w:700,a:"middle",c:"#fff"})}
function drawContinuum(){let g=frame("Values continuum",ISSUE.replace("Should ","").replace("?",""))+wrap(28,92,ISSUE,740,{s:15,w:600});
  const X=v=>400+v*170;g+=`<line x1="${X(-2)}" y1="250" x2="${X(2)}" y2="250" stroke="${C.ink}" stroke-width="4" stroke-linecap="round"/>`+R(X(-2)-60,280,120,26,C.blush,{r:13})+T(X(-2),298,"Strongly disagree",{s:12,w:600,a:"middle"})+R(X(2)-60,280,120,26,C.mintL,{r:13})+T(X(2),298,"Strongly agree",{s:12,w:600,a:"middle"})+T(400,298,"Unsure",{s:12,c:C.muted,a:"middle"});
  PEOPLE.forEach((p,i)=>{const sel=p.id===s.sel,yy=200-(i%2)*40;g+=`<line x1="${X(p.st)}" y1="${yy+14}" x2="${X(p.st)}" y2="244" stroke="${C.line}" stroke-width="2"/><circle cx="${X(p.st)}" cy="${yy}" r="${sel?16:12}" fill="${[C.coral,C.navy,C.lilac,"#E7A64A",C.sky][i]}" stroke="${sel?C.ink:"#fff"}" stroke-width="3"/>`+T(X(p.st),yy-22,p.n.split(",")[0],{s:12,w:sel?700:500,a:"middle"})});
  return g+`<circle cx="${X(s.you)}" cy="250" r="16" fill="${C.ink}"/>`+T(X(s.you),255,"You",{s:10,w:700,a:"middle",c:"#fff"})+T(X(s.you),345,`You: ${where(s.you)}`,{s:14,w:600,a:"middle"})+T(28,395,"The people are invented. Real people hold many different views on this question.",{s:12,c:C.muted,mono:true})}
function drawGov(){const F=FEATURES[s.feature];let g=frame("How New Zealand is governed","A constitutional monarchy and a parliamentary democracy");
  g+=R(250,80,300,44,s.feature==="hos"?C.butter:"#F1ECE4",{s:s.feature==="hos"?C.ink:C.line,r:12})+T(400,107,"Head of state: the King · Governor-General",{s:13,w:600,a:"middle"});
  [["leg","Legislature","Parliament · makes law"],["exe","Executive","PM, Cabinet · runs the country"],["jud","Judiciary","Courts · interpret the law"]].forEach(([k,n,d],i)=>{const x=60+i*240,on=s.feature===k;g+=R(x,150,200,130,on?FEATURES[k].col:C.card,{s:on?C.ink:C.line,r:14,sw:on?2.5:1.5})+R(x+80,165,40,60,on?"#fff":"#EEE",{r:6})+T(x+100,250,n,{s:15,w:700,a:"middle"})+T(x+100,270,d,{s:12,c:C.muted,a:"middle"})});
  [["vote","Elections every 3 years · MMP"],["tiriti","Te Tiriti o Waitangi"],["rights","Rule of law · Bill of Rights"]].forEach(([k,n],i)=>{const on=s.feature===k;g+=R(60+i*240,300,200,40,on?FEATURES[k].col:"#F1ECE4",{s:on?C.ink:C.line,r:10})+T(160+i*240,325,n,{s:12,w:600,a:"middle"})});
  return g+T(28,380,F.n+": "+F.tag,{s:14,w:700})+T(28,400,"The separation of powers keeps the three branches apart.",{s:12,c:C.muted})}
function drawInno(){const I=IDEAS[s.idea];let g=frame(I.n,`${I.who.split(",")[0]} · ${I.when}`);
  const steps=[["Problem",I.why.split(";")[0]],["Idea",I.what],["Launch",I.who],["Impact",I.value]];
  steps.forEach(([n,t],i)=>{const x=28+i*190,on=(s.lens==="what"&&i<2)||(s.lens==="why"&&i===0)||(s.lens==="value"&&i===3);g+=R(x,90,172,150,on?C.butter:C.card,{s:on?C.ink:C.line,r:14})+T(x+14,116,(i+1)+" · "+n,{s:13,w:700})+wrap(x+14,140,t.length>110?t.slice(0,108)+"…":t,150,{s:12,c:C.muted,lh:16});if(i<3)g+=`<path d="M${x+174},165 h12 m-6,-6 l6,6 l-6,6" fill="none" stroke="${C.ink}" stroke-width="2"/>`});
  if(s.lens==="eval"){g+=T(28,272,"Strengths",{s:14,w:700,c:C.mint})+I.strengths.slice(0,s.str).map((t,i)=>T(28,296+i*22,"+ It "+t,{s:13})).join("")+T(420,272,"Weaknesses",{s:14,w:700,c:C.coral})+I.weaknesses.slice(0,s.weak).map((t,i)=>T(420,296+i*22,"− It "+t,{s:13})).join("")}
  else g+=wrap(28,280,s.lens==="value"?`Costs: ${I.costs}. Benefits and economic value: ${I.value}.`:s.lens==="why"?`Why: ${I.why}.`:`${I.n} is ${I.what}. It was created by ${I.who} ${I.when}.`,744,{s:15,lh:22});
  return g+T(28,400,"Check names and dates against your class notes.",{s:12,c:C.muted,mono:true})}
function drawWords(){const list=WORDS[s.topic],[term,def]=list[s.card%list.length];let g=frame(s.topic==="gov"?"Definitions: Government":"Definitions: Innovation",`Card ${s.card%list.length+1} of ${list.length}`);
  return g+R(150,90,500,240,s.flipped?C.card:(s.topic==="gov"?C.skyL:C.butter),{s:C.ink,r:20,sw:2})+(s.flipped?wrap(180,150,def,440,{s:20,lh:30}):T(400,215,term,{s:36,w:700,a:"middle"})+T(400,250,"Say the definition out loud, then flip",{s:13,c:C.muted,a:"middle"}))+T(400,370,`${s.known} learned this session`,{s:13,c:C.muted,a:"middle",mono:true})}
function drawPara(){const I=IDEAS[s.idea];let g=frame("Two paragraphs on an innovative idea",I.n);let y=86;
  [[0,4,"Paragraph 1: describe it, who made it, why, costs, benefits and value"],[4,6,"Paragraph 2: evaluate strengths and weaknesses, then judge"]].forEach(([a,b,h])=>{g+=T(28,y,h,{s:13,w:700,c:C.muted});y+=10;
    const text=PARTS.slice(a,b).map((p,i)=>a+i<s.build?sentence(a+i,I):STARTERS[a+i]).join(" ");const box=R(28,y,744,140,C.card,{s:C.line,r:12});g+=box+wrap(44,y+26,text,710,{s:13,lh:19});y+=158});
  return g+PARTS.map((p,i)=>R(28+i*125,394,118,16,i<s.build?(i<4?C.peach:C.lilacL):"#EEE",{r:8})).join("")}
function drawTest(){let g=frame("Test yourself","Seven checks across both sections");
  return g+["Graph: right type, full marks","Graph: percentage bar for travel","Source: find the exaggeration","Continuum: the value of tradition","Government: who interprets law","Innovation: a balanced evaluation","Paragraphs: all six parts"].map((t,i)=>R(28+(i%2)*380,90+Math.floor(i/2)*70,360,56,C.card,{s:C.line,r:12})+T(48+(i%2)*380,124+Math.floor(i/2)*70,(i+1)+". "+t,{s:15,w:500})).join("")}
const DRAW={plan:drawPlan,graph:drawGraph,source:drawSource,continuum:drawContinuum,gov:drawGov,inno:drawInno,words:drawWords,para:drawPara,test:drawTest};

// ---------- the close-up card (420 × 260): what to write for this view
function card(title,lines,col){return R(0,0,420,260,C.card,{r:0})+R(16,16,388,40,col||C.butter,{r:12})+T(32,42,title,{s:15,w:700})+lines.map((l,i)=>wrap(24,84+i*46,l,372,{s:13,lh:18,c:i?C.muted:C.ink})).join("")}
function drawClose(){const v=viewNow();
  if(v==="plan")return card("On the day",[`Section A ${s.minsA} min · Section B ${110-s.minsA} min · 10 min to read and check.`,"Do the questions you're surest of first, then come back.","Bring your clear bag: ruler, pencil, pen, coloured pencils, rubber."],C.skyL);
  if(v==="graph"){const m=graphMarks();return card(`Graph checklist · ${m.got} of ${m.of}`,[m.need.map(([n,ok])=>(ok?"✓ ":"✗ ")+n).join("   "),m.fit?`✓ A ${GTYPES.find(g=>g[0]===s.gtype)[1].toLowerCase()} suits ${FIT_WHY[s.gtype]}.`:`✗ This data is ${FIT_WHY[DATA[s.data].fit]}: use a ${GTYPES.find(g=>g[0]===DATA[s.data].fit)[1].toLowerCase()}.`,"Use a ruler and pencil. Colour neatly and match your key."],m.fit&&m.got===m.of?C.mintL:C.butter)}
  if(v==="source"){const S0=SOURCES[s.src],cl=S0.clues[s.clue];return card(`${S0.name} · ${cl.n}`,[cl.tell,`Message: ${S0.message}`,"Describe what you see → explain what it means → state the message."],C.blush)}
  if(v==="continuum"){const P=PEOPLE.find(p=>p.id===s.sel);return card(`${P.n} · ${where(P.st)}`,[`Value: ${P.v}. ${P.n.split(",")[0]} ${P.st>.3?"agrees":P.st<-.3?"disagrees":"is unsure"} because ${P.because}.`,`You: ${where(s.you)}. Now give your reason and name the value behind it.`,"Values: fairness, equality, freedom, safety, responsibility, tradition, participation."],P.st>.3?C.mintL:P.st<-.3?C.blush:C.butter)}
  if(v==="gov"){const F=FEATURES[s.feature];return card(F.n,[F.text,F.tag+"."],F.col)}
  if(v==="inno"){const I=IDEAS[s.idea],bal=s.str-s.weak;return card(`${I.n} · ${LENSES.find(l=>l[0]===s.lens)[1]}`,s.lens==="eval"?[`${s.str} strength${s.str===1?"":"s"} vs ${s.weak} weakness${s.weak===1?"":"es"}: ${bal>0?"leans worthwhile":bal<0?"leans not worth it":"balanced: now make a judgement"}.`,"An Excellence answer weighs both sides, then decides and says why.","Use: however, on the other hand, overall, therefore."]:[s.lens==="what"?`${I.n} is ${I.what}.`:s.lens==="why"?`Created ${I.why}.`:`Value: ${I.value}.`,`Created by ${I.who} ${I.when}.`],C.butter)}
  if(v==="words"){const list=WORDS[s.topic],[term,def]=list[s.card%list.length];return card(term,[s.flipped?def:"Try to say it first, then flip the card.","A strong definition says what it is and gives an example."],s.topic==="gov"?C.skyL:C.butter)}
  if(v==="para")return card(`Built ${s.build} of 6 parts`,[s.build<6?`Next: ${PARTS[s.build][0]} — ${PARTS[s.build][1].toLowerCase()}.`:"Both paragraphs are assembled. Now rewrite them in your own words.","Paragraph 1 describes and explains (parts 1–4). Paragraph 2 evaluates and judges (parts 5–6).","Use your class's example if it is different."],s.build===6?C.mintL:C.lilacL);
  return card("Test yourself",["Use the controls, then press Check on each challenge.","Stuck? Ask Allen for a hint."],C.mintL)}

// ---------- steps
const steps=[
 {k:"plan",lab:"Plan the exam",cap:"Two hours, two sections. Split your time, then check your clear plastic bag.",big:"Section A is <b>skills</b>: graphs, sources, notes and values. Section B is <b>knowledge</b>: definitions, Government and Innovation, and two paragraphs.",trap:"Running out of time for the two paragraphs: they carry a lot of marks. Plan the minutes before you start.",exam:"Read the whole paper first and plan your time.",chips:["minsA","minsB","bag"],controls:["minsA"]},
 {k:"graph",lab:"Draw the graph",cap:"Pick the graph type that fits the data, then switch on everything a full-marks graph needs.",big:"A percentage bar shows <b>parts of one whole</b>. A multiple bar compares <b>two sets</b> of values. A double line shows <b>change over time</b>.",trap:"Uneven scales and missing keys lose easy marks. Count your scale steps.",exam:()=>`My ${GTYPES.find(g=>g[0]===s.gtype)[1].toLowerCase()} shows ${DATA[s.data].title.toLowerCase()}, with a title, labelled axes, an even scale and a key.`,chips:["marks","fit","biggest"],controls:["gtype","data","gTitle","gAxes","gEven","gKey"]},
 {k:"source",lab:"Read the source",cap:"Cartoon, photograph or infographic: look closer at each clue, then state the message.",big:"Describe what you can see, explain what it means, then give the <b>message</b> and the creator's <b>purpose</b>.",trap:"Describing the picture without explaining the message gets fewer marks.",exam:()=>`The ${SOURCES[s.src].name.toLowerCase()} shows… This suggests… The message is that ${SOURCES[s.src].message.charAt(0).toLowerCase()+SOURCES[s.src].message.slice(1)}`,chips:["source","clue"],controls:["src","clue"]},
 {k:"continuum",lab:"Values continuum",cap:"Place yourself on the line, then tap a person to see the value behind their view.",big:"A <b>value</b> is a belief about what is important. A <b>perspective</b> is a way of seeing an issue shaped by your values and experiences.",trap:"Saying “I agree because I think so” is a reason without a value. Name the value.",exam:()=>`I ${where(s.you)} because I value… For example… Someone who disagrees might value…`,chips:["you","person","value"],controls:["you","sel"]},
 {k:"gov",lab:"Government",cap:"Tap through the parts of New Zealand's system of government.",big:"Three branches: the <b>legislature</b> makes law, the <b>executive</b> puts it into action, the <b>judiciary</b> interprets it.",trap:"Mixing up Parliament (all MPs, makes laws) with the government (PM and ministers).",exam:"New Zealand is a constitutional monarchy and a parliamentary democracy with three branches of government.",chips:["feature"],controls:["feature"]},
 {k:"inno",lab:"Innovation",cap:"Pick an innovation and look through each lens. For the evaluation, load the balance.",big:"An <b>innovation</b> adds value: it solves a problem in a new or better way.",trap:"Listing strengths only. Evaluation means weighing both sides and making a judgement.",exam:()=>`${IDEAS[s.idea].n} was created by ${IDEAS[s.idea].who.split(",")[0]} ${IDEAS[s.idea].when} ${IDEAS[s.idea].why.split(";")[0]}.`,chips:["idea","balance"],controls:["idea","lens","str","weak"]},
 {k:"words",lab:"Definitions",cap:"Flash cards for both topics. Say the definition, then flip to check.",big:"A strong definition says <b>what it is</b> in your own words, and can give an <b>example</b>.",trap:"Using the word in its own definition (“democracy is a democratic system”).",exam:()=>{const [t,d]=WORDS[s.topic][s.card%WORDS[s.topic].length];return `${t}: ${d}`},chips:["card","learned"],controls:["topic","flip","next","known"]},
 {k:"para",lab:"Two paragraphs",cap:"Build the two paragraphs one part at a time: the exam's three bullet points, in order.",big:"Paragraph 1 <b>describes and explains</b>. Paragraph 2 <b>evaluates</b>: strengths, weaknesses and your judgement.",trap:"Forgetting the person or group who created the idea, or the economic value.",exam:()=>sentence(0,IDEAS[s.idea]),chips:["built","idea"],controls:["idea","build"]},
 {k:"test",lab:"Test yourself",cap:"Seven challenges across both sections. Use the controls, then press Check.",chips:["marks","person","feature","balance","built"],controls:["gtype","data","gTitle","gAxes","gEven","gKey","src","clue","you","sel","feature","idea","str","weak","build"]}];

const KUPU=[{mi:"manapori",en:"democracy",ta:11071},{mi:"kāwanatanga",en:"government",ta:2472},{mi:"Pāremata",en:"Parliament",ta:5295,note:"New Zealand's Parliament calls itself Pāremata Aotearoa."},{mi:"pōti",en:"to vote; a vote, an election",ta:5918},{mi:"pire",en:"bill (a proposed law)",ta:13133},{mi:"ture",en:"law, act of Parliament",ta:8768},{mi:"tāpaetanga",en:"submission",ta:38468}];
Object.entries({gov:["kāwanatanga","Pāremata","manapori"],source:["pire","ture","tāpaetanga"],continuum:["pōti"],words:["manapori","kāwanatanga","Pāremata"]}).forEach(([k,a])=>{const st=steps.find(x=>x.k===k);if(st)st.kupu=a});

const sel=(id,label,options,get,set)=>({type:"select",id,label,options,get,set});
const tog=(id,on,off)=>({type:"toggle",id,label:on,labelFn:x=>x[id]?on:off,get:x=>x[id],set:(x,v)=>{x[id]=v}});
API=StudyKit.mount({kupu:KUPU,scene3d:socials3d,postprocessing:false,
  eyebrow:"Social studies · Government and innovation", title:"The social studies exam machine", crumb:"Year 9 end-of-year social studies: graphs, cartoons, photographs and infographics, note-taking, values continuums, Government and Innovation, definitions and two-paragraph answers", homeHash:"y9",
  fig:"FIG. 21 · THE EXAM DESK", railTitle:"Skills, knowledge and paragraphs",
  badge:{label:"Year 9 social studies"},
  mainBox:"0 0 800 420", mainPhoneBig:true, mainLabel:"The exam desk: a clock, a graph, sources, a values continuum, the Beehive, an innovation and a paragraph builder", closeBox:"0 0 420 260",
  state:s, steps,
  onStep:(x,stp)=>{if(stp.k!=="test")s.view=stp.k},
  controls:[
    {type:"range",id:"minsA",label:"Section A minutes",min:30,max:80,step:5,get:()=>s.minsA,set:(x,v)=>{s.minsA=v},fmt:()=>`${s.minsA} min · B gets ${110-s.minsA}`},
    sel("gtype","Graph type",GTYPES,()=>s.gtype,(x,v)=>{s.gtype=v;s.view="graph"}),
    sel("data","Data",[["travel","Travel to school"],["turnout","Election turnout"],["trips","Scooter and bike trips"]],()=>s.data,(x,v)=>{s.data=v;s.view="graph"}),
    tog("gTitle","Title on","Title off"),tog("gAxes","Axis labels on","Axis labels off"),tog("gEven","Even scale","Uneven scale"),tog("gKey","Key on","Key off"),
    sel("src","Source",[["cartoon","Cartoon"],["photo","Photograph"],["info","Infographic"]],()=>s.src,(x,v)=>{s.src=v;s.clue=0;s.view="source"}),
    {type:"range",id:"clue",label:"Look closer at",min:0,max:4,step:1,get:()=>s.clue,set:(x,v)=>{s.clue=v;s.view="source"},fmt:()=>SOURCES[s.src].clues[s.clue].n},
    {type:"range",id:"you",label:"Where you stand",min:-2,max:2,step:.1,get:()=>s.you,set:(x,v)=>{s.you=v;s.view="continuum"},fmt:()=>where(s.you)},
    sel("sel","Person",PEOPLE.map(p=>[p.id,p.n]),()=>s.sel,(x,v)=>{s.sel=v;s.view="continuum"}),
    sel("feature","Feature",Object.entries(FEATURES).map(([k,f])=>[k,f.n]),()=>s.feature,(x,v)=>{s.feature=v;s.view="gov"}),
    sel("idea","Innovation",Object.entries(IDEAS).map(([k,f])=>[k,f.n]),()=>s.idea,(x,v)=>{s.idea=v}),
    sel("lens","Lens",LENSES,()=>s.lens,(x,v)=>{s.lens=v;s.view="inno"}),
    {type:"range",id:"str",label:"Strengths on the balance",min:0,max:3,step:1,get:()=>s.str,set:(x,v)=>{s.str=v;s.lens="eval"}},
    {type:"range",id:"weak",label:"Weaknesses on the balance",min:0,max:3,step:1,get:()=>s.weak,set:(x,v)=>{s.weak=v;s.lens="eval"}},
    sel("topic","Topic",[["gov","Government"],["inno","Innovation"]],()=>s.topic,(x,v)=>{s.topic=v;s.card=0;s.flipped=false}),
    {type:"button",id:"flip",label:"↻ Flip the card",onClick:()=>{s.flipped=!s.flipped}},
    {type:"button",id:"next",label:"Next card →",onClick:()=>{s.card=(s.card+1)%WORDS[s.topic].length;s.flipped=false}},
    {type:"button",id:"known",label:"✓ I knew it",onClick:()=>{s.known++;s.card=(s.card+1)%WORDS[s.topic].length;s.flipped=false}},
    {type:"range",id:"build",label:"Parts built",min:0,max:6,step:1,get:()=>s.build,set:(x,v)=>{s.build=v;s.view="para"},fmt:()=>`${s.build} of 6`}],
  drawMain:()=>DRAW[viewNow()](),
  drawClose,
  chips:()=>{const m=graphMarks(),P=PEOPLE.find(p=>p.id===s.sel),d=DATA[s.data],mx=Math.max(...d.series[0].v),bal=s.str-s.weak;
    return{minsA:["SECTION A",s.minsA+" min"],minsB:["SECTION B",(110-s.minsA)+" min",110-s.minsA<45],bag:["EQUIPMENT","5 items"],
      marks:["GRAPH MARKS",`${m.got} of ${m.of}`,m.got===m.of],fit:["GRAPH TYPE",m.fit?"fits the data":"doesn't fit",!m.fit],biggest:["LARGEST",`${d.cats[d.series[0].v.indexOf(mx)]} · ${fmt(mx)}`],
      source:["SOURCE",SOURCES[s.src].name],clue:["LOOKING AT",SOURCES[s.src].clues[s.clue].n,true],
      you:["YOU",where(s.you)],person:["PERSON",P.n.split(",")[0]],value:["THEIR VALUE",P.v,true],
      feature:["FEATURE",FEATURES[s.feature].tag,true],idea:["INNOVATION",IDEAS[s.idea].n],balance:["BALANCE",bal>0?"strengths win":bal<0?"weaknesses win":"level",true],
      card:["CARD",WORDS[s.topic][s.card%WORDS[s.topic].length][0]],learned:["LEARNED",fmt(s.known)],built:["PARAGRAPHS",`${s.build} of 6 parts`,s.build===6]}},
  challenges:[
    {q:"Show the e-scooter and bike-share data on the right type of graph, with every feature a full-marks graph needs.",check:()=>{const m=graphMarks();return s.data==="trips"&&m.fit&&m.got===m.of},ok:"Yes: a double line graph shows two things changing over time, with a title, labelled axes, an even scale and a key.",no:()=>s.data!=="trips"?"Set Data to Scooter and bike trips first.":!graphMarks().fit?"Change over time calls for a different graph type.":"Something on the checklist is still off. Look at the close-up card."},
    {q:"Show the travel-to-school survey as a full-marks percentage bar graph.",check:()=>{const m=graphMarks();return s.data==="travel"&&s.gtype==="pbar"&&m.got===m.of},ok:"Yes: one bar for one whole, 100% split into parts, with a key.",no:()=>"Data: Travel to school; type: percentage bar; then switch on the title, axis labels, even scale and key."},
    {q:"On the cartoon, find the clue that uses exaggeration.",check:()=>s.src==="cartoon"&&SOURCES.cartoon.clues[s.clue].k==="exaggeration",ok:"Yes: the scroll of promises is far too long, which makes the point that politicians promise a lot.",no:()=>s.src!=="cartoon"?"Choose the cartoon first.":"Move through the clues with Look closer at."},
    {q:"Stand at “unsure” on the continuum and select the person whose view comes from the value of tradition.",check:()=>Math.abs(s.you)<=.3&&s.sel==="tom",ok:"Yes: Tom values tradition: 18 is when the law treats you as an adult for most things.",no:()=>Math.abs(s.you)>.3?"Move yourself to the middle first.":"Tap through the people and read their values."},
    {q:"Show the branch of government that interprets the law.",check:()=>s.feature==="jud",ok:"Yes: the judiciary, the independent courts.",no:"That one doesn't interpret the law. Think about who decides court cases."},
    {q:"Load the jet boat's balance with at least two strengths and two weaknesses.",check:()=>s.idea==="jet"&&s.str>=2&&s.weak>=2,ok:"Yes: a balanced evaluation weighs both sides before making a judgement.",no:()=>s.idea!=="jet"?"Choose the jet boat first.":"Add more to the lighter pan."},
    {q:"Assemble all six parts of the two paragraphs.",check:()=>s.build===6,ok:"Yes: description, creator, reason, value, strengths, weaknesses and a judgement.",no:()=>`${s.build} of 6 so far.`}],
  papers:[{label:"NZQA past exams: Social Studies",url:"https://www2.nzqa.govt.nz/ncea/subjects/past-exams-and-exemplars/"}],
  truth:"Written for practice from a Year 9 exam outline. The graph data, the cartoon, the photograph illustration, the infographic layout and the people on the continuum are invented. Facts about government and the three innovations are kept to well-documented points; check names, dates and your class's own examples against your notes. Non-partisan: no real parties or politicians.",
  footer:"Covers Year 9 social studies exam skills (percentage bar, multiple bar and double line graphs; cartoon, photograph and infographic interpretation; note-taking and summarising; values continuums) and knowledge (Government and Innovation definitions, features of New Zealand's system of government, and two paragraphs on an innovative idea)."
});

// ---------- the practice question bank. Allen can add questions to it (study/tutor.js, add_question).
const bank={list:()=>[...QUESTIONS,...ADDED.map(x=>({...x,added:true}))],
  add(q){const item={sec:q.section==="B"?"B":"A",step:steps.some(x=>x.k===q.step)?q.step:"",q:String(q.question||"").replace(/[<>]/g,"").slice(0,900)};if(item.q.length<10)return null;ADDED.push(item);ADDED=ADDED.slice(-30);try{localStorage.setItem(QB_KEY,JSON.stringify(ADDED))}catch(e){}paintBank();return item}};
try{window.StudyKit.current.cfg.questionBank=bank}catch(e){}
const host=document.createElement("section");host.className="card qbank";host.setAttribute("aria-labelledby","qb-h");
const qcss=document.createElement("style");qcss.textContent=`.qbank{margin-top:18px}.qbank h3{margin:0 0 4px}.qbank>p{margin:0 0 14px;color:var(--as-muted,#654A4E);font-size:14px}.qbank ol{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.qbank li{border:1px solid var(--as-line,#E4D9DE);border-radius:14px;padding:12px 14px;display:grid;gap:8px}.qbank li b{font:600 11px "IBM Plex Mono",monospace;letter-spacing:.06em;color:#916A70}.qbank li .acts{display:flex;gap:8px;flex-wrap:wrap}
.qbank li.added{border-style:dashed}.qbank .q{font-size:15px;line-height:1.5}`;document.head.appendChild(qcss);
function paintBank(){const list=bank.list();host.innerHTML=`<h3 id="qb-h">Practice questions</h3><p>Written for this machine in the style of the exam outline, not real exam questions. Open the tool for each one, or work through it with Allen. Ask Allen for more and he'll add them here.</p><ol>${list.map((x,i)=>`<li class="${x.added?"added":""}"><b>SECTION ${x.sec}${x.added?" · ADDED BY ALLEN":""}</b><span class="q">${esc(x.q)}</span><span class="acts">${x.step?`<button class="btn" type="button" data-qopen="${x.step}">Open the tool</button>`:""}<button class="btn primary" type="button" data-qallen="${i}">Work through it with Allen</button></span></li>`).join("")}</ol>`}
paintBank();
(document.querySelector(".card.practise")||document.querySelector(".bench")).insertAdjacentElement("afterend",host);
host.addEventListener("click",e=>{const o=e.target.closest("[data-qopen]"),a=e.target.closest("[data-qallen]");
  if(o){const i=steps.findIndex(x=>x.k===o.dataset.qopen);if(i>=0){API.setStep(i);try{document.querySelector(".bench").scrollIntoView({behavior:RM?"auto":"smooth",block:"start"})}catch(err){}}}
  if(a){const x=bank.list()[+a.dataset.qallen];dispatchEvent(new CustomEvent("allen:ask",{detail:{display:"Work through this practice question with me:\n\n"+x.q,
    text:`Here is a practice question for my Year 9 social studies exam. Work through it with me step by step, and use this machine creatively to show each part (switch to the right step, set the controls, build the graph or the paragraph with me). Let me try each part before you give the answer.\n\n---\n${x.q}`}}))}});

// ---------- the 3D exam desk (Blender model, socials-scene.js). Lazy, so the lesson works if 3D can't load.
function socials3d(S){let world=null;const host3=S.canvas.parentElement,figure=host3.parentElement;host3.style.visibility="hidden";figure.classList.remove("s3-on");
  import("./socials-scene.js").then(m=>{world=m.socialsScene(S,{draw:()=>DRAW[viewNow()](),state:s,view:viewNow,DATA,PEOPLE});const r=host3.getBoundingClientRect();world.resize?.(r.width,r.height)}).catch(e=>{host3.style.visibility="hidden";figure.classList.remove("s3-on");console.warn("Exam desk 3D unavailable",e)});
  return {resize(...a){world?.resize?.(...a)},update(...a){world?.update?.(...a)}}}
})();
