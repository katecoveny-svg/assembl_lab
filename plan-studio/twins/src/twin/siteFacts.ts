// Site facts: live public data for one point in New Zealand, shown beside the model.
// The lab's own feed (/api/live/?feeds=site) answers; each fact comes back with its source, licence, date and note,
// and this card shows them as they are. It describes what each published map shows at the point. It is not a
// compliance check, and a point outside a mapped hazard is not proof the site cannot be affected.
// The point is typed in by the person using the tool. Looking it up sends it to the lab's feed, which asks each publisher
// (the card says so). It is kept in this browser only: it is not written into the plan model or into a share link, so a
// private site's location never leaves with the model. (The Real ground card reads LINZ directly and does not send it.)

interface Fact {
  id: string; label: string; status: string; truthLabel?: string; value?: unknown; unit?: string; asOf?: string | null;
  note?: string; reason?: string; needs?: string;
  source?: { name?: string; url?: string }; licence?: { name?: string; attribution?: string; caveat?: string };
}
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const KEY = 'assembl.siteFacts.where', LAST = 'assembl.siteFacts.last';

/** "lat, lon" in decimal degrees, inside New Zealand's main islands */
export function parseWhere(text: string): { lat: number; lon: number } | null {
  const m = text.trim().match(/^(-?\d{1,2}(?:\.\d+)?)\s*[,\s]\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (!m) return null;
  const lat = Number(m[1]), lon = Number(m[2]);
  if (!(lat <= -34 && lat >= -47.5 && lon >= 166 && lon <= 179)) return null;
  return { lat, lon };
}

function show(v: unknown, unit?: string) {
  if (v === null || v === undefined || v === '') return '';
  const s = typeof v === 'number' ? v.toLocaleString('en-NZ') : String(v);
  return unit ? `${s} ${unit}` : s;
}

export function renderFacts(facts: Record<string, Fact>): string {
  const all = Object.values(facts), live = all.filter((f) => f.status === 'live'), down = all.filter((f) => f.status !== 'live' && f.status !== 'not-wired'), off = all.filter((f) => f.status === 'not-wired');
  const row = (f: Fact) => `<li><div class="sf-top"><b>${esc(f.label)}</b><span class="mono small">■ ${esc(f.truthLabel ?? 'Live')}${f.asOf ? ' · ' + esc(String(f.asOf).slice(0, 10)) : ''}</span></div><div class="sf-val">${esc(show(f.value, f.unit))}</div>${f.note ? `<div class="small">${esc(f.note)}</div>` : ''}<div class="small sf-src">${esc(f.source?.name ?? '')}</div></li>`;
  const none = (f: Fact, word: string) => `<li><div class="sf-top"><b>${esc(f.label)}</b><span class="mono small">□ ${word}</span></div><div class="small">${esc(f.reason ?? f.note ?? '')}${f.needs ? ' Needs: ' + esc(f.needs) : ''}</div></li>`;
  const credits = [...new Set(live.map((f) => f.licence?.attribution).filter(Boolean) as string[])];
  return `<ul class="sf-list">${live.map(row).join('')}${down.map((f) => none(f, 'No answer just now')).join('')}${off.map((f) => none(f, 'Not connected')).join('')}</ul>` +
    (credits.length ? `<p class="small sf-credit">${credits.map(esc).join(' ')}</p>` : '');
}

export function siteFactsPanel(log: (msg: string) => void): HTMLElement {
  const el = document.createElement('section');
  el.className = 'card'; el.id = 'siteFacts';
  el.innerHTML = `<h3>Site facts</h3>
    <p class="small">Live public maps for one point in New Zealand: parcel, zone, overlays, flood, coast, landslide, weather. It shows what each map says at the point. It is not a compliance check.</p>
    <div class="row wrap"><input id="sfWhere" class="mono" placeholder="-36.80, 175.08" aria-label="Latitude, longitude" style="flex:1;min-width:150px" /><button class="pill solid" id="sfGo">Look up</button></div>
    <p class="small" id="sfNote">Type a latitude and longitude. Looking up sends the point to the lab’s feed, which asks each publisher. It is kept in this browser only: not in the model, not in a share link.</p>
    <div id="sfOut"></div>
    <style>.sf-list{list-style:none;margin:8px 0 0;padding:0}.sf-list li{padding:8px 0;border-top:1px solid rgba(51,33,47,.12)}.sf-top{display:flex;justify-content:space-between;gap:8px;align-items:baseline}.sf-val{margin:2px 0}.sf-src{opacity:.7}.sf-credit{margin-top:8px}</style>`;
  const where = el.querySelector('#sfWhere') as HTMLInputElement, out = el.querySelector('#sfOut') as HTMLElement, note = el.querySelector('#sfNote') as HTMLElement, go = el.querySelector('#sfGo') as HTMLButtonElement;
  try { where.value = localStorage.getItem(KEY) ?? ''; } catch { /* storage can be closed */ }
  try { // the last answer in this tab, shown again after the model is rebuilt (the facts are as fetched then, and say when)
    const last = JSON.parse(sessionStorage.getItem(LAST) ?? 'null') as { where: string; site: { facts: Record<string, Fact>; fetchedAt?: string } } | null;
    if (last?.site?.facts && last.where === where.value.trim()) {
      out.innerHTML = renderFacts(last.site.facts);
      note.textContent = `Shown as fetched${last.site.fetchedAt ? ' at ' + new Date(last.site.fetchedAt).toLocaleTimeString('en-NZ', { hour: 'numeric', minute: '2-digit' }) : ' earlier'}. Look up again for a fresh answer. A point outside a mapped hazard is not proof the site cannot be affected.`;
    }
  } catch { /* nothing kept */ }
  const run = async () => {
    const p = parseWhere(where.value);
    if (!p) { note.textContent = 'That is not a point in New Zealand. Use decimal degrees, latitude first: -36.80, 175.08'; return; }
    try { localStorage.setItem(KEY, where.value.trim()); } catch { /* fine */ }
    go.disabled = true; note.textContent = 'Asking the publishers…'; out.innerHTML = '';
    try {
      const r = await fetch(`/api/live/?feeds=site&lat=${p.lat}&lon=${p.lon}`, { headers: { accept: 'application/json' } });
      if (!r.ok) throw new Error(`the lab's feed answered ${r.status}`);
      const site = (await r.json())?.feeds?.site;
      if (!site?.facts) throw new Error(site?.error ?? 'no facts came back');
      out.innerHTML = renderFacts(site.facts as Record<string, Fact>);
      // the Real ground card draws the parcel outline from this answer; the answer is kept for this tab so a rebuild does not lose it
      dispatchEvent(new CustomEvent('assembl:site-facts', { detail: { lat: p.lat, lon: p.lon, facts: site.facts } }));
      try { sessionStorage.setItem(LAST, JSON.stringify({ where: where.value.trim(), site })); } catch { /* no room: it is asked again next time */ }
      const n = Object.values(site.facts as Record<string, Fact>).filter((f) => f.status === 'live').length;
      note.textContent = `${n} facts answered${site.fetchedAt ? ' at ' + new Date(site.fetchedAt).toLocaleTimeString('en-NZ', { hour: 'numeric', minute: '2-digit' }) : ''}. A point outside a mapped hazard is not proof the site cannot be affected.`;
      log(`Site facts: ${n} answered for the point.`);
    } catch (e) {
      note.textContent = `Site facts could not be fetched (${(e as Error).message}). Nothing is shown rather than a guess.`;
    } finally { go.disabled = false; }
  };
  go.addEventListener('click', () => void run());
  where.addEventListener('keydown', (e) => { if (e.key === 'Enter') void run(); });
  return el;
}
