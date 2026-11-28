import { PLANT_MAP, NZ_SURFACES, NZ_EDGINGS } from '../catalog.mjs';
import { NZ_GARDEN_PROPS } from './gardenProps.js';

export const NZ_LABOUR_RATE_HR = 85; // NZD/hr standard landscape installation labour
export const NZ_GST_RATE = 0.15;     // 15% New Zealand GST

/**
 * Compute an accurate Landscape Designer Client Quote & Bill of Materials (BOM)
 * directly from the 512x512 3-splatmap textures, planted species, beds, and NZ features.
 */
export function computeClientQuote(engine, propsEngine, options = {}) {
  const includeLabour = Boolean(options && options.includeLabour);
  const poolQuantities = (options && options.poolQuantities) || null;
  const poolSubtotal = (poolQuantities && poolQuantities.active) ? poolQuantities.totalExGst : 0;
  const S = engine.splatRes;
  const totalPixels = S * S;
  const terrainAreaM2 = engine.terrainSize * engine.terrainSize;
  const m2PerPixel = terrainAreaM2 / totalPixels;

  const dA = engine.splatDataA;
  const dB = engine.splatDataB;
  const dC = engine.splatDataC;

  // Exact pixel weight integration across all 11 channels (0..10)
  const channelPxSum = new Float64Array(11);
  for (let p = 0; p < totalPixels; p++) {
    const idx = p * 4;
    const w0 = dA[idx];
    const w1 = dA[idx + 1];
    const w2 = dA[idx + 2];
    const w3 = dA[idx + 3];
    const w4 = dB[idx];
    const w5 = dB[idx + 1];
    const w6 = dB[idx + 2];
    const w7 = dB[idx + 3];
    const w8 = dC[idx];
    const w9 = dC[idx + 1];
    const w10 = dC[idx + 2];

    const sum = w0 + w1 + w2 + w3 + w4 + w5 + w6 + w7 + w8 + w9 + w10;
    if (sum <= 0) continue;
    const inv = 1.0 / sum;
    channelPxSum[0] += w0 * inv;
    channelPxSum[1] += w1 * inv;
    channelPxSum[2] += w2 * inv;
    channelPxSum[3] += w3 * inv;
    channelPxSum[4] += w4 * inv;
    channelPxSum[5] += w5 * inv;
    channelPxSum[6] += w6 * inv;
    channelPxSum[7] += w7 * inv;
    channelPxSum[8] += w8 * inv;
    channelPxSum[9] += w9 * inv;
    channelPxSum[10] += w10 * inv;
  }

  // 1. Bulk Barks, Chips & Pebbles (depth > 0 -> m² + m³ with 10% compaction/waste allowance)
  const bulkItems = [];
  let bulkSubtotal = 0;
  let totalBulkM3 = 0;

  // 2. Paving & Decking (category === 'paving' -> m²)
  const pavingItems = [];
  let pavingSubtotal = 0;
  let totalPavingM2 = 0;

  let paintedLandscapedM2 = 0;

  for (const surf of NZ_SURFACES) {
    if (surf.channel === 0) continue;
    const areaM2 = channelPxSum[surf.channel] * m2PerPixel;
    if (areaM2 < 0.20) continue; // Ignore negligible brush feathering
    paintedLandscapedM2 += areaM2;

    if (surf.depth > 0) {
      const volumeM3 = areaM2 * surf.depth * 1.10; // +10% compaction/waste allowance
      const cost = volumeM3 * surf.pricePerM3;
      bulkSubtotal += cost;
      totalBulkM3 += volumeM3;
      bulkItems.push({
        surface: surf,
        areaM2,
        volumeM3,
        cost
      });
    } else {
      const cost = areaM2 * surf.pricePerM2;
      pavingSubtotal += cost;
      totalPavingM2 += areaM2;
      pavingItems.push({
        surface: surf,
        areaM2,
        cost
      });
    }
  }

  // 3. Bed Edging (linear metres lm)
  const edgingMap = new Map();
  let bedAreaM2 = 0;
  let edgingSubtotal = 0;
  let totalEdgingLm = 0;

  for (const b of engine.beds) {
    bedAreaM2 += b.area;
    const edgeSpec = NZ_EDGINGS.find(e => e.id === b.edgingId);
    if (edgeSpec && edgeSpec.pricePerM > 0) {
      const prev = edgingMap.get(edgeSpec.id) || { edging: edgeSpec, lm: 0, cost: 0 };
      prev.lm += b.perimeter;
      prev.cost += b.perimeter * edgeSpec.pricePerM;
      edgingMap.set(edgeSpec.id, prev);
      edgingSubtotal += b.perimeter * edgeSpec.pricePerM;
      totalEdgingLm += b.perimeter;
    }
  }
  const edgingItems = [...edgingMap.values()];

  // 4. NZ Plants Schedule
  const bySpecies = new Map();
  let plantsSubtotal = 0;
  let treeCount = 0;
  for (const p of engine.plants) {
    const spec = PLANT_MAP[p.speciesId];
    if (!spec) continue;
    bySpecies.set(p.speciesId, (bySpecies.get(p.speciesId) || 0) + 1);
    plantsSubtotal += spec.priceNZD;
    if (spec.category === 'trees') treeCount++;
  }
  const plantItems = [...bySpecies.entries()]
    .map(([id, count]) => ({
      plant: PLANT_MAP[id],
      count,
      subtotal: count * PLANT_MAP[id].priceNZD
    }))
    .sort((a, b) => b.subtotal - a.subtotal);

  // 5. NZ Garden Features / Props
  const propMap = new Map();
  let featuresSubtotal = 0;
  let totalProps = 0;
  if (propsEngine && Array.isArray(propsEngine.props)) {
    for (const pr of propsEngine.props) {
      const def = NZ_GARDEN_PROPS.find(d => d.id === pr.typeId);
      if (!def) continue;
      const prev = propMap.get(def.id) || { prop: def, count: 0, subtotal: 0 };
      prev.count++;
      prev.subtotal += def.priceNZD;
      propMap.set(def.id, prev);
      featuresSubtotal += def.priceNZD;
      totalProps++;
    }
  }
  const featureItems = [...propMap.values()];

  const landscapedAreaM2 = Math.max(bedAreaM2, paintedLandscapedM2);
  const pavingAndEdgingSubtotal = pavingSubtotal + edgingSubtotal;

  // 6. Optional Installation Labour (@ $85/hr)
  const prepHours = landscapedAreaM2 * 0.12;
  const spreadHours = totalBulkM3 * 1.40;
  const pavingHours = totalPavingM2 * 0.85;
  const plantingHours = (engine.plants.length - treeCount) * 0.12 + treeCount * 0.45;
  const edgingHours = totalEdgingLm * 0.25;
  const featureHours = totalProps * 0.75;
  const labourHours = Math.round((prepHours + spreadHours + pavingHours + plantingHours + edgingHours + featureHours) * 10) / 10;
  const labourSubtotal = includeLabour ? labourHours * NZ_LABOUR_RATE_HR : 0;

  const subtotalExclGst = plantsSubtotal + bulkSubtotal + pavingAndEdgingSubtotal + featuresSubtotal + poolSubtotal + labourSubtotal;
  const gstAmount = subtotalExclGst * NZ_GST_RATE;
  const grandTotalInclGst = subtotalExclGst + gstAmount;

  return {
    landscapedAreaM2,
    totalPlants: engine.plants.length,
    totalProps,
    speciesCount: bySpecies.size,
    plantItems,
    bulkItems,
    pavingItems,
    edgingItems,
    featureItems,
    plantsSubtotal,
    bulkSubtotal,
    pavingSubtotal,
    edgingSubtotal,
    pavingAndEdgingSubtotal,
    featuresSubtotal,
    poolSubtotal,
    poolQuantities,
    includeLabour,
    labourHours,
    labourRate: NZ_LABOUR_RATE_HR,
    labourSubtotal,
    subtotalExclGst,
    gstAmount,
    grandTotalInclGst
  };
}

function fmtNZD(val) {
  return '$' + val.toLocaleString('en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Download a clean, styled, printable HTML Client Quote & Planting Schedule.
 */
export function exportClientQuoteHTML(quote, { siteLabel = 'Aotearoa Site', slopeLabel = 'Avg 0.0°', seasonLabel = 'Mid-Dec · Summer', yearLabel = 'Yr 4' } = {}) {
  const dateStr = new Date().toLocaleDateString('en-NZ', { year: 'numeric', month: 'long', day: 'numeric' });

  const plantRows = quote.plantItems.map(r => `
    <tr>
      <td><strong>${r.plant.maori}</strong> <span class="muted">(${r.plant.common})</span><br><em>${r.plant.botanical}</em></td>
      <td>${r.plant.grade}</td>
      <td>${r.plant.sun} · ${r.plant.moisture}</td>
      <td class="num">${r.count}</td>
      <td class="num">${fmtNZD(r.plant.priceNZD)}</td>
      <td class="num"><strong>${fmtNZD(r.subtotal)}</strong></td>
    </tr>
  `).join('');

  const bulkRows = quote.bulkItems.map(r => `
    <tr>
      <td><strong>${r.surface.name}</strong><br><span class="muted">${r.surface.brand} · ${Math.round(r.surface.depth * 1000)}mm depth (+10% compaction)</span></td>
      <td class="num">${r.areaM2.toFixed(1)} m²</td>
      <td class="num"><strong>${r.volumeM3.toFixed(2)} m³</strong></td>
      <td class="num">${fmtNZD(r.surface.pricePerM3)}/m³</td>
      <td class="num"><strong>${fmtNZD(r.cost)}</strong></td>
    </tr>
  `).join('');

  const pavingRows = [
    ...quote.pavingItems.map(r => `
      <tr>
        <td><strong>${r.surface.name}</strong><br><span class="muted">${r.surface.brand} · ${r.surface.spec}</span></td>
        <td class="num">${r.areaM2.toFixed(1)} m²</td>
        <td class="num">${fmtNZD(r.surface.pricePerM2)}/m²</td>
        <td class="num"><strong>${fmtNZD(r.cost)}</strong></td>
      </tr>
    `),
    ...quote.edgingItems.map(r => `
      <tr>
        <td><strong>${r.edging.name}</strong><br><span class="muted">Bed Edging Supply</span></td>
        <td class="num">${r.lm.toFixed(1)} lm</td>
        <td class="num">${fmtNZD(r.edging.pricePerM)}/lm</td>
        <td class="num"><strong>${fmtNZD(r.cost)}</strong></td>
      </tr>
    `)
  ].join('');

  const featureRows = quote.featureItems.map(r => `
    <tr>
      <td><strong>${r.prop.name}</strong><br><span class="muted">${r.prop.subtitle}</span></td>
      <td class="num">${r.count}</td>
      <td class="num">${fmtNZD(r.prop.priceNZD)}</td>
      <td class="num"><strong>${fmtNZD(r.subtotal)}</strong></td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="en-NZ">
<head>
<meta charset="UTF-8" />
<title>NZ Landscape Client Quote & Planting Schedule — ${siteLabel}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif; color: #16201c; background: #f8faf9; margin: 0; padding: 32px; }
  .sheet { max-width: 920px; margin: 0 auto; background: #fff; border: 1px solid #d7e2dc; border-radius: 14px; padding: 36px 40px; box-shadow: 0 12px 32px rgba(15,28,22,0.06); }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #10b981; padding-bottom: 18px; margin-bottom: 22px; }
  .brand { font-size: 22px; font-weight: 800; color: #0b241b; letter-spacing: -0.02em; }
  .brand span { color: #059669; }
  .meta { text-align: right; font-size: 13px; color: #475569; line-height: 1.5; }
  .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
  .stat-box { background: #f1f7f4; border: 1px solid #d7e8df; border-radius: 10px; padding: 12px 14px; }
  .stat-lbl { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #4b6359; font-weight: 700; }
  .stat-val { font-size: 18px; font-weight: 800; color: #0b241b; margin-top: 4px; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.06em; color: #065f46; border-bottom: 1px solid #e2ece7; padding-bottom: 6px; margin: 24px 0 10px; }
  table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #52655d; padding: 8px 6px; border-bottom: 1px solid #cbd9d2; }
  td { padding: 8px 6px; border-bottom: 1px solid #edf2ef; vertical-align: top; }
  th.num, td.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .muted { color: #64748b; font-size: 11.5px; }
  .totals { margin-top: 24px; margin-left: auto; width: 360px; border-top: 2px solid #0b241b; padding-top: 12px; }
  .tot-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13.5px; }
  .tot-row.grand { font-size: 18px; font-weight: 800; color: #065f46; border-top: 1px solid #cbd9d2; margin-top: 6px; padding-top: 10px; }
  .care-box { margin-top: 26px; background: #f8faf9; border: 1px solid #dce6e1; border-radius: 10px; padding: 14px 16px; font-size: 12.5px; line-height: 1.55; color: #334155; }
  @media print { body { background: #fff; padding: 0; } .sheet { box-shadow: none; border: none; padding: 12px; } }
</style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div>
        <div class="brand">assembl. Aotearoa Studio <span>v4</span></div>
        <div class="muted" style="margin-top:4px;">Client Landscape Estimate, Supply Schedule &amp; NZ Planting BOM</div>
      </div>
      <div class="meta">
        <div><strong>Site:</strong> ${siteLabel}</div>
        <div><strong>Topography:</strong> ${slopeLabel}</div>
        <div><strong>Prepared:</strong> ${dateStr} · ${seasonLabel} (${yearLabel})</div>
      </div>
    </div>

    <div class="summary-grid">
      <div class="stat-box"><div class="stat-lbl">Landscaped Area</div><div class="stat-val">${quote.landscapedAreaM2.toFixed(1)} m²</div></div>
      <div class="stat-box"><div class="stat-lbl">NZ Plants</div><div class="stat-val">${quote.totalPlants} (${quote.speciesCount} spp.)</div></div>
      <div class="stat-box"><div class="stat-lbl">NZ Features</div><div class="stat-val">${quote.totalProps} items</div></div>
      <div class="stat-box"><div class="stat-lbl">Grand Total (incl. GST)</div><div class="stat-val">${fmtNZD(quote.grandTotalInclGst)}</div></div>
    </div>

    <h2>1. NZ Plant Schedule (${quote.totalPlants} Plants)</h2>
    <table>
      <thead><tr><th>Species</th><th>Grade</th><th>Site Notes</th><th class="num">Qty</th><th class="num">Unit</th><th class="num">Subtotal</th></tr></thead>
      <tbody>${plantRows || '<tr><td colspan="6" class="muted">No plants placed yet.</td></tr>'}</tbody>
    </table>

    <h2>2. Bulk Barks, Chips &amp; Pebbles (incl. 10% Compaction Allowance)</h2>
    <table>
      <thead><tr><th>Material</th><th class="num">Area</th><th class="num">Order Vol.</th><th class="num">Rate</th><th class="num">Subtotal</th></tr></thead>
      <tbody>${bulkRows || '<tr><td colspan="5" class="muted">No bulk mulches or aggregates painted.</td></tr>'}</tbody>
    </table>

    <h2>3. Paving, Decking &amp; Bed Edging</h2>
    <table>
      <thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Subtotal</th></tr></thead>
      <tbody>${pavingRows || '<tr><td colspan="4" class="muted">No paving or bed edging specified.</td></tr>'}</tbody>
    </table>

    ${quote.featureItems.length > 0 ? `
    <h2>4. NZ Garden Features</h2>
    <table>
      <thead><tr><th>Feature</th><th class="num">Qty</th><th class="num">Unit</th><th class="num">Subtotal</th></tr></thead>
      <tbody>${featureRows}</tbody>
    </table>` : ''}

    <div class="totals">
      <div class="tot-row"><span>Plants Subtotal</span><span>${fmtNZD(quote.plantsSubtotal)}</span></div>
      <div class="tot-row"><span>Bulk Barks, Chips &amp; Pebbles</span><span>${fmtNZD(quote.bulkSubtotal)}</span></div>
      <div class="tot-row"><span>Paving, Decking &amp; Edging</span><span>${fmtNZD(quote.pavingAndEdgingSubtotal)}</span></div>
      <div class="tot-row"><span>NZ Garden Features</span><span>${fmtNZD(quote.featuresSubtotal)}</span></div>
      ${quote.includeLabour ? `<div class="tot-row"><span>Install Labour (${quote.labourHours} hrs @ $${quote.labourRate}/hr)</span><span>${fmtNZD(quote.labourSubtotal)}</span></div>` : ''}
      <div class="tot-row"><strong>Subtotal (excl. GST)</strong><strong>${fmtNZD(quote.subtotalExclGst)}</strong></div>
      <div class="tot-row"><span>NZ GST (15%)</span><span>${fmtNZD(quote.gstAmount)}</span></div>
      <div class="tot-row grand"><span>Grand Total (incl. GST)</span><span>${fmtNZD(quote.grandTotalInclGst)}</span></div>
    </div>

    <div class="care-box">
      <strong>Aotearoa Seasonal Establishment &amp; Care Notes:</strong>
      Plant NZ natives ideally in Autumn (Mar–May) or Spring (Sep–Nov) to establish deep root systems before dry summer winds.
      Apply Daltons Black Bark Mulch or Pine Bark to 75mm depth keeping mulch 50mm clear of stems. Water deeply twice weekly
      through the first summer; top-dress with slow-release native fertiliser (low-phosphorus for Proteaceae/mānuka) in early spring.
      Pricing is an indicative NZD supply estimate (excl. earthworks, drainage, consent, or freight unless noted).
    </div>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `aotearoa-client-quote-${new Date().toISOString().slice(0, 10)}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return html;
}
