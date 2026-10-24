(()=>{
// The language features machine: a word mixing desk. Lines are pads you can hear, comparisons are two circles
// that overlap, intensity features are faders, tone recolours a scene, and a slot machine builds the exam sentence.
// Every line and poem here is original, written for this machine.
const esc=StudyKit.esc;
const sfx=n=>{try{if(!s.mute&&window.StudyKit&&StudyKit.sfx)StudyKit.sfx(n)}catch(e){}};
const INK="#492B3E",ROSE="#916A70",CREAM="#FFF8F3",LILAC="#F2ECFA",DESK="#2F1F2D",DESK2="#3E2B3B",PADOFF="#4A3547",PADTXT="#E9DCE6",WHITE="#FFFDFB";
const SLOT={f:"#E3D7FA",q:"#FFE2A8",e:"#C7EBDD",r:"#FAD0DC"};
const CH={allit:"#FFB48A",asson:"#9CC7F2",onom:"#FFD66B",simile:"#CDB8F5",metaphor:"#F7B2C4",person:"#A8DEC6",hyper:"#F49AAE",rep:"#F4C46B",rq:"#8FB8F0",emo:"#C9A3E8"};
const SENSE={s:["SIGHT","#F4C46B"],h:["SOUND","#8FB8F0"],t:["TOUCH","#F49AAE"],m:["SMELL","#9ED39B"],g:["TASTE","#C9A3E8"]};
// ---- screen-size aware type: the canvas is 800 wide, so on a phone everything is scaled down; we set bigger sizes there
const mq=matchMedia("(max-width:820px)");const PH=()=>mq.matches;
const Z=()=>PH()?{hero:40,h2:30,body:25,small:20,tiny:17,pad:33,reel:19}:{hero:34,h2:25,body:19.5,small:15,tiny:12.5,pad:27,reel:16.5};
let _mc=null;
function tw(t,size,wt=400,mono=false){try{_mc=_mc||document.createElement("canvas").getContext("2d");_mc.font=`${wt} ${size}px ${mono?'"IBM Plex Mono",ui-monospace,monospace':'"Instrument Sans",system-ui,sans-serif'}`;return _mc.measureText(t).width}catch(e){return String(t).length*size*(mono?0.6:0.52)}}
const DISP="var(--display)",MONO="var(--mono)";
const T=(x,y,t,size,o={})=>`<text x="${x}" y="${y}"${o.a?` text-anchor="${o.a}"`:""} style="font:${o.wt||400} ${size}px ${o.mono?MONO:DISP};fill:${o.fill||INK}${o.ls?`;letter-spacing:${o.ls}px`:""}${o.op!=null?`;opacity:${o.op}`:""}">${esc(t)}</text>`;
// ---- a small rich-text flow engine: segments [{t,k}] wrap into lines, with highlight backgrounds, underlines and tap targets
function flow(segs,o){const size=o.size,lh=o.lh||size*1.35,sty=o.sty||(()=>({})),P=[];let pend=true;
  segs.forEach(sg=>String(sg.t).split(/(\n+|[ \t]+)/).forEach(pt=>{if(!pt)return;if(/^\n+$/.test(pt)){P.push({br:pt.length});pend=true;return}if(/^[ \t]+$/.test(pt)){pend=true;return}
    P.push({t:pt,k:sg.k,glue:!pend&&P.length>0&&!P[P.length-1].br});pend=false}));
  const sp=tw(" ",size,o.wt||400);const lines=[[]];let cx=0;const U=[];
  P.forEach(p=>{if(p.br){U.push({br:p.br});return}if(p.glue&&U.length&&!U[U.length-1].br)U[U.length-1].ps.push(p);else U.push({ps:[p]})});
  U.forEach(u=>{if(u.br){lines.push([]);if(u.br>1)lines[lines.length-1].gap=true;cx=0;return}
    u.ps.forEach(p=>{const st=sty(p.k)||{};p.st=st;p.w=tw(p.t,size,st.wt||o.wt||400)});const uw=u.ps.reduce((a,p)=>a+p.w,0);
    if(cx>0&&cx+sp+uw>o.w){lines.push([]);cx=0}let x=cx>0?cx+sp:0;u.ps.forEach(p=>{p.x=x;x+=p.w;lines[lines.length-1].push(p)});cx=x});
  let out="",yy=o.y,ys=[];const bgs=[],txt=[],hit=[];
  lines.forEach((L,i)=>{if(L.gap)yy+=lh*0.45;ys.push(yy);const lw=L.length?L[L.length-1].x+L[L.length-1].w:0,off=o.align==="middle"?(o.w-lw)/2:0,base=yy+lh/2+size*0.34,top=yy+(lh-size*1.32)/2;
    L.forEach((p,j)=>{const st=p.st,nx=L[j+1],pv=L[j-1],x0=o.x+off+p.x,first=!pv||pv.k!==p.k||p.k==null;
      if(first&&(st.bg||st.ul||st.data)){let e=j;while(L[e+1]&&L[e+1].k===p.k&&p.k!=null)e++;const xe=o.x+off+L[e].x+L[e].w;
        if(st.bg)bgs.push(`<rect x="${x0-3.5}" y="${top}" width="${xe-x0+7}" height="${size*1.32}" rx="5" fill="${st.bg}"${st.bgop!=null?` opacity="${st.bgop}"`:""}/>`);
        if(st.ul)bgs.push(`<rect x="${x0}" y="${base+size*0.16}" width="${xe-x0}" height="${Math.max(2,size*0.12)}" rx="1" fill="${st.ul}"/>`);
        if(st.data)hit.push(`<rect x="${x0-3}" y="${yy}" width="${xe-x0+6}" height="${lh}" fill="transparent" data-a="${st.data}" style="cursor:pointer"/>`)}
      txt.push(`<text x="${x0}" y="${base}" style="font:${st.wt||o.wt||400} ${size}px ${DISP};fill:${st.fill||o.fill||INK}${st.op!=null?`;opacity:${st.op}`:""}">${esc(p.t)}</text>`)});
    yy+=lh});
  out=bgs.join("")+txt.join("")+hit.join("");return{o:out,h:yy-o.y,n:lines.length,ys}}
function fitFlow(segs,o,maxH,minSize){let sz=o.size,r;for(let i=0;i<8;i++){r=flow(segs,{...o,size:sz,lh:sz*(o.lhf||1.3)});if(r.h<=maxH||sz<=minSize)break;sz*=0.92}return r}
const segQuote=(line,quote,k="q")=>{const i=quote?line.indexOf(quote):-1;if(i<0)return[{t:line}];return[{t:line.slice(0,i)},{t:quote,k},{t:line.slice(i+quote.length)}]};
const plain=l=>l.replace(/[\[\]{}]/g,"");
const hash=str=>{let h=7;for(const c of str)h=(h*31+c.charCodeAt(0))>>>0;return h};

// ---- the features
const FEAT={
 allit:{n:"alliteration",art:"alliteration",def:"the same consonant sound at the start of nearby words",d2:"repeat the same letter"},
 asson:{n:"assonance",art:"assonance",def:"the same vowel sound repeated in nearby words",d2:"repeat a vowel sound"},
 onom:{n:"onomatopoeia",art:"onomatopoeia",def:"a word that sounds like the noise it names",d2:"use a sound word"},
 simile:{n:"simile",art:"a simile",def:"comparing two things using 'like' or 'as'",d2:"compare one thing to another"},
 metaphor:{n:"metaphor",art:"a metaphor",def:"saying one thing is another thing",d2:"compare one thing to another"},
 person:{n:"personification",art:"personification",def:"giving human actions or feelings to something that isn't human",d2:"make something seem human"},
 hyper:{n:"hyperbole",art:"hyperbole",def:"huge exaggeration that isn't meant literally",d2:"exaggerate"},
 rep:{n:"repetition",art:"repetition",def:"repeating a word, phrase or pattern for effect",d2:"repeat some words"},
 rq:{n:"rhetorical question",art:"a rhetorical question",def:"a question asked for effect, not for an answer",d2:"ask the reader a question"},
 emo:{n:"emotive language",art:"emotive language",def:"words chosen to stir up strong feelings",d2:"use emotional words"},
 imag:{n:"sensory imagery",art:"sensory imagery",def:"description that appeals to the five senses",d2:"describe the scene"},
 tone:{n:"tone",art:"tone",def:"the writer's attitude, shown through word choice",d2:"show how the writer feels"}};
const CONFUSE={allit:["asson","onom"],asson:["allit","rep"],onom:["allit","imag"],simile:["metaphor","person"],metaphor:["simile","hyper"],person:["metaphor","simile"],hyper:["emo","metaphor"],rep:["allit","rq"],rq:["emo","rep"],emo:["hyper","imag"]};
const SOUNDS=["allit","asson","onom"],CMPS=["simile","metaphor","person"],AMPS=["hyper","rep","rq","emo"],TONES=["excited","tense","calm"];
const TONE_READER={excited:"share the rush and energy of the moment",tense:"feel uneasy, waiting for something to go wrong",calm:"slow down and relax into the scene"};
// ---- six worlds to choose from (original lines and poems)
const CTX={
bike:{name:"Downhill MTB · the Redwoods",
 allit:{line:"[B]ig [b]erms [b]ounced my [b]ike [b]ack onto the line.",letter:"b",quote:"Big berms bounced my bike back",effect:"copy the bumpy, thudding rhythm of the wheels slamming into each berm",reader:"feel every jolt through the handlebars"},
 asson:{line:"Up the fire r[oa]d I r[o]lled sl[ow], c[o]ld air fr[o]zen in my thr[oa]t.",v:"oh",vl:"long 'oh'",quote:"rolled slow, cold air frozen",effect:"stretch the line out with long, heavy 'oh' sounds that slow it right down",reader:"feel how tiring the climb back up the hill is"},
 onom:{line:"My tyres {crunched} over the gravel, then {hissed} through wet ferns.",snd:{crunched:"crunch",hissed:"hiss"},quote:"crunched over the gravel, then hissed",effect:"let us hear the track change under the tyres, from rough gravel to slippery ferns",reader:"feel as if they are riding right behind the writer"},
 simile:{line:"I dropped into the chute like a stone down a well.",a:"me, dropping in",b:"a stone down a well",sig:"like",share:["straight down","fast","no way back"],quote:"like a stone down a well",effect:"show how steep the drop is and how little control the rider has",reader:"feel the stomach-lurching fall and sense there is no turning back"},
 metaphor:{line:"The last section was a washing machine of roots and rocks.",a:"the last section",b:"a washing machine",sig:"was",share:["spinning","rough","thrown about"],quote:"a washing machine of roots and rocks",effect:"show how the rider is tossed and shaken around by the rough track",reader:"picture the rider being churned around, dizzy and out of control"},
 person:{line:"The redwood roots reached out and grabbed at my front wheel.",a:"the roots",b:"a person grabbing",sig:"grabbed",share:["on purpose","trying to stop me","sneaky"],quote:"roots reached out and grabbed",effect:"make the roots seem alive and out to get the rider",reader:"sense that the forest itself is a danger the rider has to fight"},
 base:"The track was steep and I was nervous at the top.",
 hyper:{line:"The drop-in was so steep it was practically upside down.",quote:"practically upside down",effect:"exaggerate the steepness to show how terrifying it looks from the top",reader:"understand how huge the drop feels to the rider"},
 rep:{line:"Breathe. Look ahead. Breathe. Let go of the brakes.",quote:"Breathe. Look ahead. Breathe.",effect:"show the rider talking themselves through their nerves",reader:"feel the rider's racing heartbeat and their need to stay calm"},
 rq:{line:"Why did I ever think this was a good idea?",quote:"Why did I ever think this was a good idea?",effect:"show the rider's doubt and panic at the top of the run",reader:"share the rider's second thoughts and wonder what happens next"},
 emo:{line:"My trembling hands clung to the grips, terrified of what came next.",quote:"trembling hands clung to the grips, terrified",effect:"use strong feeling words to show how frightened the rider is",reader:"feel sympathy and fear for the rider"},
 tone:{excited:"{Sunlight flashed between the giant trunks|s}. I {heard the hub buzz|h} as I *flew* over the roots, {cold air whipping my face|t}, and I *whooped* all the way to the bottom.",
   tense:"The trees *loomed* over the track, {dark and silent|s}. {Wet roots slid under my tyres|t}, I could {taste dust in my dry mouth|g}, and every {snap of a branch|h} made me *flinch*.",
   calm:"Mist {drifted softly between the redwoods|s}. The air {smelled of pine and damp earth|m}, my tyres {hummed|h}, and I *rolled gently* down the *easy*, winding trail."},
 poem:{title:"Drop-in",lines:["At the top, the redwoods hold their breath.","My heart is a drum on the handlebars,","and I tip, I tip, I tip into the chute.","Roots rattle, rocks rip at the rubber,","the forest blurs like a video on fast-forward,","then whump — the flat, the light, the laugh."],
   tone:"thrilled",toneOpts:["thrilled","bored","gloomy","furious"],spot:[[1,"person"],[4,"allit"]],
   best:{n:5,f:"simile",quote:"blurs like a video on fast-forward",effect:"show how fast the rider is going, so the trees smear past",reader:"feel the dizzy, rushing speed of the ride"},
   fix:{n:2,f:"metaphor",quote:"My heart is a drum",effect:"show the rider's heart pounding loudly with nerves",reader:"hear and feel the rider's fear before the drop"}}},
fish:{name:"Fishing off the rocks",
 allit:{line:"[S]alt [s]pray [s]izzled on the [s]lippery [s]tones.",letter:"s",quote:"Salt spray sizzled on the slippery stones",effect:"repeat the hissing 's' sound, like spray fizzing on the rocks",reader:"hear the sea seething around the angler's feet"},
 asson:{line:"Kn[ee]-d[ee]p in the s[ea], I f[ee]l the r[ee]l sp[ee]d.",v:"ee",vl:"long 'ee'",quote:"I feel the reel speed",effect:"repeat the sharp, high 'ee' sound, like the whine of line ripping off the reel",reader:"hear the reel screaming and feel the sudden thrill of a bite"},
 onom:{line:"{Plop} went the sinker, and the sea {slurped} around the rocks.",snd:{plop:"plop",slurped:"slurp"},quote:"Plop went the sinker, and the sea slurped",effect:"let us hear the small splash of the sinker and the sucking of the sea",reader:"feel as if they are standing on the rocks next to the writer"},
 simile:{line:"The rod bent like a question mark over the water.",a:"the rod",b:"a question mark",sig:"like",share:["curved","waiting","unsure"],quote:"bent like a question mark",effect:"show the shape of the bent rod and hint that the catch is still uncertain",reader:"wonder, like the angler, what is on the end of the line"},
 metaphor:{line:"The fish was a silver bullet tearing through the kelp.",a:"the fish",b:"a silver bullet",sig:"was",share:["fast","shiny","powerful"],quote:"a silver bullet",effect:"show that the fish is fast, shiny and powerful",reader:"picture a flash of silver and feel how hard it will be to land"},
 person:{line:"The sea crept up the rocks and tugged at my boots.",a:"the sea",b:"a person sneaking up",sig:"crept",share:["sneaky","pulling","won't let go"],quote:"crept up the rocks and tugged at my boots",effect:"make the sea seem alive and sneaky, as if it wants to pull the angler in",reader:"feel uneasy about how dangerous the sea can be"},
 base:"I waited a long time for a bite.",
 hyper:{line:"I waited about a thousand years for a single nibble.",quote:"about a thousand years",effect:"exaggerate the wait to show how slow and boring it felt",reader:"understand the angler's impatience and smile at the frustration"},
 rep:{line:"Nothing. Nothing. Then everything at once.",quote:"Nothing. Nothing.",effect:"stretch out the empty waiting before the sudden bite",reader:"feel the long boredom, then the shock of the strike"},
 rq:{line:"Was there a single fish left in the whole Hauraki Gulf?",quote:"Was there a single fish left in the whole Hauraki Gulf?",effect:"show the angler's frustration and doubt",reader:"share the feeling of wanting to pack up and go home"},
 emo:{line:"My frozen fingers ached, and my heart sank every time the line went slack.",quote:"my heart sank",effect:"use feeling words to show the angler's discomfort and disappointment",reader:"feel sorry for the cold, hopeful angler"},
 tone:{excited:"The {rod slammed down|s}! The {reel screamed|h}, {cold spray soaked my hoodie|t}, I could {taste salt on my lips|g}, and I *laughed* as I *hauled* the snapper in.",
   tense:"{Grey waves heaved|s} below the rocks. {Each boom of the swell|h} shook the ledge, {my boots slipped on the weed|t}, and I *gripped* the rod, *watching* the next set *rear* up.",
   calm:"The tide {lapped gently|h} at the rocks. {Pale light spread across the water|s}, the air {smelled of salt and seaweed|m}, and I *settled* back to *wait*, in *no hurry* at all."},
 poem:{title:"Off the Rocks",lines:["The sea breathes in, the sea breathes out,","my float bobs bright on the blue.","Hours drag by like anchors,","then zing! The line is alive,","a heavy, fighting heartbeat in my hands,","and the whole Gulf pulls against me."],
   tone:"thrilled",toneOpts:["thrilled","angry","sad","bored"],spot:[[2,"allit"],[6,"hyper"]],
   best:{n:3,f:"simile",quote:"drag by like anchors",effect:"show how heavy and slow the waiting feels",reader:"feel the boredom weighing on the angler"},
   fix:{n:5,f:"metaphor",quote:"a heavy, fighting heartbeat",effect:"show that the fish is alive, strong and fighting hard",reader:"feel the struggle through the line, as if the fish's life is in the angler's hands"}}},
vinyl:{name:"The record shop",
 allit:{line:"[C]rates of [c]lassic [c]overs [c]rowded the [c]ounter.",letter:"k",quote:"Crates of classic covers crowded the counter",effect:"use hard, clicking 'c' sounds, like flicking through records",reader:"picture the packed little shop and hear the click of the sleeves"},
 asson:{line:"Sm[oo]th bl[ue]s t[u]nes m[o]ved thr[ou]gh the r[oo]m.",v:"oo",vl:"long 'oo'",quote:"Smooth blues tunes moved through the room",effect:"repeat the long, soft 'oo' sound, so the line feels slow and mellow like the music",reader:"relax into the calm, dreamy feel of the shop"},
 onom:{line:"The needle {crackled}, then the bass went {boom} through the floor.",snd:{crackled:"crackle",boom:"boom"},quote:"The needle crackled, then the bass went boom",effect:"let us hear the record start, from tiny crackles to a huge bass note",reader:"feel the build-up and the thrill of the music kicking in"},
 simile:{line:"The record spun like a slow black planet.",a:"the record",b:"a planet",sig:"like",share:["round","turning","steady"],quote:"spun like a slow black planet",effect:"make the turning record seem huge and important, like a world of its own",reader:"see the record as something special, not just plastic"},
 metaphor:{line:"The bassline was a heartbeat under the floorboards.",a:"the bassline",b:"a heartbeat",sig:"was",share:["steady","deep","alive"],quote:"a heartbeat under the floorboards",effect:"show that the bass is steady and deep and keeps the shop alive",reader:"feel the music pulsing through their own body"},
 person:{line:"Old albums whispered from the shelves, begging me to take them home.",a:"the albums",b:"a person begging",sig:"begging",share:["wanting","calling out","hopeful"],quote:"whispered from the shelves, begging me",effect:"make the records seem alive and desperate to be chosen",reader:"feel the pull of the shop and the writer's love of records"},
 base:"I really wanted that record.",
 hyper:{line:"I would have swapped my whole bedroom for that one record.",quote:"swapped my whole bedroom",effect:"exaggerate how badly the writer wants the record",reader:"understand the writer's obsession and maybe smile at it"},
 rep:{line:"One more listen. Just one more. One more.",quote:"One more listen. Just one more.",effect:"show that the writer can't stop replaying the track",reader:"feel the song getting stuck in their own head"},
 rq:{line:"How could twenty dollars ever be too much for this?",quote:"How could twenty dollars ever be too much for this?",effect:"challenge the idea that the record is too expensive",reader:"take the writer's side and agree it's worth it"},
 emo:{line:"When the owner said it had already sold, I was absolutely gutted.",quote:"absolutely gutted",effect:"use strong feeling words to show deep disappointment",reader:"feel the writer's crushing letdown"},
 tone:{excited:"The {neon sign buzzed|h} above the {bright, packed racks|s}. I {ran my fingers along the sleeves|t}, *grinning*, and *pounced* on the album I'd been *hunting* for months.",
   tense:"The shop was {dim and silent|s} except for a {ticking clock|h}. The owner *watched* me. My {sweaty fingers|t} *fumbled* the record, and it *slipped*.",
   calm:"{Warm light pooled on the counter|s}. The {soft hiss of the record|h} filled the room, the air {smelled of old cardboard|m}, and I *took my time*, *flicking slowly* through the crates."},
 poem:{title:"Side A",lines:["The needle drops, and the room holds still.","Crackle, hiss, then a bassline hum,","the drums are thunder in my chest,","the singer's voice is smooth as honey.","Play it again. Play it again.","I could live inside this song for a hundred years."],
   tone:"joyful",toneOpts:["joyful","angry","bored","scared"],spot:[[2,"onom"],[5,"rep"]],
   best:{n:3,f:"metaphor",quote:"the drums are thunder in my chest",effect:"show how loud and powerful the drums feel",reader:"feel the beat shaking through their own body"},
   fix:{n:4,f:"simile",quote:"smooth as honey",effect:"show that the singer's voice is soft, sweet and easy to listen to",reader:"almost taste the warm, golden sound"}}},
arcade:{name:"The arcade",
 allit:{line:"[P]inball [p]addles [p]opped, [p]inged and [p]ounded.",letter:"p",quote:"Pinball paddles popped, pinged and pounded",effect:"use quick, popping 'p' sounds to copy the clatter of the pinball machine",reader:"hear the noisy, non-stop action of the arcade"},
 asson:{line:"Wh[i]te l[i]ghts and br[igh]t h[igh] scores sh[i]ne all n[igh]t.",v:"eye",vl:"long 'i'",quote:"White lights and bright high scores shine all night",effect:"repeat the sharp 'i' sound, so the line feels bright and electric",reader:"picture glowing screens that never switch off"},
 onom:{line:"Coins {clinked} into the slot and the screen went {bleep}, {bleep}, {bleep}.",snd:{clinked:"clink",bleep:"bleep"},quote:"Coins clinked into the slot and the screen went bleep",effect:"let us hear the arcade machine coming to life as the game starts",reader:"feel the buzz of starting a brand-new game"},
 simile:{line:"My thumbs flew across the buttons like sparks off a grinder.",a:"my thumbs",b:"sparks off a grinder",sig:"like",share:["fast","hot","flying everywhere"],quote:"like sparks off a grinder",effect:"show how fast and frantic the player's thumbs are moving",reader:"feel the speed and pressure of the game"},
 metaphor:{line:"The claw machine was a greedy little thief.",a:"the claw machine",b:"a thief",sig:"was",share:["takes your money","sneaky","gives nothing back"],quote:"a greedy little thief",effect:"show that the claw machine takes your money and rarely gives anything back",reader:"feel the player's frustration and laugh, because they've been there too"},
 person:{line:"The old racing game coughed, groaned and finally woke up.",a:"the racing game",b:"a person waking up",sig:"coughed",share:["slow","old","grumpy"],quote:"coughed, groaned and finally woke up",effect:"make the old machine seem like a tired, grumpy person",reader:"feel fond of the battered old game"},
 base:"The last level was hard.",
 hyper:{line:"The last level was impossible. Not even a robot could beat it.",quote:"Not even a robot could beat it",effect:"exaggerate how hard the level is",reader:"understand how frustrated and challenged the player feels"},
 rep:{line:"Jump. Duck. Jump. Duck. Don't blink.",quote:"Jump. Duck. Jump. Duck.",effect:"copy the fast rhythm of the moves in the game",reader:"feel the pressure of every split-second move"},
 rq:{line:"Who designs a boss with three health bars?",quote:"Who designs a boss with three health bars?",effect:"show the player's outrage at how unfair the game is",reader:"share the frustration and maybe laugh along"},
 emo:{line:"With one life left, I was desperate, sweating and terrified of losing it all.",quote:"desperate, sweating and terrified",effect:"use strong feeling words to show the player's panic",reader:"feel the high stakes of the final life"},
 tone:{excited:"{Lights flashed red and gold|s}, the {speakers thumped|h}, and the {buttons were warm under my thumbs|t}. I *smashed* the high score and *yelled* so loud the whole arcade *cheered*.",
   tense:"The {timer blinked red|s}. The {machine beeped faster and faster|h}, my {palms were slick on the joystick|t}, and I *held my breath*, *praying* I wouldn't *slip*.",
   calm:"Early on a Sunday the arcade was {quiet and dim|s}. The {old machines hummed softly|h}, the air {smelled of popcorn|m}, and I *wandered* between them, *in no rush* to play."},
 poem:{title:"Final Level",lines:["The screen glows like a campfire in the dark,","the joystick jumps and judders in my grip.","One life. One chance. One move.","The boss laughs at me with pixel teeth,","my thumbs are lightning,","and BOOM! The whole arcade explodes in cheers."],
   tone:"triumphant",toneOpts:["triumphant","bored","gloomy","calm"],spot:[[2,"allit"],[4,"person"]],
   best:{n:1,f:"simile",quote:"glows like a campfire in the dark",effect:"make the screen seem warm and inviting, something the player is drawn towards",reader:"feel pulled into the game, like people gathering round a fire"},
   fix:{n:5,f:"metaphor",quote:"my thumbs are lightning",effect:"show the player's thumbs moving incredibly fast and powerfully",reader:"feel the speed and energy of the final fight"}}},
rugby:{name:"Rugby",
 allit:{line:"[T]wo [t]ired [t]eams [t]ook [t]urns [t]ackling in the mud.",letter:"t",quote:"Two tired teams took turns tackling",effect:"repeat the hard 't' sound, like the thump of tackle after tackle",reader:"feel how tough and exhausting the game is"},
 asson:{line:"The l[ou]d cr[ow]d sh[ou]ted [ou]t as we drove the ball d[ow]n.",v:"ow",vl:"'ow'",quote:"loud crowd shouted out",effect:"repeat the big, open 'ow' sound, like the roar of a crowd",reader:"hear the noise of the stadium swelling around them"},
 onom:{line:"Boots {thudded} into the turf and the crowd {roared}.",snd:{thudded:"thud",roared:"roar"},quote:"Boots thudded into the turf and the crowd roared",effect:"let us hear the heavy impact of the game and the noise around it",reader:"feel as if they are standing on the sideline"},
 simile:{line:"Their number 8 ran at us like a runaway truck.",a:"their number 8",b:"a runaway truck",sig:"like",share:["huge","fast","unstoppable"],quote:"like a runaway truck",effect:"show how big and unstoppable the player is",reader:"feel the fear of having to make that tackle"},
 metaphor:{line:"Our forward pack was a brick wall.",a:"our forwards",b:"a brick wall",sig:"was",share:["solid","strong","won't move"],quote:"a brick wall",effect:"show that the forwards are solid, strong and impossible to get through",reader:"feel proud of the team and confident in its defence"},
 person:{line:"The ball bounced away, laughing at our fumbling hands.",a:"the ball",b:"a person laughing",sig:"laughing",share:["mocking","escaping","won't be caught"],quote:"laughing at our fumbling hands",effect:"make the ball seem cheeky, as if it is against the team",reader:"feel the embarrassment of the dropped ball"},
 base:"It was cold and wet at training.",
 hyper:{line:"It was so cold my toes turned into ice blocks.",quote:"my toes turned into ice blocks",effect:"exaggerate the cold to show how miserable training was",reader:"almost feel their own toes freezing"},
 rep:{line:"Run. Hit. Get up. Run. Hit. Get up.",quote:"Run. Hit. Get up.",effect:"copy the repeating rhythm of the drills",reader:"feel how tiring and endless training is"},
 rq:{line:"Who decided training should start at 6 a.m. in July?",quote:"Who decided training should start at 6 a.m. in July?",effect:"show the player's grumpy disbelief",reader:"laugh and agree that it's unfair"},
 emo:{line:"We were frozen, exhausted and miserable, but nobody quit.",quote:"frozen, exhausted and miserable",effect:"use strong feeling words to show how hard it was, so the team's grit seems even more impressive",reader:"admire the team for not giving up"},
 tone:{excited:"The {crowd roared|h} as {our winger burst down the sideline|s}. I {felt the stand shake|t} and *screamed* with everyone else as the winger *dived* over the line.",
   tense:"The {scoreboard glowed 14–15|s}. The {crowd went silent|h}. {Rain stung my face|t} as I *lined up* the kick, *knees shaking*, *everything* resting on it.",
   calm:"After the game, the {field was empty and green|s}. We {sat on the cool grass|t} in the {smell of cut turf|m}, {sharing sweet oranges|g} and *laughing quietly*."},
 poem:{title:"Final Whistle",lines:["The rain comes sideways like a thousand needles,","boots slap and slide on the sodden field.","Their winger is a missile, streaking past,","but we chase, we chase, we chase them down.","Crunch! The tackle. The ball spills free.","The whole of Aotearoa holds its breath."],
   tone:"determined",toneOpts:["determined","relaxed","bored","silly"],spot:[[3,"metaphor"],[5,"onom"]],
   best:{n:1,f:"simile",quote:"like a thousand needles",effect:"show how sharp and painful the rain feels",reader:"feel the harsh conditions the players are battling through"},
   fix:{n:4,f:"rep",quote:"we chase, we chase, we chase",effect:"show the team's relentless, never-ending effort",reader:"feel the team's determination never to give up"}}},
beach:{name:"The beach",
 allit:{line:"[W]ild [w]aves [w]ashed over the [w]arm [w]hite sand.",letter:"w",quote:"Wild waves washed over the warm white sand",effect:"repeat the soft 'w' sound, like the swish of waves",reader:"hear the gentle rhythm of the sea"},
 asson:{line:"L[a]te in the d[ay], the w[a]ves pl[ay]ed in the b[ay].",v:"ay",vl:"long 'ay'",quote:"Late in the day, the waves played in the bay",effect:"repeat the long 'ay' sound, so the line feels slow, lazy and musical",reader:"feel the relaxed end of a summer's day"},
 onom:{line:"Waves {crashed} on the sand, then {fizzed} back out.",snd:{crashed:"crash",fizzed:"fizz"},quote:"Waves crashed on the sand, then fizzed back out",effect:"let us hear each wave break and then drain away",reader:"feel as if they are standing at the water's edge"},
 simile:{line:"The sand was as hot as a frying pan.",a:"the sand",b:"a frying pan",sig:"as",share:["burning","painful","hard to stand on"],quote:"as hot as a frying pan",effect:"show how painfully hot the sand is",reader:"almost feel their feet burning and want to run for the water"},
 metaphor:{line:"The sea was a sheet of glass at sunrise.",a:"the sea",b:"a sheet of glass",sig:"was",share:["flat","smooth","shiny"],quote:"a sheet of glass",effect:"show that the sea is perfectly flat, smooth and shining",reader:"picture a calm, peaceful morning"},
 person:{line:"The old pōhutukawa leaned over the water, watching the swimmers.",a:"the pōhutukawa",b:"a person watching",sig:"watching",share:["protective","patient","old"],quote:"leaned over the water, watching",effect:"make the tree seem like a calm guardian of the beach",reader:"feel safe and at home at the beach"},
 base:"The beach was busy on New Year's Day.",
 hyper:{line:"Every single person in Tāmaki Makaurau was squeezed onto one beach.",quote:"Every single person in Tāmaki Makaurau",effect:"exaggerate the crowd to show how packed the beach was",reader:"picture a jam-packed beach and feel a bit squashed"},
 rep:{line:"Towels, umbrellas, chilly bins. Towels, umbrellas, chilly bins, everywhere.",quote:"Towels, umbrellas, chilly bins.",effect:"show that there is beach gear wherever you look",reader:"feel how crowded and cluttered the beach is"},
 rq:{line:"Is there any better feeling than that first dive into cold water?",quote:"Is there any better feeling than that first dive into cold water?",effect:"invite the reader to remember their own first swim of summer",reader:"agree with the writer and share the joy"},
 emo:{line:"A wave smashed the little kid's sandcastle, and he burst into heartbroken tears.",quote:"heartbroken tears",effect:"use strong feeling words to show the child's sadness",reader:"feel sympathy for the child"},
 tone:{excited:"The {sun blazed on the water|s}. I {raced across the burning sand|t}, {heard everyone shrieking|h}, and *flung* myself into the waves, *laughing* like a little kid.",
   tense:"{Dark clouds crept over the bay|s}. The {wind whipped sand against my legs|t}, the {waves boomed|h} louder, and I *swam faster*, the shore suddenly *far* too *far* away.",
   calm:"The {tide whispered in and out|h}. {Soft gold light lay on the water|s}, I could {taste salt on my lips|g}, and I *lay still* on my towel, *drifting* towards sleep."},
 poem:{title:"Low Tide",lines:["The sun sinks slowly into the sea,","the sky a bowl of peach and pink.","Waves fold over like soft blankets,","then whisper back to sleep.","Gulls cry. The old wharf creaks.","I could stay here forever."],
   tone:"peaceful",toneOpts:["peaceful","angry","terrified","excited"],spot:[[1,"allit"],[2,"metaphor"]],
   best:{n:3,f:"simile",quote:"fold over like soft blankets",effect:"make the waves seem gentle and comforting",reader:"feel calm and safe, like being tucked into bed"},
   fix:{n:5,f:"onom",quote:"The old wharf creaks",effect:"let us hear the small sounds of a quiet evening",reader:"notice how still and peaceful the beach has become"}}}};
const CTXK=["bike","fish","vinyl","arcade","rugby","beach"];

// ---- state
const s={ctx:"bike",sch:"allit",cch:"simile",amp:{hyper:false,rep:false,rq:false,emo:false},ampLast:null,ampT:{},tone:"excited",item:0,reels:null,mute:false,
  seq:null,flash:null,vd:170,vdFrom:170,vdT:0,meter:0,solved:{},step:"sound",reelT:{}};
const C=()=>CTX[s.ctx];
const itemsOf=c=>[...SOUNDS,...CMPS,...AMPS].map(f=>({f,...c[f]}));
const art=f=>FEAT[f].art;
const sentence=it=>`The writer uses ${art(it.f)} ('${it.quote}') to ${it.effect}, which makes the reader ${it.reader}.`;

// ---- sound: a tiny Web Audio synth, created on the first tap, quiet and short
let AC=null,MG=null,NB=null;
function ac(){if(!AC){const K=window.AudioContext||window.webkitAudioContext;if(!K)return null;AC=new K();MG=AC.createGain();MG.gain.value=0.28;MG.connect(AC.destination);
  NB=AC.createBuffer(1,AC.sampleRate*2,AC.sampleRate);const d=NB.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1}
  if(AC.state==="suspended")AC.resume();return AC}
function env(g,t,a,dur,peak){g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(peak,t+a);g.gain.exponentialRampToValueAtTime(0.0001,t+dur)}
function nz(t,dur,o){const a=AC,src=a.createBufferSource();src.buffer=NB;const f=a.createBiquadFilter();f.type=o.type||"bandpass";f.frequency.setValueAtTime(o.f||1000,t);if(o.f2)f.frequency.exponentialRampToValueAtTime(o.f2,t+dur);f.Q.value=o.q||1;
  const g=a.createGain();env(g,t,o.a||0.004,dur,o.g||0.4);src.connect(f).connect(g).connect(MG);src.start(t,Math.random()*1.5);src.stop(t+dur+0.05)}
function tn(t,dur,o){const a=AC,osc=a.createOscillator();osc.type=o.type||"sine";osc.frequency.setValueAtTime(o.f,t);if(o.f2)osc.frequency.exponentialRampToValueAtTime(o.f2,t+dur);
  const g=a.createGain();env(g,t,o.a||0.005,dur,o.g||0.3);osc.connect(g).connect(MG);osc.start(t);osc.stop(t+dur+0.05)}
const VOW={ee:[[270,2290]],ih:[[390,1990]],uh:[[600,1170]],ah:[[730,1090]],oo:[[300,870]],oh:[[520,900],[330,780]],ay:[[530,1840],[300,2200]],eye:[[730,1090],[320,2200]],ow:[[730,1090],[330,800]]};
function vowel(t,v,dur,gain=0.5){const a=AC,F=VOW[v]||VOW.uh,src=a.createOscillator();src.type="sawtooth";src.frequency.setValueAtTime(150,t);src.frequency.linearRampToValueAtTime(128,t+dur);
  const out=a.createGain();env(out,t,0.03,dur,gain);
  [0,1].forEach(k=>{const bp=a.createBiquadFilter();bp.type="bandpass";bp.Q.value=k?11:7;bp.frequency.setValueAtTime(F[0][k],t);if(F[1])bp.frequency.linearRampToValueAtTime(F[1][k],t+dur*0.85);
    const g=a.createGain();g.gain.value=k?0.55:1;src.connect(bp).connect(g).connect(out)});out.connect(MG);src.start(t);src.stop(t+dur+0.05)}
function consonant(t,L){const pl={b:[500,1],d:[2600,1],g:[1600,1],p:[900,0],t:[4200,0],k:[1900,0],c:[1900,0]};
  if(pl[L]){nz(t,0.035,{f:pl[L][0],q:1.4,g:pl[L][1]?0.35:0.6});if(pl[L][1])tn(t,0.06,{f:130,f2:90,g:0.25});return 0.05}
  if(L==="s"||L==="z"){nz(t,0.15,{type:"highpass",f:4500,g:0.22,a:0.02});return 0.15}
  if(L==="w"){vowel(t,"oo",0.09,0.35);return 0.08}
  nz(t,0.1,{f:1500,q:0.6,g:0.15});return 0.1}
const FX={
 crunch:t=>{for(let i=0;i<7;i++)nz(t+i*0.035+Math.random()*0.01,0.05,{f:900+Math.random()*900,q:1.2,g:0.5})},
 hiss:t=>nz(t,0.5,{type:"highpass",f:3500,f2:5500,g:0.22,a:0.06}),
 plop:t=>{tn(t,0.15,{f:900,f2:170,g:0.45});nz(t,0.05,{f:1200,g:0.1})},
 slurp:t=>{tn(t,0.32,{type:"triangle",f:260,f2:720,g:0.22,a:0.03});nz(t,0.32,{f:600,f2:1600,q:3,g:0.25,a:0.03})},
 crackle:t=>{for(let i=0;i<16;i++)nz(t+Math.random()*0.6,0.006,{type:"highpass",f:2200,g:0.15+Math.random()*0.4})},
 boom:t=>{tn(t,0.7,{f:85,f2:40,g:0.8});nz(t,0.15,{type:"lowpass",f:220,g:0.4})},
 clink:t=>{[0,0.09].forEach(d=>{tn(t+d,0.25,{f:2600,g:0.18});tn(t+d,0.2,{f:3950,g:0.1})})},
 bleep:t=>tn(t,0.11,{type:"square",f:880,g:0.08}),
 thud:t=>{tn(t,0.26,{f:115,f2:45,g:0.85});nz(t,0.08,{type:"lowpass",f:400,g:0.4})},
 roar:t=>nz(t,1,{f:520,f2:880,q:0.8,g:0.4,a:0.25}),
 crash:t=>nz(t,0.75,{type:"lowpass",f:3200,f2:500,g:0.5,a:0.02}),
 fizz:t=>{for(let i=0;i<22;i++)nz(t+i*0.025+Math.random()*0.02,0.012,{type:"highpass",f:5500,g:0.08+Math.random()*0.12})}};
// one pad = one word: what it sounds like on each channel
function padSound(t,w,ch){if(!w.hot){nz(t,0.02,{f:700,q:0.8,g:0.05});return}
  if(ch==="allit"){const L=s.ctx&&C().allit.letter;const d=consonant(t,L);vowel(t+d*0.6,"uh",0.13,0.32)}
  else if(ch==="asson"){nz(t,0.02,{f:1500,g:0.08});vowel(t+0.02,C().asson.v,0.3,0.5)}
  else{const r=C().onom.snd[w.plain.toLowerCase().replace(/[^a-zāēīōū]/g,"")];r&&FX[r]&&FX[r](t)}}
function playPad(i){if(s.mute||!ac())return;const W=padWords();padSound(AC.currentTime+0.01,W[i],s.sch);s.flash={i,t0:performance.now()};kick(450)}
function playLine(){if(s.mute){sfx("buzz");return}if(!ac())return;const W=padWords(),t0=AC.currentTime+0.05,slots=[];let t=0;
  W.forEach((w,i)=>{const d=w.hot?(s.sch==="onom"?0.62:0.36):0.24;padSound(t0+t,w,s.sch);slots.push([t,d]);t+=d});
  s.seq={t0:performance.now()+50,slots,dur:t};kick(t*1000+300)}
// ---- an animation pump that only runs while something moves
let till=0,raf=0;function kick(ms){till=Math.max(till,performance.now()+ms);if(!raf)raf=requestAnimationFrame(pump)}
function pump(){raf=0;api&&api.redraw();if(performance.now()<till)raf=requestAnimationFrame(pump);else{s.seq=null;s.flash=null;api&&api.redraw()}}
const ease=x=>x<0?0:x>1?1:1-Math.pow(1-x,3);

// ---- step 1: the pads
function padWords(){return C()[s.sch].line.split(" ").map(w=>{const segs=[];let hot=false,on=false,buf="";
  for(const ch of w){if(ch==="["||ch==="]"||ch==="{"||ch==="}"){if(buf)segs.push({t:buf,h:hot});buf="";if(ch==="["){hot=true}else if(ch==="]"){hot=false}else if(ch==="{"){hot=true;on=true}else hot=false;continue}buf+=ch}
  if(buf)segs.push({t:buf,h:hot});return{segs,hot:segs.some(x=>x.h),onom:on,plain:segs.map(x=>x.t).join("")}})}
function soundScene(){const z=Z(),W=padWords(),col=CH[s.sch],now=performance.now();let o=bgGrad("#FFF6EF","#F1EAF9");
  // header
  o+=T(28,58,cap1(FEAT[s.sch].n),z.hero,{wt:600});
  const dl=flow([{t:FEAT[s.sch].def+"."}],{x:420,y:18,w:360,size:z.small,lh:z.small*1.25,fill:ROSE,align:"middle"});o+=`<g transform="translate(0,${Math.max(0,(52-dl.h)/2)})">${dl.o}</g>`;
  // console
  o+=`<rect x="16" y="82" width="768" height="272" rx="20" fill="${DESK}"/><rect x="16" y="82" width="768" height="272" rx="20" fill="none" stroke="${DESK2}" stroke-width="3"/>`;
  for(let i=0;i<6;i++)o+=`<circle cx="${40+i*16}" cy="102" r="3.5" fill="${i<3?col:"#5A4458"}"/>`;
  o+=T(764,106,"TAP A PAD TO HEAR IT",z.tiny,{a:"end",mono:true,fill:"#B9A3B4",ls:1});
  // pad layout with wrap
  let ps=z.pad,rows,ph;for(let k=0;k<6;k++){ph=ps*1.9;const gap=12,maxW=728;rows=[[]];let x=0;
    W.forEach((w,i)=>{const pw=tw(w.plain,ps,600)+30;if(x>0&&x+gap+pw>maxW){rows.push([]);x=0}rows[rows.length-1].push({i,w,pw,x:x?x+gap:0});x=(x?x+gap:0)+pw});
    if(rows.length*(ph+14)<=172)break;ps*=0.9}
  const top=124+(176-rows.length*(ph+14))/2;
  const seqI=s.seq?(()=>{const e=(now-s.seq.t0)/1000;return s.seq.slots.findIndex(([a,d])=>e>=a&&e<a+d)})():-1;
  rows.forEach((R,r)=>{const rw=R.length?R[R.length-1].x+R[R.length-1].pw:0,ox=400-rw/2,y=top+r*(ph+14);
    R.forEach(P=>{const x=ox+P.x,w=P.w,act=seqI===P.i||(s.flash&&s.flash.i===P.i&&now-s.flash.t0<350),fill=w.hot?col:PADOFF;
      if(act)o+=`<rect x="${x-6}" y="${y-6}" width="${P.pw+12}" height="${ph+12}" rx="16" fill="${w.hot?col:"#8E7489"}" opacity=".35"/>`;
      o+=`<g data-a="pad:${P.i}" role="button" tabindex="0" aria-label="Play the word ${esc(w.plain)}" style="cursor:pointer"><rect x="${x}" y="${y+(act?2:0)}" width="${P.pw}" height="${ph}" rx="12" fill="${fill}" stroke="${act?WHITE:w.hot?"#FFFFFF55":"#5E475B"}" stroke-width="${act?3:1.5}"/>`;
      o+=`<rect x="${x+4}" y="${y+ph-7+(act?2:0)}" width="${P.pw-8}" height="4" rx="2" fill="#000" opacity=".12"/>`;
      let tx=x+15;const by=y+ph/2+ps*0.34+(act?2:0);let line="";
      w.segs.forEach(sg=>{const sw=tw(sg.t,ps,600);if(sg.h&&w.hot)line+=`<rect x="${tx}" y="${by+ps*0.14}" width="${sw}" height="${Math.max(3,ps*0.12)}" rx="1.5" fill="${INK}"/>`;tx+=sw});
      o+=`<text x="${x+15}" y="${by}" style="font:600 ${ps}px ${DISP}">${w.segs.map(sg=>`<tspan style="fill:${w.hot?(sg.h?INK:"#6B4D62"):PADTXT}${sg.h?"":";opacity:"+(w.hot?0.85:0.9)}">${esc(sg.t)}</tspan>`).join("")}</text>${line}</g>`;
      o+=`<circle cx="${x+P.pw-10}" cy="${y-1}" r="3" fill="${w.hot?col:"#5A4458"}"/>`})});
  // the track lane: a little waveform for each word, with a playhead
  const L0=40,L1=760,ly=330;let tot=0;const sl=W.map(w=>{const d=w.hot?(s.sch==="onom"?0.62:0.36):0.24;const r=[tot,d];tot+=d;return r});
  o+=`<rect x="${L0-8}" y="${ly-18}" width="${L1-L0+16}" height="36" rx="10" fill="#241722"/>`;
  W.forEach((w,i)=>{const x0=L0+sl[i][0]/tot*(L1-L0),x1=L0+(sl[i][0]+sl[i][1])/tot*(L1-L0);
    if(!w.hot){o+=`<line x1="${x0+4}" x2="${x1-4}" y1="${ly}" y2="${ly}" stroke="#5A4458" stroke-width="2"/>`;return}
    let d="";const n=40;for(let k=0;k<=n;k++){const xx=x0+3+(x1-x0-6)*k/n,f=k/n;let a;
      if(s.sch==="allit")a=(f<0.25?13*(1-f*4):5*Math.sin(f*Math.PI))*Math.sin(k*2.2);else if(s.sch==="asson")a=12*Math.sin(f*Math.PI)*Math.sin(k*1.1);else a=14*Math.exp(-f*2.5)*Math.sin(k*k*0.37+i);
      d+=(k?" L":"M")+xx.toFixed(1)+","+(ly+a).toFixed(1)}
    o+=`<path d="${d}" fill="none" stroke="${col}" stroke-width="2.2" stroke-linejoin="round"/>`});
  if(s.seq){const e=Math.min(1,(now-s.seq.t0)/1000/s.seq.dur);if(e>0)o+=`<line x1="${L0+e*(L1-L0)}" x2="${L0+e*(L1-L0)}" y1="${ly-18}" y2="${ly+18}" stroke="${WHITE}" stroke-width="2.5"/>`}
  // channel buttons
  SOUNDS.forEach((k,i)=>o+=chanBtn(16+i*262,366,244,42,FEAT[k].n.toUpperCase(),CH[k],s.sch===k,"sch:"+k,z));
  return o}
function chanBtn(x,y,w,h,label,col,on,act,z){return `<g data-a="${act}" role="button" tabindex="0" aria-label="${esc(label)}" style="cursor:pointer"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h/2}" fill="${on?col:WHITE}" stroke="${INK}" stroke-width="${on?2:1.2}"/><circle cx="${x+20}" cy="${y+h/2}" r="5" fill="${on?INK:col}"/>${T(x+w/2+8,y+h/2+z.tiny*0.36+1,label,Math.min(z.tiny,(w-50)/label.length/0.6),{a:"middle",mono:true,wt:on?600:500,ls:0.5})}</g>`}
const cap1=t=>t[0].toUpperCase()+t.slice(1);
function bgGrad(a,b,id="wbg"){return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="800" height="420" fill="url(#${id})"/>`}

// ---- step 2: comparisons as two overlapping circles
const VD={simile:190,metaphor:120,person:160};
function compareScene(){const z=Z(),it=C()[s.cch],col=CH[s.cch];let o=bgGrad("#FBF4FF","#FFF3EE","wbg2");
  const segs=segQuote(it.line,it.quote,"q");const fl=fitFlow(segs,{x:40,y:24,w:720,size:z.h2,lhf:1.28,wt:500,align:"middle",sty:k=>k==="q"?{bg:col,wt:600}:{}},86,z.body);
  o+=`<rect x="16" y="12" width="768" height="${fl.h+24}" rx="16" fill="${WHITE}" stroke="${INK}" stroke-width="1.5"/>`+fl.o;
  const cb=fl.h+36,r=Math.min(140,(420-cb-z.small*2.6-14)/2),cy=cb+z.small*2.6+r,sc=r/124,p=ease((performance.now()-s.vdT)/650),d=(s.vdFrom+(VD[s.cch]-s.vdFrom)*p)*sc,X0=(16+(PH()?150:136)+10+784)/2,ax=X0-d/2,bx=X0+d/2;
  const qcol=s.cch==="person"?"#BFE6D3":"#FAD0DC";
  o+=`<circle cx="${ax}" cy="${cy}" r="${r}" fill="#E8DFF8" stroke="${INK}" stroke-width="1.5" opacity=".95"/><circle cx="${bx}" cy="${cy}" r="${r}" fill="${qcol}" stroke="${INK}" stroke-width="1.5" opacity=".78"/>`;
  o+=`<clipPath id="lens"><circle cx="${ax}" cy="${cy}" r="${r}"/></clipPath><circle cx="${bx}" cy="${cy}" r="${r}" fill="${col}" clip-path="url(#lens)" stroke="${INK}" stroke-width="1.5"/>`;
  o+=T(ax-r*0.36,cy-r*0.56,"WHAT IT IS",z.tiny,{a:"middle",mono:true,fill:ROSE,ls:1})+T(bx+r*0.36,cy-r*0.56,s.cch==="person"?"A PERSON":"COMPARED TO",z.tiny,{a:"middle",mono:true,fill:ROSE,ls:1});
  const lab=(t,x)=>{const f=fitFlow([{t}],{x:x-r*0.46,y:0,w:r*0.92,size:z.body,lhf:1.15,wt:600,align:"middle"},z.body*2.4,z.small);return `<g transform="translate(0,${cy-8-f.h/2-r*0.06})">${f.o}</g>`};
  o+=lab(it.a,ax-r*0.4)+lab(it.b,bx+r*0.4);
  // the bridge word
  const sig=s.cch==="simile"?it.sig.toUpperCase():s.cch==="metaphor"?"IS / WAS":"HUMAN ACTION",sw=tw(sig,z.small,600,true)+28,iy=cy-Math.sqrt(Math.max(0,r*r-d*d/4));
  o+=`<rect x="${X0-sw/2}" y="${iy-z.small*2.4}" width="${sw}" height="${z.small*1.7}" rx="${z.small*0.85}" fill="${INK}"/>`+T(X0,iy-z.small*1.25,sig,z.small,{a:"middle",mono:true,wt:600,fill:WHITE});
  // shared qualities in the overlap
  it.share.forEach((q,i)=>{const w=tw(q,z.small,600)+24,y=cy-z.small*1.6+i*z.small*1.75,show=ease((performance.now()-s.vdT-250-i*120)/400);
    o+=`<g opacity="${show}"><rect x="${X0-w/2}" y="${y-z.small*0.75}" width="${w}" height="${z.small*1.5}" rx="${z.small*0.75}" fill="${WHITE}" stroke="${INK}"/>${T(X0,y+z.small*0.34,q,z.small,{a:"middle",wt:600})}</g>`});
  o+=T(X0,cy+r-14,"SHARED = THE EFFECT",z.tiny,{a:"middle",mono:true,wt:600,fill:INK,ls:1});
  // feature tabs
  CMPS.forEach((k,i)=>{const y=cy-81+i*54,on=s.cch===k;o+=`<g data-a="cch:${k}" role="button" tabindex="0" aria-label="${FEAT[k].n}" style="cursor:pointer"><rect x="${i%2?16:16}" y="${y}" width="${PH()?150:136}" height="40" rx="20" fill="${on?CH[k]:WHITE}" stroke="${INK}" stroke-width="${on?2:1}"/>${T(16+(PH()?75:68),y+20+z.tiny*0.36,FEAT[k].n.toUpperCase(),Math.min(z.tiny,(PH()?132:120)/FEAT[k].n.length/0.6),{a:"middle",mono:true,wt:on?600:500})}</g>`});
  return o}

// ---- step 3: the intensity faders
function ampScene(){const z=Z(),c=C(),now=performance.now();let o=bgGrad("#FFF2F5","#F4EEFB","wbg3");
  o+=`<rect x="16" y="16" width="238" height="388" rx="20" fill="${DESK}"/>`+T(36,46,"INTENSITY DESK",z.tiny,{mono:true,fill:"#B9A3B4",ls:1});
  AMPS.forEach((k,i)=>{const on=s.amp[k],y=70+i*82,p=s.ampT[k]?ease((now-s.ampT[k])/350):1,pos=on?p:1-p,kx=40+pos*150;
    o+=`<g data-a="amp:${k}" role="button" tabindex="0" aria-pressed="${on}" aria-label="${FEAT[k].n}" style="cursor:pointer"><rect x="24" y="${y-8}" width="222" height="74" rx="12" fill="transparent"/>`;
    o+=T(36,y+14,FEAT[k].n.toUpperCase(),Math.min(z.small,196/FEAT[k].n.length/0.6),{mono:true,wt:600,fill:on?CH[k]:"#C7B4C3"});
    o+=`<rect x="40" y="${y+34}" width="170" height="8" rx="4" fill="#1E131C"/><rect x="40" y="${y+34}" width="${pos*170}" height="8" rx="4" fill="${CH[k]}"/>`;
    o+=`<rect x="${kx-12}" y="${y+22}" width="24" height="32" rx="6" fill="${on?CH[k]:"#8E7489"}" stroke="${WHITE}" stroke-width="2"/><line x1="${kx-6}" x2="${kx+6}" y1="${y+38}" y2="${y+38}" stroke="${INK}" stroke-width="2"/>`;
    o+=`<circle cx="228" cy="${y+38}" r="6" fill="${on?CH[k]:"#4A3547"}"/></g>`});
  // meter
  const n=AMPS.filter(k=>s.amp[k]).length;o+=T(272,46,"INTENSITY",z.tiny,{mono:true,fill:ROSE,ls:1});
  for(let i=0;i<12;i++){const lit=i<n*3,c2=i<6?"#9ED39B":i<9?"#F4C46B":"#F49AAE";o+=`<rect x="${396+i*32}" y="28" width="26" height="22" rx="4" fill="${lit?c2:"#EDE3EA"}" stroke="${INK}" stroke-opacity=".25"/>`}
  // the passage: plain line, then each active channel adds its own line
  o+=`<rect x="268" y="66" width="516" height="338" rx="18" fill="${WHITE}" stroke="${INK}" stroke-width="1.5"/>`;
  const parts=[{k:null,line:c.base}].concat(AMPS.filter(k=>s.amp[k]).map(k=>({k,line:c[k].line,q:c[k].quote})));
  let size=z.body,blocks;for(let a=0;a<6;a++){let y=84;blocks=parts.map(P=>{const r=flow(P.k?segQuote(P.line,P.q,"q"):[{t:P.line}],{x:300,y,w:466,size,lh:size*1.28,wt:P.k?500:400,fill:P.k?INK:ROSE,sty:k=>k==="q"?{bg:CH[P.k],wt:600}:{}});const b={...P,r,y};y+=r.h+size*0.55;return b});
    if(blocks.length&&blocks[blocks.length-1].y+blocks[blocks.length-1].r.h<=392)break;size*=0.93}
  blocks.forEach(b=>{const op=b.k&&s.ampT[b.k]?ease((now-s.ampT[b.k])/400):1;o+=`<g opacity="${op}">${b.k?`<rect x="282" y="${b.y+2}" width="6" height="${b.r.h-4}" rx="3" fill="${CH[b.k]}"/>`:""}${b.r.o}</g>`});
  if(!n)o+=T(526,370,"Slide a channel up to add a feature",z.small,{a:"middle",fill:ROSE});
  return o}

// ---- step 4: a scene recoloured by tone, with sensory imagery
function toneSegs(p){const out=[];p.replace(/\{([^|}]+)\|([shtmg])\}|\*([^*]+)\*|([^{*]+)/g,(m,a,b,c2,d)=>{if(a)out.push({t:a,k:"s"+b});else if(c2)out.push({t:c2,k:"tw"});else out.push({t:d});return""});return out}
const TONEPAL={excited:["#FFB38A","#FFE6A6","#FFD08A"],tense:["#5E4E73","#A898BC","#8A7A9E"],calm:["#BFE3E8","#F6EEF8","#D9EFE8"]};
function scene(ctx,tone,H){const P=TONEPAL[tone],dark=tone==="tense";let o=`<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P[0]}"/><stop offset="1" stop-color="${P[1]}"/></linearGradient></defs><rect width="800" height="${H}" fill="url(#sky)"/>`;
  if(tone==="excited"){o+=`<circle cx="650" cy="60" r="42" fill="#FFF3B0"/>`;for(let i=0;i<12;i++){const a=i*Math.PI/6;o+=`<line x1="${650+Math.cos(a)*52}" y1="${60+Math.sin(a)*52}" x2="${650+Math.cos(a)*70}" y2="${60+Math.sin(a)*70}" stroke="#FFF3B0" stroke-width="4" stroke-linecap="round"/>`}}
  else if(tone==="calm"){o+=`<circle cx="640" cy="64" r="30" fill="#FFF8E6" opacity=".9"/><path d="M120,50 q8,-8 16,0 q8,-8 16,0 M180,74 q6,-6 12,0 q6,-6 12,0" fill="none" stroke="${INK}" stroke-width="1.6" opacity=".45"/>`}
  else{o+=[[160,50,90],[420,34,120],[660,58,100]].map(([x,y,w])=>`<ellipse cx="${x}" cy="${y}" rx="${w}" ry="26" fill="#43354F" opacity=".55"/>`).join("");for(let i=0;i<26;i++)o+=`<line x1="${i*33+10}" y1="${(i*53)%120+20}" x2="${i*33+2}" y2="${(i*53)%120+44}" stroke="#E8E0F0" stroke-width="1.2" opacity=".5"/>`}
  const g=dark?"#4E5F55":"#8DBF8A",g2=dark?"#3B4A42":"#6FA36E";
  if(ctx==="bike"){o+=`<rect y="${H-50}" width="800" height="50" fill="${g2}"/>`;for(let i=0;i<9;i++){const x=20+i*92+(i%2)*20,w=26+(i%3)*8;o+=`<rect x="${x}" y="0" width="${w}" height="${H-40}" fill="${dark?"#5A3A34":"#A9674F"}"/><rect x="${x+w*0.6}" y="0" width="${w*0.2}" height="${H-40}" fill="#000" opacity=".12"/>`}
    o+=`<path d="M0,${H-26} C200,${H-70} 380,${H-10} 800,${H-46} L800,${H} L0,${H}Z" fill="${dark?"#6B5040":"#C99A6B"}"/>`+rider(400,H-62)}
  else if(ctx==="fish"){o+=`<rect y="${H*0.52}" width="800" height="${H*0.48}" fill="${dark?"#4F6E80":"#7FC1D6"}"/>`;for(let i=0;i<4;i++)o+=`<path d="M0,${H*0.56+i*14} ${[...Array(20)].map(()=>"q10,-4 20,0 t20,0").join(" ")}" fill="none" stroke="#fff" stroke-opacity="${0.4-i*0.08}"/>`;
    o+=`<path d="M0,${H-70} L170,${H-90} L230,${H-40} L210,${H} L0,${H}Z" fill="${dark?"#5C5058":"#8F8189"}"/><circle cx="130" cy="${H-142}" r="11" fill="${INK}"/><path d="M120,${H-130} q10,-6 20,0 l4,36 l-28,0Z" fill="#E77FA0"/><line x1="140" y1="${H-118}" x2="330" y2="${H-190}" stroke="${INK}" stroke-width="3"/><path d="M330,${H-190} Q420,${H-150} 470,${H*0.52}" fill="none" stroke="${INK}" stroke-width=".8"/><ellipse cx="470" cy="${H*0.52}" rx="7" ry="10" fill="#F29C7A" stroke="${INK}"/>`}
  else if(ctx==="vinyl"){o+=`<rect y="${H-60}" width="800" height="60" fill="${dark?"#6A4B3A":"#B98B5E"}"/>`;const cols=["#F49AAE","#9ED39B","#F4C46B","#8FB8F0","#C9A3E8","#FFB48A"];for(let r=0;r<2;r++)for(let i=0;i<22;i++)o+=`<rect x="${20+i*35}" y="${20+r*70}" width="30" height="58" rx="2" fill="${cols[(i*7+r*3)%6]}" opacity="${dark?0.55:0.9}"/>`;
    o+=`<rect x="300" y="${H-92}" width="200" height="40" rx="8" fill="#3A3540"/><ellipse cx="380" cy="${H-82}" rx="70" ry="12" fill="#1E1B20"/><ellipse cx="380" cy="${H-82}" rx="22" ry="4" fill="#F2B8C6"/>`}
  else if(ctx==="arcade"){o+=`<rect y="${H-50}" width="800" height="50" fill="${dark?"#2C2236":"#3A2C48"}"/>`;for(let i=0;i<9;i++)o+=`<line x1="${i*100}" y1="${H-50}" x2="${i*100-60}" y2="${H}" stroke="#C9A3E8" stroke-opacity=".5"/>`;
    [140,330,520].forEach((x,i)=>{o+=`<rect x="${x}" y="${H-170}" width="140" height="130" rx="10" fill="${dark?"#3B2E4A":"#5B4670"}"/><rect x="${x+16}" y="${H-156}" width="108" height="66" rx="6" fill="${["#8FB8F0","#F49AAE","#9ED39B"][i]}" opacity="${dark?0.6:1}"/><circle cx="${x+40}" cy="${H-70}" r="8" fill="#F4C46B"/><circle cx="${x+70}" cy="${H-70}" r="8" fill="#F49AAE"/><rect x="${x+96}" y="${H-80}" width="6" height="20" fill="#E9DCE6"/>`})}
  else if(ctx==="rugby"){o+=`<rect y="${H*0.42}" width="800" height="${H*0.58}" fill="${g}"/>`;for(let i=0;i<8;i++)o+=`<rect x="${i*100}" y="${H*0.42}" width="50" height="${H*0.58}" fill="#fff" opacity=".07"/>`;
    o+=`<rect y="${H*0.18}" width="800" height="${H*0.24}" fill="${dark?"#5A4E68":"#C9B6D9"}"/>`;for(let i=0;i<70;i++)o+=`<circle cx="${8+i*11.5}" cy="${H*0.24+(i%3)*12}" r="4" fill="${["#F49AAE","#8FB8F0","#F4C46B","#fff"][i%4]}" opacity=".8"/>`;
    o+=`<path d="M560,${H-20} V${H*0.2} M640,${H-20} V${H*0.2} M560,${H*0.62} H640" stroke="#fff" stroke-width="5"/><ellipse cx="300" cy="${H-40}" rx="22" ry="14" fill="#B5734F" transform="rotate(-25,300,${H-40})"/>`}
  else{o+=`<rect y="${H*0.48}" width="800" height="${H*0.22}" fill="${dark?"#4F6E80":"#7FC1D6"}"/><path d="M0,${H*0.7} Q400,${H*0.62} 800,${H*0.72} L800,${H} L0,${H}Z" fill="${dark?"#A89880":"#F1D9A8"}"/>`;
    o+=`<path d="M150,${H} Q160,${H*0.5} 110,${H*0.35}" stroke="#6B4A3A" stroke-width="10" fill="none"/>`;for(let i=0;i<14;i++)o+=`<circle cx="${40+(i*37)%150}" cy="${H*0.22+(i*23)%60}" r="${22+(i%3)*5}" fill="${i%3?"#5C8A55":"#D9534F"}" opacity="${dark?0.7:0.95}"/>`;
    o+=`<rect x="420" y="${H*0.56}" width="90" height="16" rx="8" fill="#F49AAE" transform="rotate(-10,465,${H*0.6})"/>`}
  if(dark)o+=`<rect width="800" height="${H}" fill="#2A1A3A" opacity=".18"/>`;return o}
function rider(x,y){return `<g transform="translate(${x},${y}) rotate(-8)"><circle cx="-26" cy="20" r="17" fill="none" stroke="${INK}" stroke-width="4"/><circle cx="30" cy="20" r="17" fill="none" stroke="${INK}" stroke-width="4"/><path d="M-26,20 L-4,0 L22,0 L30,20 M-4,0 L4,20 L-26,20 M22,0 L18,-12" stroke="${INK}" stroke-width="3.5" fill="none"/><circle cx="6" cy="-34" r="9" fill="#E77FA0"/><path d="M4,-26 L-2,-4 M2,-22 L18,-12" stroke="${INK}" stroke-width="5" stroke-linecap="round"/></g>`}
function toneScene(){const z=Z(),H=206;let o=scene(s.ctx,s.tone,H);
  const tl="TONE: "+s.tone.toUpperCase(),w=tw(tl,z.small,600,true)+30;o+=`<rect x="16" y="14" width="${w}" height="${z.small*1.9}" rx="${z.small*0.95}" fill="${WHITE}" stroke="${INK}" stroke-width="1.5"/>`+T(31,14+z.small*0.95+z.small*0.35,tl,z.small,{mono:true,wt:600});
  o+=`<rect x="0" y="${H}" width="800" height="${420-H}" fill="${WHITE}"/><line x1="0" x2="800" y1="${H}" y2="${H}" stroke="${INK}" stroke-width="1.5"/>`;
  const segs=toneSegs(C().tone[s.tone]);const f=fitFlow(segs,{x:28,y:H+12,w:744,size:z.body,lhf:1.42,sty:k=>k==="tw"?{wt:600,bg:"#EDE3EA"}:k&&k[0]==="s"?{ul:SENSE[k[1]][1],bg:SENSE[k[1]][1],bgop:0.28}:{}},150,z.small);o+=`<g transform="translate(0,${Math.max(0,(150-f.h)/2)})">${f.o}</g>`;
  const used=new Set(segs.filter(x=>x.k&&x.k[0]==="s").map(x=>x.k[1]));
  Object.keys(SENSE).forEach((k,i)=>{const on=used.has(k),x=16+i*155,y=376;o+=`<rect x="${x}" y="${y}" width="145" height="34" rx="17" fill="${on?SENSE[k][1]:WHITE}" stroke="${INK}" stroke-opacity="${on?1:0.3}"/>`+T(x+72.5,y+17+z.tiny*0.36,SENSE[k][0],z.tiny,{a:"middle",mono:true,wt:on?600:400,op:on?1:0.45})});
  return o}

// ---- step 5: the exam-sentence slot machine
function reelOpts(it){const pl=plain(it.line),key=it.quote;let rest=pl.replace(key,"").replace(/^[\s,.;:!?—-]+|[\s,.;:!?—-]+$/g,"").split(/\s+/).filter(Boolean);
  const miss=rest.length>=2?rest.slice(0,5).join(" "):key.split(" ").slice(0,Math.max(1,Math.floor(key.split(" ").length/2))).join(" ");
  const q=[{t:key,sc:2}];if(pl!==key&&pl.length>key.length+3)q.push({t:pl,sc:1});q.push({t:miss,sc:rest.length>=2?0:1});
  return{f:[{t:FEAT[it.f].n,sc:2,k:it.f},...CONFUSE[it.f].map(k=>({t:FEAT[k].n,sc:0,k}))],q,
    e:[{t:"make the writing more interesting",sc:0},{t:FEAT[it.f].d2,sc:1},{t:it.effect,sc:2}],
    r:[{t:"want to keep reading",sc:0},{t:"feel more involved",sc:1},{t:it.reader,sc:2}]}}
function shuffled(a,h){const b=a.map((x,i)=>({x,o:(h>>>(i*3))%7+i*0.1}));b.sort((p,q)=>p.o-q.o);return b.map(p=>p.x)}
function curReels(){const it=itemsOf(C())[s.item],O=reelOpts(it),h=hash(s.ctx+s.item);const R={};
  ["f","q","e","r"].forEach((k,j)=>{R[k]=shuffled(O[k],h+j*977)});
  if(!s.reels||s.reels.key!==s.ctx+s.item){s.reels={key:s.ctx+s.item};["f","q","e","r"].forEach(k=>{let lo=0;R[k].forEach((x,i)=>{if(x.sc<R[k][lo].sc)lo=i});s.reels[k]=lo})}
  return{it,R}}
const score=()=>{const{R}=curReels();return["f","q","e","r"].reduce((a,k)=>a+R[k][s.reels[k]%R[k].length].sc,0)};
const LEVEL=n=>n>=8?"Excellent":n>=6?"Strong":n>=4?"Getting there":"Weak";
const RL={f:"FEATURE",q:"QUOTE",e:"EFFECT",r:"READER"};
function explainScene(){const z=Z(),{it,R}=curReels(),now=performance.now();let o=bgGrad("#FFF8EE","#F2ECFA","wbg5");
  const pl=plain(it.line),qo=R.q[s.reels.q%R.q.length];
  const f=fitFlow(segQuote(pl,qo.t,"q"),{x:40,y:22,w:720,size:z.h2,lhf:1.25,wt:500,align:"middle",sty:k=>k==="q"?{bg:SLOT.q,wt:600}:{}},70,z.body);
  o+=`<rect x="16" y="12" width="768" height="${Math.max(84,f.h+20)}" rx="16" fill="${WHITE}" stroke="${INK}" stroke-width="1.5"/><g transform="translate(0,${Math.max(0,(64-f.h)/2)})">${f.o}</g>`;
  const top=110,rh=216,rw=186;
  ["f","q","e","r"].forEach((k,j)=>{const x=16+j*(rw+8),opts=R[k],i=s.reels[k]%opts.length,op=opts[i],p=ease((now-(s.reelT[k]||0))/260);
    o+=`<g data-a="reel:${k}" role="button" tabindex="0" aria-label="Change the ${RL[k].toLowerCase()}" style="cursor:pointer"><rect x="${x}" y="${top}" width="${rw}" height="${rh}" rx="14" fill="${WHITE}" stroke="${INK}" stroke-width="1.5"/>`;
    o+=`<path d="M${x},${top+14} a14,14 0 0 1 14,-14 h${rw-28} a14,14 0 0 1 14,14 v24 h-${rw}Z" fill="${SLOT[k]}" stroke="${INK}" stroke-width="1.5"/>`+T(x+14,top+26,RL[k],z.tiny,{mono:true,wt:600,ls:1});
    o+=`<clipPath id="rc${k}"><rect x="${x+2}" y="${top+40}" width="${rw-4}" height="${rh-76}"/></clipPath><g clip-path="url(#rc${k})"><g transform="translate(0,${(1-p)*40})" opacity="${p}">`;
    const t=k==="q"?`'${op.t}'`:k==="e"?"to "+op.t:k==="r"?"makes the reader "+op.t:op.t;
    const ff=fitFlow([{t}],{x:x+12,y:top+48,w:rw-24,size:z.reel,lhf:1.22,wt:500},rh-90,z.reel*0.7);o+=ff.o+`</g></g>`;
    for(let d=0;d<opts.length;d++)o+=`<circle cx="${x+rw/2+(d-(opts.length-1)/2)*16}" cy="${top+rh-20}" r="5" fill="${d===i?INK:"none"}" stroke="${INK}"/>`;
    o+=`<path d="M${x+rw-26},${top+rh-25} l7,8 l7,-8" fill="none" stroke="${INK}" stroke-width="2"/></g>`});
  // strength meter
  const sc=score(),mv=s.meter;o+=T(16,358,"STRENGTH",z.tiny,{mono:true,fill:ROSE,ls:1})+T(784,358,`${LEVEL(sc)} · ${sc}/8`,z.small,{a:"end",mono:true,wt:600});
  o+=`<rect x="16" y="368" width="768" height="34" rx="17" fill="${WHITE}" stroke="${INK}" stroke-width="1.5"/>`;
  const gw=Math.max(0,(764-0)*mv/8);o+=`<defs><linearGradient id="mg" x1="0" x2="1"><stop offset="0" stop-color="#F49AAE"/><stop offset=".5" stop-color="#F4C46B"/><stop offset="1" stop-color="#9ED39B"/></linearGradient></defs><rect x="18" y="370" width="${gw}" height="30" rx="15" fill="url(#mg)"/>`;
  for(let i=1;i<8;i++)o+=`<line x1="${16+i*96}" x2="${16+i*96}" y1="372" y2="398" stroke="${INK}" stroke-opacity=".18"/>`;
  return o}

// ---- test: the poem
function poemScene(){const z=Z(),P=C().poem;let o=bgGrad("#FFF7F1","#F1ECFA","wbg6");
  o+=`<rect x="16" y="12" width="768" height="396" rx="18" fill="${WHITE}" stroke="${INK}" stroke-width="1.5"/>`;
  o+=T(48,58,P.title,z.h2+4,{wt:600})+T(752,56,"AN ORIGINAL POEM",z.tiny,{a:"end",mono:true,fill:ROSE,ls:1});
  const marks={};const sv=s.solved;
  if(sv.s0)marks[P.spot[0][0]]=P.spot[0][1];if(sv.s1)marks[P.spot[1][0]]=P.spot[1][1];if(sv.best)marks[P.best.n]=P.best.f;if(sv.fix)marks[P.fix.n]=P.fix.f;
  const lh=48,size=Math.min(z.body+1,lh*0.6);
  P.lines.forEach((L,i)=>{const n=i+1,y=74+i*lh,m=marks[n];
    if(m){const tag=FEAT[m].n.toUpperCase(),tW=tw(tag,z.tiny,600,true)+20;o+=`<rect x="36" y="${y+4}" width="728" height="${lh-8}" rx="10" fill="${CH[m]||"#E3D7FA"}" opacity=".55"/><rect x="${756-tW}" y="${y+lh/2-z.tiny*0.8}" width="${tW}" height="${z.tiny*1.6}" rx="${z.tiny*0.8}" fill="${INK}"/>`+T(756-tW/2,y+lh/2+z.tiny*0.35,tag,z.tiny,{a:"middle",mono:true,wt:600,fill:WHITE})}
    o+=T(54,y+lh/2+size*0.34,String(n),z.small,{mono:true,fill:ROSE})+T(92,y+lh/2+size*0.34,L,size,{wt:m?600:400})});
  const n=Object.values(sv).filter(Boolean).length;o+=T(48,392,`${n} OF 5 SOLVED${sv.tone?" · TONE: "+P.tone.toUpperCase():""}`,z.tiny,{mono:true,wt:600,fill:ROSE,ls:1});
  return o}

// ---- close-up: the exam sentence, built in four coloured parts
function strip(it,title){let o=`<text class="t-lab" x="14" y="20">${esc(title)}</text>`;let y=30;
  [["f","FEATURE",FEAT[it.f]?FEAT[it.f].n:it.f],["q","QUOTE",`'${it.quote}'`],["e","EFFECT","to "+it.effect],["r","READER","which makes the reader "+it.reader]].forEach(([k,lab,txt])=>{
    const f=flow([{t:txt}],{x:92,y:y+6,w:316,size:12,lh:15,fill:INK});const h=Math.max(30,f.h+12);
    o+=`<rect x="10" y="${y}" width="400" height="${h}" rx="8" fill="${SLOT[k]}"/><text x="20" y="${y+19}" style="font:500 10px ${MONO};fill:${INK};letter-spacing:.06em">${lab}</text>`+f.o;y+=h+6});
  return o}
function explainClose(){const{it,R}=curReels();const pick=k=>R[k][s.reels[k]%R[k].length];
  const FB={f:["Not this feature. Look at what the words actually do.","","Right feature."],q:["This bit doesn't contain the feature.","Trim it: quote only the words that do the work.","Short and precise."],
    e:["Too vague: 'interesting' could describe anything.","That just defines the feature. Say what it does in this line.","Specific: says what this line does."],r:["Every text 'makes you want to read on'. Say something only this line does.","Which feeling, exactly?","Names a real feeling or idea."]};
  let o=`<text class="t-lab" x="14" y="20">YOUR SENTENCE, PART BY PART</text>`;let y=30;
  ["f","q","e","r"].forEach(k=>{const p=pick(k),f=flow([{t:FB[k][p.sc]||FB[k][0]}],{x:92,y:y+5,w:300,size:12,lh:15,fill:INK});const h=Math.max(28,f.h+10);
    o+=`<rect x="10" y="${y}" width="400" height="${h}" rx="8" fill="${SLOT[k]}"/><text x="20" y="${y+18}" style="font:500 10px ${MONO};fill:${INK}">${RL[k]}</text>`+f.o+`<text x="402" y="${y+18}" text-anchor="end" style="font:600 12px ${MONO};fill:${p.sc===2?"#2F6B47":p.sc===1?"#8A5A1C":"#A5552F"}">${p.sc===2?"✓":p.sc===1?"~":"✗"}</text>`;y+=h+5});
  const F=pick("f"),fk=F.k;o+=`<text class="t-lab" x="14" y="${y+14}">READ IT BACK</text>`;
  const segs=[{t:"The writer uses "},{t:FEAT[fk].art,k:"f"},{t:" ("},{t:`'${pick("q").t}'`,k:"q"},{t:") "},{t:"to "+pick("e").t,k:"e"},{t:", which "},{t:"makes the reader "+pick("r").t,k:"r"},{t:"."}];
  o+=fitFlow(segs,{x:14,y:y+20,w:392,size:12,lhf:1.3,fill:"var(--ink)",sty:k=>k?{bg:SLOT[k],fill:INK}:{}},256-y-20,9.5).o;
  return o}
function toneItem(){const segs=toneSegs(C().tone[s.tone]),tws=segs.filter(x=>x.k==="tw").map(x=>x.t),sn=segs.filter(x=>x.k&&x.k[0]==="s");
  return{tws,sn,txt:`The writer creates ${s.tone==="excited"?"an":"a"} ${s.tone} tone through word choices like '${tws[0]}' and '${tws[1]||tws[0]}'. Sensory imagery such as '${sn[0].t}' (${SENSE[sn[0].k[1]][0].toLowerCase()}) helps the reader ${TONE_READER[s.tone]}.`}}
function toneClose(){const ti=toneItem();let o=`<text class="t-lab" x="14" y="20">TONE = THE WRITER'S ATTITUDE, SHOWN BY WORD CHOICE</text>`;
  o+=`<rect x="10" y="30" width="400" height="52" rx="8" fill="#EDE3EA"/><text x="20" y="48" style="font:500 10px ${MONO};fill:${INK}">TONE WORDS</text>`+flow([{t:ti.tws.join(" · ")}],{x:20,y:54,w:380,size:12.5,lh:16,wt:600,fill:INK}).o;
  let y=94;o+=`<text class="t-lab" x="14" y="${y}">SENSORY IMAGERY · PAINTS THE PICTURE</text>`;y+=8;
  ti.sn.slice(0,4).forEach(x=>{const f=flow([{t:x.t}],{x:92,y:y+3,w:312,size:12,lh:15,fill:INK});const h=Math.max(24,f.h+6);o+=`<rect x="10" y="${y}" width="400" height="${h}" rx="8" fill="${SENSE[x.k[1]][1]}" opacity=".55"/><text x="20" y="${y+16}" style="font:500 10px ${MONO};fill:${INK}">${SENSE[x.k[1]][0]}</text>`+f.o;y+=h+4});
  return o}
function testClose(){const items=[["Name the feature","Say exactly which one, e.g. 'a simile'."],["Quote 2–6 words","Only the words that do the work."],["Say the effect","What does it show or suggest in THIS line?"],["Say the reader's response","A real feeling or idea, not 'interesting'."]];
  let o=`<text class="t-lab" x="14" y="20">EVERY EXPLANATION, FOUR MOVES</text>`;items.forEach(([a,b],i)=>{const y=32+i*52,k="fqer"[i];o+=`<rect x="10" y="${y}" width="400" height="44" rx="8" fill="${SLOT[k]}"/><text x="22" y="${y+19}" style="font:600 12.5px ${DISP};fill:${INK}">${i+1}. ${esc(a)}</text><text x="22" y="${y+35}" style="font:400 12px ${DISP};fill:${INK}">${esc(b)}</text>`});return o}
function curItem(st){const c=C();if(st.k==="sound")return{f:s.sch,...c[s.sch]};if(st.k==="compare")return{f:s.cch,...c[s.cch]};
  if(st.k==="amp"){const k=s.ampLast&&s.amp[s.ampLast]?s.ampLast:AMPS.find(k=>s.amp[k]);return k?{f:k,...c[k]}:{f:"hyper",...c.hyper}}return null}
function setExam(t){const e=document.getElementById("k-exam");if(e&&e.textContent!==t)e.textContent=t}

// ---- steps
const steps=[
 {k:"sound",lab:"Hear the words",cap:"Each word is a pad on the desk. Pick a channel, press <b>▶ Play the line</b> and listen for the pattern. Tap any pad to hear one word. Sound only plays when you tap.",controls:["ctx","sch","play","mute"],
  big:"<b>The big idea:</b> sound features make you <i>hear</i> the writing. Alliteration repeats first consonant sounds, assonance repeats vowel sounds, and onomatopoeia sounds like the noise it names. Always ask: what does the sound copy, or what mood does it make?",
  exam:"The writer uses alliteration ('Big berms bounced my bike back') to copy the bumpy, thudding rhythm of the wheels slamming into each berm, which makes the reader feel every jolt through the handlebars.",
  trap:"Calling any repeated letter alliteration. It's about the sound, not the spelling: 'kind cats' is alliteration, but 'cheap cars' isn't. Assonance is vowel sounds, wherever they are in the word.",chips:["ch","pat","hits"]},
 {k:"compare",lab:"Comparisons",cap:"A comparison puts two things side by side. The overlap is what they share, and that's where the effect comes from. Switch between simile, metaphor and personification.",controls:["ctx","cch"],
  big:"<b>The big idea:</b> a simile says one thing is <i>like</i> another; a metaphor says it <i>is</i> another; personification gives something non-human a human action. To explain the effect, name what the two things share.",
  exam:"The writer uses a simile ('like a stone down a well') to show how steep the drop is and how little control the rider has, which makes the reader feel the stomach-lurching fall and sense there is no turning back.",
  trap:"Just saying 'it compares the track to a stone'. That only names the feature. Say what they share (straight down, fast, no way back) and why that matters.",chips:["feat","sig","share"]},
 {k:"amp",lab:"Turn it up",cap:"Start with a plain sentence. Slide up a channel to add hyperbole, repetition, a rhetorical question or emotive language, and watch the intensity climb.",controls:["ctx","hyper","rep","rq","emo"],
  big:"<b>The big idea:</b> these features turn up the feeling. Hyperbole exaggerates, repetition hammers an idea home, a rhetorical question pulls the reader in, and emotive language makes them feel. Explain what feeling is being turned up, and why.",
  exam:"The writer uses hyperbole ('practically upside down') to exaggerate the steepness and show how terrifying it looks from the top, which makes the reader understand how huge the drop feels to the rider.",
  trap:"Calling every question a rhetorical question. If the writer answers it straight away, or expects an answer, it's just a question. A rhetorical question is asked for effect.",chips:["on","int"]},
 {k:"tone",lab:"Picture and tone",cap:"The same place, three tones. Change the tone and watch the scene and the word choices change. Sensory imagery is underlined by sense; tone words are in bold.",controls:["ctx","tone"],
  big:"<b>The big idea:</b> imagery paints the picture; tone colours it. Tone is the writer's attitude, and you prove it with word choices. Name the tone with a precise word (tense, not just 'bad'), then quote the words that create it.",
  exam:"The writer creates an excited tone through word choices like 'flew' and 'whooped'. Sensory imagery such as 'cold air whipping my face' (touch) helps the reader share the rush and energy of the moment.",
  trap:"Saying 'the tone is happy' or 'sad' with no proof. Pick a precise tone word (thrilled, uneasy, peaceful) and quote the words that create it.",chips:["tone","senses"]},
 {k:"explain",lab:"Build the sentence",cap:"The exam sentence has four parts. Tap a reel to change it, and push the strength meter as high as it goes. Then try <b>Next line</b>.",controls:["ctx","next"],
  big:"<b>The big idea:</b> <i>The writer uses [feature] ('quote') to [effect], which makes the reader [feel or understand something].</i> The feature name gets you started; the effect and the reader's response are where the marks are.",
  exam:"",trap:"Ending with 'which makes the reader want to keep reading'. It could be said about any text, so it shows nothing. Say what this line makes the reader feel, picture or understand.",chips:["str","lvl"]},
 {k:"test",lab:"Test yourself",cap:"An original poem from your world. Answer each challenge, then press Check. Solved lines light up on the poem.",controls:["ctx"],chips:["solved","world"],
  big:"<b>Exam tip:</b> in an unfamiliar text, find two or three features, then write one strong sentence for each: feature, short quote, effect, reader. Three precise sentences beat a page of feature-spotting."}];

const W=()=>itemsOf(C());
const sel=(id,opts,ph="Choose…")=>`<select id="${id}" class="wx-sel"><option value="">${ph}</option>${opts.map(o=>`<option value="${esc(o[0])}">${esc(o[1])}</option>`).join("")}</select>`;
const radios=(name,opts)=>`<span class="wx-opts">${opts.map(o=>`<label class="wx-opt"><input type="radio" name="${name}" value="${esc(o[0])}"><span>${esc(o[1])}</span></label>`).join("")}</span>`;
const val=id=>{const e=document.getElementById(id);return e?e.value:""};
const rval=n=>{const e=document.querySelector(`input[name="${n}"]:checked`);return e?e.value:""};
function featOpts(f,salt){const o=[f,...CONFUSE[f]||["simile","metaphor"]];const extra=["hyper","person","allit","rep","onom","metaphor","simile"].find(k=>!o.includes(k));o.push(extra);return shuffled(o.map(k=>[k,FEAT[k].n]),hash(s.ctx+salt))}
function solve(k,ok){s.solved[k]=ok||s.solved[k];sfx(ok?"ding":"buzz");if(ok&&Object.values(s.solved).filter(Boolean).length===5)setTimeout(()=>sfx("win"),400);api&&api.redraw();return ok}
const P_=()=>C().poem;
const challenges=[
 {get q(){const[n,f]=P_().spot[0];return `Line ${n}: <i>“${esc(P_().lines[n-1])}”</i> Which feature stands out? ${sel("wc0",featOpts(f,"a"))}`},
  check:()=>solve("s0",val("wc0")===P_().spot[0][1]),ok:()=>`Yes: ${FEAT[P_().spot[0][1]].n}, ${FEAT[P_().spot[0][1]].def}.`,no:()=>val("wc0")?`Not quite. Check the definition: ${FEAT[val("wc0")].n} is ${FEAT[val("wc0")].def}. Does that fit?`:"Choose a feature first."},
 {get q(){const[n,f]=P_().spot[1];return `Line ${n}: <i>“${esc(P_().lines[n-1])}”</i> Which feature stands out? ${sel("wc1",featOpts(f,"b"))}`},
  check:()=>solve("s1",val("wc1")===P_().spot[1][1]),ok:()=>`Yes: ${FEAT[P_().spot[1][1]].n}. Now you could explain its effect.`,no:()=>val("wc1")?`Not quite. Read the line aloud and ask what the words are doing.`:"Choose a feature first."},
 {get q(){const b=P_().best,f=FEAT[b.f];const o=shuffled([["a",`The writer uses ${f.art} to make the poem more interesting.`],["b",`The writer uses ${f.art} ('${b.quote}'), which is ${f.def}.`],["c",sentence(b)]],hash(s.ctx+"c"));
   return `Line ${b.n} uses ${f.art}: <i>“${esc(b.quote)}”</i>. Pick the best explanation. ${radios("wc2",o)}`},
  check:()=>solve("best",rval("wc2")==="c"),ok:"Yes: it names the feature, quotes briefly, says the effect in this line and how the reader responds.",no:()=>rval("wc2")?"Not that one. One option is vague and one just defines the feature. Which one says what this line actually does?":"Pick an option first."},
 {get q(){const x=P_().fix,f=FEAT[x.f];const o=shuffled([["a","to make it sound good, which makes the reader enjoy it"],["b",`to ${x.effect}, which makes the reader ${x.reader}`],["c",`to describe it, which makes the reader read on`]],hash(s.ctx+"d"));
   return `This explanation is weak: <i>“The writer uses ${f.art} ('${esc(x.quote)}') <b>to show it is good, which makes the reader want to read on.</b>”</i> Which ending fixes it? ${radios("wc3",o)}`},
  check:()=>solve("fix",rval("wc3")==="b"),ok:()=>`Yes. Now the whole sentence works: ${sentence(P_().fix)}`,no:()=>rval("wc3")?"That ending is still vague. Look for the one that's specific to this line.":"Pick an option first."},
 {get q(){return `What is the tone of the whole poem? ${sel("wc4",shuffled(P_().toneOpts.map(t=>[t,t]),hash(s.ctx+"e")))}`},
  check:()=>solve("tone",val("wc4")===P_().tone),ok:()=>`Yes: ${P_().tone}. In the exam, back it up with two quotes from the poem.`,no:()=>val("wc4")?"Not quite. Look at the verbs and the last line: what attitude do they show?":"Choose a tone first."}];

// ---- kupu Māori: te reo terms for this machine, each checked in Te Aka Māori Dictionary (ta = word id). Sources and notes: te-reo-notes.md
const KUPU=[
 {mi:"kupu",en:"word",ta:3275},
 {mi:"kupu whakarite",en:"metaphor, simile, figurative language",ta:3286},
 {mi:"orokati tārua",en:"alliteration",ta:46400},
 {mi:"kupu ororite",en:"onomatopoeia",ta:46388},
 {mi:"huarite",en:"rhyme",ta:46329},
 {mi:"tukurua",en:"repetition",ta:8681},
 {mi:"kīanga",en:"phrase",ta:2607},
 {mi:"rerenga kōrero",en:"sentence",ta:6727}];
Object.entries({"sound": ["orokati tārua", "kupu ororite", "huarite"], "compare": ["kupu whakarite"], "amp": ["tukurua"], "tone": ["kupu"], "explain": ["rerenga kōrero", "kīanga"]}).forEach(([k,a])=>{const st=steps.find(x=>x.k===k);if(st)st.kupu=a});
const api=StudyKit.mount({kupu:KUPU,
  eyebrow:"English · Language features", title:"The language features machine", crumb:"Year 9 and 10 English: reading unfamiliar texts and poems", homeHash:"y9",
  fig:"FIG. 15 · A WORD MIXING DESK", railTitle:"From spotting to explaining",
  badge:{label:"English · Year 9",examText:"Tue 3 Nov",exam:"2026-11-03T09:00:00+13:00"},
  mainBox:"0 0 800 420", mainPhoneBig:true, mainLabel:"A word mixing desk: words as pads, comparisons as overlapping circles, intensity faders, a scene that changes with tone, and an exam-sentence slot machine", closeBox:"0 0 420 260",
  state:s, steps, onStep:(x,st)=>{s.step=st.k;if(st.k==="compare"){s.vdFrom=s.vd;s.vdT=performance.now();kick(900)}if(st.k==="explain"){s.meter=0;kick(700)}},
  controls:[
    {type:"select",id:"ctx",label:"Your world",options:CTXK.map(k=>[k,CTX[k].name]),get:()=>s.ctx,set:(x,v)=>{s.ctx=v;s.reels=null;s.solved={};s.meter=0;sfx("tick");
      if(api&&api.step.k==="test")setTimeout(()=>api.setStep(steps.length-1),0);if(api&&api.step.k==="explain")kick(700);if(api&&api.step.k==="compare"){s.vdFrom=VD[s.cch]-60;s.vdT=performance.now();kick(900)}}},
    {type:"select",id:"sch",label:"Channel",options:SOUNDS.map(k=>[k,FEAT[k].n]),get:()=>s.sch,set:(x,v)=>{s.sch=v;sfx("tick")}},
    {type:"button",id:"play",label:"▶ Play the line",onClick:()=>playLine()},
    {type:"toggle",id:"mute",label:"Sound off",get:()=>s.mute,set:(x,v)=>{s.mute=v},labelFn:()=>s.mute?"🔇 Sound off":"🔈 Sound on"},
    {type:"select",id:"cch",label:"Feature",options:CMPS.map(k=>[k,FEAT[k].n]),get:()=>s.cch,set:(x,v)=>setCmp(v)},
    ...AMPS.map(k=>({type:"toggle",id:k,label:cap1(FEAT[k].n),get:()=>s.amp[k],set:(x,v)=>setAmp(k,v)})),
    {type:"select",id:"tone",label:"Tone",options:TONES.map(t=>[t,cap1(t)]),get:()=>s.tone,set:(x,v)=>{s.tone=v;sfx("whoosh")}},
    {type:"button",id:"next",label:"Next line →",onClick:()=>{s.item=(s.item+1)%itemsOf(C()).length;s.reels=null;s.meter=0;sfx("whoosh");kick(700)}}],
  drawMain:(x,st)=>{const k=st.k;
    if(k!=="explain"&&k!=="test"&&k!=="tone"){const it=curItem(st);setExam(sentence(it))}else if(k==="tone")setExam(toneItem().txt);else if(k==="explain"){const{it}=curReels();setExam(sentence(it))}
    if(k==="explain"){const t=score();if(Math.abs(s.meter-t)>0.01){s.meter+=(t-s.meter)*0.18;if(Math.abs(s.meter-t)<0.02)s.meter=t;kick(60)}}
    return k==="sound"?soundScene():k==="compare"?compareScene():k==="amp"?ampScene():k==="tone"?toneScene():k==="explain"?explainScene():poemScene()},
  drawClose:(x,st)=>{const k=st.k;if(k==="explain")return explainClose();if(k==="tone")return toneClose();if(k==="test")return testClose();return strip(curItem(st),"BUILD THE EXAM SENTENCE")},
  chips:(x,st)=>{const c=C(),W2=padWords(),hot=W2.filter(w=>w.hot).length,n=AMPS.filter(k=>s.amp[k]).length,ti=st.k==="tone"?toneItem():null;
    const pat=s.sch==="allit"?`'${c.allit.letter==="k"?"c/k":c.allit.letter}' sound`:s.sch==="asson"?c.asson.vl+" sound":"sound words";
    return{ch:["CHANNEL",FEAT[s.sch].n,true],pat:["PATTERN",pat],hits:["HITS",`${hot} of ${W2.length} words`],
      feat:["FEATURE",FEAT[s.cch].n,true],sig:["SIGNAL",s.cch==="simile"?`'${c[s.cch].sig}'`:s.cch==="metaphor"?`'${c[s.cch].sig}' (it is…)`:`'${c[s.cch].sig}' (human verb)`],share:["SHARED",c[s.cch].share.join(", ")],
      on:["CHANNELS ON",`${n} of 4`,true],int:["INTENSITY",["plain","warm","loud","very loud","maximum"][n]],
      tone:["TONE",s.tone,true],senses:["SENSES",ti?`${new Set(ti.sn.map(x=>x.k)).size} of 5`:""],
      str:["STRENGTH",`${score()} / 8`,true],lvl:["LEVEL",LEVEL(score())],
      solved:["SOLVED",`${Object.values(s.solved).filter(Boolean).length} of 5`,true],world:["WORLD",c.name]}},
  challenges,
  papers:[{label:"NZQA: English past exams",url:"https://www2.nzqa.govt.nz/ncea/subjects/past-exams-and-exemplars/"}],
  truth:"Every line, passage and poem here is original, written for this machine, and simplified so one feature stands out at a time. Real texts mix features together, and a line can use more than one. The sounds are simple synthesised effects. Check your school's exam guidance for exactly what your teacher expects.",
  footer:"Covers Year 9–10 English: identifying and explaining language features (simile, metaphor, personification, alliteration, assonance, onomatopoeia, hyperbole, repetition, rhetorical questions, sensory imagery, emotive language and tone) in unfamiliar texts and poems. Leads into NCEA Level 1 English."
});
function setCmp(v){s.vdFrom=(()=>{const p=ease((performance.now()-s.vdT)/650);return s.vdFrom+(VD[s.cch]-s.vdFrom)*p})();s.cch=v;s.vdT=performance.now();sfx("whoosh");kick(1100)}
function setAmp(k,v){s.amp[k]=v;s.ampT[k]=performance.now();if(v)s.ampLast=k;sfx(v?"pop":"tick");kick(500)}
// ---- taps on the canvas
const svg=document.getElementById("k-main");
function act(a){if(!a)return;const[k,v]=a.split(":");
  if(k==="pad")playPad(+v);else if(k==="sch"){s.sch=v;sfx("tick");api.redraw()}else if(k==="cch"){setCmp(v);api.redraw()}else if(k==="amp"){setAmp(v,!s.amp[v]);api.redraw()}
  else if(k==="reel"){const{R}=curReels();s.reels[v]=(s.reels[v]+1)%R[v].length;s.reelT[v]=performance.now();sfx("tick");const t=score();if(t===8)setTimeout(()=>sfx("win"),200);kick(700)}}
svg.addEventListener("click",e=>{const g=e.target.closest&&e.target.closest("[data-a]");if(g)act(g.getAttribute("data-a"))});
svg.addEventListener("keydown",e=>{if(e.key!=="Enter"&&e.key!==" ")return;const g=e.target.closest&&e.target.closest("[data-a]");if(g){e.preventDefault();act(g.getAttribute("data-a"))}});
// ---- small styles for the challenge inputs (this machine only)
const st=document.createElement("style");st.textContent=`.wx-sel{margin:4px 0 0 4px;max-width:100%}.wx-opts{display:grid;gap:6px;margin-top:8px}.wx-opt{display:flex;gap:8px;align-items:flex-start;font-size:13.5px;line-height:1.4;color:var(--body);border:1px solid var(--line);border-radius:10px;padding:7px 10px;cursor:pointer;background:var(--paper)}
.wx-opt:has(input:checked){border-color:var(--ink);background:var(--chalk)}.wx-opt input{accent-color:var(--sun);margin-top:3px;flex:none}.challenge .q i{font-style:normal;color:var(--ink);font-weight:500}
#k-main [data-a]:focus{outline:none}#k-main [data-a]:focus-visible>rect:first-of-type{stroke:var(--sun);stroke-width:4}`;document.head.appendChild(st);
try{mq.addEventListener("change",()=>api.redraw())}catch(e){}
try{document.fonts&&document.fonts.ready.then(()=>api.redraw())}catch(e){}
})();
