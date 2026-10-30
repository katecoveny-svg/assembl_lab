/* The eight original owner-source p5 engines stay available alongside the three new modes. */
const engines={
 attract:{name:'Attractor bloom',boot:bootAttract,draw:drawAttract,description:'A thousand paths fold into a living, tangled bloom.',hint:'Drag to bend the bloom · arrow keys work too',prompt:'Pause, change the curve, then step. Can a tiny change make a completely different shape?',controls:[['attA','Curve A',-3,3,.05],['attB','Curve B',-3,3,.05]]},
 braid:{name:'The braid',boot:bootBraid,draw:drawBraid,description:'Loose threads find their way into a woven order.',hint:'Drag to scatter the threads · arrow keys work too',prompt:'How does gathering change the balance between chaos and order?',controls:[['assemble','Gather',0,1,.01],['turbulence','Restlessness',0,1,.01],['trails','Trails',.1,.98,.01]]},
 glyph:{name:'Glyph assembly',boot:bootGlyph,draw:drawGlyph,description:'Make your word from particles. Scatter it. Let it find itself.',hint:'Drag to scatter your word · arrow keys work too',prompt:'The same word is a collection of target points. What happens when the pull gets weaker?',word:true,controls:[['assemble','Pull together',.05,1,.01],['turbulence','Swirl',0,1,.01]]},
 murmur:{name:'Murmuration',boot:bootMurmur,draw:drawMurmur,description:'A cloud of marks gathers into your word, then drifts away.',hint:'Drag through the cloud · arrow keys work too',prompt:'This is a choreographed particle artwork, not a bird behaviour simulation. How could you tell the difference?',word:true,controls:[['density','Density',.1,1,.05]]},
 ink:{name:'Ink rings',boot:bootInk,draw:drawInk,description:'Growing rings, little imperfections, never quite a circle.',hint:'Tap to plant a new centre · arrow keys move it',prompt:'Which changes feel regular, and which feel random? These are invented rings, not a tree-age measurement.',controls:[['warp','Wobble',0,1,.01],['ringGap','Ring spacing',0,1,.01],['density','Growth',.1,1,.01]]},
 sumi:{name:'Suminagashi',boot:bootSumi,draw:drawSumi,description:'Drop ink into a slow, shifting field of ripples.',hint:'Tap to drop ink · arrow keys add a drop',prompt:'Inspired by ink marbling. This is a procedural drawing, not a fluid simulation. Try overlapping two drops.',controls:[['density','Expansion',.1,1,.01]]},
 ascii:{name:'ASCII forge',boot:bootAscii,draw:drawAscii,description:'Your word becomes a flickering field of tiny characters.',hint:'Change your word or adjust the grain',prompt:'How few characters can still make a readable word? Compare coarse and fine sampling.',word:true,controls:[['asciiSize','Grain',0,1,.05]]},
 lattice:{name:'Proof lattice',boot:bootLattice,draw:drawLattice,description:'A shifting score of marks, rhythm and negative space.',hint:'Drag to loosen the rhythm · arrow keys work too',prompt:'These values are generated. How could a real dataset change the pattern?',controls:[['cells','Columns',3,14,1],['tension','Tension',0,1,.01],['warp','Sway',0,1,.01]]}
};

const initialLegacy={...state};let legacyReady,legacyActive='attract',legacyCanvas;
window.legacyStudioReady=new Promise(resolve=>legacyReady=resolve);
function setup(){
 pixelDensity(Math.min(devicePixelRatio||1,2));const c=createCanvas(800,1000);c.parent('legacy-host');legacyCanvas=c.elt;noLoop();W=width;H=height;
 window.LegacyStudio={
  engines,
  get canvas(){return legacyCanvas;}, get state(){return state;},
  select(id){legacyActive=id;this.reset(false);},
  resize(w,h){if(W===w&&H===h)return;resizeCanvas(w,h,true);W=width;H=height;this.reset(false);},
  render(){frameCount+=1;engines[legacyActive].draw();},
  reset(defaults=true){if(defaults)Object.assign(state,initialLegacy);t=0;frameCount=0;randomSeed(state.seed);noiseSeed(state.seed);background(PAPER);engines[legacyActive].boot();if(legacyActive==='sumi'){this.interact(.35,.45);this.interact(.6,.55);this.interact(.5,.35);}const n=legacyActive==='ink'?140:legacyActive==='sumi'?90:legacyActive==='glyph'?100:35;for(let i=0;i<n;i++)this.render();},
  palette(dark){PAPER=dark?'#201c38':'#f6f2eb';PLUM=dark?'#c2acf2':'#29264f';ROSE=dark?'#ff9b8f':'#dc756b';GRAPHITE=dark?'#a3cfc0':'#796e95';CW={bg:PAPER,ink:PLUM,accent:ROSE};this.reset(false);},
  set(key,value){state[key]=value;if(key==='text'){state.kineticText=state.asciiText=value;}if(['text','asciiSize','density'].includes(key))this.reset(false);else this.render();},
  remix(seed){state.seed=seed;if(legacyActive==='attract'){state.attA=random(-2.8,2.8);state.attB=random(-2.8,2.8);}else state.warp=random(.2,.9);this.reset(false);},
  interact(x,y){x*=W;y*=H;if(legacyActive==='sumi'){sumiDrops.push({x,y,r:2,maxR:180,wob:1.3,ph:random(TWO_PI),plum:random()>.3});if(sumiDrops.length>24)sumiDrops.shift();}else if(legacyActive==='ink'){state._inkCx=x;state._inkCy=y;state._inkR=0;}else if(legacyActive==='attract'){state.attA=x/W*6-3;state.attB=y/H*6-3;}else if(legacyActive==='lattice'){state.tension=x/W;state.warp=y/H;}else for(const a of agents){const dx=a.x-x,dy=a.y-y,d=Math.hypot(dx,dy);if(d<180){a.x+=dx*.5;a.y+=dy*.5;}}this.render();}
 };legacyReady(window.LegacyStudio);
}
