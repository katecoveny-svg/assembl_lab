import {mountPractice} from '../kit/practice.js';
export const practice = {
 id:'pendulum-practice', title:'Make the swing make sense',
 intro:'Predict first. Use the machine to investigate, then explain the physics in your own words. Original practice supporting selected NCEA Level 3 Physics AS91524 oscillation and energy concepts.',
 scope:'Not an NZQA assessment, grade prediction or complete revision course. Check your teacher’s selected topics. The small-angle model excludes friction. Physical periods come from the model, not the independently controlled animation speed.',
 questions:[
 {prompt:'Predict: at length 0.60 m and release angle 8°, what happens to the period and total mechanical energy when mass increases from 0.50 kg to 1.00 kg? Explain before moving the slider.',
 hint:'Which equation contains mass: T = 2π√(L/g), or E ≈ ½mgLA²? A must be in radians.',
 answer:'The period stays approximately 1.55 s because mass is absent from the ideal period equation. Energy doubles from 0.0287 J to 0.0574 J because E is proportional to mass at fixed length and angle. A larger gravitational force is accompanied by greater inertia.',
 misconception:'A heavier bob does not have a shorter ideal pendulum period.'},
 {prompt:'Calculate the periods for lengths 0.40 m and 0.90 m, using g = 9.81 m/s² and the same small release angle. Enter the ratio T(long)/T(short). Which completes fewer cycles in a fixed real time?',
 hint:'Use T = 2π√(L/g). In the ratio, the common factors cancel: T₂/T₁ = √(L₂/L₁).',
 expected:1.5,tolerance:.02,unit:'ratio (no units)',
 answer:'T(short) = 2π√(0.40/9.81) = 1.26875… s ≈ 1.27 s. T(long) = 2π√(0.90/9.81) = 1.90312… s ≈ 1.90 s. Their ratio is √(0.90/0.40) = 1.50. The longer pendulum completes fewer cycles. Values are model calculations, not experimental measurements.',
 misconception:'Period scales with the square root of length, not length itself.'},
 {prompt:'Explain why the bob is fastest at the bottom and momentarily stationary at a turning point. Why would a real pendulum eventually stop while this one does not?',
 hint:'Track energy transfers. “Energy disappears” is not an explanation. What does the model leave out?',
 answer:'At a turning point, speed and kinetic energy are zero while potential energy is greatest. On the way down, potential energy transfers to kinetic energy. At the bottom, potential energy relative to that level is zero and kinetic energy, hence speed, is greatest. Air resistance and pivot friction transfer a real pendulum’s mechanical energy to the surroundings, mainly as thermal energy. This ideal model excludes those losses.',
 misconception:'Zero speed at a turning point does not mean zero restoring acceleration.'}
 ],
 sources:[{label:'NZQA AS91524: mechanical systems',href:'https://www.nzqa.govt.nz/nqfdocs/ncea-resource/achievements/2023/as91524.pdf'},{label:'2026 Level 3 Physics assessment specifications',href:'https://www.nzqa.govt.nz/nqfdocs/ncea-resource/specifications/2026/91524-spc-2026.pdf'}]
};
if (typeof document !== 'undefined') mountPractice(practice);
