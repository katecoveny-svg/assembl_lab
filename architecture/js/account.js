// Sign-in, the practice and its people. This file draws the header's "working as" area and the practice panel, and tells
// the page's store whether to use this browser or the practice's shared records. It never reads or writes records
// itself: that is cloud.js. Sign-in is Google only, through Supabase's own client.
//
// What a person sees is decided here; what a person can do is decided in the database. Hiding a button for a viewer is
// a courtesy. The database refuses the change regardless.

import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SCHEMA, BUCKET, CLIENT_MODULE, AUTH_STORAGE_KEY } from './config.js';
import { createGateway, createCloudStore, createTeam, createArtworkPlace, moveProjects, probeShared, NOT_ON } from './cloud.js';
import { createRadarClient } from './radar-client.js';
import { SAMPLE_ID } from './model.js';
import { lookChoiceHtml, isTheme, DEFAULT_THEME } from './theme.js';

const MARK = 'assembl.architecture.signin_started'; // set when a person leaves for Google, so a return that never arrives can be explained
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const day = (v) => { const d = new Date(v); return !v || Number.isNaN(d.getTime()) ? '' : `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const ROLE_SAYS = { owner: 'Owner', member: 'Member', viewer: 'Viewer' };
const isSample = (p) => !!p && (p.sample === true || p.id === SAMPLE_ID);

/** What came back in the address after a trip to Google: an error, a code to finish sign-in with, or nothing. */
export function readReturn(href) {
  const u = new URL(href), q = u.searchParams, h = new URLSearchParams(u.hash.startsWith('#') && !u.hash.startsWith('#/') ? u.hash.slice(1) : '');
  const get = (k) => q.get(k) ?? h.get(k) ?? '';
  return { error: get('error'), code: get('error_code'), description: get('error_description'), hasCode: q.has('code') };
}
/** the same address with the sign-in leftovers taken off */
export function cleanReturn(href) {
  const u = new URL(href);
  for (const k of ['error', 'error_code', 'error_description', 'code', 'state']) u.searchParams.delete(k);
  if (u.hash.startsWith('#') && !u.hash.startsWith('#/') && /(^|[#&])(error|access_token|error_description)=/.test(u.hash)) u.hash = '';
  return u.href;
}
/** A plain sentence for a sign-in that came back with an error. What Supabase or Google said is quoted, not trusted. */
export function returnProblem(r) {
  if (!r?.error && !r?.description) return '';
  const said = String(r.description || r.error).replace(/\+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 180);
  if (r.error === 'access_denied' && !/redirect|not allowed|exchange|provider/i.test(said)) return `Sign-in with Google was cancelled or refused, so you are not signed in. (The answer was: “${said}”.)`;
  return `Sign-in with Google came back with an error, so you are not signed in. The answer was: “${said}”. If it mentions a redirect or an address that is not allowed, this page’s address still has to be added to the sign-in allow-list in Supabase.`;
}
/** the address Google should send a person back to: this page, with nothing after it */
export const pageAddress = (href) => { const u = new URL('./', href); u.search = ''; u.hash = ''; return u.href; };

/**
 *   store   the page's one store (createSwitch): this file points it at the browser or at the shared records
 *   local   the browser store
 *   slot    the element in the header for the sign-in controls
 *   panel   the element under the banner for the practice panel
 *   nameLabel  the "Working as" label with the typed name, hidden while signed in
 *   panelExtra optional: (practice) => html for one more section of the practice panel (the practice's artwork: artwork.js)
 */
export function mountAccount({ store, local, slot, panel, nameLabel, win = globalThis, loadClient = null, panelExtra = null }) {
  const st = {
    phase: 'starting',          // 'starting' | 'out' | 'in'
    shared: 'unknown',          // 'unknown' | 'ready' | 'not_switched_on' | 'out_of_date' | 'unreachable'
    user: null, practices: [], practice: null, invitations: [],
    open: false, notice: '', busy: '', confirm: '',
    people: [], invites: [], mine: [], moved: {}, report: null, peopleError: '',
  };
  const listeners = new Set();
  let client = null, gateway = null, team = null, started = false;
  const changed = () => { draw(); for (const fn of listeners) Promise.resolve().then(fn).catch(() => {}); };
  const say = (text) => { st.notice = text; st.open = true; };

  // ---- which store the page uses ------------------------------------------------------------------------------------
  function usePractice(p, { home = started } = {}) {
    st.practice = p;
    store.use(p ? createCloudStore({ gateway, practice: p, local }) : null);
    try { if (p) win.localStorage?.setItem('assembl.architecture.practice', p.id); } catch { /* the choice is just not remembered */ }
    if (home && win.location && /^#\/p\//.test(win.location.hash)) win.location.hash = '#/'; // a project link means nothing in the other store
    changed();
  }
  function leave(why = '') {
    st.phase = 'out'; st.user = null; st.practices = []; st.invitations = []; st.people = []; st.invites = []; st.report = null; st.open = false;
    if (why) say(why);
    usePractice(null);
    // forget the sign-in kept in this browser (it may be an expired one), then ask again whether shared records are reachable
    Promise.resolve(client?.auth.signOut({ scope: 'local' })).catch(() => {}).then(() => probeShared(gateway)).then((s) => { if (st.phase === 'out') { st.shared = s; changed(); } }).catch(() => {});
  }
  function trouble(code) {
    if (code === 'signed_out' && st.phase === 'in') leave('Your sign-in has expired. Sign in again to open the shared records. You are now looking at the records saved in this browser.');
    if (code === 'not_switched_on' && st.shared !== 'not_switched_on') { st.shared = 'not_switched_on'; usePractice(null); }
  }

  /** read the practice's chosen look before it is shown, so the page opens in it. A look that cannot be read is the default. */
  async function loadLook(p) {
    if (!p) return p;
    try { p.theme = await team.look(p.id); } catch { p.theme = ''; }
    return p;
  }

  async function loadPractices() {
    try {
      st.practices = await team.myPractices(st.user.id);
      st.shared = 'ready';
    } catch (e) {
      st.shared = e.code === 'not_switched_on' ? 'not_switched_on' : e.code === 'out_of_date' ? 'out_of_date' : e.code === 'signed_out' ? 'unknown' : 'unreachable';
      st.practices = [];
      if (e.code === 'signed_out') return; // trouble() says so, and takes the page back to this browser's records
      usePractice(null, { home: false });
      return;
    }
    try { st.invitations = await team.myInvitations(); } catch { st.invitations = []; }
    let want = '';
    try { want = win.localStorage?.getItem('assembl.architecture.practice') ?? ''; } catch { /* no memory of a choice */ }
    const chosen = st.practices.find((p) => p.id === (st.practice?.id ?? want)) ?? (st.practices.length === 1 ? st.practices[0] : null);
    if (!chosen) st.open = true; // nothing is shared until a practice is made, joined or chosen
    if (chosen) await loadLook(chosen);
    if (chosen?.id !== st.practice?.id || chosen?.role !== st.practice?.role) usePractice(chosen, { home: started && !!st.practice });
    else { if (chosen && st.practice) st.practice.theme = chosen.theme; changed(); }
  }
  async function enter(session) {
    const u = session.user ?? {}, meta = u.user_metadata ?? {};
    st.phase = 'in';
    st.user = { id: u.id, email: u.email ?? '', name: String(meta.full_name || meta.name || u.email || 'Signed in').trim() };
    try { win.localStorage?.removeItem(MARK); } catch { /* nothing to clear */ }
    await loadPractices();
  }

  async function loadPanel() {
    st.mine = (await local.list('project')).filter((p) => !isSample(p)).sort((a, b) => String(a.name).localeCompare(String(b.name)));
    st.moved = (await local.get('setting', 'moved'))?.value ?? {};
    if (!st.practice) return;
    st.peopleError = '';
    try {
      st.people = await team.people(st.practice.id);
      st.invites = st.practice.role === 'owner' ? await team.invitations(st.practice.id) : [];
      const me = st.people.find((p) => p.user_id === st.user?.id);
      if (me && me.role !== st.practice.role) { // an owner changed this person's role since the page opened
        const p = { ...st.practice, role: me.role };
        st.practices = st.practices.map((x) => (x.id === p.id ? p : x));
        usePractice(p, { home: false });
      }
    } catch (e) { st.peopleError = e.message; }
  }

  // ---- start: is anyone signed in? did a sign-in just come back? ----------------------------------------------------
  async function start() {
    const back = readReturn(win.location.href);
    let marked = false;
    try { const t = Number(win.localStorage?.getItem(MARK) ?? 0); marked = t > 0 && Date.now() - t < 3600000; win.localStorage?.removeItem(MARK); } catch { /* storage is blocked: no marker */ }
    if (back.error || back.description) say(returnProblem(back));
    try {
      const mod = await (loadClient ? loadClient() : import(CLIENT_MODULE));
      client = mod.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true, storageKey: AUTH_STORAGE_KEY },
        db: { schema: SCHEMA },
      });
    } catch {
      st.phase = 'out'; st.shared = 'unreachable';
      changed();
      return;
    }
    gateway = createGateway(client, {
      schema: SCHEMA, bucket: BUCKET,
      refresh: async () => { const r = await client.auth.refreshSession(); return !!r?.data?.session && !r.error; },
      onTrouble: (code) => setTimeout(() => trouble(code), 0),
    });
    team = createTeam(gateway);
    let session = null;
    try { session = (await client.auth.getSession())?.data?.session ?? null; } catch { session = null; }
    if (back.error || back.description || back.hasCode) { try { win.history?.replaceState(win.history.state, '', cleanReturn(win.location.href)); } catch { /* the address keeps its leftovers */ } }
    client.auth.onAuthStateChange((event, s) => setTimeout(() => {
      if (event === 'SIGNED_OUT' && st.phase === 'in') leave();
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && s?.user && s.user.id !== st.user?.id && started) enter(s).catch(() => {});
    }, 0));
    if (session?.user) await enter(session);
    else {
      st.phase = 'out';
      if (!st.notice && back.hasCode) say('Sign-in came back to this page but could not be finished, so you are not signed in. Try again. If it keeps happening, this page’s address may not be on the sign-in allow-list in Supabase.');
      else if (!st.notice && marked) say('Sign-in did not come back to this page, so you are not signed in. If Google sent you to a different page, this page’s address still has to be added to the sign-in allow-list in Supabase.');
      changed();
      probeShared(gateway).then((s) => { if (st.phase === 'out') { st.shared = s; changed(); } }).catch(() => {});
    }
  }

  // ---- what is pressed ---------------------------------------------------------------------------------------------------
  const busy = async (what, fn) => {
    if (st.busy) return;
    st.busy = what; st.notice = ''; draw();
    try { await fn(); } catch (e) { say(e?.message || 'That did not work.'); } finally { st.busy = ''; draw(); }
  };
  const twice = (key) => { if (st.confirm === key) { st.confirm = ''; return true; } st.confirm = key; draw(); return false; };

  async function onClick(e) {
    const el = e.target.closest('[data-acct]');
    if (!el) return;
    const act = el.dataset.acct, id = el.dataset.id ?? '';
    if (act === 'signin') return busy('signin', async () => {
      if (!client) throw new Error('Sign-in could not be loaded just now. Reload the page and try again.');
      try { win.localStorage?.setItem(MARK, String(Date.now())); } catch { /* without the marker a lost return cannot be explained, but sign-in still works */ }
      const r = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: pageAddress(win.location.href), queryParams: { prompt: 'select_account' } } });
      if (r?.error) throw new Error('Sign-in with Google could not be started just now. Nothing has changed: you are not signed in.');
    });
    if (act === 'signout') return busy('signout', async () => { leave(); });
    if (act === 'toggle') { st.open = !st.open; st.confirm = ''; if (st.open) { draw(); await loadPanel(); } return draw(); }
    if (act === 'close') { st.open = false; st.notice = ''; st.confirm = ''; return draw(); }
    if (act === 'dismiss') { st.notice = ''; if (st.phase !== 'in') st.open = false; return draw(); }
    if (act === 'again') return busy('again', async () => { if (st.phase === 'in') await loadPractices(); else st.shared = await probeShared(gateway); changed(); });
    if (act === 'choose') { const p = st.practices.find((x) => x.id === id); if (p) { st.report = null; await loadLook(p); usePractice(p, { home: true }); await loadPanel(); draw(); } return; }
    if (act === 'accept') return busy(`accept:${id}`, async () => {
      const practiceId = await team.acceptInvitation(id);
      await loadPractices();
      const p = st.practices.find((x) => x.id === practiceId);
      if (p) { await loadLook(p); usePractice(p, { home: true }); }
      await loadPanel();
    });
    if (act === 'cancel-invite') return busy(`cancel:${id}`, async () => { await team.cancelInvitation(id); await loadPanel(); });
    if (act === 'remove-person') { if (!twice(`person:${id}`)) return; return busy(`person:${id}`, async () => { await team.removePerson(st.practice.id, id); await loadPanel(); }); }
    if (act === 'leave') {
      if (!twice('leave')) return;
      return busy('leave', async () => {
        const name = st.practice.name;
        await team.removePerson(st.practice.id, st.user.id);
        usePractice(null, { home: true });
        await loadPractices();
        say(`You have left ${name}. Its records stay with the practice.`);
      });
    }
    if (act === 'remove-local') {
      if (!twice(`local:${id}`)) return;
      return busy(`local:${id}`, async () => { await local.removeProject(id); await loadPanel(); changed(); });
    }
  }
  async function onSubmit(e) {
    const form = e.target.closest('form[data-acct-form]');
    if (!form) return;
    e.preventDefault();
    const d = Object.fromEntries([...new FormData(form).entries()].map(([k, v]) => [k, String(v).trim()])), what = form.dataset.acctForm;
    if (what === 'practice') return busy('practice', async () => {
      const p = { ...(await team.createPractice(d.name)), theme: '' }; // a new practice has not chosen a look
      st.practices = [...st.practices, p];
      usePractice(p, { home: true });
      await loadPanel();
      say(`${p.name} is set up, and you are its owner. New projects are now saved to its shared records. Projects already in this browser stay here until you copy them up.`);
    });
    if (what === 'invite') return busy('invite', async () => {
      const inv = await team.invite(st.practice.id, d.email, d.role);
      await loadPanel();
      say(`${inv.email} is invited as ${inv.role === 'owner' ? 'an owner' : `a ${inv.role}`}. Nothing was emailed: ask them to open this page and sign in with Google using that address.`);
    });
    if (what === 'move') return busy('move', async () => {
      const ids = new FormData(form).getAll('pid').map(String);
      if (!ids.length) throw new Error('Tick at least one project to copy.');
      st.report = await moveProjects({ local, cloud: store.current, ids });
      await loadPanel(); changed();
    });
  }
  async function onChange(e) {
    const sw = e.target.closest('select[data-acct-switch]');
    if (sw) { // the practice switcher in the header: the same as choosing a practice in the panel
      const p = st.practices.find((x) => x.id === sw.value);
      if (!p || p.id === st.practice?.id) return;
      st.report = null; await loadLook(p); usePractice(p, { home: true });
      if (st.open) await loadPanel();
      return draw();
    }
    const el = e.target.closest('select[data-acct-role]');
    if (!el) return;
    const userId = el.dataset.acctRole, role = el.value;
    await busy(`role:${userId}`, async () => { try { await team.setRole(st.practice.id, userId, role); } finally { await loadPanel(); } });
  }

  // ---- drawing ---------------------------------------------------------------------------------------------------------------
  const offText = () => (st.shared === 'not_switched_on' ? NOT_ON : st.shared === 'out_of_date' ? 'The shared records are not up to date with this page yet.' : st.shared === 'unreachable' ? 'Shared records could not be reached just now.' : '');

  function draw() {
    if (!slot || !panel) return;
    const off = st.busy ? ' disabled' : '';
    if (nameLabel) nameLabel.hidden = st.phase === 'in';
    if (st.phase === 'starting') slot.innerHTML = '<span class="acct-state">Checking sign-in…</span>';
    else if (st.phase === 'out') {
      // [owner switch] Sign-in is offered only once the shared records answer: until the owner has exposed the arch schema
      // and allowed this page's address for sign-in, Google could send a person back to another of the project's sites.
      slot.innerHTML = st.shared === 'ready'
        ? `<span class="acct-state">Not signed in</span><button class="btn acct-btn" data-acct="signin"${off}>${st.busy === 'signin' ? 'Opening Google…' : 'Sign in with Google'}</button>`
        : '<span class="acct-state">Sign-in: not switched on yet</span>';
    } else {
      const where = st.practice ? `${esc(st.practice.name)} · ${ROLE_SAYS[st.practice.role].toLowerCase()}` : st.shared === 'ready' ? 'no practice yet' : 'not shared';
      // more than one practice: a switcher in the header, so changing practice is one step
      const switcher = st.practices.length > 1 ? `<label class="acct-switch"><span class="vh">Practice in use</span><select data-acct-switch${off}>${st.practice ? '' : '<option value="" selected>Choose a practice</option>'}${st.practices.map((x) => `<option value="${esc(x.id)}"${x.id === st.practice?.id ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>` : '';
      slot.innerHTML = `<span class="acct-who"><span class="acct-lab">Working as</span><span class="acct-name">${esc(st.user.name)}</span><span class="acct-state">${where}</span></span>${switcher}
        <span class="acct-btns"><button class="btn acct-btn" data-acct="toggle" aria-expanded="${st.open}" aria-controls="account-panel"${off}>Practice</button><button class="btn acct-btn" data-acct="signout"${off}>${st.busy === 'signout' ? 'Signing out…' : 'Sign out'}</button></span>`;
    }
    const show = st.open || !!st.notice;
    panel.hidden = !show;
    panel.innerHTML = show ? `<div class="acct-in">${st.notice ? `<p class="acct-note" role="status"><span>${esc(st.notice)}</span><button class="link" data-acct="dismiss">Dismiss</button></p>` : ''}${st.open && st.phase === 'in' ? panelHtml() : ''}</div>` : '';
  }

  function panelHtml() {
    const off = st.busy ? ' disabled' : '';
    const head = (label, title, line) => `<header class="acct-head"><div><p class="label">${esc(label)}</p><h2>${esc(title)}</h2><p class="st acct-line">${line}</p></div><button class="link" data-acct="close">Close</button></header>`;
    const signed = `Signed in as ${esc(st.user.email || st.user.name)}.`;
    if (st.shared !== 'ready') {
      return `<section class="acct-box">${head('Practice', offText(), '□ Saved in this browser only')}
        <p>${signed} ${st.shared === 'not_switched_on' ? 'The shared database exists, but it cannot be reached from a browser until its owner switches that on in Supabase. Until then everything on this page is saved in this browser only, as before.'
          : st.shared === 'out_of_date' ? 'The shared database is reachable, but an update to it has not been applied yet. Until then everything on this page is saved in this browser only, as before.'
          : 'Everything on this page is being saved in this browser only until the shared records answer.'}</p>
        <div class="acts"><button class="btn" data-acct="again"${off}>${st.busy === 'again' ? 'Checking…' : 'Check again'}</button></div></section>`;
    }
    const invites = st.invitations.length ? `<section class="acct-sec"><p class="label">Invitations for you</p><ul class="acct-list">${st.invitations.map((i) => `<li><div class="acct-main"><b>${esc(i.practice_name)}</b><span class="small">as ${esc(ROLE_SAYS[i.role]?.toLowerCase() ?? i.role)} · invited ${esc(day(i.created_at))}</span></div>
        <button class="btn solid" data-acct="accept" data-id="${esc(i.id)}"${off}>${st.busy === `accept:${i.id}` ? 'Joining…' : `Join ${esc(i.practice_name)}`}</button></li>`).join('')}</ul></section>` : '';
    if (!st.practice) {
      const pick = st.practices.length ? `<section class="acct-sec"><p class="label">Your practices</p><ul class="acct-list">${st.practices.map((p) => `<li><div class="acct-main"><b>${esc(p.name)}</b><span class="small">${esc(ROLE_SAYS[p.role])}</span></div><button class="btn solid" data-acct="choose" data-id="${esc(p.id)}"${off}>Open</button></li>`).join('')}</ul></section>` : '';
      return `<section class="acct-box">${head('Practice', st.practices.length ? 'Choose a practice' : 'You are not in a practice yet', '□ Saved in this browser only · nothing is shared')}
        <p>${signed} Records are shared through a practice. Until you ${st.practices.length ? 'open one' : 'start one or join one'}, everything on this page is still saved in this browser only.</p>
        <div class="acct-grid">${pick}${invites}
          <section class="acct-sec"><p class="label">Start a practice</p>
            <form class="f" data-acct-form="practice"><label>Practice name<input name="name" required minlength="2" maxlength="120" autocomplete="organization" placeholder="e.g. Ridge Architects" /></label>
              <div class="f-act"><button class="btn solid"${off}>${st.busy === 'practice' ? 'Setting up…' : 'Start this practice'}</button></div></form>
            <p class="small">You become its owner. You can then invite colleagues and choose what each can do.</p></section>
          ${st.invitations.length ? '' : `<section class="acct-sec"><p class="label">Joining a colleague’s practice</p><p class="small">Ask an owner to invite <b>${esc(st.user.email)}</b>. Nothing is emailed: once they have, sign in here again and the invitation will be waiting.</p></section>`}
        </div></section>`;
    }
    const p = st.practice, owner = p.role === 'owner', viewer = p.role === 'viewer';
    const people = st.peopleError ? `<p class="acct-note">${esc(st.peopleError)}</p>` : `<ul class="acct-list">${st.people.map((m) => {
      const me = m.user_id === st.user.id, sure = st.confirm === `person:${m.user_id}`;
      const role = owner ? `<select class="acct-role" data-acct-role="${esc(m.user_id)}" aria-label="Role of ${esc(m.name || m.email)}"${off}>${Object.keys(ROLE_SAYS).map((r) => `<option value="${r}"${r === m.role ? ' selected' : ''}>${ROLE_SAYS[r]}</option>`).join('')}</select>` : `<span class="st">${esc(ROLE_SAYS[m.role] ?? m.role)}</span>`;
      return `<li><div class="acct-main"><b>${esc(m.name || m.email)}${me ? ' (you)' : ''}</b><span class="small">${esc(m.email)}</span></div>${role}
        ${owner && !me ? `<button class="link" data-acct="remove-person" data-id="${esc(m.user_id)}"${off}>${sure ? 'Remove for good' : 'Remove'}</button>` : '<span></span>'}</li>`;
    }).join('') || '<li class="small">Loading the people…</li>'}</ul>`;
    const pending = st.invites.length ? `<ul class="acct-list">${st.invites.map((i) => `<li><div class="acct-main"><b>${esc(i.email)}</b><span class="small">invited ${esc(day(i.created_at))} · not signed in yet</span></div><span class="st">${esc(ROLE_SAYS[i.role] ?? i.role)}</span>
      <button class="link" data-acct="cancel-invite" data-id="${esc(i.id)}"${off}>Cancel</button></li>`).join('')}</ul>` : '';
    const moveRows = st.mine.map((x) => {
      const m = st.moved[x.id], here = m?.state === 'copied' && m.practice_id === p.id, sure = st.confirm === `local:${x.id}`;
      return here
        ? `<li><div class="acct-main"><b>${esc(x.name)}</b><span class="small">■ Copied to ${esc(m.practice || p.name)} on ${esc(day(m.at))}. This browser still has its own copy.</span></div><button class="link" data-acct="remove-local" data-id="${esc(x.id)}"${off}>${sure ? 'Remove for good' : 'Remove the browser copy'}</button></li>`
        : `<li><label class="acct-pick"><input type="checkbox" name="pid" value="${esc(x.id)}" /><span class="acct-main"><b>${esc(x.name)}</b><span class="small">${x.client ? `Client: ${esc(x.client)} · ` : ''}changed ${esc(day(x.updated_at))}${m?.state === 'failed' ? ' · □ an earlier copy did not finish' : ''}</span></span></label></li>`;
    }).join('');
    const canTick = st.mine.some((x) => !(st.moved[x.id]?.state === 'copied' && st.moved[x.id]?.practice_id === p.id));
    const report = st.report ? `<ul class="acct-report" role="status">${st.report.map((r) => {
      const c = r.counts;
      const what = r.outcome === 'copied' ? `■ ${esc(r.name)}: copied. Read back from the shared records: ${plural(c.tasks, 'task')}, ${plural(c.documents, 'document')}, ${plural(c.approvals, 'approval')}, ${plural(c.checklist, 'checklist item')}, ${plural(c.activity, 'activity entry', 'activity entries')}${c.files ? `, ${plural(c.files, 'file')}` : ''}.`
        : `□ ${esc(r.name || 'A project')}: not copied. ${esc(r.reason)}`;
      return `<li>${what}</li>`;
    }).join('')}</ul>` : '';
    return `<section class="acct-box">${head('Practice', p.name, `■ Shared · you are ${owner ? 'an owner' : `a ${p.role}`}${viewer ? ': you can read everything and change nothing' : ''}`)}
      ${st.practices.length > 1 ? `<p class="small">Also yours: ${st.practices.filter((x) => x.id !== p.id).map((x) => `<button class="link" data-acct="choose" data-id="${esc(x.id)}">${esc(x.name)}</button>`).join(' ')}</p>` : ''}
      <div class="acct-grid">${invites}
        <section class="acct-sec"><p class="label">Look</p>${lookChoiceHtml({ theme: isTheme(p.theme) ? p.theme : DEFAULT_THEME, scope: 'practice', canChange: owner, practice: p.name })}
          <p class="small">${owner ? 'Everyone in the practice sees the look chosen here.' : 'Only an owner can change it.'}</p></section>
        ${panelExtra ? panelExtra(p) : ''}
        <section class="acct-sec"><p class="label">People</p>${people}
          <p class="small">Owners invite people and set roles. Members add and change records. Viewers read everything and change nothing. A practice always keeps at least one owner.</p>
          <div class="acts"><button class="link" data-acct="leave"${off}>${st.confirm === 'leave' ? 'Leave for good' : 'Leave this practice'}</button></div></section>
        ${owner ? `<section class="acct-sec"><p class="label">Invite a colleague</p>
          <form class="f acct-invite" data-acct-form="invite"><label>Their Google email address<input name="email" type="email" required maxlength="200" autocomplete="off" placeholder="name@example.co.nz" /></label>
            <label>Role<select name="role"><option value="member">Member: adds and changes records</option><option value="viewer">Viewer: reads only</option><option value="owner">Owner: also manages people</option></select></label>
            <div class="f-act"><button class="btn solid"${off}>${st.busy === 'invite' ? 'Adding…' : 'Add invitation'}</button></div></form>
          <p class="small">Nothing is emailed. Ask them to open this page and sign in with Google using that address. They are added only when Google confirms the address is theirs.</p>${pending}</section>` : ''}
        <section class="acct-sec"><p class="label">Move this browser’s projects to the practice</p>
          ${viewer ? '<p class="small">Viewers cannot add records, so they cannot copy projects up.</p>'
            : st.mine.length ? `<form class="f" data-acct-form="move"><ul class="acct-list">${moveRows}</ul>
                ${canTick ? `<div class="f-act"><button class="btn solid"${off}>${st.busy === 'move' ? 'Copying…' : `Copy the ticked projects to ${esc(p.name)}`}</button></div>` : ''}</form>`
              : '<p class="small">This browser has no projects of its own to copy.</p>'}
          ${report}
          <p class="small">Nothing moves by itself. Only the projects you tick are copied, and the copy in this browser stays until you remove it. The Sample always stays in this browser.</p></section>
      </div></section>`;
  }

  slot?.addEventListener('click', onClick);
  slot?.addEventListener('change', onChange);
  panel?.addEventListener('click', onClick);
  panel?.addEventListener('submit', onSubmit);
  panel?.addEventListener('change', onChange);
  draw();

  // The first screen waits for sign-in only when there is one to wait for: a sign-in kept in this browser, or one just
  // coming back from Google. Otherwise the page opens straight away and the sign-in button appears when it is ready.
  let expecting = false;
  try { expecting = !!win.localStorage?.getItem(AUTH_STORAGE_KEY) || new URL(win.location.href).searchParams.has('code'); } catch { expecting = false; }
  const going = start().catch(() => { if (st.phase === 'starting') st.phase = 'out'; changed(); });
  const ready = (expecting ? Promise.race([going, new Promise((r) => setTimeout(r, 6000))]) : Promise.resolve()).then(() => { started = true; draw(); });

  return {
    ready,
    onChange(fn) { listeners.add(fn); },
    /** the signed-in person's name, or null when nobody is signed in */
    who: () => (st.phase === 'in' ? st.user.name : null),
    get state() { return { phase: st.phase, shared: st.shared, practice: st.practice, user: st.user, practices: st.practices }; },

    /** the Radar client (radar-client.js) for the signed-in person, or null when signed out or the shared records are off */
    radar: () => (st.phase === 'in' && gateway && st.user?.id ? createRadarClient({ gateway, userId: st.user.id }) : null),

    /** the practice's own artwork place (cloud.js), or null when no practice is in use: artwork.js keeps the practice's artwork through it */
    artworkPlace: () => (st.practice && gateway && store.shared ? createArtworkPlace(gateway, st.practice) : null),
    /** draw the header and the practice panel again (artwork.js, after its section changes) */
    redraw: () => draw(),

    /** Choose the look of the practice in use (owners only; the database refuses anyone else). */
    async setLook(theme) {
      const p = st.practice;
      if (!p || !team) throw new Error('No practice is in use, so this look is for this browser only.');
      if (p.role !== 'owner') throw new Error(`Only an owner of ${p.name} can change its look.`);
      p.theme = await team.setLook(p.id, theme);
      changed();
      return p.theme;
    },

    /** what the practice in use looks for in public tender notices (practice.extra.hunt), or null when none is set or it cannot be read */
    async hunt() {
      const p = st.practice;
      if (!p || !team) return null;
      try { return await team.hunt(p.id); } catch { return null; }
    },
    /** Public tender notices the radar has collected (any member). [] when no practice is in use; throws when the shared records cannot be read. */
    async huntSignals(since = null) {
      const p = st.practice;
      if (!p || !team) return [];
      return team.huntSignals(p.id, since);
    },
    /** News stories the radar has collected (any member). [] when no practice is in use; throws when the shared records cannot be read. */
    async huntLeads(since = null) {
      const p = st.practice;
      if (!p || !team) return [];
      return team.huntLeads(p.id, since);
    },
    /** Tenders read from alert emails and added by this practice (any member can read). [] when no practice is in use. */
    async huntInbox() {
      const p = st.practice;
      if (!p || !team) return [];
      return team.huntInbox(p.id);
    },
    /** Save tenders read from alert emails (an owner or member; the database refuses a viewer). */
    async addHuntInbox(items) {
      const p = st.practice;
      if (!p || !team) throw new Error('No practice is in use, so these are kept in this browser only.');
      if (p.role === 'viewer') throw new Error(`You are a viewer of ${p.name}: you can read the alert emails already added but not add more.`);
      return team.addHuntInbox(p.id, items);
    },
    /** Is a Gmail reader on for the practice in use? { on, since, lastUsed, lastCount }, or null when it cannot be read. */
    async huntReader() {
      const p = st.practice;
      if (!p || !team) return null;
      try { return await team.huntReader(p.id); } catch { return null; }
    },
    /** Make a reader token (owners only). Returns it once; the shared records keep only its hash. */
    async makeHuntReader() {
      const p = st.practice;
      if (!p || !team) throw new Error('No practice is in use: a reader needs the shared records.');
      if (p.role !== 'owner') throw new Error(`Only an owner of ${p.name} can make a reader.`);
      return team.makeHuntReader(p.id);
    },
    async stopHuntReader() {
      const p = st.practice;
      if (!p || !team) throw new Error('No practice is in use.');
      if (p.role !== 'owner') throw new Error(`Only an owner of ${p.name} can stop a reader.`);
      return team.stopHuntReader(p.id);
    },
    /** Save what the practice looks for (owners only; the database refuses anyone else). */
    async setHunt(hunt) {
      const p = st.practice;
      if (!p || !team) throw new Error('No practice is in use, so this is kept in this browser only.');
      if (p.role !== 'owner') throw new Error(`Only an owner of ${p.name} can change what it looks for.`);
      return team.setHunt(p.id, hunt);
    },

    /** the banner under the header: where records are being saved, right now */
    truthHtml(persistent) {
      if (st.practice && store.shared) {
        const r = st.practice.role;
        return `<span>■ Signed in and shared with ${esc(st.practice.name)}.</span> <span>${r === 'viewer' ? 'You are a viewer: you can read everything and change nothing.' : `You are ${r === 'owner' ? 'an owner' : 'a member'}.`} The Sample stays in this browser.</span>`;
      }
      if (!persistent) return '<span>□ This browser is not letting the page save.</span> <span>Work will be lost when the tab closes: export the project to keep it.</span>';
      const first = '<span>■ Saved in this browser only.</span>';
      if (st.phase === 'in') return `${first} <span>${st.shared === 'ready' ? 'Signed in, but not in a practice yet: nothing is shared.' : `Signed in. ${offText() || 'Checking the shared records…'}`}</span>`;
      if (st.phase === 'out' && st.shared === 'ready') return `${first} <span>Sign in with Google to share records with your practice.</span>`;
      return `${first}${offText() ? ` <span>${offText()}</span>` : ''}`;
    },

    /** wording that depends on where a project is kept. Pass the project when there is one: the Sample is always in the browser. */
    words(project) {
      const shared = store.shared && !!st.practice && !isSample(project);
      const name = st.practice?.name ?? 'the practice';
      return shared ? {
        shared: true,
        here: `in the shared records of ${name}`,
        keptOnly: `in the shared records of ${name}`,
        from: `from the shared records of ${name}`,
        fileState: ['■ File in the shared records', '□ File not in the shared records'],
        limitWhy: 'in the shared records',
        filesLine: (n, _persistent, here = '') => `■ Files are kept in the shared records of ${name}, up to ${n} a file${here}. Everyone in the practice can open them. Export with the files to keep a copy of your own.`,
        passAcross: `The file is read from the shared records of ${name} and passed across inside this browser.`,
        record: `A record kept in the shared records of ${name}.`,
        pointSaved: `saved to the shared records of ${name}, where the people in your practice can read it`,
        whoNote: '“Who” is the name on the Google account that was signed in, or the name typed before the project was shared. The shared record also keeps which account added each entry.',
        approvalsNote: 'kept in the practice’s shared records with the account that recorded each one',
        missingTitle: `That project is not in the shared records of ${name}.`,
        missingText: 'It may belong to another practice, or it may only be saved in the browser it was made in.',
      } : {
        shared: false,
        here: 'in this browser',
        keptOnly: 'in this browser only',
        from: 'from this browser',
        fileState: ['■ File kept in this browser', '□ File not in this browser'],
        limitWhy: ', because files are kept in this browser',
        filesLine: (n, persistent, here = '') => `${persistent ? '■ Files are kept in this browser only' : '□ This browser is not keeping files past this tab'}, up to ${n} a file${here}. Clearing this browser’s data removes them, so export with the files to keep a copy. To share files with your practice, sign in and copy the project to the practice.`,
        passAcross: 'The kept file is passed across inside this browser. Nothing is uploaded.',
        record: 'A record kept in one browser.',
        pointSaved: 'saved in this browser only',
        whoNote: `“Who” is the name typed in “Working as”. ${st.phase === 'in' ? 'This project is saved in this browser, not under your sign-in' : 'Nobody is signed in'}, so it is not proof of who it was.`,
        approvalsNote: 'typed into the practice’s own browser',
        missingTitle: 'That project is not in this browser.',
        missingText: st.phase === 'in' ? 'Projects made before sharing are saved in the browser they were made in. If it was made on another device, export it there and import the file here.'
          : 'Projects are saved in the browser they were made in. If it was made on another device, export it there and import the file here. If it is one of your practice’s shared projects, sign in to open it.',
      };
    },

    /** shown in place of a screen that could not be read from the shared records */
    troubleHtml(err) {
      return `<div class="wrap"><div class="empty" style="margin-top:32px"><h3>This could not be opened.</h3><p>${esc(err?.message || 'Something went wrong.')}</p>
        <p class="small">Nothing has been lost or changed. ${store.shared ? 'The shared records did not answer as expected.' : ''}</p><a class="btn solid" href="#/">All projects</a></div></div>`;
    },

    /**
     * After the page draws a screen. For a viewer of shared records, take away what they cannot do (the database refuses
     * it regardless). For everyone in shared records, take away "Remove" on a project: the shared record keeps projects.
     */
    afterRender(root) {
      if (!root || !store.shared || !st.practice) return;
      const onSample = !!root.querySelector('.phead .tag, .pack-head .tag');
      for (const b of root.querySelectorAll('[data-act="project-remove"]')) if (!b.closest('.prow')?.querySelector('.tag')) b.hidden = true;
      if (st.practice.role !== 'viewer' || onSample) return;
      for (const el of root.querySelectorAll('[data-act="add"], [data-act="edit"], [data-act="remove"], [data-act="ask"], [data-act="back"], [data-act="done"], [data-act="facts-remove"], [data-act="model-remove"], [data-act="pick"], [data-act="file-pick"], [data-act="file-remove"], [data-act="sourced-consent"], [data-act="sourced-tasks"], [data-act="auckland-remove"], form[data-form]')) {
        if (el.matches('[data-act="pick"]') && el.closest('.prow')) continue;
        el.hidden = true;
      }
      for (const el of root.querySelectorAll('select[data-status]')) el.disabled = true;
      const wrap = root.querySelector('.wrap');
      if (wrap && !wrap.querySelector('.acct-viewer')) {
        const note = root.ownerDocument.createElement('p');
        note.className = 'flash acct-viewer';
        note.textContent = `□ You are a viewer in ${st.practice.name}: you can read everything and change nothing.`;
        const after = wrap.querySelector('.hero, .rail-now, .pack-bar');
        if (after) after.after(note); else wrap.prepend(note);
      }
    },
  };
}
