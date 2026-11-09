// Fixed teaching traces, not probabilities or calibrated equipment forecasts.
export const TRACES = Object.freeze({
  A: {signal:'Vibration trend rising; motor current stable. Sensor calibration is current.', fault:true, detected:true},
  B: {signal:'Vibration trend rising; motor current stable. Sensor calibration is current.', fault:false, detected:false},
  C: {signal:'Intermittent vibration rise; a sensor check is overdue. Current is inconclusive.', fault:true, detected:false}
});
export const ASSUMPTIONS = Object.freeze({horizon:48, failureHour:30, failureHours:8, inspectionHours:1, repairHours:2, inspectionCost:800, repairCost:6000, emergencyCost:18000, supportCost:1200});
export function compare({trace='A', action='inspect', hourlyCost=4000}={}) {
  if (!Object.hasOwn(TRACES,trace) || !['inspect','replace','defer'].includes(action) || !Number.isFinite(hourlyCost) || hourlyCost<0 || hourlyCost>20000) throw new RangeError('Choose a valid trace, action and cost from 0 to 20,000.');
  const t=TRACES[trace], a=ASSUMPTIONS;
  function run(policy) {
    const supported=policy!=='baseline', inspection=policy==='inspect', repair=policy==='replace'||inspection&&t.detected;
    const missed=t.fault&&!repair, falseAlarm=!t.fault&&repair;
    const planned=(inspection?a.inspectionHours:0)+(repair?a.repairHours:0), unplanned=missed?a.failureHours:0;
    const direct=(supported?a.supportCost:0)+(inspection?a.inspectionCost:0)+(repair?a.repairCost:0)+(missed?a.emergencyCost:0);
    return {policy,planned,unplanned,missed,falseAlarm,direct,total:direct+(planned+unplanned)*hourlyCost,events:[{hour:6,text:supported?'AI alert reviewed by planner':'Scheduled checks: no actionable finding'}, {hour:8,text:inspection?(t.detected?'Inspection confirms defect; planner authorises repair':'Inspection finds no defect (not proof of absence)'):repair?'Planner authorises precautionary replacement':'Continue existing checks; no intervention'}, {hour:30,text:missed?'Fault manifests; protective stop and emergency repair':'No failure in this trace'}, {hour:48,text:'Comparison window ends'}]};
  }
  const baseline=run('baseline'),supported=run(action);
  return {trace,action,hourlyCost,baseline,supported,net:baseline.total-supported.total,truth:t.fault?'Latent bearing defect':'Benign signal; no latent defect'};
}
export function sceneAt(result,hour) {
  if (!result) return {state:'ok',stopped:false};
  const r=result.supported, planned=hour>=8&&hour<8+r.planned, failed=r.missed&&hour>=30&&hour<38;
  return {state:failed?'stop':planned?'service':hour>=6&&hour<8?'warn':'ok',stopped:planned||failed};
}
