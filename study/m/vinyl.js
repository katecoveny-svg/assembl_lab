(()=>{
// The vinyl machine: a turntable, a groove under a magnifier, and the sound it makes.
// Circle maths (rpm, circumference, speed), waves (frequency, wavelength, v = fλ), pitch and loudness.
const fmt=(x,d=0)=>{let v=Number(x);if(Math.abs(v)<0.5*Math.pow(10,-d))v=0;return v.toLocaleString("en-NZ",{maximumFractionDigits:d,minimumFractionDigits:d})};
const V_AIR=343, R_OUT=0.146, R_IN=0.060; // m: outer and inner groove radius of a 12-inch LP
const NOTES=["C","C♯","D","D♯","E","F","F♯","G","G♯","A","A♯","B"];
const noteOf=f=>{const n=Math.round(12*Math.log2(f/440))+57;return NOTES[((n%12)+12)%12]+Math.floor(n/12)};
const s={rpm:100/3,disc:100/3,r:0.146,f:440,amp:0.6,ang:0,t:0,arm:0,db:70,hours:2,phase:0,format:"lp"};
// ---- NCEA Level 2/3 circular motion (AS91171, AS91524): ω = 2πf, v = rω, a = v²/r, with a 7-inch single for comparison
const RMAX=()=>s.format==="single"?0.088:0.146, R_SINGLE=0.088;
const omega=()=>2*Math.PI*rps(), vlin=r=>r*omega(), acen=r=>omega()*omega()*r, I_PLATTER=0.5*1.5*0.15*0.15;
const rps=()=>s.rpm/60, period=()=>60/s.rpm, speedAt=r=>2*Math.PI*r*rps();
const pitchRatio=()=>s.rpm/s.disc, heard=()=>s.f*pitchRatio();
// ---- sound (only after a tap): a short tone at the frequency you'd hear
let actx=null;
function beep(f,amp){try{actx=actx||new (window.AudioContext||window.webkitAudioContext)();const o=actx.createOscillator(),g=actx.createGain();o.type="triangle";o.frequency.value=Math.min(8000,Math.max(40,f));
  g.gain.setValueAtTime(0,actx.currentTime);g.gain.linearRampToValueAtTime(0.06+0.12*amp,actx.currentTime+0.03);g.gain.exponentialRampToValueAtTime(0.0001,actx.currentTime+0.9);o.connect(g).connect(actx.destination);o.start();o.stop(actx.currentTime+0.95)}catch(e){}}

// ---- palette for the record shop look
// figure materials: the shared bench recipe (StudyKit.figMat), so the turntable matches the rest of the bench
const FM=StudyKit.figMat,V_WOOD=FM("wood","#B98B5E"),V_MAT=FM("rubber","#2A2A2E"),V_ARM=FM("metal","#C9C4C9"),V_REC=FM("plastic","#1E1B20");
const WOOD=V_WOOD.fill,WOOD2=V_WOOD.stroke,VINYL=V_REC.fill,GROOVE="#3A3540",LABEL="#F2B8C6",LABEL2="#A8DCCB",METAL=V_ARM.fill,PINK="#E77FA0",MINT="#5FB79B";
function turntable(cx,cy,R){let o=`<rect x="${cx-R-34}" y="${cy-R-30}" width="${2*R+150}" height="${2*R+60}" rx="18" fill="${WOOD}"/><rect x="${cx-R-34}" y="${cy-R-30}" width="${2*R+150}" height="${2*R+60}" rx="18" fill="none" stroke="${WOOD2}" stroke-width="3"/>`;
  o+=`<circle cx="${cx}" cy="${cy}" r="${R+8}" ${V_MAT.attrs}/>`;
  o+=`<g transform="rotate(${s.ang*180/Math.PI},${cx},${cy})"><circle cx="${cx}" cy="${cy}" r="${R}" fill="${VINYL}"/>`;
  for(let k=0;k<26;k++){const rr=R*0.42+k*(R*0.56/26);o+=`<circle cx="${cx}" cy="${cy}" r="${rr}" fill="none" stroke="${GROOVE}" stroke-width="${k%7===6?2.2:0.7}" opacity="${k%7===6?0.9:0.6}"/>`}
  o+=`<path d="M${cx},${cy-R} A${R},${R} 0 0 1 ${cx+R*0.7},${cy-R*0.7}" stroke="#fff" stroke-width="5" opacity=".08" fill="none"/>`;
  o+=`<circle cx="${cx}" cy="${cy}" r="${R*0.34}" fill="${LABEL}"/><path d="M${cx-R*0.34},${cy} A${R*0.34},${R*0.34} 0 0 0 ${cx+R*0.34},${cy}Z" fill="${LABEL2}"/>`;
  o+=`<text x="${cx}" y="${cy-R*0.14}" text-anchor="middle" style="font:700 ${R*0.09}px var(--display);fill:#492B3E">SIDE A</text><text x="${cx}" y="${cy+R*0.2}" text-anchor="middle" style="font:500 ${R*0.07}px var(--mono);fill:#492B3E">${s.disc>40?"45":"33⅓"} RPM</text>`;
  o+=`<line x1="${cx}" y1="${cy-R*0.32}" x2="${cx}" y2="${cy-R*0.24}" stroke="#492B3E" stroke-width="3"/></g><circle cx="${cx}" cy="${cy}" r="5" fill="${METAL}" stroke="#555"/>`;
  // tonearm: pivot top-right, needle at radius s.r along the left side
  const px=cx+R+62,py=cy-R+8,nr=s.r/RMAX()*R*0.98,na=Math.PI*0.86,nx=cx+Math.cos(na)*nr*0.25+ (R*0.12),ny=cy-Math.sin(na)*0+(-nr*0.0);
  const needle=[cx+nr*Math.cos(-0.62),cy+nr*Math.sin(-0.62)];
  o+=`<circle cx="${px}" cy="${py}" r="16" ${V_ARM.attrs}/><line x1="${px}" y1="${py}" x2="${needle[0]+6}" y2="${needle[1]-8}" stroke="${V_ARM.stroke}" stroke-width="7" stroke-linecap="round"/><line x1="${px}" y1="${py}" x2="${needle[0]+6}" y2="${needle[1]-8}" stroke="${V_ARM.fill}" stroke-width="4" stroke-linecap="round"/><line x1="${px}" y1="${py}" x2="${needle[0]+6}" y2="${needle[1]-8}" stroke="${V_ARM.hi}" stroke-width="1.2" stroke-linecap="round" opacity=".8"/><rect x="${needle[0]-4}" y="${needle[1]-12}" width="18" height="12" rx="2" fill="#333" transform="rotate(-30,${needle[0]},${needle[1]})"/>`;
  return {o,needle}}
function magnifier(x,y,r){// the groove under the needle: a wiggle whose wavelength = groove speed ÷ frequency
  const v=speedAt(s.r),lam=v/s.f; // metres
  const scale=r*2/0.003; // show 3 mm of groove across the lens
  let o=`<clipPath id="vyLens"><circle cx="${x}" cy="${y}" r="${r}"/></clipPath><g clip-path="url(#vyLens)"><rect x="${x-r}" y="${y-r}" width="${2*r}" height="${2*r}" fill="${VINYL}"/>`;
  for(let k=-3;k<=3;k++){if(k===0)continue;o+=`<path d="${wig(x-r,y+k*r*0.28,2*r,lam*scale,4*s.amp,s.phase*0.6+k)}" stroke="${GROOVE}" stroke-width="5" fill="none"/>`}
  o+=`<path d="${wig(x-r,y,2*r,lam*scale,10*s.amp,s.phase)}" stroke="#7d7488" stroke-width="7" fill="none"/><path d="${wig(x-r,y,2*r,lam*scale,10*s.amp,s.phase)}" stroke="#ddd" stroke-width="1.2" fill="none" opacity=".6"/>`;
  o+=`<path d="M${x-6},${y-r} L${x+6},${y-r} L${x+2},${y+2} L${x-2},${y+2}Z" fill="${METAL}" stroke="#555"/></g><circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#2a2a2e" stroke-width="8"/><circle cx="${x}" cy="${y}" r="${r+4}" fill="none" stroke="${PINK}" stroke-width="2"/>`;
  o+=`<line x1="${x-lam*scale/2}" x2="${x+lam*scale/2}" y1="${y+r*0.55}" y2="${y+r*0.55}" stroke="${MINT}" stroke-width="3"/><text x="${x}" y="${y+r+26}" text-anchor="middle" style="font:600 14px var(--mono);fill:#492B3E">one wiggle λ = ${fmt(lam*1000,2)} mm</text>`;
  return o}
function wig(x0,y0,w,lamPx,A,ph){let d=`M${x0},${y0}`;const n=Math.min(400,Math.max(30,w/lamPx*16));for(let i=0;i<=n;i++){const x=x0+i*w/n;d+=` L${x.toFixed(1)},${(y0+A*Math.sin(2*Math.PI*(x-x0)/Math.max(0.5,lamPx)-ph)).toFixed(1)}`}return d}
function drawMain(st){const W=800,H=420;let o=`<rect width="${W}" height="${H}" fill="#F7EEF0"/>`;
  for(let i=0;i<9;i++)o+=`<rect x="${560+i*26}" y="300" width="22" height="110" rx="2" fill="${[PINK,MINT,"#F4C26B","#8FA9E0",LABEL,LABEL2,"#C9A7E8","#F29C7A","#9BD3E8"][i]}" opacity=".75"/>`;
  if(st.k==="air"||st.k==="loud")return o+airScene(st);
  if(["omega","centripetal","formats"].includes(st.k))return o+circularScene(st);
  const T=turntable(220,215,160);o+=T.o;
  const [nx,ny]=T.needle;
  if(st.k!=="spin"){o+=`<line x1="${nx}" y1="${ny}" x2="590" y2="140" stroke="${PINK}" stroke-width="1.5" stroke-dasharray="4 4"/>`+magnifier(610,140,104)}
  else{// speed of the groove under the needle, outer vs inner
    o+=`<circle cx="220" cy="215" r="${160*R_OUT/R_OUT*0.98}" fill="none" stroke="${PINK}" stroke-width="2" stroke-dasharray="6 5"/><circle cx="220" cy="215" r="${160*R_IN/R_OUT}" fill="none" stroke="${MINT}" stroke-width="2" stroke-dasharray="6 5"/>`;
    o+=`<g transform="translate(470,70)"><rect width="300" height="210" rx="14" fill="#fff" stroke="#E3D3D8"/><text x="18" y="32" style="font:600 13px var(--mono);fill:${PINK}">OUTER GROOVE · r = 14.6 cm</text><text x="18" y="58" style="font:600 22px var(--mono);fill:#492B3E">${fmt(speedAt(R_OUT)*100,1)} cm/s</text>
      <text x="18" y="102" style="font:600 13px var(--mono);fill:${MINT}">INNER GROOVE · r = 6.0 cm</text><text x="18" y="128" style="font:600 22px var(--mono);fill:#492B3E">${fmt(speedAt(R_IN)*100,1)} cm/s</text>
      <text x="18" y="168" style="font:500 12px var(--mono);fill:#916A70">SAME rpm, DIFFERENT SPEED:</text><text x="18" y="188" style="font:500 12px var(--mono);fill:#916A70">BIGGER CIRCLE, MORE DISTANCE EACH TURN</text></g>`}
  o+=`<rect x="16" y="14" width="250" height="40" rx="8" fill="#fff" opacity=".92"/><text x="28" y="39" style="font:600 15px var(--mono);fill:#492B3E">${fmt(s.rpm,1)} rpm · ${fmt(period(),2)} s a turn</text>`;
  if(st.k==="pitch")o+=`<g transform="translate(470,268)"><rect width="300" height="64" rx="12" fill="#fff" stroke="#E3D3D8"/><text x="16" y="26" style="font:500 12px var(--mono);fill:#916A70">RECORDED ${fmt(s.f)} Hz (${noteOf(s.f)}) · YOU HEAR</text><text x="16" y="52" style="font:600 22px var(--mono);fill:${pitchRatio()>1.01?PINK:pitchRatio()<0.99?MINT:"#492B3E"}">${fmt(heard())} Hz · ${noteOf(heard())}</text></g>`;
  return o}
function circularScene(st){const R=s.format==="single"?100:160,T=turntable(220,215,R);let o=T.o;const [nx,ny]=T.needle;
  // the dust speck on the groove under the needle: velocity along the tangent, acceleration toward the centre
  const cx=220,cy=215,rp=s.r/RMAX()*R*0.98,a0=s.ang+Math.PI*0.3,px=cx+rp*Math.cos(a0),py=cy+rp*Math.sin(a0);
  o+=`<defs><marker id="vyArr" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8Z" fill="context-stroke"/></marker></defs>`;
  o+=`<circle cx="${cx}" cy="${cy}" r="${rp}" fill="none" stroke="${PINK}" stroke-dasharray="5 5"/><circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="7" fill="${MINT}" stroke="#fff" stroke-width="2"/>`;
  const vl=Math.min(120,vlin(s.r)*180),al=Math.min(110,acen(s.r)*40);
  o+=`<line x1="${px.toFixed(1)}" y1="${py.toFixed(1)}" x2="${(px-vl*Math.sin(a0)).toFixed(1)}" y2="${(py+vl*Math.cos(a0)).toFixed(1)}" stroke="${PINK}" stroke-width="3.5" marker-end="url(#vyArr)"/>`;
  o+=`<line x1="${px.toFixed(1)}" y1="${py.toFixed(1)}" x2="${(px-al*Math.cos(a0)).toFixed(1)}" y2="${(py-al*Math.sin(a0)).toFixed(1)}" stroke="${MINT}" stroke-width="3.5" marker-end="url(#vyArr)"/>`;
  o+=`<g transform="translate(470,60)"><rect width="300" height="${st.k==="formats"?260:210}" rx="14" fill="#fff" stroke="#E3D3D8"/>`;
  if(st.k==="omega")o+=`<text x="18" y="30" style="font:600 13px var(--mono);fill:${PINK}">ANGULAR VELOCITY ω = 2πf</text><text x="18" y="56" style="font:500 12px var(--mono);fill:#916A70">f = ${fmt(s.rpm,2)} ÷ 60 = ${fmt(rps(),3)} Hz</text><text x="18" y="86" style="font:600 22px var(--mono);fill:#492B3E">ω = ${fmt(omega(),2)} rad/s</text><text x="18" y="116" style="font:500 12px var(--mono);fill:#916A70">T = 2π ÷ ω = ${fmt(2*Math.PI/omega(),2)} s a turn</text><text x="18" y="150" style="font:600 13px var(--mono);fill:${MINT}">LEVEL 3: THE PLATTER</text><text x="18" y="172" style="font:500 12px var(--mono);fill:#916A70">I = ½MR² = ${fmt(I_PLATTER,4)} kg m² (1.5 kg, 0.15 m)</text><text x="18" y="192" style="font:500 12px var(--mono);fill:#916A70">L = Iω = ${fmt(I_PLATTER*omega(),3)} kg m²/s · Ek = ½Iω² = ${fmt(0.5*I_PLATTER*omega()*omega(),3)} J</text>`;
  else if(st.k==="centripetal")o+=`<text x="18" y="30" style="font:600 13px var(--mono);fill:${PINK}">SPEED ALONG THE GROOVE v = rω</text><text x="18" y="58" style="font:600 22px var(--mono);fill:#492B3E">${fmt(s.r,3)} × ${fmt(omega(),2)} = ${fmt(vlin(s.r),2)} m/s</text><text x="18" y="96" style="font:600 13px var(--mono);fill:${MINT}">CENTRIPETAL a = v²/r = ω²r</text><text x="18" y="124" style="font:600 22px var(--mono);fill:#492B3E">${fmt(acen(s.r),2)} m/s²</text><text x="18" y="156" style="font:500 12px var(--mono);fill:#916A70">toward the centre, always; the speck's speed</text><text x="18" y="174" style="font:500 12px var(--mono);fill:#916A70">is constant but its velocity keeps turning</text><text x="18" y="198" style="font:500 12px var(--mono);fill:#916A70">a 1 mg speck needs F = ma = ${(acen(s.r)*1e-6).toExponential(1)} N of grip</text>`;
  else o+=`<text x="18" y="30" style="font:600 13px var(--mono);fill:${PINK}">12-INCH LP · 33⅓ rpm · OUTER r = 0.146 m</text><text x="18" y="56" style="font:600 18px var(--mono);fill:#492B3E">ω = ${fmt(2*Math.PI*(100/3)/60,2)} rad/s · v = ${fmt(0.146*2*Math.PI*(100/3)/60,2)} m/s</text><text x="18" y="92" style="font:600 13px var(--mono);fill:${MINT}">7-INCH SINGLE · 45 rpm · OUTER r = 0.088 m</text><text x="18" y="118" style="font:600 18px var(--mono);fill:#492B3E">ω = ${fmt(2*Math.PI*45/60,2)} rad/s · v = ${fmt(0.088*2*Math.PI*45/60,2)} m/s</text><text x="18" y="152" style="font:500 12px var(--mono);fill:#916A70">faster spin, slower groove: v = rω</text><text x="18" y="172" style="font:500 12px var(--mono);fill:#916A70">scales with radius</text><text x="18" y="206" style="font:600 13px var(--mono);fill:${PINK}">YOUR NEEDLE NOW</text><text x="18" y="232" style="font:600 18px var(--mono);fill:#492B3E">r = ${fmt(s.r*100,1)} cm · v = ${fmt(vlin(s.r),2)} m/s</text><text x="18" y="252" style="font:500 12px var(--mono);fill:#916A70">${fmt(vlin(s.r)*1000)} mm of groove a second</text>`;
  o+=`</g><rect x="16" y="14" width="300" height="40" rx="8" fill="#fff" opacity=".92"/><text x="28" y="39" style="font:600 15px var(--mono);fill:#492B3E">${s.format==="single"?"7-inch single":"12-inch LP"} · ${fmt(s.rpm,1)} rpm · ω = ${fmt(omega(),2)} rad/s</text>`;
  return o}
function airScene(st){// a speaker pushing air: compressions and rarefactions travel at 343 m/s
  const W=800,y0=120,h=200,lamPx=Math.max(14,Math.min(700,V_AIR/s.f*180));let o=`<g transform="translate(40,${y0})"><rect x="0" y="40" width="60" height="120" rx="10" fill="#2a2a2e"/><circle cx="48" cy="100" r="${42+6*s.amp*Math.sin(s.phase)}" fill="#3a3540" stroke="${METAL}" stroke-width="3"/><circle cx="48" cy="100" r="12" fill="${PINK}"/></g>`;
  for(let i=0;i<420;i++){const gx=120+(i%42)*16,gy=y0+30+Math.floor(i/42)*15,dx=18*s.amp*Math.sin(2*Math.PI*(gx-120)/lamPx-s.phase);o+=`<circle cx="${gx+dx}" cy="${gy}" r="2.4" fill="#492B3E" opacity=".75"/>`}
  o+=`<line x1="120" x2="${120+lamPx}" y1="${y0+190}" y2="${y0+190}" stroke="${MINT}" stroke-width="3"/><text x="120" y="${y0+212}" style="font:600 13px var(--mono);fill:#492B3E">one wavelength λ = ${fmt(V_AIR/s.f,2)} m${lamPx>=700?" (longer than the screen)":""}</text>`;
  o+=`<rect x="16" y="14" width="330" height="40" rx="8" fill="#fff" opacity=".92"/><text x="28" y="39" style="font:600 15px var(--mono);fill:#492B3E">${fmt(s.f)} Hz · ${noteOf(s.f)} · ${st.k==="loud"?fmt(s.db)+" dB":"v = 343 m/s"}</text>`;
  return o}
// ---- close-ups
function wavePanel(){const w=420,h=260,ms=4,X=t=>46+t/ms*(w-60),Y=v=>130-v*80;let o=`<line x1="46" x2="${w-12}" y1="130" y2="130" stroke="var(--line)"/><line x1="46" x2="46" y1="30" y2="230" stroke="var(--ink)"/>`;
  let d="";for(let i=0;i<=400;i++){const t=i/400*ms;d+=(i?" L":"M")+X(t).toFixed(1)+","+Y(s.amp*Math.sin(2*Math.PI*heard()*t/1000)).toFixed(1)}o+=`<path d="${d}" fill="none" stroke="${PINK}" stroke-width="2.2"/>`;
  const T=1000/heard();if(T<ms){o+=`<line x1="${X(T/4)}" x2="${X(T/4+T)}" y1="${Y(s.amp)-12}" y2="${Y(s.amp)-12}" stroke="var(--ink)"/><text class="t-ink" x="${X(T/4)}" y="${Y(s.amp)-18}">period T = ${fmt(T,2)} ms</text>`}
  o+=`<line x1="${w-30}" x2="${w-30}" y1="130" y2="${Y(s.amp)}" stroke="${MINT}" stroke-width="2"/><text class="t-lab" x="${w-36}" y="${Y(s.amp)+14}" text-anchor="end">AMPLITUDE</text>`;
  o+=`<text class="t-lab" x="${w-12}" y="252" text-anchor="end">TIME (ms) · 4 ms SHOWN</text><text class="t-ink" x="54" y="24">f = 1 ÷ T = ${fmt(heard())} Hz</text>`;return o}
function keys(){const w=420,h=260;let o="";const base=48;const k0=Math.round(12*Math.log2(s.f/440))+57,k1=Math.round(12*Math.log2(heard()/440))+57;
  const white=[0,2,4,5,7,9,11];let x=12;const pos={};for(let n=base;n<base+36;n++){const pc=n%12;if(white.includes(pc)){pos[n]=x;o+=`<rect x="${x}" y="60" width="17" height="110" rx="3" fill="${n===k1?PINK:n===k0?LABEL2:"#fff"}" stroke="#bbb"/>`;x+=18}}
  for(let n=base;n<base+36;n++){const pc=n%12;if(!white.includes(pc)){const xx=pos[n-1]+12;o+=`<rect x="${xx}" y="60" width="11" height="68" rx="2" fill="${n===k1?PINK:n===k0?MINT:"#2a2a2e"}"/>`}}
  const semis=12*Math.log2(pitchRatio());
  o+=`<text class="t-ink" x="12" y="30">Speed ratio ${fmt(s.rpm,1)} ÷ ${fmt(s.disc,1)} = ${fmt(pitchRatio(),3)}</text><text class="t-ink" x="12" y="48">Pitch moves ${semis>=0?"up":"down"} ${fmt(Math.abs(semis),1)} semitones</text>`;
  o+=`<rect x="12" y="190" width="12" height="12" fill="${LABEL2}"/><text class="t-lab" x="30" y="200">RECORDED NOTE</text><rect x="150" y="190" width="12" height="12" fill="${PINK}"/><text class="t-lab" x="168" y="200">WHAT YOU HEAR</text>`;
  o+=`<text class="t-lab" x="12" y="232">EVERY OCTAVE DOUBLES THE FREQUENCY · ONE SEMITONE = ×1.059</text>`;return o}
function dbPanel(){const w=420,h=260,levels=[["Whisper",30],["Talking",60],["Busy café",75],["Lawnmower",90],["Earbuds at max",100],["Concert",110]];const X=d=>30+(d-20)/100*360;let o="";
  o+=`<line x1="30" x2="390" y1="150" y2="150" stroke="var(--ink)"/>`;levels.forEach(([n,d],i)=>{o+=`<line x1="${X(d)}" x2="${X(d)}" y1="144" y2="156" stroke="var(--ink)"/><text class="t-lab" x="${X(d)}" y="${i%2?178:132}" text-anchor="middle">${n.toUpperCase()} ${d}</text>`});
  o+=`<rect x="${X(80)}" y="186" width="${X(120)-X(80)}" height="10" fill="${PINK}" opacity=".35"/><text class="t-lab" x="${X(80)}" y="214">WHO SAFE LISTENING: ABOUT 80 dB FOR UP TO 40 H A WEEK (ADULTS)</text>`;
  o+=`<circle cx="${X(s.db)}" cy="150" r="8" fill="${PINK}" stroke="#fff" stroke-width="2"/><text class="t-ink" x="${X(s.db)}" y="104" text-anchor="middle" style="font-weight:600">${fmt(s.db)} dB</text>`;
  const safeH=40*Math.pow(2,-(s.db-80)/3);o+=`<text class="t-ink" x="30" y="34">Every +3 dB doubles the sound energy,</text><text class="t-ink" x="30" y="52">so the safe time halves: at ${fmt(s.db)} dB about ${safeH>=1?fmt(safeH,0)+" h":fmt(safeH*60,0)+" min"} a week.</text>`;return o}
function circlePanel(){const C_out=2*Math.PI*R_OUT,C_in=2*Math.PI*R_IN;return `<text class="t-lab" x="16" y="28">ONE TURN = ONE CIRCUMFERENCE, C = 2πr</text>
  <text class="t-ink" x="16" y="60">Outer: 2 × π × 0.146 = ${fmt(C_out,3)} m a turn</text><text class="t-ink" x="16" y="82">Inner: 2 × π × 0.060 = ${fmt(C_in,3)} m a turn</text>
  <text class="t-lab" x="16" y="116">TURNS A SECOND = rpm ÷ 60 = ${fmt(rps(),3)}</text>
  <text class="t-ink" x="16" y="146">Speed = C × turns a second</text><text class="t-ink" x="16" y="168">Outer: ${fmt(C_out,3)} × ${fmt(rps(),3)} = ${fmt(speedAt(R_OUT),3)} m/s</text><text class="t-ink" x="16" y="190">Inner: ${fmt(C_in,3)} × ${fmt(rps(),3)} = ${fmt(speedAt(R_IN),3)} m/s</text>
  <text class="t-lab" x="16" y="224">A 20-MINUTE SIDE ≈ ${fmt(20*s.rpm)} TURNS</text>`}
// ---- steps
const steps=[
 {k:"spin",lab:"Spin it",cap:"A record turns at 33⅓ revolutions per minute. Every groove takes the same time to go round, but the outer groove has further to travel.",speed:1,speedLabel:"real time",controls:["play","rpm"],
  big:"<b>The big idea:</b> one turn covers one circumference, C = 2πr. Same turns a second, bigger circle, faster speed.",
  exam:"At 33⅓ rpm the record makes 33⅓ ÷ 60 = 0.556 turns a second. The outer groove (r = 0.146 m) has a circumference of 2π × 0.146 = 0.917 m, so it moves at 0.917 × 0.556 ≈ 0.51 m/s. The inner groove (r = 0.06 m) moves at only 0.21 m/s.",
  trap:"Using the diameter in C = 2πr. Use the radius, or use C = πd.",chips:["rpm","period","outer","inner"]},
 {k:"groove",lab:"The groove is a wave",cap:"Under the magnifier, the groove wiggles. One full wiggle is one wavelength. Higher notes squeeze more wiggles into each millimetre.",speed:1,speedLabel:"slowed down",controls:["play","f","needle","hear"],
  big:"<b>The big idea:</b> wave speed = frequency × wavelength (v = fλ). Here the 'wave speed' is how fast the groove passes the needle.",
  exam:"The groove passes the needle at about 0.51 m/s near the edge. For a 440 Hz note, the wavelength in the groove is λ = v ÷ f = 0.51 ÷ 440 ≈ 0.0012 m, about 1.2 mm. Near the centre the groove moves slower, so the same note is squeezed into a shorter wavelength.",
  trap:"Mixing up frequency and wavelength. Higher frequency means a shorter wavelength when the speed is the same.",chips:["f","heard","lambda","gspeed"]},
 {k:"pitch",lab:"Sped-up songs",cap:"Play a 33⅓ record at 45 rpm and everything happens 1.35 times faster: every frequency goes up, so every note sounds higher. That's how a sped-up song works.",speed:1,speedLabel:"slowed down",controls:["play","rpm","f","hear"],
  big:"<b>The big idea:</b> pitch depends on frequency. Speed the record up by a ratio and every frequency is multiplied by the same ratio.",
  exam:"Playing a 33⅓ rpm record at 45 rpm multiplies every frequency by 45 ÷ 33⅓ = 1.35. A 440 Hz note (A) is heard at 440 × 1.35 = 594 Hz, about five semitones higher (near D). Higher frequency means higher pitch.",
  trap:"Thinking louder means higher. Loudness is amplitude; pitch is frequency.",chips:["ratio","f","heard","note"]},
 {k:"air",lab:"Sound in the air",cap:"The speaker pushes the air back and forth. Bunched-up air (compressions) and spread-out air (rarefactions) travel away at 343 m/s. Slide the frequency and watch the wavelength change.",speed:1,speedLabel:"slowed down",controls:["play","f","amp","hear"],
  big:"<b>The big idea:</b> sound is a longitudinal wave: air particles vibrate back and forth in the same direction the wave travels. v = fλ.",
  exam:"Sound is a longitudinal wave: air particles vibrate parallel to the direction the wave travels, making compressions and rarefactions. The speed of sound in air is about 343 m/s, so a 440 Hz note has a wavelength of λ = v ÷ f = 343 ÷ 440 ≈ 0.78 m.",
  trap:"Thinking the air itself travels from the speaker to your ear. The particles vibrate in place; the energy travels.",chips:["f","lambda","amp"]},
 {k:"loud",lab:"Loud and safe",cap:"Bigger vibrations mean more energy and a louder sound, measured in decibels. Every 3 dB more doubles the energy, so your safe listening time halves.",speed:1,speedLabel:"slowed down",controls:["play","db","hear"],
  big:"<b>The big idea:</b> loudness depends on amplitude. Decibels are a scale where +10 dB is ten times the sound energy.",
  exam:"A louder sound has a larger amplitude, so the particles vibrate further and carry more energy. On the decibel scale each increase of 10 dB is ten times the sound energy, and about +3 dB doubles it, so the safe listening time halves.",
  trap:"Thinking 100 dB is only a bit more than 80 dB. It is about 100 times the sound energy.",chips:["db","safe"]},
 {k:"omega",lab:"NCEA: angular velocity",cap:"Level 2 and 3. Physicists measure spin in radians a second: ω = 2πf. Show that 33⅓ rpm is about 3.5 rad/s. The pink arrow is the velocity of a dust speck on the groove; the mint arrow is its acceleration.",speed:1,speedLabel:"real time",controls:["play","rpm"],
  big:"<b>The big idea:</b> one turn is 2π radians, so ω = 2πf = 2π ÷ T. Level 3 adds the platter's rotational inertia I = ½MR², angular momentum L = Iω and rotational kinetic energy ½Iω².",
  exam:"f = 33.33 ÷ 60 = 0.556 Hz, so ω = 2πf = 2π × 0.556 = 3.49 rad s⁻¹. The period is T = 1 ÷ f = 1.8 s. (Level 3: a 1.5 kg, 0.15 m platter has I = ½MR² = 0.017 kg m², so L = Iω = 0.059 kg m² s⁻¹.)",
  trap:"Putting rpm straight into ω. Divide by 60 for revolutions a second, then multiply by 2π for radians a second.",chips:["rpm","omega","period"]},
 {k:"centripetal",lab:"NCEA: centripetal acceleration",cap:"A dust speck on the outer groove moves at v = rω and, because its direction keeps changing, it accelerates toward the centre at a = v²/r. Move the needle and watch both arrows.",speed:1,speedLabel:"real time",controls:["play","rpm","needle"],
  big:"<b>The big idea:</b> uniform circular motion has constant speed but changing velocity, so there is an acceleration, toward the centre, of size v²/r = ω²r. Something must supply the force (friction, for the speck).",
  exam:"v = rω = 0.146 × 3.49 = 0.51 m s⁻¹. a = v² ÷ r = 0.51² ÷ 0.146 ≈ 1.78 m s⁻², directed toward the centre of the record. The friction between the speck and the vinyl provides the centripetal force F = ma.",
  trap:"Drawing the acceleration along the velocity. In uniform circular motion the acceleration is perpendicular to the velocity, pointing at the centre.",chips:["omega","vlin","acen"]},
 {k:"formats",lab:"NCEA: LP vs single",cap:"A 7-inch single spins faster (45 rpm) but its outer groove is at only r = 0.088 m. Compare the track speed with the LP's, then use v = rω to explain why inner grooves carry less information per second.",speed:1,speedLabel:"real time",controls:["play","format","needle"],
  big:"<b>The big idea:</b> v = rω: at the same ω, speed scales with radius. More groove passing the stylus each second means more room for waveform detail, which is why engineers keep the loudest tracks near the outer edge.",
  exam:"Single: ω = 2π × 45 ÷ 60 = 4.71 rad s⁻¹, v = rω = 0.088 × 4.71 = 0.41 m s⁻¹, slower than the LP's outer groove (0.51 m s⁻¹) despite the faster spin, because v = rω scales with radius. On any record the inner grooves pass the stylus at lower v, so fewer metres of groove pass each second and less waveform detail fits: inner grooves carry less information per second.",
  trap:"Assuming faster rpm means a faster groove. Compare rω, not ω: a small record at 45 rpm can be slower at the edge than a big one at 33⅓.",chips:["format","omega","vlin","mmps"]},
 {k:"test",lab:"Test yourself",cap:"Six challenges: three on sound, three on circular motion. Use the controls, then press Check.",controls:["rpm","format","f","needle","db","hear"],chips:["rpm","f","heard","lambda","omega","acen"],
  big:"<b>Exam tip:</b> write the formula, put the numbers in with units, then say what it means: \"so the note sounds higher\"."}];
// ---- kupu Māori: te reo terms for this machine, each checked in Te Aka Māori Dictionary (ta = word id). Sources and notes: te-reo-notes.md
const KUPU=[
 {mi:"oro",en:"sound",ta:4804},
 {mi:"ngaru",en:"wave",ta:4584},
 {mi:"ngaru pou",en:"longitudinal wave",ta:40248},
 {mi:"auau",en:"frequency",ta:523,chip:["f", "heard"]},
 {mi:"hauoro",en:"pitch (of a sound)",ta:39275},
 {mi:"tōiriiri",en:"vibration",ta:15290},
 {mi:"kahaoro",en:"volume, loudness",ta:45548,chip:"db"},
 {mi:"pūngao oro",en:"sound energy",ta:47724}];
Object.entries({"groove": ["ngaru", "auau", "tōiriiri"], "pitch": ["auau", "hauoro"], "air": ["oro", "ngaru pou", "tōiriiri", "pūngao oro"], "loud": ["kahaoro", "oro"], "omega": ["auau"], "centripetal": ["auau"]}).forEach(([k,a])=>{const st=steps.find(x=>x.k===k);if(st)st.kupu=a});
StudyKit.mount({kupu:KUPU,caseTint:"blush",
  eyebrow:"Science and maths · Waves, sound and circles", title:"The vinyl machine", crumb:"Year 9 and 10 Science (waves and sound) and Maths (circles, rates and ratios), plus three NCEA Level 2–3 steps on circular motion (AS91171, AS91524)", homeHash:"y10",
  fig:"FIG. 11 · A TURNTABLE, A GROOVE AND A SPEAKER", railTitle:"From groove to ear",
  badge:{label:"Years 9–11 · NCEA L2 91171 · L3 91524"},
  mainBox:"0 0 800 420", mainPhoneBig:true, mainLabel:"A turntable with a record spinning, a magnifier showing the groove's wiggles, and a speaker pushing air", closeBox:"0 0 420 260",
  state:s, steps, onStep:(x,st)=>{s.step=st.k},
  controls:[{type:"play"},
    {type:"select",id:"rpm",label:"Turntable",options:[["33.333","33⅓ rpm"],["45","45 rpm"],["78","78 rpm"],["25","25 rpm (slowed)"]],get:()=>String(s.rpm>33&&s.rpm<34?"33.333":s.rpm),set:(x,v)=>{s.rpm=v==="33.333"?100/3:+v}},
    {type:"range",id:"f",label:"Note recorded",min:55,max:1760,step:1,get:()=>s.f,set:(x,v)=>{s.f=v},fmt:()=>`${fmt(s.f)} Hz · ${noteOf(s.f)}`},
    {type:"range",id:"needle",label:"Needle position",min:6,max:14.6,step:0.1,get:()=>s.r*100,set:(x,v)=>{s.r=Math.min(v/100,RMAX())},fmt:()=>`${fmt(s.r*100,1)} cm from centre`},
    {type:"range",id:"amp",label:"Volume (amplitude)",min:0.1,max:1,step:0.05,get:()=>s.amp,set:(x,v)=>{s.amp=v},fmt:()=>Math.round(s.amp*100)+"%"},
    {type:"range",id:"db",label:"Loudness",min:30,max:110,step:1,get:()=>s.db,set:(x,v)=>{s.db=v;s.amp=Math.min(1,0.1+(v-30)/90)},fmt:()=>s.db+" dB"},
    {type:"button",id:"hear",label:"▶ Hear it",onClick:()=>beep(heard(),s.amp)},
    {type:"select",id:"format",label:"Record",options:[["lp","12-inch LP at 33⅓"],["single","7-inch single at 45"]],get:()=>s.format,set:(x,v)=>{s.format=v;if(v==="single"){s.rpm=45;s.disc=45;s.r=Math.min(s.r,R_SINGLE)}else{s.rpm=100/3;s.disc=100/3}}}],
  tick:(x,dt,st)=>{const slow=st.k==="spin"?1:0.0025;s.ang+=2*Math.PI*rps()*dt;s.phase+=2*Math.PI*Math.min(heard(),900)*dt*slow*(st.k==="air"||st.k==="loud"?1:1);s.t+=dt},
  drawMain:(x,st)=>drawMain(st),
  drawClose:(x,st)=>st.k==="spin"?circlePanel():st.k==="pitch"?keys():st.k==="loud"?dbPanel():wavePanel(),
  chips:()=>({rpm:["SPEED",fmt(s.rpm,1)+" rpm"],period:["ONE TURN",fmt(period(),2)+" s"],outer:["OUTER GROOVE",fmt(speedAt(R_OUT),2)+" m/s",true],inner:["INNER GROOVE",fmt(speedAt(R_IN),2)+" m/s"],
    f:["RECORDED",`${fmt(s.f)} Hz`],heard:["YOU HEAR",`${fmt(heard())} Hz · ${noteOf(heard())}`,true],ratio:["RATIO",fmt(pitchRatio(),3)],note:["SEMITONES",(12*Math.log2(pitchRatio())>=0?"+":"")+fmt(12*Math.log2(pitchRatio()),1)],
    lambda:["WAVELENGTH",["air","loud"].includes(s.step)?fmt(V_AIR/s.f,2)+" m in air":fmt(speedAt(s.r)/s.f*1000,2)+" mm in groove",true],gspeed:["GROOVE SPEED",fmt(speedAt(s.r),2)+" m/s"],
    amp:["AMPLITUDE",Math.round(s.amp*100)+"%"],db:["LOUDNESS",s.db+" dB",true],safe:["SAFE A WEEK",(()=>{const h=40*Math.pow(2,-(s.db-80)/3);return h>=1?fmt(h,0)+" h":fmt(h*60,0)+" min"})()],
    omega:["ω = 2πf",fmt(omega(),2)+" rad/s",true],vlin:["v = rω",fmt(vlin(s.r),2)+" m/s",true],acen:["a = v²/r",fmt(acen(s.r),2)+" m/s²",true],format:["RECORD",s.format==="single"?"7-inch · 45 rpm":"12-inch · 33⅓ rpm"],mmps:["GROOVE A SECOND",fmt(vlin(s.r)*1000)+" mm"]}),
  challenges:[
    {q:"Play a 33⅓ record so that a 440 Hz A is heard at about 594 Hz.",check:()=>Math.abs(heard()-594)<4,ok:()=>`Yes: 440 × ${fmt(pitchRatio(),3)} = ${fmt(heard())} Hz. That's 45 ÷ 33⅓ = 1.35.`,no:()=>`Not yet: you hear ${fmt(heard())} Hz. Which turntable speed multiplies 440 by 1.35?`},
    {q:"Find a needle position where a 1000 Hz note is exactly 0.30 mm long in the groove (33⅓ rpm).",check:()=>Math.abs(s.rpm-100/3)<0.01&&s.f===1000&&Math.abs(speedAt(s.r)/s.f*1000-0.30)<0.02,ok:()=>`Yes: λ = v ÷ f = ${fmt(speedAt(s.r),3)} ÷ 1000 = ${fmt(speedAt(s.r)/s.f*1000,2)} mm at ${fmt(s.r*100,1)} cm.`,no:()=>s.f!==1000||Math.abs(s.rpm-100/3)>0.01?"Set 33⅓ rpm and a 1000 Hz note first.":`Not yet: ${fmt(speedAt(s.r)/s.f*1000,2)} mm. Move the needle: closer to the centre is slower and shorter.`},
    {q:"Set the loudness where the safe listening time is about 10 hours a week.",check:()=>Math.abs(40*Math.pow(2,-(s.db-80)/3)-10)<2,ok:()=>`Yes: ${s.db} dB. From 80 dB, +6 dB is two doublings, so 40 h ÷ 4 = 10 h.`,no:()=>`Not yet: ${s.db} dB allows about ${fmt(40*Math.pow(2,-(s.db-80)/3),1)} h. Each +3 dB halves the time from 40 h at 80 dB.`},
    {q:"NCEA: set the turntable so the angular velocity is about 4.7 rad/s.",check:()=>Math.abs(omega()-4.71)<0.1,ok:()=>`Yes: ${fmt(s.rpm,1)} rpm = ${fmt(rps(),3)} Hz, ω = 2π × ${fmt(rps(),3)} = ${fmt(omega(),2)} rad/s.`,no:()=>`Not yet: ω = ${fmt(omega(),2)} rad/s at ${fmt(s.rpm,1)} rpm. Which speed gives f = 4.7 ÷ 2π = 0.75 Hz?`},
    {q:"NCEA: on the LP at 33⅓ rpm, put the needle where the centripetal acceleration is 1.0 m/s².",check:()=>s.format==="lp"&&Math.abs(s.rpm-100/3)<0.01&&Math.abs(acen(s.r)-1.0)<0.03,ok:()=>`Yes: a = ω²r = ${fmt(omega(),2)}² × ${fmt(s.r,3)} = ${fmt(acen(s.r),2)} m/s² at ${fmt(s.r*100,1)} cm.`,no:()=>s.format!=="lp"||Math.abs(s.rpm-100/3)>0.01?"Choose the 12-inch LP at 33⅓ first.":`Not yet: ${fmt(acen(s.r),2)} m/s² at ${fmt(s.r*100,1)} cm. a = ω²r, so r = 1.0 ÷ ${fmt(omega()*omega(),2)} = ${fmt(100/(omega()*omega()),1)} cm.`},
    {q:"NCEA: find the LP needle position (33⅓ rpm) where the groove speed equals the 7-inch single's outer groove at 45 rpm.",check:()=>s.format==="lp"&&Math.abs(s.rpm-100/3)<0.01&&Math.abs(vlin(s.r)-R_SINGLE*2*Math.PI*0.75)<0.012,ok:()=>`Yes: the single's edge moves at 0.088 × 4.71 = ${fmt(R_SINGLE*2*Math.PI*0.75,2)} m/s; on the LP that is r = v ÷ ω = ${fmt(R_SINGLE*2*Math.PI*0.75/omega()*100,1)} cm, well inside the edge.`,no:()=>s.format!=="lp"||Math.abs(s.rpm-100/3)>0.01?"Choose the 12-inch LP at 33⅓ first.":`Not yet: ${fmt(vlin(s.r),2)} m/s at ${fmt(s.r*100,1)} cm. The single's edge does 0.41 m/s; r = v ÷ ω.`}],
  papers:[{label:"NZQA: Physics, Earth and Space Science",url:"https://www2.nzqa.govt.nz/ncea/subjects/past-exams-and-exemplars/physics-earth-and-space-science/"},{label:"NZQA: Mathematics and Statistics",url:"https://www2.nzqa.govt.nz/ncea/subjects/past-exams-and-exemplars/"},{label:"NZQA: L2 Physics 91171 (mechanics)",url:"https://www.nzqa.govt.nz/ncea/assessment/view-detailed.do?standardNumber=91171"},{label:"NZQA: L3 Physics 91524 (mechanical systems)",url:"https://www.nzqa.govt.nz/ncea/assessment/view-detailed.do?standardNumber=91524"}],
  truth:"The NCEA steps use the practice pack's radii (0.146 m LP, 0.088 m single); the platter's 1.5 kg and 0.15 m for the Level 3 figures are estimates. A 12-inch LP with grooves from about 14.6 cm to 6.0 cm from the centre. Speed of sound 343 m/s (air at 20°C). Safe listening uses the WHO guide of about 80 dB for up to 40 hours a week for adults (lower for children), halving for every 3 dB louder. The groove drawing is exaggerated so you can see it, and the waves are slowed down.",
  footer:"Covers Year 9–10 waves and sound (frequency, wavelength, amplitude, v = fλ, longitudinal waves, decibels) and maths (circumference, rates, ratios). Waves ideas lead into NCEA physics. The three NCEA steps cover circular motion for L2 AS91171 (ω = 2πf, v = rω, a = v²/r) and the rotational ideas of L3 AS91524 (I, L = Iω, ½Iω²)."
});
})();
