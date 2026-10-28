/* Adapted from assemblnz-f0afd79d/public/generative-studio/index.html
 * Source blob 13867b18b6a2e5bc4be482cf8890d8da6af3f226. Owner-authorised reuse.
 * See living-provenance.md for changes and dependency notices. */
let W=1000,H=700,t=0,agents=[],dataRows=[],glyphPts=[],attPts=[],murmurPts=[],sumiDrops=[],asciiGrid=[];
const ASCII_RAMP=' .,:;i1tfLCG08@';
let PAPER='#F7F3EC',PLUM='#222A55',GRAPHITE='#4A5070',ROSE='#2A7D63',CHALK='#ffffff';
let CW={bg:PAPER,ink:PLUM,accent:ROSE};
const state={seed:42,particles:1100,turbulence:.65,trails:.92,assemble:.28,cells:8,tension:.4,warp:.65,density:.7,text:'create',kineticText:'create',asciiText:'create',asciiSize:.65,attA:-1.4,attB:1.6,attC:1,attD:.7,ringGap:.5};
function rgba(hex,a){
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
}

function fbm(x,y,oct=4){
  let v=0,a=1,f=1,s=0;
  for(let i=0;i<oct;i++){ v+=noise(x*f,y*f)*a; s+=a; a*=0.5; f*=2; }
  return v/s;
}

function bootBraid(){
  agents = [];
  const n = state.particles;
  for(let i=0;i<n;i++){
    agents.push({
      x: random(W), y: random(H),
      px:null, py:null,
      tx:0, ty:0, target:null,
      sp: random(0.6, 2.2),
      tone: random()<0.82 ? 'graphite' : 'plum',
      life: random(120, 480),
    });
  }
  // lattice targets — gentle asymmetric grid, right-of-centre
  const cols = Math.max(6, Math.floor(Math.sqrt(n)*1.1));
  const rows = Math.ceil(n/cols);
  const gx = W*0.18, gy = H*0.2, gw = W*0.66, gh = H*0.6;
  let ti = 0;
  for(const a of agents){
    const c = ti % cols, r = Math.floor(ti/cols);
    a.tx = gx + (c/(cols-1))*gw + random(-4,4);
    a.ty = gy + (r/(rows-1))*gh + random(-4,4);
    ti++;
  }
}

function drawBraid(){
  t += 0.008;
  // chalk fade — trail length by state.trails
  noStroke();
  fill(rgba(PAPER, 1 - state.trails*0.92));
  rect(0,0,W,H);

  // assembly ramps over ~14s so the reveal reads: friction -> journey -> proof
  const ramp = Math.min(1, t/0.19);
  const asm = state.assemble * ramp;
  const turb = state.turbulence;

  for(const a of agents){
    const dx = a.tx - a.x, dy = a.ty - a.y;
    const d = Math.sqrt(dx*dx+dy*dy) + 0.001;
    const settled = d < 3;

    if(!settled){
      const na = fbm(a.x*0.0016, a.y*0.0016 + t, 3) * Math.PI*4;
      const flowAmp = a.sp * (0.35 + turb) * (1 - asm*0.85);
      const pull = asm * Math.min(1, d/160) * a.sp * 2.4;
      a.px = a.x; a.py = a.y;
      a.x += Math.cos(na)*flowAmp + (dx/d)*pull;
      a.y += Math.sin(na)*flowAmp + (dy/d)*pull;

      // bolder strokes — weight by distance from target (drama of the journey)
      const journey = 1 - Math.min(1, d/400);
      const w = 0.8 + journey*2.2 + (a.tone==='plum' ? 0.8 : 0);
      strokeWeight(w);
      strokeCap(ROUND);
      const alpha = 0.55 + journey*0.3;
      if(a.tone==='plum') stroke(rgba(PLUM, alpha));
      else stroke(rgba(GRAPHITE, alpha*0.75));
      line(a.px, a.py, a.x, a.y);

      a.life--;
      if(a.life<=0 && asm < 0.5){
        a.x = random(W); a.y = random(H); a.px=null; a.py=null; a.life = random(240,720);
      }
      if(a.life<=0 && asm >= 0.98){ a.life = 999999; }
    } else {
      a.x = a.tx + Math.sin(t*3 + a.ty)*0.4; a.y = a.ty;
      strokeWeight(1.2);
      stroke(a.tone==='plum' ? rgba(PLUM,0.95) : rgba(GRAPHITE,0.6));
      if(a.px!==null) line(a.px, a.py, a.x, a.y);
      a.px = a.x; a.py = a.y;
    }
  }
  // proof marks — lattice nodes where settled
  noStroke(); fill(rgba(PLUM,0.6));
  for(let i=0;i<agents.length;i+=37){
    const a=agents[i];
    if(Math.abs(a.x-a.tx)<2) circle(a.tx, a.ty, 2.5);
  }
}

function bootLattice(){
  // generate a plausible proof series (or parse later)
  dataRows = [];
  const n = 48;
  let v = 30;
  for(let i=0;i<n;i++){
    v += random(-8, 10); v = Math.max(6, Math.min(95, v));
    dataRows.push(v);
  }
  background(PAPER);
}

function drawLattice(){
  background(PAPER);
  t += 0.01;
  const n = dataRows.length;
  const cols = Math.max(3, state.cells);
  const margin = W*0.12;
  const gw = (W - margin*2)/cols;

  for(let c=0;c<cols;c++){
    const cx = margin + c*gw + gw/2;
    const colH = H*0.62;
    const top = H*0.2;
    // ribbon width modulated by data + tension
    for(let i=0;i<n;i++){
      const yy = top + (i/(n-1))*colH;
      const dv = dataRows[(i + c*7) % n]/100;
      const sway = Math.sin(t*0.8 + i*0.32 + c*1.7) * (1-state.tension) * gw*0.42;
      const wob = fbm(c*3.1, i*0.14 + t*0.15, 3) * gw*0.3 * state.warp;
      const w = (2 + dv*gw*0.5) * (0.5 + state.density);
      const x = cx + sway + wob - w/2;
      const isPlum = ((i + c) % 9 === 0);
      noStroke();
      fill(isPlum ? rgba(PLUM, 0.85) : rgba(GRAPHITE, 0.16 + dv*0.5));
      rect(x, yy, w, colH/n*0.62, 3);
      // evidence tick on plum rows
      if(isPlum){
        fill(rgba(PLUM,0.9));
        rect(cx + sway + wob + w/2 + 6, yy + 1, 14, 2);
      }
    }
  }
  // baseline rule
  stroke(rgba(PLUM,0.5)); strokeWeight(1);
  line(margin, H*0.86, W-margin, H*0.86);
  noStroke(); fill(rgba(GRAPHITE,0.55));
  textFont('IBM Plex Mono'); textSize(9); textAlign(LEFT);
  text('generated series · n='+n+' · art, not measured data', margin, H*0.86+18);
}

function bootGlyph(){
  glyphPts = [];
  agents = [];
  const pg = createGraphics(W, H);
  pg.pixelDensity(1);
  pg.background(255);
  pg.fill(0);
  pg.noStroke();
  pg.textFont('Instrument Sans');
  const txt = (state.text||'assembl').toLowerCase().slice(0,14);
  let size = Math.min(W*0.9, (W*1.6)/Math.max(3,txt.length));
  pg.textSize(size);
  // shrink to fit
  while(pg.textWidth(txt) > W*0.86 && size > 20){ size *= 0.94; pg.textSize(size); }
  pg.textAlign(CENTER, CENTER);
  pg.text(txt, W/2, H/2);
  pg.loadPixels();
  const gap = Math.max(3, Math.floor(W/320));
  for(let y=0;y<H;y+=gap){
    for(let x=0;x<W;x+=gap){
      const idx = 4*(y*W+x);
      if(pg.pixels[idx] < 100) glyphPts.push({x, y});
    }
  }
  pg.remove();
  if(glyphPts.length === 0) return;
  const n = Math.min(glyphPts.length, Math.floor(state.particles*1.6));
  for(let i=0;i<n;i++){
    const target = glyphPts[Math.floor(random(glyphPts.length))];
    agents.push({
      x: random(W), y: random(H),
      vx: random(-1,1), vy: random(-1,1),
      tx: target.x + random(-1,1), ty: target.y + random(-1,1),
      r: random(0.8, 2.6),
      plum: random() < 0.9,
      delay: Math.floor(random(0, 90)),
      frame: 0,
    });
  }
}

function drawGlyph(){
  t += 0.01;
  noStroke(); fill(rgba(PAPER, 0.16)); rect(0,0,W,H);
  const asm = state.assemble;
  noStroke();
  for(const a of agents){
    a.frame++;
    if(a.frame < a.delay) continue;
    const dx = a.tx - a.x, dy = a.ty - a.y;
    const d = Math.sqrt(dx*dx+dy*dy)+0.001;
    // spring toward target + swirl that dies out near the target
    const k = 0.045 * asm;
    const swirlAmp = state.turbulence * Math.min(1, d/240) * 0.5;
    a.vx += dx*k + Math.sin(t*2 + a.ty*0.02)*swirlAmp;
    a.vy += dy*k + Math.cos(t*2 + a.tx*0.02)*swirlAmp;
    a.vx *= 0.82; a.vy *= 0.82;
    a.x += a.vx; a.y += a.vy;
    const settled = d < 4;
    fill(a.plum ? rgba(PLUM, settled?0.9:0.5) : rgba(GRAPHITE, settled?0.7:0.35));
    circle(a.x, a.y, a.r);
  }
}

function bootAttract(){
  attPts = [];
  const n = Math.floor(state.particles * 1.4);
  for(let i=0;i<n;i++) attPts.push({ x: random(-2,2), y: random(-2,2) });
  background(PAPER);
}

function drawAttract(){
  t += 0.01;
  noStroke(); fill(rgba(PAPER, 0.045)); rect(0,0,W,H);
  const {attA:a, attB:b, attC:c, attD:d} = state;
  // slow drift of coefficients = the bloom breathes
  const aa = a + Math.sin(t*0.7)*0.12;
  const bb = b + Math.cos(t*0.5)*0.12;
  const sc = Math.min(W,H)*0.21;
  strokeWeight(1.6);
  for(let k=0;k<attPts.length;k++){
    const p = attPts[k];
    const nx = Math.sin(aa*p.y) + c*Math.cos(aa*p.x);
    const ny = Math.sin(bb*p.x) + d*Math.cos(bb*p.y);
    // colour by iteration depth — rose young, plum ancient, high contrast
    const age = (k/attPts.length + t*0.03) % 1;
    const px = W/2 + nx*sc, py = H/2 + ny*sc;
    stroke(age < 0.3 ? rgba(ROSE, 0.55) : age < 0.65 ? rgba(PLUM, 0.6) : rgba(GRAPHITE, 0.42));
    const ox = W/2 + p.x*sc, oy = H/2 + p.y*sc;
    point(px, py);
    p.x = nx; p.y = ny;
  }
}

function bootInk(){
  background(PAPER);
  t = 0;
  state._inkR = 0;
  state._inkCx = W*0.5 + random(-W*0.06, W*0.06);
  state._inkCy = H*0.5 + random(-H*0.06, H*0.06);
}

function drawInk(){
  t += 0.012;
  const cx = state._inkCx, cy = state._inkCy;
  const maxR = Math.min(W,H)*0.46;
  if(state._inkR > maxR){ state._inkR = 0; background(rgba(PAPER,1)); return; }
  state._inkR += 0.55 + state.density*0.8;
  const r = state._inkR;
  const gap = state.ringGap;
  const wobAmp = 1.5 + state.warp*22;
  const steps = Math.max(48, Math.floor(r*1.4));
  // one ring per frame — plum core years, rose sap years
  const year = Math.floor(r / (6 + gap*14));
  const isRose = (year % 4 === 2);
  const lw = 0.6 + fbm(r*0.02, t, 2)*2.2;
  stroke(isRose ? rgba(ROSE, 0.5) : rgba(PLUM, 0.55));
  strokeWeight(lw);
  noFill();
  beginShape();
  for(let i=0;i<=steps;i++){
    const a = (i/steps)*Math.PI*2;
    const wob = fbm(Math.cos(a)*1.6 + r*0.015, Math.sin(a)*1.6 - r*0.011, 4) * wobAmp;
    const rr = r + wob + Math.sin(a*7 + r*0.05)*0.7;
    vertex(cx + Math.cos(a)*rr, cy + Math.sin(a)*rr);
  }
  endShape(CLOSE);
  // drought rings — occasional tight dark bands
  if(year % 9 === 5){
    stroke(rgba(GRAPHITE, 0.3)); strokeWeight(0.5);
    beginShape();
    for(let i=0;i<=steps;i++){
      const a=(i/steps)*Math.PI*2;
      const rr = r - 2.5 + fbm(Math.cos(a)*2, Math.sin(a)*2, 2)*3;
      vertex(cx + Math.cos(a)*rr, cy + Math.sin(a)*rr);
    }
    endShape(CLOSE);
  }
}

function bootMurmur(){
  murmurPts = [];
  agents = [];
  const txt = (state.kineticText || 'assembl').toLowerCase().slice(0,10);
  const pg = createGraphics(W, H);
  pg.pixelDensity(1);
  pg.background(255,253,251);
  pg.fill(36,11,33);
  pg.noStroke();
  pg.textFont('Instrument Sans');
  let size = Math.min(H*0.5, W*1.3/Math.max(2, txt.length*0.6));
  pg.textSize(size);
  while(pg.textWidth(txt) > W*0.85 && size > 20){ size *= 0.93; pg.textSize(size); }
  pg.textAlign(CENTER, CENTER);
  pg.text(txt, W/2, H/2);
  pg.loadPixels();
  const gap = Math.max(4, Math.floor(W/280));
  for(let y=0;y<H;y+=gap){
    for(let x=0;x<W;x+=gap){
      const idx = 4*(y*W+x);
      if(pg.pixels[idx] < 100) murmurPts.push({x, y});
    }
  }
  pg.remove();
  const n = Math.min(murmurPts.length, Math.floor(600+state.density*1800));
  for(let i=0;i<n;i++){
    const target = murmurPts[Math.floor(random(murmurPts.length))];
    agents.push({
      x: random(W), y: random(H),
      vx: random(-2,2), vy: random(-2,2),
      tx: target.x, ty: target.y,
      ph: random(Math.PI*2),
      sp: random(0.8, 2.0),
    });
  }
  background(CW.bg);
}

function drawMurmur(){
  t += 0.012;
  const cycle = (t*0.15) % 1;
  const assemble = cycle < 0.4 ? cycle/0.4 : (cycle < 0.6 ? 1 : 1-(cycle-0.6)/0.4);
  noStroke(); fill(rgba(CW.bg, 0.08)); rect(0,0,W,H);
  for(const a of agents){
    const dx = a.tx - a.x, dy = a.ty - a.y;
    const d = Math.sqrt(dx*dx+dy*dy)+0.001;
    if(assemble > 0.1){
      const k = 0.03 * assemble;
      a.vx += dx*k + Math.sin(t*3 + a.ph)*0.3*(1-assemble);
      a.vy += dy*k + Math.cos(t*3 + a.ph)*0.3*(1-assemble);
    } else {
      a.vx += Math.sin(t*5 + a.ph)*0.4;
      a.vy += Math.cos(t*5 + a.ph)*0.4;
    }
    a.vx *= 0.92; a.vy *= 0.92;
    a.x += a.vx; a.y += a.vy;
    const settled = d < 5 && assemble > 0.8;
    const alpha = settled ? 1 : 0.72 + assemble*0.25;
    fill(a.ph > 4 ? rgba(ROSE, alpha) : rgba(PLUM, alpha));
    noStroke();
    const sz = settled ? 3.2 : 2.4 + Math.sin(t*4 + a.ph)*0.4;
    circle(a.x, a.y, sz);
  }
}

function bootSumi(){
  background(CW.bg);
  sumiDrops = [];
  t = 0;
}

function drawSumi(){
  t += 0.008;
  noStroke(); fill(rgba(CW.bg, 0.03)); rect(0,0,W,H);
  if(frameCount % 45 === 0 && sumiDrops.length < 24){
    sumiDrops.push({
      x: random(W*0.2, W*0.8), y: random(H*0.2, H*0.8),
      r: 2, maxR: random(60, 180),
      wob: random(0.5, 2.0), ph: random(Math.PI*2),
      plum: random() > 0.3,
    });
  }
  const windX = (fbm(t*0.3, 0, 2)-0.5)*3;
  const windY = (fbm(0, t*0.3, 2)-0.5)*2;
  for(const d of sumiDrops){
    d.r += 0.4 + state.density*0.6;
    d.x += windX * (1 + d.r*0.01);
    d.y += windY * (1 + d.r*0.01);
    if(d.r > d.maxR) continue;
    const alpha = 0.5 * (1 - d.r/d.maxR);
    const wobAmp = d.wob * (1 + d.r*0.02);
    stroke(d.plum ? rgba(PLUM, alpha) : rgba(ROSE, alpha*0.7));
    strokeWeight(0.8 + (1-d.r/d.maxR)*1.2);
    noFill();
    beginShape();
    const steps = Math.max(24, Math.floor(d.r*0.8));
    for(let i=0;i<=steps;i++){
      const a = (i/steps)*Math.PI*2;
      const w = fbm(Math.cos(a)*1.5 + d.ph, Math.sin(a)*1.5 + t*0.2, 3) * wobAmp;
      const rr = d.r + w + Math.sin(a*6 + t + d.ph)*1.5;
      vertex(d.x + Math.cos(a)*rr, d.y + Math.sin(a)*rr);
    }
    endShape(CLOSE);
  }
  sumiDrops = sumiDrops.filter(d => d.r <= d.maxR);
}

function bootAscii(){
  asciiGrid = [];
  const txt = (state.asciiText || 'assembl').slice(0, 12);
  const pg = createGraphics(W, H);
  pg.pixelDensity(1);
  pg.background(255, 253, 251);
  pg.fill(36, 11, 33);
  pg.noStroke();
  pg.textFont('Instrument Sans');
  let size = Math.min(H*0.62, W*1.35/Math.max(2, txt.length*0.62));
  pg.textSize(size);
  while(pg.textWidth(txt) > W*0.88 && size > 20){ size *= 0.93; pg.textSize(size); }
  pg.textAlign(CENTER, CENTER);
  pg.text(txt, W/2, H/2);
  pg.loadPixels();
  const cell = Math.max(7, Math.round(12 - state.asciiSize*6));
  for(let y=0; y<H; y+=cell){
    for(let x=0; x<W; x+=cell){
      const idx = 4*(y*W+x);
      const lum = pg.pixels[idx]; // dark = letter
      const v = 1 - lum/255;
      if(v > 0.12){
        asciiGrid.push({ x, y, v, ph: random(Math.PI*2), sp: random(0.5, 1.6), cell });
      }
    }
  }
  pg.remove();
  background(CW.bg);
}

function drawAscii(){
  t += 0.02;
  background(CW.bg);
  textFont('IBM Plex Mono');
  textAlign(CENTER, CENTER);
  for(const g of asciiGrid){
    const pulse = 0.5 + 0.5*Math.sin(t*g.sp*2 + g.ph);
    const idx = Math.min(ASCII_RAMP.length-1, Math.floor(g.v * (0.55 + pulse*0.45) * ASCII_RAMP.length));
    const ch = ASCII_RAMP[idx];
    if(ch === ' ') continue;
    const isAccent = pulse > 0.86;
    fill(isAccent ? CW.accent : CW.ink);
    textSize(g.cell * (0.7 + g.v*0.5));
    text(ch, g.x, g.y + Math.sin(t + g.ph)*1.5);
  }
  // sparse drifting glyphs in the negative space — the "field" around the word
  for(let i=0;i<60;i++){
    const x = (fbm(i*3.7, t*0.1, 2) * W + W) % W;
    const y = (fbm(i*7.3, t*0.13, 2) * H + H) % H;
    fill(rgba(ROSE, 0.25));
    textSize(9);
    text(ASCII_RAMP[2 + (i % 6)], x, y);
  }
}

