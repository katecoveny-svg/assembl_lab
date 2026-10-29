const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
export function phasePose(phase){
 if(!Number.isFinite(phase)) throw new TypeError('phase must be finite');
 const p=((phase%1)+1)%1;
 const av=p<.55?smooth(p/.035)*(1-smooth((p-.51)/.04)):0;
 const semilunar=p>=.60&&p<.88?smooth((p-.60)/.035)*(1-smooth((p-.845)/.035)):0;
 const contraction=p<.55?1-smooth(p/.50):p<.88?smooth((p-.60)/.28):1;
 const phaseName=p<.55?'Filling':p<.60?'Isovolumetric contraction':p<.88?'Ejection':'Isovolumetric relaxation';
 return {phase:p,av,semilunar,contraction,phaseName};
}
