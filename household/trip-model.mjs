import {number} from './model.mjs';
export function observation(value,now=Date.now()) {
 if(typeof value!=='string'||!value.trim()||!Number.isFinite(Date.parse(value)))throw Error('Add a valid price observation date and time.');
 const age=now-Date.parse(value);if(age < -300000)throw Error('A price observation cannot be in the future.');return {ageHours:age/3600000,stale:age>86400000};
}
export function tripCost(s,now=Date.now()) {
 const n=(k,label,max)=>number(s[k],label,max);
 const baseKm=n('baseKm','Current route distance',3000),nextKm=n('nextKm','Candidate route distance',3000),baseMinutes=n('baseMinutes','Current route minutes',10000),nextMinutes=n('nextMinutes','Candidate route minutes',10000);
 const efficiency=n('efficiency','Fuel consumption',60),litres=n('litres','Litres to buy',200),basePrice=n('basePrice','Usual pump price',10),nextPrice=n('nextPrice','Candidate pump price',10),drivingPrice=n('drivingPrice','Driving fuel value',10);
 if(efficiency===0||basePrice===0||nextPrice===0||drivingPrice===0)throw Error('Consumption and fuel prices must be greater than zero.');
 if(!['91','95','98','diesel'].includes(s.grade))throw Error('Choose one matching fuel grade.');
 if(!s.baseSource?.trim()||!s.nextSource?.trim())throw Error('Record where both pump prices came from.');
 const observations=[observation(s.baseObserved,now),observation(s.nextObserved,now)];
 const baseFees=n('baseFees','Current tolls and parking',1000),nextFees=n('nextFees','Candidate tolls and parking',1000);
 const extraKm=nextKm-baseKm,extraLitres=extraKm*efficiency/100,drivingDifference=extraLitres*drivingPrice,pumpDifference=litres*(basePrice-nextPrice),feeDifference=nextFees-baseFees;
 const net=pumpDifference-drivingDifference-feeDifference;
 return {baseKm,nextKm,extraKm,extraMinutes:nextMinutes-baseMinutes,extraLitres,drivingDifference,pumpDifference,feeDifference,net,baseFill:litres*basePrice,nextFill:litres*nextPrice,stale:observations.some(x=>x.stale),breakEvenLitres:basePrice>nextPrice?Math.max(0,(drivingDifference+feeDifference)/(basePrice-nextPrice)):null};
}
export function blankTrip(){return {grade:'91',baseKm:'',nextKm:'',baseMinutes:'',nextMinutes:'',efficiency:'',litres:'',basePrice:'',nextPrice:'',drivingPrice:'',baseFees:0,nextFees:0,baseSource:'',nextSource:'',baseObserved:'',nextObserved:''};}
export function exampleTrip(){const s=blankTrip(),now=new Date();now.setMinutes(now.getMinutes()-30);const local=new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,16);return {...s,baseKm:18,nextKm:24,baseMinutes:32,nextMinutes:43,efficiency:8,litres:40,basePrice:2.8,nextPrice:2.65,drivingPrice:2.8,baseSource:'Fictional usual-station price',nextSource:'Fictional candidate-station price',baseObserved:local,nextObserved:local};}
