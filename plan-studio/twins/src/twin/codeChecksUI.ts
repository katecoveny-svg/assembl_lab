// The code pre-check card: each cited figure beside what the model shows, for a person to review.
// The measuring and the rules table live in codeChecks.ts, which has no browser in it and is what the tests run.
// This card only shows the results. It is not a compliance decision and gives no professional sign-off.
import { DERIVED_WORDS, editionLine, RULES, STANDING, STATUSES, resultsAsText, runCodeChecks, tally, type Check, type Citation, type Status } from './codeChecks';
import { modelFingerprint } from './approvals';

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const day = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' });
const SHORT: Record<Status, [string, string]> = { 'meets the cited figure': ['meets the cited figure', 'meet the cited figure'], 'does not meet the cited figure': ['does not meet it', 'do not meet it'], 'cannot tell from this model': ['cannot tell', 'cannot tell'], 'not applicable': ['not applicable', 'not applicable'] };
const square = (s: Status) => (s === 'meets the cited figure' ? '■' : '□');
const link = (c: Citation, text: string) => `<a href="${esc(c.url)}${c.page ? '#page=' + c.page : ''}" target="_blank" rel="noopener">${esc(text)}</a>`;
const ref = (c: Citation) => (c.short.includes(c.clause) ? c.short : `${c.short} ${c.clause}`);

function counts(list: Check[]): string {
  const t = tally(list);
  return STATUSES.filter((s) => t[s]).map((s) => `${s === 'not applicable' ? '' : square(s) + ' '}${t[s]} ${SHORT[s][t[s] === 1 ? 0 : 1]}`).join(' · ');
}

/** the card's inner list, as a string: one block per rule, one line per thing measured */
export function renderChecks(checks: Check[]): string {
  return RULES.map((r) => {
    const mine = checks.filter((c) => c.rule === r.id), open = mine.some((c) => c.status === 'does not meet the cited figure');
    const row = (c: Check) => `<li><div class="cc-top"><b>${esc(c.subject)}</b><span class="mono small${c.status === 'does not meet the cited figure' ? ' bad' : ''}">${square(c.status)} ${esc(c.status)}</span></div>` +
      `<div class="small cc-says">${esc(c.says)}</div>` +
      (c.derived ? `<div class="small cc-how">Measured: ${esc(DERIVED_WORDS[c.derived])}. ${esc(c.where)}.</div>` : '') +
      c.caveats.map((k) => `<div class="small cc-note">${esc(k)}</div>`).join('') +
      `<div class="small cc-cite">${link(c.cite, ref(c.cite))}</div></li>`;
    return `<details class="cc-rule"${open ? ' open' : ''}><summary><b>${esc(r.title)}</b><span class="mono small">${esc(counts(mine))}</span></summary>` +
      `<p class="small">Figure: ${esc(r.figure)}. ${link(r.cite, `${r.cite.document}, ${r.cite.clause}`)}. ${esc(editionLine(r.cite))}. Read ${esc(day(r.cite.readOn))}.</p>` +
      `<ul class="cc-list">${mine.map(row).join('')}</ul><p class="small cc-out">${esc(r.leavesOut)}</p></details>`;
  }).join('');
}

interface Host { project: { key: string; title: string }; log(msg: string): void; save: ((filename: string, data: Blob) => Promise<void>) | null }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function codeChecksPanel(app: Host, plan: any, version?: string): HTMLElement {
  const el = document.createElement('section');
  el.className = 'card'; el.id = 'codeChecks';
  let checks: Check[] = [], failed = '';
  try { checks = runCodeChecks(plan); } catch (e) { failed = (e as Error).message; }
  const fp = version ?? modelFingerprint(plan), read = [...new Set(RULES.map((r) => r.cite.readOn))].sort().pop() ?? '';
  el.innerHTML = `<h3>Code pre-check</h3>
    <p class="small"><b>${esc(STANDING)}</b></p>
    <p class="mono small" id="ccTally"></p>
    <div id="ccRules"></div>
    <div class="row wrap" style="margin-top:8px"><button class="pill" id="ccSave">Download results</button></div>
    <p class="small">Each figure was read from the official document on ${esc(day(read))}. Documents are amended: check the edition before relying on a figure. This card gives no professional sign-off and never says a design complies. Anything measured close to a figure, or resting on a size the model does not hold, is shown as "cannot tell".</p>
    <style>.cc-rule{border-top:1px solid rgba(51,33,47,.12);padding:8px 0}.cc-rule summary{cursor:pointer;font-size:13px;margin-left:16px;list-style-position:outside}.cc-rule summary span{display:block;margin-top:2px}.cc-rule summary:focus-visible{outline:2px solid var(--rose);outline-offset:2px}.cc-list{list-style:none;margin:6px 0 0;padding:0}.cc-list li{padding:7px 0;border-top:1px dashed rgba(51,33,47,.12)}.cc-top{display:flex;justify-content:space-between;gap:8px;align-items:baseline;flex-wrap:wrap;font-size:13px}.cc-says{margin:2px 0;color:var(--ink)}.cc-how,.cc-note,.cc-cite{margin-top:2px}.cc-note{padding-left:10px;border-left:2px solid rgba(51,33,47,.18)}.cc-out{margin-top:8px}#codeChecks a{color:inherit;text-decoration:underline;text-underline-offset:2px}</style>`;
  const $ = <T extends HTMLElement>(id: string) => el.querySelector('#' + id) as T;
  if (failed) {
    $('ccTally').textContent = '□ The pre-check could not be run on this model. Nothing is shown rather than a guess.';
    ($('ccSave') as HTMLButtonElement).disabled = true;
    app.log(`Code pre-check could not be run (${failed}).`);
    return el;
  }
  $('ccTally').textContent = `version ${fp} · ${counts(checks)}`;
  $('ccRules').innerHTML = renderChecks(checks);
  $('ccSave').addEventListener('click', async () => {
    if (!app.save) return app.log('Downloads aren’t available in this view.');
    const now = new Date(), stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    await app.save(`${app.project.key}-code-pre-check-${stamp}.txt`, new Blob([resultsAsText(plan, checks, now, fp)], { type: 'text/plain' })).catch(() => void 0);
    app.log(`Code pre-check for version ${fp} offered for download. It is not a compliance decision.`);
  });
  return el;
}
