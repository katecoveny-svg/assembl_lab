// Adapter only: all bookings, queues and cleaning come from the existing ACCOM engine.
export const PLANS = [
 {id:'desk',name:'Personal welcome',msg:false,selfci:false,note:'One receptionist welcomes every party at the desk.'},
 {id:'message',name:'Pre-arrival details',msg:true,selfci:false,note:'Collect details before arrival. Every party still visits reception.'},
 {id:'self',name:'Self check-in',msg:false,selfci:true,note:'Eligible parties go straight to their room. Reception remains available.'},
 {id:'both',name:'Both tools',msg:true,selfci:true,note:'Combine both tools. Check whether the extra cost changes this afternoon.'}
];
export function prepareArrival(K) {
 const base=K.run({...K.BASE,...K.AS_IS,mode:'lodge',rto:'nelson'});
 let day=0,max=-1;
 base.day.forEach((d,i)=>d.arr.forEach(x=>{if(x.wait>max){day=i;max=x.wait;}}));
 const plans=PLANS.map(p=>{const year=p.id==='desk'?base:K.run({...base.S,msg:p.msg,selfci:p.selfci});const view=K.dayView(year,day);return {...p,year,view,metrics:arrivalMetrics(view,year)};});
 return {day,plans,start:13*60,end:18*60};
}
export function arrivalMetrics(view,year){return {parties:view.arr.length,maxWait:Math.max(0,...view.arr.map(x=>x.wait)),notReady:view.notReady,self:view.arr.filter(x=>x.self).length,monthlyTools:year.tools/12};}
export function arrivalNow(view,t){return {waiting:view.arr.filter(x=>!x.self&&x.arrH*60<=t&&x.svcStart>t).length,welcomed:view.arr.filter(x=>x.svcEnd<=t).length,cleaning:view.sched.filter(x=>x.start<=t&&x.end>t).length};}
