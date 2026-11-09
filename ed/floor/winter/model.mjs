// Operational adapter only. ED.step, routing and all clinical category rules remain unchanged.
import {ED} from '../../sim.js';
export const START=7*1440, HORIZON=1440;
export const PLANS=[
 {id:'base',name:'Existing team',patch:{},note:'6 doctors, 2 triage nurses. 44 cubicles, 4 resus bays, 14 minors chairs.'},
 {id:'staff',name:'Two extra doctors',patch:{doctors:8},note:'8 doctors for all 24 hours: 48 additional doctor-hours. Nursing and spaces unchanged; roster feasibility is assumed.'},
 {id:'flow',name:'Earlier ward releases',patch:{earlyDischarge:true},note:'Same daily ward release allowance, shifted earlier. Requires ward coordination and safe discharge arrangements; clinical eligibility is not modelled.'},
 {id:'capacity',name:'28 staffed ward beds',patch:{extraBeds:28},note:'Assumes 28 additional staffed ward beds, +7 releases/day and +4 holding buffer in this engine. Staffing, lead time and costs are not modelled.'}
];
export function createRun(plan='base',seed=7,{perDay=280,surge=.25,warmup=true}={}){
 if(!Number.isInteger(seed)||seed<1||seed>1e6||!Number.isFinite(perDay)||perDay<0||perDay>1000||!Number.isFinite(surge)||surge<0||surge>1)throw new RangeError('Scenario inputs outside bounded exercise');
 const choice=PLANS.find(p=>p.id===plan);if(!choice)throw new RangeError('Unknown plan');
 const common={...ED.BASE,perDay};const st=ED.newState(common,seed);st.t=5*1440;
 if(warmup)while(st.t<START)ED.step(common,st);else st.t=START;
 st.done=[];const carry=st.pts.length;
 const S={...common,surge,...choice.patch};while(st.docs.length<S.doctors)st.docs.push({p:null});
 return {st,S,seed,plan,carry,arrivals:[],lastID:st.id,boardMinutes:0};
}
export function advance(run,minutes=1){
 if(!Number.isInteger(minutes)||minutes<0)throw new RangeError('Minutes must be a non-negative integer');
 const end=Math.min(START+HORIZON,run.st.t+minutes);
 while(run.st.t<end){ED.step(run.S,run.st);
  for(const p of run.st.pts)if(p.id>run.lastID)run.arrivals.push({id:p.id,arr:p.arr,cat:p.cat,amb:p.amb,admit:p.admit,doc:p.docLeft,obs:p.obsLeft});
  run.lastID=run.st.id;run.boardMinutes+=run.st.pts.filter(p=>p.state==='board').length;
 }return run;
}
export function metrics(run){
 const {st}=run,elapsed=st.t-START,all=[...st.done.map(p=>({...p,seenAt:p.seen})),...st.pts],cohort=all.filter(p=>p.arr>=START);
 const unseen=cohort.filter(p=>p.seenAt==null),seen=cohort.length-unseen.length;
 const accrued=cohort.reduce((n,p)=>n+((p.seenAt??st.t)-p.arr),0);
 const waiting=st.pts.filter(p=>p.seenAt==null).length,boarding=st.pts.filter(p=>p.state==='board').length;
 return {elapsed,arrivals:cohort.length,seen,unseen:unseen.length,waitLowerBound:cohort.length?accrued/cohort.length:0,
 oldestUnseen:unseen.reduce((n,p)=>Math.max(n,st.t-p.arr),0),waiting,boarding,boardAverage:elapsed?run.boardMinutes/elapsed:0,
 exits:st.done.length,cohortExits:st.done.filter(p=>p.arr>=START).length,remaining:st.pts.length,carry:run.carry,
 pending:cohort.filter(p=>p.out==null).length,cub:st.pts.filter(p=>p.where==='cub').length};
}
export function at(plan,seed,minute,options){if(!Number.isInteger(minute)||minute<0||minute>HORIZON)throw new RangeError('Seek outside 24-hour horizon');return advance(createRun(plan,seed,options),minute);}
