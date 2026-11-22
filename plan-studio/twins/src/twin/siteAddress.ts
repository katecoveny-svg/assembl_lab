// Site address search for the Site facts card: type a New Zealand street address, pick a match, and the card looks up that point.
// The words go to the lab's address feed (/api/live/?feeds=address&q=..), which asks LINZ's public NZ Addresses list and gives back up
// to eight matches with a point each. The feed does not log or store the words, apart from the short-lived cache of its answer.
// Same rules as the operations page's Site address box (architecture/js/address.js): wait 300 ms for a pause, nothing under 4
// characters, an overtaken answer is ignored, a combobox with a listbox, arrow keys, Enter and Escape, 44 px rows.
// LINZ NZ Addresses is CC BY 4.0: ADDRESS_CREDIT is shown beside the chosen address.

export interface AddressMatch { id: number | null; address: string; suburb: string; town: string; council: string; lat: number; lon: number }
export const ADDRESS_CREDIT = 'Sourced from the LINZ Data Service and licensed for reuse under the CC BY 4.0 licence.';
const MIN = 4, DELAY = 300;
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const inNZ = (lat: number, lon: number) => Number.isFinite(lat) && Number.isFinite(lon) && lat <= -34 && lat >= -47.5 && lon >= 166 && lon <= 179;

/** "Ponsonby, Auckland": the suburb and town, once each */
export const placeLine = (m: Pick<AddressMatch, 'suburb' | 'town'>) => [m.suburb, m.town].filter((p, i, a) => p && a.indexOf(p) === i).join(', ');

/** Ask the feed. Throws with plain words; nothing is guessed. */
export async function askAddress(words: string, signal?: AbortSignal, fetchImpl: typeof fetch = fetch): Promise<{ matches: AddressMatch[]; more: boolean }> {
  const q = words.trim();
  if (q.length < MIN) return { matches: [], more: false };
  if (q.length > 120) throw new Error('That is too long for an address: 120 characters at most.');
  let r: Response;
  try { r = await fetchImpl(`/api/live/?feeds=address&q=${encodeURIComponent(q)}`, { headers: { accept: 'application/json' }, signal }); }
  catch (e) { if ((e as Error)?.name === 'AbortError') throw e; throw new Error('The address search could not be reached. Check the connection, or type the point instead.'); }
  if (!r.ok) throw new Error(`The address search is not answering just now (${r.status}). Try again in a minute, or type the point instead.`);
  const a = (await r.json())?.feeds?.address;
  if (!a || a.error) throw new Error(a?.error ? String(a.error) : 'The address search gave no answer. Try again in a minute, or type the point instead.');
  const matches = ((a.values?.matches ?? []) as AddressMatch[]).filter((m) => m && m.address && inNZ(m.lat, m.lon)).slice(0, 8)
    .map((m) => ({ id: m.id ?? null, address: String(m.address), suburb: String(m.suburb ?? ''), town: String(m.town ?? ''), council: String(m.council ?? ''), lat: m.lat, lon: m.lon }));
  return { matches, more: !!a.values?.more };
}

const CSS = `.sa{display:grid;gap:6px;margin:0 0 10px}.sa label{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--mauve)}.sa-f{position:relative}
.sa-in{width:100%;min-height:44px;padding:8px 10px;font:inherit;color:var(--ink);background:#fff;border:1px solid var(--line2);border-radius:0}
.sa-list{position:absolute;z-index:30;left:0;right:0;top:calc(100% + 2px);margin:0;padding:0;list-style:none;background:#fff;border:1px solid var(--line2);max-height:50vh;overflow-y:auto}.sa-list[hidden]{display:none}
.sa-opt{display:grid;align-content:center;min-height:44px;padding:5px 10px;border-bottom:1px solid var(--line);cursor:pointer}.sa-opt:last-child{border-bottom:0}
.sa-opt[aria-selected="true"],.sa-opt:hover{background:var(--pale);box-shadow:inset 3px 0 0 var(--plum)}.sa-s{font-weight:500}.sa-r{font-size:12.5px;color:var(--mauve)}
.sa-msg{margin:0;min-height:1.3em;font-size:12.5px}.sa-chosen{display:grid;gap:2px;padding:8px 10px;border:1px solid var(--line2);background:#fff}.sa-chosen b{font-size:16px;font-weight:500}.sa-chosen button{justify-self:start;min-height:44px;background:none;border:0;padding:0;color:inherit;text-decoration:underline;cursor:pointer;font:inherit}`;

/**
 * The search box. onPick gets the chosen match; the box then shows it with a way to choose another.
 * Returns the element and show(match | null), which puts a saved choice back or clears it.
 */
export function addressSearch(onPick: (m: AddressMatch) => void): { el: HTMLElement; show: (m: AddressMatch | null) => void } {
  const el = document.createElement('div');
  el.className = 'sa';
  el.innerHTML = `<style>${CSS}</style><label for="saIn" id="saLab">Site address</label>
    <div class="sa-f"><input id="saIn" class="sa-in" type="text" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="saList" aria-labelledby="saLab" aria-describedby="saMsg"
      autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="120" placeholder="14 Ponsonby Road, Ponsonby" /><ul class="sa-list" id="saList" role="listbox" aria-labelledby="saLab" hidden></ul></div>
    <p class="sa-msg small" id="saMsg" role="status" aria-live="polite"></p><div class="sa-chosen" id="saChosen" hidden></div>`;
  const input = el.querySelector('#saIn') as HTMLInputElement, list = el.querySelector('#saList') as HTMLElement, msg = el.querySelector('#saMsg') as HTMLElement, chosen = el.querySelector('#saChosen') as HTMLElement;
  let matches: AddressMatch[] = [], at = -1, open = false, run = 0, timer: number | undefined, ctl: AbortController | undefined;
  const setOpen = (o: boolean) => { open = o; list.hidden = !o; input.setAttribute('aria-expanded', String(o)); if (!o) { at = -1; input.removeAttribute('aria-activedescendant'); list.querySelectorAll('[aria-selected="true"]').forEach((n) => n.setAttribute('aria-selected', 'false')); } };
  const active = (i: number) => { at = i; list.querySelectorAll('[role="option"]').forEach((n, j) => n.setAttribute('aria-selected', String(j === i))); if (i >= 0) { input.setAttribute('aria-activedescendant', `saOpt${i}`); (list.children[i] as HTMLElement | undefined)?.scrollIntoView?.({ block: 'nearest' }); } };
  const say = (t: string) => { msg.textContent = t; };
  const draw = (ms: AddressMatch[]) => { matches = ms; list.innerHTML = ms.map((m, i) => { const c = m.address.indexOf(','); const s = c < 0 ? m.address : m.address.slice(0, c), r = c < 0 ? '' : m.address.slice(c + 1).trim();
    return `<li id="saOpt${i}" class="sa-opt" role="option" aria-selected="false" data-i="${i}"><span class="sa-s">${esc(s)}</span><span class="sa-r">${esc(r)}</span></li>`; }).join(''); };
  const pick = (i: number) => { const m = matches[i]; if (!m) return; setOpen(false); show(m); onPick(m); };
  function show(m: AddressMatch | null) {
    if (!m) { chosen.hidden = true; chosen.innerHTML = ''; input.parentElement!.hidden = false; return; }
    input.parentElement!.hidden = true; say('');
    chosen.hidden = false;
    chosen.innerHTML = `<span class="small">■ Chosen address</span><b>${esc(m.address)}</b><span class="small">${esc(placeLine(m))}${m.council && m.council !== m.town && m.council !== m.suburb ? ' · ' + esc(m.council) : ''}</span><span class="small">${esc(ADDRESS_CREDIT)}</span><button type="button" id="saChange">Choose another</button>`;
    (chosen.querySelector('#saChange') as HTMLElement).addEventListener('click', () => { show(null); input.value = ''; input.focus(); });
  }
  input.addEventListener('input', () => {
    clearTimeout(timer); run++; ctl?.abort(); ctl = undefined; draw([]); setOpen(false);
    const q = input.value.trim();
    if (q.length < MIN) { say(''); return; }
    say('Looking…'); const mine = run;
    timer = window.setTimeout(async () => {
      ctl = new AbortController();
      try {
        const got = await askAddress(q, ctl.signal);
        if (mine !== run) return;
        draw(got.matches); setOpen(got.matches.length > 0);
        say(got.matches.length ? `${got.matches.length} ${got.matches.length === 1 ? 'match' : 'matches'}. Use the up and down arrows, then Enter.${got.more ? ' More match than are shown: add the suburb or town.' : ''}` : 'No current address matches that. Check the spelling, or add the suburb or town.');
      } catch (e) { if (mine !== run || (e as Error)?.name === 'AbortError') return; say((e as Error).message); }
    }, DELAY);
  });
  input.addEventListener('keydown', (e) => {
    const n = matches.length; let used = true;
    if (e.key === 'ArrowDown' && n) { if (!open) { setOpen(true); active(0); } else active((at + 1) % n); }
    else if (e.key === 'ArrowUp' && n) { if (!open) { setOpen(true); active(n - 1); } else active((at - 1 + n) % n); }
    else if (e.key === 'Home' && open && at >= 0) active(0);
    else if (e.key === 'End' && open && at >= 0) active(n - 1);
    else if (e.key === 'Enter' && open && at >= 0) pick(at);
    else if (e.key === 'Escape' && open) setOpen(false);
    else used = false;
    if (used) e.preventDefault();
  });
  input.addEventListener('focusout', (e) => { if (!el.contains(e.relatedTarget as Node | null)) setOpen(false); });
  list.addEventListener('mousedown', (e) => { if ((e.target as HTMLElement).closest('[role="option"]')) e.preventDefault(); });
  list.addEventListener('click', (e) => { const o = (e.target as HTMLElement).closest('[role="option"]') as HTMLElement | null; if (o) pick(Number(o.dataset.i)); });
  return { el, show };
}
