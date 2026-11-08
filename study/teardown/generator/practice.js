import {mountPractice} from '../kit/practice.js';
export const practice = {
 id:'generator-practice',title:'From a turning coil to useful power',
 intro:'Predict first, calculate second, then explain where the energy comes from. Original practice supporting selected NCEA Level 3 Physics AS91526 induction and AC concepts.',
 scope:'Not an NZQA assessment, grade prediction or complete revision course. This companion does not cover the standard’s full DC, capacitor, inductor or reactive-circuit scope. Use the ideal fixed-speed model: 100 turns, loop area 0.032 m², no internal resistance or inductance. Angle is between the coil normal and the field.',
 questions:[
 {prompt:'Predict the flux linkage and generated emf at 0°, 90°, 180° and 270°. Where is each greatest in magnitude? Pause and step through the machine to check.',
 hint:'Flux linkage λ = NBA cos θ. Generated emf ε = NBAω sin θ. Think about the rate of change, not just the amount of flux.',
 answer:'Flux-linkage magnitude is greatest at 0° and 180°, where emf is zero. Emf magnitude is greatest at 90° and 270°, where flux linkage is zero but changing fastest. With this model’s sign convention, emf is positive at 90° and negative at 270°.',
 misconception:'Maximum magnetic flux is not maximum induced voltage.'},
 {prompt:'Set B = 0.20 T, speed = 120 rpm and resistance = 20 Ω. Calculate frequency, angular speed, peak emf, RMS voltage and average load power. Enter the average power in watts.',
 hint:'f = rpm/60; ω = 2πf; ε(max) = NBAω; V(rms) = ε(max)/√2; average P = V(rms)²/R. Keep extra digits until your final answer.',
 expected:1.6170359850744803,tolerance:.02,unit:'W',
 answer:'f = 120/60 = 2.00 Hz. ω = 4π = 12.57 rad/s. ε(max) = 100 × 0.20 × 0.032 × 4π = 8.04 V. V(rms) = 8.04248…/√2 = 5.69 V. Average power = 5.68689…²/20 = 1.62 W. The answer check accepts rounding within 0.02 W; this is practice feedback, not NZQA marking.',
 misconception:'Peak voltage squared divided by resistance gives peak instantaneous power, not average power.'},
 {prompt:'Set B = 0.20 T and speed = 120 rpm, then increase resistance from 20 Ω to 40 Ω. Explain what happens to ideal emf, RMS current, average power and average drive torque.',
 hint:'Emf is set by N, B, A and ω. Use I(rms) = V(rms)/R and average P = average torque × ω.',
 answer:'Ideal emf stays unchanged. RMS current halves from 0.284 A to 0.142 A. Average power halves from 1.62 W to 0.809 W. At unchanged angular speed, average drive torque also halves. The external mechanical drive supplies the electrical energy; the magnets are not an energy source.',
 misconception:'These relationships assume an ideal generator kept at fixed speed. Real generators can have internal losses and changing speed.'}
 ],
 sources:[{label:'NZQA AS91526: electrical systems',href:'https://www.nzqa.govt.nz/nqfdocs/ncea-resource/achievements/2023/as91526.pdf'},{label:'2026 Level 3 Physics assessment specifications',href:'https://www.nzqa.govt.nz/nqfdocs/ncea-resource/specifications/2026/91524-spc-2026.pdf'}]
};
if (typeof document !== 'undefined') mountPractice(practice);
