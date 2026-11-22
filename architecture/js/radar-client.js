// The calls "Look ahead with Radar" makes. This is the only file that talks to Radar (the edge function radar-pursuit-v2) and to its two tables.
//
// What decides who can do what is the database, not this file (supabase/migrations/20261102003000_pursuit_radar_public_runs.sql in the main repo):
//   public.pursuit_seller_profiles   a person reads, adds, changes and deletes only rows whose user_id is their own (auth.uid()).
//   public.pursuit_radar_runs        a person reads and adds only their own rows; there is no update or delete. A row with no user is a public
//                                    (signed-out) run and no signed-in person can read it.
// So a profile and its runs belong to the signed-in PERSON, not to the practice: another member of the practice does not see them. What the
// practice shares is the enquiry a person adds to the pipeline (it carries the opportunity in `extra.radar`).
// The function reads the same two tables with the caller's own token (never a service key) and refuses a profile that is not `approved`.
// This file never handles a token itself: gateway.token() hands over the signed-in person's token for the one call, and nothing keeps it.
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';
import { readStatus, runRequest, cleanRun, explainRadarError, readProfileRow, newUuid, RUN_TIMEOUT_MS } from './radar-model.js';

export const FUNCTION_NAME = 'radar-pursuit-v2';
export const RUNS_SHOWN = 10;

/**
 *   gateway  cloud.js createGateway(): ask(), pub(table) for the public schema, token()
 *   userId   the signed-in person's id (the tables' user_id)
 */
export function createRadarClient({ gateway, userId, url = SUPABASE_URL, key = SUPABASE_PUBLISHABLE_KEY, fetch: fetchImpl = (...a) => globalThis.fetch(...a), timeoutMs = RUN_TIMEOUT_MS, now = () => new Date() } = {}) {
  const endpoint = `${url}/functions/v1/${FUNCTION_NAME}`;

  /** one POST to the function with the person's own token. Resolves { status, body }; throws a plain sentence for a network failure, a timeout or a stop. */
  async function post(body, { signal, ms = timeoutMs } = {}) {
    const token = await gateway.token();
    if (!token) throw Object.assign(new Error(explainRadarError({ status: 401 })), { code: 'signed_out' });
    const ctl = new AbortController();
    let timedOut = false, stopped = false;
    const timer = setTimeout(() => { timedOut = true; ctl.abort(); }, ms);
    const onStop = () => { stopped = true; ctl.abort(); };
    if (signal) { if (signal.aborted) onStop(); else signal.addEventListener('abort', onStop, { once: true }); }
    try {
      const res = await fetchImpl(endpoint, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, apikey: key }, body: JSON.stringify(body), signal: ctl.signal });
      let json = null; try { json = await res.json(); } catch { json = null; }
      return { status: res.status, ok: res.ok, body: json };
    } catch (e) {
      if (timedOut) throw Object.assign(new Error(explainRadarError({ timedOut: true })), { code: 'timeout' });
      if (stopped || e?.name === 'AbortError') throw Object.assign(new Error(explainRadarError({ aborted: true })), { code: 'stopped' });
      throw Object.assign(new Error(explainRadarError({ network: true })), { code: 'network' });
    } finally { clearTimeout(timer); if (signal) signal.removeEventListener?.('abort', onStop); }
  }

  return {
    /** Is Radar ready? Sends { action: "status" } only: the function answers without a model call, so this is free. */
    async status() {
      const r = await post({ action: 'status' }, { ms: 20000 });
      if (!r.ok) throw new Error(explainRadarError({ status: r.status, message: r.body?.error }));
      return readStatus(r.body);
    },
    /**
     * A paid run. The caller (radar.js) only calls this after an explicit confirm. `runId` is chosen by the caller, so a repeat of the same
     * run returns the saved result and does not run again (the function checks pursuit_radar_runs first).
     */
    async run({ mission, sellerProfileId, runId, signal }) {
      const body = runRequest({ mission, sellerProfileId, runId });
      const r = await post(body, { signal });
      if (!r.ok) throw Object.assign(new Error(explainRadarError({ status: r.status, message: r.body?.error })), { code: 'refused', status: r.status });
      return cleanRun(r.body);
    },
    /** this person's saved company profile (their newest row), or null. Row level security returns only their own rows; the user_id filter says so too. */
    async getProfile() {
      const rows = await gateway.ask(() => gateway.pub('pursuit_seller_profiles').select('id, profile, updated_at').eq('user_id', userId).order('updated_at', { ascending: false }).limit(1));
      const row = Array.isArray(rows) ? rows[0] : null;
      return row ? { id: row.id, profile: readProfileRow(row), updatedAt: row.updated_at ?? '' } : null;
    },
    /** Save the profile as this person's own row: an insert for a new one, an update for the one they have. The database refuses any row that is not theirs. */
    async saveProfile(profile, { isNew }) {
      const stamp = now().toISOString();
      if (isNew) {
        await gateway.ask(() => gateway.pub('pursuit_seller_profiles').insert({ id: profile.id, user_id: userId, profile, updated_at: stamp }));
      } else {
        const rows = await gateway.ask(() => gateway.pub('pursuit_seller_profiles').update({ profile, updated_at: stamp }).eq('id', profile.id).eq('user_id', userId).select('id'));
        if (!rows?.length) throw new Error('The shared records did not change that profile. It may belong to another sign-in. Reload and try again.');
      }
      return profile;
    },
    /** this person's own past runs, newest first. Reading one never calls the function and costs nothing. */
    async listRuns() {
      const rows = await gateway.ask(() => gateway.pub('pursuit_radar_runs').select('id, generated_at, payload').eq('user_id', userId).order('generated_at', { ascending: false }).limit(RUNS_SHOWN));
      const out = [];
      for (const r of Array.isArray(rows) ? rows : []) { try { out.push(cleanRun({ ...r.payload, runId: r.payload?.runId ?? r.id })); } catch { /* a row that is not a run is skipped */ } }
      return out;
    },
    newRunId: newUuid,
  };
}
