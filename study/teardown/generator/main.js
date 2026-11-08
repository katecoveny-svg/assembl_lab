import {createTeardown,fmt} from '/study/teardown/kit/teardown.js';
import * as model from './model.js';
import {build} from './machine.js';
const simple={label:'Ideal model',note:'Uniform magnetic field, steady rotation, no winding resistance or inductance. Purely resistive external load. External drive supplies the electrical energy.'};
createTeardown({
  id:'generator',title:'AC generator',subtitle:'Turn motion into alternating voltage · inspect the coil, poles and slip rings',
  level:'Physics companion: magnetic flux, Faraday’s law, AC, energy and power. Supports senior secondary revision; not a complete assessment-standard lesson.',checked:'8 November 2026',
  canvasLabel:'A rotating rectangular coil between two magnetic poles, with slip rings, brushes and a resistive load. All readouts follow the same ideal model.',
  truth:[simple,{label:'Illustrative',note:'20 × 16 cm loop, 100 turns and chosen field/speed/load ranges are teaching values, not a product specification. Five drawn strands represent 100 turns; housing is schematic.'}],
  model:{period:360,unit:'°',at:model.at,checks:model.checks,inputs:[
    {key:'rpm',label:'Rotation speed',min:0,max:600,step:20,value:120,format:v=>fmt(v)+' rpm',note:'The display slows rotation for inspection. At 0 rpm the phase can still be explored, but emf is zero.'},
    {key:'field',label:'Magnetic field',min:0,max:.8,step:.05,value:.2,format:v=>fmt(v,2)+' T',note:'Uniform field; independent of the coil’s current in this idealisation.'},
    {key:'resistance',label:'Load resistance',min:5,max:100,step:5,value:20,format:v=>fmt(v)+' Ω',note:'A purely resistive load. Current and load power change; ideal emf does not.'}
  ]},build,step:10,cycleSeconds:6,
  bands:[{from:0,to:180,label:'Positive output'},{from:180,to:360,label:'Negative output'}],
  live:{label:'Generated emf',unit:'V',digits:2,value:s=>s.emf,a:s=>s.direction,b:s=>fmt(s.theta)+'° coil angle'},
  say:s=>s.direction,
  status:(s,k)=>`Phase demonstration: one turn in ${fmt(k.cycleSeconds)} s · model frequency ${fmt(s.frequency,2)} Hz`,
  readoutsTruth:simple,readouts:[
    {label:'Flux per turn',get:s=>fmt(s.flux*1000,2)+' mWb'},
    {label:'Flux linkage',get:s=>fmt(s.linkage,3)+' Wb-turn'},
    {label:'Current through load',get:s=>fmt(s.current,3)+' A'},
    {label:'Instantaneous load power',get:s=>fmt(s.power,2)+' W'},
    {label:'Average load power',get:s=>fmt(s.meanPower,2)+' W'},
    {label:'RMS voltage',get:s=>fmt(s.rms,2)+' V'},
    {label:'Drive torque required',get:s=>fmt(s.torque,3)+' N·m'}
  ],charts:[
    {id:'flux',kind:'sweep',title:'Flux linkage',y:{label:'Wb-turn'},series:[{label:'NΦ',get:s=>s.linkage}],value:s=>fmt(s.linkage,3)+' Wb-turn'},
    {id:'emf',kind:'sweep',title:'Alternating emf',y:{label:'V'},series:[{label:'Emf',get:s=>s.emf}],value:s=>fmt(s.emf,2)+' V'},
    {id:'power',kind:'sweep',title:'Power delivered to the load',y:{label:'W',min:0},series:[{label:'Power',get:s=>s.power}],value:s=>fmt(s.power,2)+' W',footer:s=>'Voltage and current both reverse; their product stays non-negative.'}
  ],schematic:{title:'Flux changes, so voltage appears',height:150,truth:simple,formula:'Φ = BA cos θ · ε = −N dΦ/dt = NBAω sin θ<br>I = ε/R · P = ε²/R',draw(s){
    const x=85,y=75,a=s.angle,nx=45*Math.cos(a),ny=-45*Math.sin(a);
    return `<g style="color:var(--ink)" fill="none" stroke="currentColor"><path d="M20 30H240M20 75H240M20 120H240" opacity=".25"/><circle cx="${x}" cy="${y}" r="45" stroke-dasharray="3 4" opacity=".4"/><line x1="${x}" y1="${y}" x2="${x+nx}" y2="${y+ny}" stroke-width="3"/><circle cx="${x+nx}" cy="${y+ny}" r="3" fill="currentColor"/><g stroke="none" fill="currentColor" font-family="IBM Plex Mono,monospace" font-size="10"><text x="155" y="45">B →</text><text x="155" y="65">θ ${fmt(s.theta)}°</text><text x="155" y="85">ε ${fmt(s.emf,2)} V</text><text x="18" y="145">View down the rotation axis; line = coil normal</text></g></g>`;
  }},
  callouts:[
    {anchor:'North pole',label:'North pole',side:'left',at:.22,value:s=>fmt(s.B,2)+' T in the gap'},
    {anchor:'Coil',label:'Rotating winding',side:'left',at:.55,value:s=>fmt(s.N)+' turns · '+fmt(s.theta)+'°'},
    {anchor:'Rings',label:'Separate slip rings',side:'right',at:.22,value:()=> 'AC: no split-ring rectification'},
    {anchor:'Load',label:'Resistive load',side:'right',at:.7,value:s=>fmt(s.R)+' Ω · '+fmt(s.power,2)+' W'}
  ],
  subsystems:[{key:'rotor',label:'Winding and shaft'},{key:'field',label:'Magnetic field'},{key:'output',label:'Rings and load'},{key:'frame',label:'Bench and bearings'}],
  views:{hero:{label:'Hero',az:28,el:22,dist:105,narrowDist:185,target:[4,3,0]},front:{label:'Front',az:0,el:12,dist:100,narrowDist:185,target:[3,3,0]},top:{label:'Along the shaft',az:0,el:80,dist:105,narrowDist:185,target:[0,3,0]},apart:{hidden:true,az:28,el:28,dist:185,narrowDist:240,target:[4,7,0]}},
  learn:[
    {step:'Explore',text:'Pause and step through 0°, 90°, 180° and 270°. Compare the flux and voltage curves. The largest flux is not the largest voltage.',show:{play:false,view:'front'}},
    {step:'Predict',text:'What happens to peak voltage if rotation speed doubles? What happens to average load power when resistance doubles?'},
    {step:'Investigate',text:'Keep field and resistance fixed; compare 120 rpm with 240 rpm. Then return to 120 rpm and double the load resistance. Record voltage, current and power.'},
    {step:'Explain',text:'Use Faraday’s law to explain the quarter-cycle shift. Use I = ε/R to explain why lower resistance requires more drive torque. The load’s energy comes from turning the shaft.'}
  ],sources:[
    {label:'OpenStax University Physics, 13.7 Electric Generators and Back Emf',href:'https://openstax.org/books/university-physics-volume-2/pages/13-7-electric-generators-and-back-emf',note:'Rotating-coil geometry and ε = NBAω sin θ. Geometry here is an original schematic, not a copied product.'},
    {label:'OpenStax University Physics, 15.2 Simple AC Circuits',href:'https://openstax.org/books/university-physics-volume-2/pages/15-2-simple-ac-circuits',note:'Ideal resistive AC load, RMS and average power.'}
  ]
});
