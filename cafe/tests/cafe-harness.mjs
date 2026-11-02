// Loads the café twin's existing business model (the inline `const CAFE = (() => { ... })();` classic script in
// cafe/index.html) into Node without a browser, so tests exercise the exact code the page runs. Nothing is copied
// or re-implemented: the script text is lifted from the page and evaluated in an isolated vm context.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

export const PAGE = new URL('../index.html', import.meta.url);

export function modelSource(html = readFileSync(PAGE, 'utf8')) {
  const start = html.indexOf('const CAFE = (() => {');
  if (start < 0) throw new Error('CAFE model script not found in cafe/index.html');
  const open = html.lastIndexOf('<script>', start), close = html.indexOf('</script>', start);
  if (open < 0 || close < 0) throw new Error('CAFE model script tags not found');
  return html.slice(open + '<script>'.length, close);
}

export const modelHash = (src = modelSource()) => createHash('sha256').update(src).digest('hex');

export function loadCafe(src = modelSource()) {
  const ctx = vm.createContext({ Math, JSON, Date, Array, Object, Float64Array, Number, String, Set, Map, isFinite, parseFloat, parseInt });
  vm.runInContext(src + '\n;globalThis.__CAFE = CAFE;', ctx, { filename: 'cafe/index.html#CAFE' });
  return ctx.__CAFE;
}

// A compact per-minute trace of the operational state the 3D scene reads: queue, orders, kitchen, pass, drinks,
// tables, cabinet stock, specials and the bin. Rounded so the golden file is stable across platforms.
export function traceDay(K, S, dow, every = 5) {
  const d = K.newDay(S, dow), M = K.MODES[S.mode], rows = [];
  while (d.t < M.end) {
    if (d.t % every === 0) rows.push(snapshot(K, S, d));
    K.step(S, d);
  }
  return { rows, stats: summary(K.dayStats(S, d)) };
}

export function snapshot(K, S, d) {
  const P = d.parties.slice(0, d.next);
  return [
    d.t,
    d.counterQ.length,                                                     // queue to order (café)
    d.counter.length,                                                      // being served at the till
    P.filter(p => p.phase === 'wait').length,                              // waiting for takeaway
    P.filter(p => p.phase === 'door').length,                              // waiting at the door (dinner)
    d.kitQ.length,                                                         // open kitchen tickets
    d.pass.filter(k => k.out < 0 && k.out !== -2).length,                  // plates waiting at the pass
    S.mode === 'cafe' ? d.espQ.length : d.barQ.length,                     // drinks to make
    d.tables.map(T => T.state[0] + (T.party >= 0 ? '' : '-')).join(''),    // table states
    Object.values(d.stock).reduce((a, v) => a + Math.max(0, v), 0),       // prepped stock left
    Object.keys(d.special).filter(k => d.special[k]).sort().join(','),     // on special
    Math.round(d.binKg * 100) / 100,
    P.filter(p => p.phase === 'app').length,                               // app orders in progress
  ];
}

const r2 = x => (typeof x === 'number' ? Math.round(x * 1000) / 1000 : x);
export function summary(st) {
  const keys = ['sales', 'cogs', 'appSales', 'directSales', 'appOrders', 'served', 'dine', 'take', 'covers', 'p90order', 'p90recv', 'walked', 'walkQueue', 'walkSeat', 'noshow', 'rained', 'hours', 'wages', 'binKg'];
  return Object.fromEntries(keys.map(k => [k, r2(st[k])]));
}

export function weekSummary(w) {
  const keys = ['revenue', 'cogs', 'gp', 'labour', 'commission', 'direct', 'card', 'fees', 'ebitda', 'hours', 'covers', 'served', 'walked', 'wasteKg', 'over', 'under', 'p90orderAvg', 'p90recvAvg'];
  return Object.fromEntries(keys.map(k => [k, r2(w[k])]));
}

export function proofSummary(P) {
  return { w: r2(P.w), y: r2(P.y), capex: P.capex, rows: P.rows.map(r => ({ k: r.k, w: r2(r.w), last: r2(r.last) })) };
}

// The full set of behaviour snapshots used as the golden baseline.
export function baseline(K) {
  const cafe = { ...K.BASE }, cafeAll = { ...K.BASE, ...K.PROPOSED, deposits: false }, dinner = { ...K.BASE, mode: 'dinner' };
  return {
    cafeTuesday: traceDay(K, cafe, 1),
    cafeSaturdayAllProposed: traceDay(K, cafeAll, 5),
    dinnerFriday: traceDay(K, dinner, 4),
    weekCafeAsIs: weekSummary(K.week(cafe)),
    weekDinnerAsIs: weekSummary(K.week(dinner)),
    proofCafe: proofSummary(K.proof(cafe)),
    proofDinner: proofSummary(K.proof(dinner)),
  };
}
