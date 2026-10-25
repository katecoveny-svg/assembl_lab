// Side profiles of the stylised car classes as SVG, drawn from the same profile numbers as the 3D kit (/cars/kit3d.js):
// body shell with wheel arches, the glasshouse with its pillars, wheels with rims, head and tail lights, a ground shadow.
// Self-contained on purpose: the MCP Apps card inlines this function's source, so it must not reference anything outside it.
export function profileSVG(kind, paint, opts) {
  opts = opts || {};
  var T = {
    hatch: { L: 4.00, bot: .28, wr: .31, wf: 1.27, wb: -1.27, belt: .93, roof: 1.50, top: [[2.00, .50], [2.00, .68], [1.88, .76], [1.25, .86], [.80, .93]], glass: [.80, .12, -1.42, -1.82], tail: [[-1.82, .93], [-1.95, .86], [-2.00, .55]] },
    sedan: { L: 4.65, bot: .30, wr: .32, wf: 1.40, wb: -1.38, belt: .95, roof: 1.45, top: [[2.32, .52], [2.32, .70], [2.18, .79], [1.45, .90], [.95, .95]], glass: [.95, .18, -1.05, -1.62], tail: [[-1.62, .98], [-2.22, .97], [-2.31, .90], [-2.33, .56]] },
    suv: { L: 4.60, bot: .38, wr: .36, wf: 1.36, wb: -1.36, belt: 1.10, roof: 1.70, top: [[2.30, .60], [2.30, .86], [2.17, .98], [1.50, 1.06], [1.00, 1.10]], glass: [1.00, .28, -1.95, -2.20], tail: [[-2.20, 1.10], [-2.28, 1.00], [-2.30, .62]] },
    ute: { L: 5.30, bot: .44, wr: .38, wf: 1.62, wb: -1.50, belt: 1.14, roof: 1.80, top: [[2.65, .64], [2.65, .92], [2.50, 1.06], [1.70, 1.12], [1.06, 1.14]], glass: [1.06, .40, -.72, -.86],
      tail: [[-.86, 1.14], [-.94, 1.14], [-.94, .74], [-2.58, .74], [-2.58, .70], [-2.65, .66]], tray: [-.94, -2.58, 1.18, .74] },
    van: { L: 5.00, bot: .34, wr: .35, wf: 1.62, wb: -1.40, belt: 1.18, roof: 2.00, top: [[2.50, .58], [2.50, .92], [2.32, 1.06], [1.86, 1.14], [1.64, 1.18]], glass: [1.64, 1.10, -2.40, -2.46], tail: [[-2.46, 1.18], [-2.50, 1.10], [-2.50, .60]], sideTo: .02 },
  }[kind] || null;
  if (!T) T = { L: 4.00, bot: .28, wr: .31, wf: 1.27, wb: -1.27, belt: .93, roof: 1.50, top: [[2.00, .50], [2.00, .68], [1.88, .76], [1.25, .86], [.80, .93]], glass: [.80, .12, -1.42, -1.82], tail: [[-1.82, .93], [-1.95, .86], [-2.00, .55]] };
  var S = 100, H = 2.25, pad = .18, W0 = -2.75, Wd = 5.5;
  var X = function (x) { return ((x - W0) * S).toFixed(1); }, Y = function (y) { return ((H - y) * S).toFixed(1); };
  var P = function (p) { return X(p[0]) + " " + Y(p[1]); };
  var g = T.glass, ra = T.wr + .08, d = "M" + P(T.top[0]);
  T.top.forEach(function (p) { d += " L" + P(p); });
  d += " L" + P([g[1], T.roof]) + " L" + P([g[2], T.roof]) + " L" + P([g[3], T.belt]);
  T.tail.forEach(function (p) { d += " L" + P(p); });
  d += " L" + P([-T.L / 2 + .05, T.bot]) + " L" + P([T.wb - ra, T.bot]) + " A" + (ra * S).toFixed(1) + " " + (ra * S).toFixed(1) + " 0 0 1 " + P([T.wb + ra, T.bot]);
  d += " L" + P([T.wf - ra, T.bot]) + " A" + (ra * S).toFixed(1) + " " + (ra * S).toFixed(1) + " 0 0 1 " + P([T.wf + ra, T.bot]) + " L" + P([T.L / 2 - .06, T.bot]) + " Z";
  // glasshouse: windscreen foot → roof front → roof rear → rear belt (a cab-only window for the ute and van)
  var yb = T.belt + .035, yt = T.roof - .07, end = T.sideTo != null ? T.sideTo : g[3];
  var gl = "M" + P([g[0] - .04, yb]) + " L" + P([g[1] - .02, yt]) + " L" + P([T.sideTo != null ? end : g[2] + .02, yt]) + " L" + P([T.sideTo != null ? end : g[3] + .06, yb]) + " Z";
  var span = (g[1] - (T.sideTo != null ? end : g[2])), n = T.sideTo != null ? 1 : span > 2.3 ? 3 : 2, pillars = "";
  for (var i = 1; i < n; i++) { var px = g[1] - span * i / n; pillars += '<rect x="' + X(px - .05) + '" y="' + Y(yt + .01) + '" width="' + (.1 * S).toFixed(1) + '" height="' + ((yt - yb + .02) * S).toFixed(1) + '" fill="' + paint + '"/>'; }
  var wheel = function (x) {
    var cx = X(x), cy = Y(T.wr), r = T.wr * S, rim = r * .62, sp = "";
    for (var k = 0; k < 5; k++) { var a = k * Math.PI * 2 / 5 - Math.PI / 2; sp += '<line x1="' + cx + '" y1="' + cy + '" x2="' + (+cx + Math.cos(a) * rim * .9).toFixed(1) + '" y2="' + (+cy + Math.sin(a) * rim * .9).toFixed(1) + '" stroke="#8E9095" stroke-width="' + (r * .11).toFixed(1) + '" stroke-linecap="round"/>'; }
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r.toFixed(1) + '" fill="#2E2A2C"/><circle cx="' + cx + '" cy="' + cy + '" r="' + rim.toFixed(1) + '" fill="#C9CCD0"/>' + sp + '<circle cx="' + cx + '" cy="' + cy + '" r="' + (rim * .26).toFixed(1) + '" fill="#9A9DA2"/>';
  };
  var hy = T.top[1][1] - .06, ty = Math.max(.62, T.tail[1][1] - .14);
  var lights = '<rect x="' + X(T.L / 2 - .16) + '" y="' + Y(hy + .06) + '" width="16" height="11" rx="4" fill="#F4F1E8" stroke="#00000022"/>' +
    '<rect x="' + X(-T.L / 2 - .01) + '" y="' + Y(ty + .07) + '" width="11" height="14" rx="3" fill="#B5453E"/>';
  var tray = T.tray ? '<rect x="' + X(T.tray[1]) + '" y="' + Y(T.tray[2]) + '" width="' + ((T.tray[0] - T.tray[1]) * S).toFixed(1) + '" height="' + ((T.tray[2] - T.tray[3]) * S).toFixed(1) + '" fill="' + paint + '" stroke="#240B21" stroke-opacity=".28" stroke-width="2.4"/><line x1="' + X(T.tray[1] + .05) + '" y1="' + Y(T.tray[2] - .06) + '" x2="' + X(T.tray[0] - .05) + '" y2="' + Y(T.tray[2] - .06) + '" stroke="#00000022" stroke-width="3"/>' : "";
  var wells = [T.wf, T.wb].map(function (x) { return '<circle cx="' + X(x) + '" cy="' + Y(T.wr) + '" r="' + (ra * S - 2).toFixed(1) + '" fill="#2E2A2C" opacity=".9"/>'; }).join("");
  var shadow = '<ellipse cx="' + X(0) + '" cy="' + Y(0) + '" rx="' + (T.L * .52 * S).toFixed(1) + '" ry="10" fill="' + (opts.shadow || "#240B21") + '" opacity=".12"/>';
  var label = opts.title ? '<title>' + String(opts.title).replace(/[<&]/g, "") + '</title>' : "";
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + (-pad * S) + ' ' + (-.05 * S) + ' ' + ((Wd + 2 * pad) * S) + ' ' + ((H + .15) * S) + '" role="img"' + (opts.title ? "" : ' aria-hidden="true"') + ' class="' + (opts.cls || "car-profile") + '">' + label + shadow + wells +
    '<path d="' + d + '" fill="' + paint + '" stroke="#240B21" stroke-opacity=".28" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<path d="' + gl + '" fill="#433C47" opacity=".88"/>' + pillars + tray + lights +
    '<line x1="' + X(-T.L / 2 + .2) + '" y1="' + Y(T.bot + .1) + '" x2="' + X(T.L / 2 - .2) + '" y2="' + Y(T.bot + .1) + '" stroke="#00000026" stroke-width="5"/>' +
    wheel(T.wf) + wheel(T.wb) + '</svg>';
}
