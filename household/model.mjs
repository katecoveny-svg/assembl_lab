// Adapted from Assembl lib/os/packs/household/modules/bills.ts.
// Extended with strict input validation, separate GST bases and scenario accounting.
export function number(value, label, max = 1000000) {
  if (!['string','number'].includes(typeof value) || (typeof value === 'string' && value.trim() === '')) throw Error(`${label}: enter a number.`);
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > max) throw Error(`${label}: use a number from 0 to ${max}.`);
  return n;
}
export function period(value) { const n = number(value, 'Billing days', 366); if (!Number.isInteger(n) || n < 1) throw Error('Billing days: use a whole number from 1 to 366.'); return n; }
export function bill(days, rows, plan, reduction = 0) {
  days = period(days);
  if (!rows.length || rows.length > 3) throw Error('Enter 1–3 usage bands.');
  if (!['incl','excl'].includes(plan.gst)) throw Error('Choose a GST basis.');
  reduction = number(reduction, 'Usage reduction', 100);
  const factor = plan.gst === 'excl' ? 1.15 : 1;
  const fixed = days * number(plan.daily, 'Daily charge', 10000) / 100 * factor;
  const kwh = rows.reduce((s,r) => s + number(r.kwh, 'Usage kWh'), 0) * (1 - reduction / 100);
  if (plan.rates.length !== rows.length) throw Error('Every usage band needs a matching rate.');
  const usage = rows.reduce((s,r,i) => s + number(r.kwh, 'Usage kWh') * number(plan.rates[i], 'Unit rate', 10000) / 100, 0) * factor * (1 - reduction / 100);
  // Adjustments are separately labelled GST-inclusive NZD, never taxed twice.
  const fees = number(plan.fees, 'Period fees');
  const credit = number(plan.credit, 'Period credits');
  const total = fixed + usage + fees - credit;
  return { fixed, usage, fees, credit, total, kwh, effective: kwh ? total / kwh * 100 : null };
}
export function compare(s) {
  const current = bill(s.days, s.rows, s.current);
  const alternative = bill(s.days, s.rows, s.alternative);
  const scenario = bill(s.days, s.rows, s.alternative, s.reduction);
  const switchFee = number(s.switchFee, 'One-off switching cost');
  const stated = s.stated === '' ? null : number(s.stated, 'Stated bill total');
  return { current, alternative, scenario, switchFee, planDifference: current.total - alternative.total,
    behaviourDifference: alternative.total - scenario.total,
    combinedDifference: current.total - scenario.total - switchFee,
    unexplained: stated === null ? null : stated - current.total };
}
export function basket(rows) {
  let baseline=0, planned=0, pantry=0, priceChange=0;
  for (const r of rows) {
    const qty=number(r.qty,'Quantity',10000), have=number(r.have,'Already have',10000), price=number(r.price,'Usual unit cost'), next=number(r.next,'Planned unit cost');
    if (have>qty) throw Error('Already have cannot exceed the quantity needed.');
    baseline+=qty*price; planned+=(qty-have)*next; pantry+=have*price; priceChange+=(qty-have)*(price-next);
  }
  return {baseline,planned,pantry,priceChange,difference:baseline-planned};
}
export const blank = () => ({version:1,example:false,days:'',stated:'',rows:[{name:'Anytime',kwh:''}],current:{daily:'',gst:'incl',rates:[''],fees:0,credit:0},alternative:{daily:'',gst:'incl',rates:[''],fees:0,credit:0},reduction:0,switchFee:0,food:[],school:[]});
export const example = () => ({version:1,example:true,days:31,stated:227.85,rows:[{name:'Anytime',kwh:412},{name:'Night',kwh:118}],current:{daily:245,gst:'incl',rates:[31.2,19.8],fees:0,credit:0},alternative:{daily:220,gst:'incl',rates:[29,18],fees:0,credit:0},reduction:0,switchFee:0,food:[{name:'Milk · 2 L',qty:3,have:1,price:5,next:4.8},{name:'Rice · 1 kg',qty:2,have:1,price:4,next:3.5},{name:'Apples · 1 kg',qty:2,have:0,price:5,next:4.5}],school:[{name:'Uniform shirts',qty:3,have:1,price:35,next:15},{name:'Stationery pack',qty:1,have:0,price:40,next:32}]});
export function validate(s) { if(s.version!==1) throw Error('Unsupported saved version.'); compare(s); basket(s.food); basket(s.school); return s; }
