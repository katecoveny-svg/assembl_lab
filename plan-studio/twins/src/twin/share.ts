import QRCode from 'qrcode';
import type { App } from './app';

// Sharing from the tool: a short link and a QR code for a phone.
//  - Interactive view: the twin's own URL with the finishes (?fin=) and the camera (?cam=) in it. For a project built from
//    files on the lab (16A) that is all it takes. A dropped plan is uploaded first so the link can rebuild it (?share=).
//  - Stills and fly-throughs: uploaded to the lab's Blob store (owner passphrase required) and shown on a share page.
// Uploads go browser → Blob directly (client tokens from /api/twin-share), so large videos are fine.

const LAB = 'https://lab.assembl.co.nz';
const API = `${LAB}/api/twin-share`;
const KEY = 'assembl-twin-owner-key';

export interface Shareable {
  kind: 'still' | 'video' | 'scene';
  title: string;
  blob?: Blob;
  /** scene: the plan model to rebuild from, and the query that restores finishes and camera */
  plan?: unknown;
  query?: string;
}

function ownerKey(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}
function setOwnerKey(v: string) {
  try {
    localStorage.setItem(KEY, v);
  } catch {
    /* private mode: ask each time */
  }
}

export function cameraQuery(app: App) {
  const p = app.camera.position;
  const t = app.controls.target;
  return [p.x, p.y, p.z, t.x, t.y, t.z].map((v) => v.toFixed(2)).join(',');
}

/** the interactive link for this view (no upload) */
export function viewLink(app: App) {
  const u = new URL(location.href);
  u.searchParams.delete('webgl');
  u.searchParams.delete('nopost');
  u.searchParams.set('cam', cameraQuery(app));
  // links made on a preview or the artifact host point at the live lab page when the path matches
  if (!/assembl\.co\.nz$/.test(u.hostname) && /\/plan-studio\/twins\//.test(u.pathname)) return `${LAB}${u.pathname}${u.search}`;
  return u.toString();
}

async function status(): Promise<{ configured: boolean } | null> {
  try {
    const r = await fetch(API, { method: 'GET' });
    if (!r.ok) return null;
    return (await r.json()) as { configured: boolean };
  } catch {
    return null;
  }
}

/** upload a still, a video or a scene; returns the share page URL */
async function upload(item: Shareable, key: string, project: string): Promise<string> {
  const { upload: put } = await import('@vercel/blob/client');
  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  const payload = (extra: Record<string, unknown>) => JSON.stringify({ key, id, project, ...extra });
  let fileUrl = '';
  let planUrl = '';
  if (item.blob) {
    const ext = item.kind === 'video' ? 'webm' : 'png';
    const r = await put(`twin-shares/${id}.${ext}`, item.blob, { access: 'public', handleUploadUrl: API, clientPayload: payload({ part: 'file' }), contentType: item.blob.type || (ext === 'png' ? 'image/png' : 'video/webm'), multipart: item.blob.size > 8e6 });
    fileUrl = r.url;
  }
  if (item.plan) {
    const b = new Blob([JSON.stringify(item.plan)], { type: 'application/json' });
    const r = await put(`twin-shares/${id}-plan.json`, b, { access: 'public', handleUploadUrl: API, clientPayload: payload({ part: 'plan' }), contentType: 'application/json' });
    planUrl = r.url;
  }
  const m = await fetch(`${API}?op=manifest`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ key, id, kind: item.kind, title: item.title, project, fileUrl, planUrl, query: item.query ?? '', page: location.pathname }),
  });
  if (!m.ok) throw new Error(m.status === 401 ? 'That passphrase was not accepted.' : `The lab said ${m.status}.`);
  return `${LAB}/plan-studio/twins/share/?id=${id}`;
}

/** the share sheet: link, QR code, copy, native share */
export async function shareSheet(app: App, item: Shareable, opts: { needsUpload: boolean; link?: string }) {
  document.getElementById('shareSheet')?.remove();
  const el = document.createElement('div');
  el.id = 'shareSheet';
  el.className = 'share-sheet';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', `Share ${item.title}`);
  el.innerHTML = `<div class="card share-card"><div class="row" style="justify-content:space-between"><h3>Share ${item.kind === 'scene' ? 'the interactive view' : item.kind === 'video' ? 'the fly-through' : 'this still'}</h3><button class="pill" id="shareClose" aria-label="Close">Close</button></div><div id="shareBody"><p class="small">Preparing…</p></div></div>`;
  document.body.append(el);
  const close = () => el.remove();
  el.querySelector('#shareClose')!.addEventListener('click', close);
  el.addEventListener('keydown', (e) => e.key === 'Escape' && close());
  (el.querySelector('#shareClose') as HTMLButtonElement).focus();
  const body = el.querySelector('#shareBody')!;
  const show = async (url: string, note: string) => {
    const qr = await QRCode.toDataURL(url, { margin: 1, width: 240, color: { dark: '#21121F', light: '#F9F6F2' } });
    body.innerHTML = `<img class="share-qr" src="${qr}" width="240" height="240" alt="QR code for the link" /><p class="small">${note}</p><input class="share-url" readonly value="${url.replace(/"/g, '&quot;')}" aria-label="Link" /><div class="row wrap"><button class="pill solid" id="shareCopy">Copy link</button>${'share' in navigator ? '<button class="pill" id="shareNative">Share…</button>' : ''}<a class="pill" href="${url}" target="_blank" rel="noopener">Open</a></div>`;
    body.querySelector('#shareCopy')!.addEventListener('click', async () => {
      await navigator.clipboard?.writeText(url).catch(() => void 0);
      app.log('Link copied.');
    });
    body.querySelector('#shareNative')?.addEventListener('click', () => void navigator.share({ title: item.title, url }).catch(() => void 0));
  };
  if (!opts.needsUpload && opts.link) return show(opts.link, 'Opens the live, interactive twin at this view and with these finishes. Scan it with a phone camera.');
  const st = await status();
  if (!st?.configured) {
    body.innerHTML = `<p class="small">Saving ${item.kind === 'scene' ? 'a dropped plan' : 'renders'} for sharing needs the lab's storage, which isn't connected yet (a Blob store and an owner passphrase on the lab's Vercel project). ${item.blob ? 'You can still download the file.' : ''}</p>${item.blob ? '<div class="row"><button class="pill solid" id="shareDl">Download instead</button></div>' : ''}`;
    body.querySelector('#shareDl')?.addEventListener('click', () => void app.save?.(`${app.project.key}-${item.kind}.${item.kind === 'video' ? 'webm' : 'png'}`, item.blob!));
    return;
  }
  const go = async (key: string) => {
    body.innerHTML = '<p class="small">Uploading…</p>';
    try {
      const url = await upload(item, key, app.project.key);
      setOwnerKey(key);
      await show(url, 'Saved to the lab. Anyone with the link can view it; only you can add to it. Scan it with a phone camera.');
    } catch (e) {
      body.innerHTML = `<p class="small">Couldn't save: ${(e as Error).message}</p>`;
      ask();
    }
  };
  const ask = () => {
    const f = document.createElement('form');
    f.className = 'row wrap';
    f.innerHTML = `<label class="small" style="flex:1">Owner passphrase <input type="password" id="shareKey" autocomplete="current-password" required style="width:100%" /></label><button class="pill solid" type="submit">Save and share</button>`;
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      void go((f.querySelector('#shareKey') as HTMLInputElement).value);
    });
    body.append(f);
    (f.querySelector('#shareKey') as HTMLInputElement).focus();
  };
  const k = ownerKey();
  if (k) void go(k);
  else {
    body.innerHTML = '<p class="small">Saving to the lab needs your owner passphrase (asked once on this device).</p>';
    ask();
  }
}

/** apply ?cam= from the URL once the scene is built */
export function applyCameraFromURL(app: App) {
  const c = new URLSearchParams(location.search).get('cam');
  if (!c) return false;
  const v = c.split(',').map(Number);
  if (v.length !== 6 || v.some((x) => !Number.isFinite(x))) return false;
  app.camera.position.set(v[0], v[1], v[2]);
  app.controls.target.set(v[3], v[4], v[5]);
  app.controls.update();
  return true;
}
