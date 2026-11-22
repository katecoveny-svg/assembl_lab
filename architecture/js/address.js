// The "Site address" box on the project's Site tab: type a New Zealand street address, pick a match, use it as the site.
// Two parts, so the rules can be checked without a page:
//   createSearch(...)   the rules: wait for a pause in typing (300 ms), ask once per pause, ignore an answer that has been
//                       overtaken, move through the matches with the arrow keys, say what happened in plain words.
//   mountAddressBox(...) the page: a combobox (role="combobox", a listbox of options, aria-activedescendant) that draws what
//                       createSearch says. Only the box itself is changed while typing; the rest of the page is left alone.
import { askAddress, splitAddress, ADDRESS_MIN } from './facts.js';

export const DELAY_MS = 300;
const say = {
  looking: 'Looking…',
  none: 'No current address matches that. Check the spelling, or add the suburb or town.',
  more: 'More addresses match than are shown. Add the suburb or town to narrow it.',
  found: (n) => `${n} ${n === 1 ? 'match' : 'matches'}. Use the up and down arrows, then Enter.`,
};

/**
 * The rules of the box. view = { options(list), active(i), message(text), open(bool) }; ask(words, { signal }) -> { matches, more }.
 * Nothing is asked for fewer than 4 characters. A later key press cancels the wait and any question still on its way.
 */
const defaultAsk = (words, o) => askAddress(words, undefined, o); // askAddress(words, fetch, { signal })
export function createSearch({ ask = defaultAsk, view, onPick, delay = DELAY_MS, timers = { set: (fn, ms) => setTimeout(fn, ms), clear: (t) => clearTimeout(t) }, controller = () => new AbortController() }) {
  let timer = null, run = 0, ctl = null, list = [], at = -1, open = false;
  const show = (matches, more) => { list = matches; at = -1; open = matches.length > 0; view.options(list); view.active(at); view.open(open); view.message(matches.length ? (more ? `${say.found(matches.length)} ${say.more}` : say.found(matches.length)) : say.none); };
  const close = () => { if (!open) return; open = false; at = -1; view.active(-1); view.open(false); };
  const reset = (message = '') => { list = []; at = -1; open = false; view.options([]); view.active(-1); view.open(false); view.message(message); };
  return {
    /** the words in the box changed */
    typed(words) {
      timers.clear(timer); timer = null; run++; ctl?.abort(); ctl = null;
      const q = String(words ?? '').trim();
      if (q.length < ADDRESS_MIN) { reset(''); return; }
      view.message(say.looking);
      const mine = run;
      timer = timers.set(async () => {
        timer = null; ctl = controller();
        try {
          const got = await ask(q, { signal: ctl.signal });
          if (mine !== run) return; // overtaken by a later key press
          show(got.matches, got.more);
        } catch (e) {
          if (mine !== run || e?.name === 'AbortError') return;
          reset(e?.message || 'The address search did not answer. Enter the site as coordinates instead.');
        }
      }, delay);
    },
    /** a key in the box. Returns true when it was used (the page then stops the key doing its usual thing) */
    key(k) {
      if (k === 'ArrowDown') { if (!list.length) return false; if (!open) { open = true; view.open(true); at = 0; } else at = (at + 1) % list.length; view.active(at); return true; }
      if (k === 'ArrowUp') { if (!list.length) return false; if (!open) { open = true; view.open(true); at = list.length - 1; } else at = (at - 1 + list.length) % list.length; view.active(at); return true; }
      if (k === 'Home' && open && at >= 0) { at = 0; view.active(at); return true; }
      if (k === 'End' && open && at >= 0) { at = list.length - 1; view.active(at); return true; }
      if (k === 'Enter') { if (open && at >= 0) { const m = list[at]; close(); onPick(m); return true; } return false; }
      if (k === 'Escape') { if (open) { close(); return true; } return false; }
      return false;
    },
    pick(i) { const m = list[i]; if (m) { close(); onPick(m); } },
    close,
    stop() { timers.clear(timer); timer = null; run++; ctl?.abort(); ctl = null; },
    get state() { return { list, at, open }; },
  };
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** The markup for the box. The page puts it where the address goes; mountAddressBox finds it by data-addr. */
export function addressBoxHtml({ busy = false } = {}) {
  return `<div class="addr" data-addr>
    <label class="addr-lab" for="addr-in" id="addr-lab">Site address</label>
    <div class="addr-field">
      <input id="addr-in" class="addr-in" type="text" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="addr-list" aria-describedby="addr-help addr-msg" aria-labelledby="addr-lab"
        autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" inputmode="text" maxlength="120" placeholder="14 Ponsonby Road, Ponsonby"${busy ? ' disabled' : ''} />
      <ul class="addr-list" id="addr-list" role="listbox" aria-labelledby="addr-lab" hidden></ul>
    </div>
    <p class="small addr-help" id="addr-help">A New Zealand street address. Flats work too: 2/14 Ponsonby Road, or Flat 2, 14 Ponsonby Road.</p>
    <p class="addr-msg" id="addr-msg" role="status" aria-live="polite"></p>
  </div>`;
}

/** Wire a box drawn by addressBoxHtml. Returns a function that undoes it. */
export function mountAddressBox(root, { onPick, ask = defaultAsk, delay = DELAY_MS } = {}) {
  const box = root.querySelector('[data-addr]');
  if (!box) return () => {};
  const input = box.querySelector('input'), listEl = box.querySelector('[role="listbox"]'), msg = box.querySelector('.addr-msg');
  let current = [];
  const view = {
    options(list) {
      current = list;
      listEl.innerHTML = list.map((m, i) => { const { street, rest } = splitAddress(m.address); return `<li id="addr-opt-${i}" role="option" aria-selected="false" data-i="${i}" class="addr-opt"><span class="addr-street">${esc(street)}</span><span class="addr-rest">${esc(rest)}</span></li>`; }).join('');
    },
    active(i) {
      listEl.querySelectorAll('[role="option"]').forEach((el, j) => { el.setAttribute('aria-selected', j === i ? 'true' : 'false'); });
      if (i >= 0) { input.setAttribute('aria-activedescendant', `addr-opt-${i}`); listEl.querySelector(`#addr-opt-${i}`)?.scrollIntoView?.({ block: 'nearest' }); } else input.removeAttribute('aria-activedescendant');
    },
    message(t) { msg.textContent = t; msg.hidden = !t; },
    open(o) { listEl.hidden = !o; input.setAttribute('aria-expanded', o ? 'true' : 'false'); },
  };
  view.message('');
  const search = createSearch({ ask, view, delay, onPick: (m) => onPick(m) });
  const onInput = () => search.typed(input.value);
  const onKey = (e) => { if (search.key(e.key)) e.preventDefault(); };
  const onDown = (e) => { if (e.target.closest('[role="option"]')) e.preventDefault(); }; // keep the focus in the box
  const onClick = (e) => { const o = e.target.closest('[role="option"]'); if (o) search.pick(+o.dataset.i); };
  const onOut = (e) => { if (!box.contains(e.relatedTarget)) search.close(); };
  input.addEventListener('input', onInput); input.addEventListener('keydown', onKey); input.addEventListener('focusout', onOut);
  listEl.addEventListener('mousedown', onDown); listEl.addEventListener('click', onClick);
  return () => { search.stop(); input.removeEventListener('input', onInput); input.removeEventListener('keydown', onKey); input.removeEventListener('focusout', onOut); listEl.removeEventListener('mousedown', onDown); listEl.removeEventListener('click', onClick); };
}
