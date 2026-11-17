// The detail view: a modal <dialog> that grows out of the card it was opened from, under a brief rose and plum-ink
// wash, with its text rising in masked lines. It holds the orbitable viewer (or the still when 3D cannot run), every
// fact the catalogue has about the piece, the real download, and links to real variants and neighbours.
// Focus is trapped while it is open; Escape and the close button return focus to whatever opened it.
import type { Catalogue, Item } from './types';
import type { Viewer, ViewerStatus } from './viewer';
import { $, esc, fmtBytes, boundsText, reducedMotion, webglAvailable, COLLECTION_TITLES, isEditable } from './util';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea, [tabindex]:not([tabindex="-1"]), summary';

export class Detail {
  private dlg: HTMLDialogElement;
  private surface: HTMLElement;
  private cat: Catalogue;
  private byId: Map<string, Item>;
  private getViewer: () => Promise<Viewer | null>;
  private viewer: Viewer | null = null;
  private item: Item | null = null;
  private origin: HTMLElement | null = null;
  private opener: HTMLElement | null = null;
  private closing = false;
  onClose: (item: Item) => void = () => {};
  onNavigate: (item: Item) => void = () => {};

  constructor(dlg: HTMLDialogElement, cat: Catalogue, getViewer: () => Promise<Viewer | null>) {
    this.dlg = dlg;
    this.cat = cat;
    this.byId = new Map(cat.items.map((x) => [x.id, x]));
    this.getViewer = getViewer;
    this.surface = $('.d-surface', dlg);
    dlg.addEventListener('cancel', (e) => {
      e.preventDefault();
      this.close();
    });
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg) this.close();
    });
    dlg.addEventListener('keydown', (e) => this.onKey(e));
    $('.d-close', dlg).addEventListener('click', () => this.close());
    const stage = $('.d-stage', dlg);
    stage.addEventListener('keydown', (e) => this.onStageKey(e));
    for (const b of dlg.querySelectorAll<HTMLButtonElement>('.v-tools [data-act]')) b.addEventListener('click', () => this.act(b.dataset.act!, b));
    $('.v-retry', dlg).addEventListener('click', () => this.item && this.loadModel(this.item, true));
    dlg.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-goto]');
      if (b) this.show(this.byId.get(b.dataset.goto!)!, true);
    });
  }

  get isOpen() {
    return this.dlg.open;
  }

  get current() {
    return this.item;
  }

  async open(item: Item, origin: HTMLElement | null, opener: HTMLElement | null) {
    if (this.dlg.open) {
      this.show(item, true);
      return;
    }
    this.origin = origin;
    this.opener = opener ?? (document.activeElement as HTMLElement | null);
    this.fill(item);
    document.documentElement.classList.add('modal-open');
    this.dlg.showModal();
    this.dlg.scrollTop = 0;
    $('.d-info', this.dlg).scrollTop = 0;
    $<HTMLElement>('#d-title', this.dlg).focus({ preventScroll: true });
    this.animateIn();
    this.loadModel(item);
  }

  /** switch the open dialog to another item */
  private show(item: Item, fromInside = false) {
    this.fill(item);
    $('.d-info', this.dlg).scrollTop = 0;
    this.riseText();
    this.loadModel(item);
    if (fromInside) {
      $<HTMLElement>('#d-title', this.dlg).focus({ preventScroll: true });
      this.onNavigate(item);
    }
  }

  async close() {
    if (!this.dlg.open || this.closing) return;
    this.closing = true;
    const item = this.item!;
    const rm = reducedMotion();
    if (!rm) {
      const o = this.origin && this.origin.isConnected ? this.origin.getBoundingClientRect() : null;
      const s = this.surface.getBoundingClientRect();
      const visible = o && o.width > 20 && o.bottom > 0 && o.top < innerHeight;
      const kf: Keyframe[] = visible
        ? [{ transform: 'none', opacity: 1 }, { transform: `translate(${o!.left - s.left}px, ${o!.top - s.top}px) scale(${o!.width / s.width}, ${o!.height / s.height})`, opacity: 0.2 }]
        : [{ transform: 'none', opacity: 1 }, { transform: 'translateY(16px) scale(.97)', opacity: 0 }];
      $('.d-grid', this.dlg).animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' });
      await this.surface.animate(kf, { duration: 380, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' }).finished.catch(() => {});
    }
    this.viewer?.pause();
    this.viewer?.clear();
    this.dlg.close();
    for (const a of this.surface.getAnimations({ subtree: true })) a.cancel();
    document.documentElement.classList.remove('modal-open');
    this.closing = false;
    const back = this.opener && this.opener.isConnected ? this.opener : null;
    this.onClose(item);
    back?.focus({ preventScroll: true });
  }

  // ------------------------------------------------------------------------------------------- motion

  private animateIn() {
    if (reducedMotion()) return;
    const s = this.surface.getBoundingClientRect();
    const o = this.origin && this.origin.isConnected ? this.origin.getBoundingClientRect() : null;
    const ease = 'cubic-bezier(.2,.85,.25,1)';
    if (o && o.width > 20) {
      this.surface.animate(
        [
          { transform: `translate(${o.left - s.left}px, ${o.top - s.top}px) scale(${o.width / s.width}, ${o.height / s.height}) rotate(-1.6deg)`, borderRadius: '14px' },
          { transform: 'translate(0,0) scale(1) rotate(0deg)', borderRadius: getComputedStyle(this.surface).borderRadius },
        ],
        { duration: 760, easing: ease },
      );
    } else {
      this.surface.animate([{ transform: 'translateY(24px) scale(.97)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 520, easing: ease });
    }
    $('.d-grid', this.dlg).animate([{ opacity: 0 }, { opacity: 0, offset: 0.35 }, { opacity: 1 }], { duration: 760, easing: 'ease-out' });
    // ink wash: a plum-ink drop and a rose wash spreading from the card, then clearing. Plain blobs scaled with
    // transforms (no live SVG filters, which are slow to rasterise on large surfaces)
    const ink = $('.d-ink', this.dlg);
    const cx = o ? o.left + o.width / 2 - s.left : s.width / 2;
    const cy = o ? o.top + o.height / 2 - s.top : s.height / 2;
    const r = Math.hypot(Math.max(cx, s.width - cx), Math.max(cy, s.height - cy)) * 1.2;
    const blobs = [...ink.querySelectorAll<HTMLElement>('.blob')];
    for (const bl of blobs) {
      bl.style.left = `${cx}px`;
      bl.style.top = `${cy}px`;
      bl.style.width = bl.style.height = `${2 * r}px`;
    }
    const grow = (el: Element, delay: number, dur: number, to: number, turn: number) =>
      el.animate([{ transform: `translate(-50%, -50%) scale(0) rotate(0deg)` }, { transform: `translate(-50%, -50%) scale(${to}) rotate(${turn}deg)` }], { duration: dur, delay, easing: 'cubic-bezier(.3,.7,.2,1)', fill: 'both' });
    grow(blobs[0], 0, 780, 1, 24);
    grow(blobs[1], 110, 720, 1, -18);
    grow(blobs[2], 0, 520, 0.09, 40);
    blobs[2].animate([{ opacity: 0.8 }, { opacity: 0.8, offset: 0.45 }, { opacity: 0 }], { duration: 620, easing: 'ease-out', fill: 'both' });
    ink.animate([{ opacity: 1 }, { opacity: 1, offset: 0.5 }, { opacity: 0 }], { duration: 1150, easing: 'ease-out', fill: 'both' });
    this.riseText(260);
  }

  private riseText(delay = 0) {
    if (reducedMotion()) return;
    $$rise(this.dlg).forEach((el, i) => {
      el.animate([{ transform: 'translateY(105%)' }, { transform: 'translateY(0)' }], { duration: 620, delay: delay + i * 55, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
    });
    $('.d-body', this.dlg).animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 520, delay: delay + 260, easing: 'ease-out', fill: 'backwards' });
  }

  // ------------------------------------------------------------------------------------------- content

  private fill(it: Item) {
    this.item = it;
    const d = this.dlg;
    d.dataset.id = it.id;
    $('.d-eyebrow .line', d).textContent = `${it.categoryTitle} · ${it.type}`;
    $('#d-title .line', d).textContent = it.title;
    const sci = $('.d-sci', d);
    sci.hidden = !it.scientificName;
    $('.line', sci).textContent = it.scientificName ?? '';
    $('#d-desc', d).textContent = it.description;
    const still = $<HTMLImageElement>('.d-still', d);
    still.src = it.preview.url;
    still.alt = `Still render of ${it.title}`;
    $('.d-stage', d).setAttribute('aria-label', `3D view of ${it.title}. Arrow keys turn it, plus and minus zoom, 0 resets the view.`);
    $('.d-body', d).innerHTML = this.body(it);
  }

  private body(it: Item) {
    const f = it.files[0];
    const b = it.dimensions.modelBoundsMm;
    const sources = it.collections.map((c) => COLLECTION_TITLES[c] ?? c).join(', ');
    const ids = Object.entries(it.sourceIds).map(([k, v]) => `<span class="idpair"><span>${esc(k)}</span> ${esc(v)}</span>`).join(' ');
    const ext = f.extensionsRequired?.length ? f.extensionsRequired.join(', ') : 'none';
    const licence = it.licence.url ? `<a href="${esc(it.licence.url)}" rel="noopener" target="_blank">${esc(it.licence.name)}</a>` : esc(it.licence.name);
    const fam = it.family ? it.family.members.filter((m) => m !== it.id).map((m) => this.byId.get(m)!).filter(Boolean) : [];
    const more = this.cat.items.filter((x) => x.category === it.category && x.id !== it.id && !fam.includes(x));
    const start = Math.max(0, this.cat.items.filter((x) => x.category === it.category).findIndex((x) => x.id === it.id));
    const near = [...more.slice(start), ...more.slice(0, start)].slice(0, 4);
    const mini = (x: Item) => `<li><button type="button" class="mini" data-goto="${esc(x.id)}"><img src="${esc(x.preview.url)}" alt="" loading="lazy" width="96" height="96"><span>${esc(x.title)}</span></button></li>`;
    return `
      <ul class="truth" aria-label="Truth labels">
        <li class="chip ring">${esc(it.verification.readinessLabel)}</li>
        <li class="chip dot">Rights: ${esc(it.rights.label)}</li>
        <li class="chip ring">Sizes as modelled, not verified against a real product</li>
      </ul>
      <dl class="facts">
        <div><dt>Materials, as modelled</dt><dd>${it.materials.map((m) => esc(m)).join('<span class="sep" aria-hidden="true">·</span>')}</dd></div>
        <div><dt>Stated size</dt><dd>${esc(it.dimensions.stated)}<small>${esc(it.dimensions.statedSource)}</small></dd></div>
        <div><dt>Model bounds</dt><dd><span class="mono">${esc(boundsText(it))}</span> <span class="unit">W × D × H</span>${it.dimensions.scale ? `<strong class="warn">Not to scale: drawn at a common field-guide size</strong>` : ''}<small>Measured from this file by the inventory build (x ${b.x}, y ${b.y}, z ${b.z} mm).</small></dd></div>
        <div><dt>Format</dt><dd>GLB, glTF 2.0 binary<span class="sep">·</span>${(f.triangles ?? 0).toLocaleString('en-NZ')} triangles<span class="sep">·</span>${f.materials} materials<span class="sep">·</span>${f.textures} textures<small>Needs: ${esc(ext)}</small></dd></div>
        <div><dt>Sources</dt><dd>${esc(sources)}<small class="ids">${ids}</small></dd></div>
        ${it.twin ? `<div><dt>In the twin</dt><dd>Fills the “${esc(it.twin.role.replace(/_/g, ' '))}” slot (${esc(it.twin.id)}, placed ${esc(it.twin.fit === 'floor' ? 'on the floor' : it.twin.fit === 'wall' ? 'against a wall' : 'hanging')})</dd></div>` : ''}
        <div><dt>Licence</dt><dd>${licence}<small>${esc(it.licence.attribution)}${it.licence.statedBySource ? ` · ${esc(it.licence.statedBySource)}` : ''}</small></dd></div>
        <div><dt>Rights</dt><dd>${esc(it.rights.label)}<small>Commercial use: not claimed.</small></dd></div>
        <div><dt>Status</dt><dd>${esc(it.verification.sourceStatus)}<small>Preview asset. Photorealism not claimed; dimensional accuracy unverified.</small></dd></div>
      </dl>
      <section class="d-sec" aria-labelledby="dl-h">
        <h3 id="dl-h" class="d-h">Download</h3>
        <a class="btn primary dl" href="${esc(f.url)}" download="${esc(it.id)}.glb">Download GLB<span class="mono">${fmtBytes(f.bytes)}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v12M6 11l6 6 6-6M5 20h14"/></svg></a>
        <p class="small">${esc(f.label)}. three.js opens it with GLTFLoader and MeshoptDecoder; tools without Meshopt and WebP support need a decompressed copy. This is a preview file, not a verified production asset.</p>
        <p class="small mono hash" title="SHA-256">sha256 ${esc(f.sha256.slice(0, 16))}…</p>
        ${it.notDeployed.length ? `<details class="nd"><summary>Other versions, not on this site (${it.notDeployed.length})</summary><ul>${it.notDeployed.map((n) => `<li>${esc(n.label)} · ${fmtBytes(n.bytes)}<small>${esc(n.where)}</small></li>`).join('')}</ul></details>` : ''}
      </section>
      <section class="d-sec" aria-labelledby="pv-h">
        <h3 id="pv-h" class="d-h">Provenance</h3>
        <ul class="plain">${it.provenance.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
      </section>
      <details class="d-sec notes">
        <summary class="d-h">What is assumed or unverified (${it.verification.notes.length})</summary>
        <ul class="plain">${it.verification.notes.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
      </details>
      <section class="d-sec" aria-labelledby="st-h">
        <h3 id="st-h" class="d-h">Stills</h3>
        <div class="stills">
          <figure><img src="${esc(it.preview.url)}" alt="Preview render of ${esc(it.title)}" loading="lazy" width="360" height="360"><figcaption>${esc(it.preview.note)}</figcaption></figure>
          ${it.sourceStill ? `<figure><img src="${esc(it.sourceStill.url)}" alt="Source render of ${esc(it.title)}" loading="lazy"><figcaption>${esc(it.sourceStill.note)}</figcaption></figure>` : ''}
        </div>
      </section>
      ${fam.length ? `<section class="d-sec" aria-labelledby="fm-h"><h3 id="fm-h" class="d-h">Variants: ${esc(it.family!.title)}</h3><ul class="minis">${fam.map(mini).join('')}</ul></section>` : ''}
      ${near.length ? `<section class="d-sec" aria-labelledby="mr-h"><h3 id="mr-h" class="d-h">More in ${esc(it.categoryTitle)}</h3><ul class="minis">${near.map(mini).join('')}</ul></section>` : ''}
      <p class="small later-note">Saving to a collection, material variants and project placement are not built yet.</p>`;
  }

  // ------------------------------------------------------------------------------------------- viewer

  private async loadModel(it: Item, retry = false) {
    const d = this.dlg;
    const stage = $('.d-stage', d);
    stage.dataset.state = 'still';
    if (!webglAvailable()) {
      this.status({ state: 'error', message: 'nogl' });
      return;
    }
    if (!this.viewer) this.viewer = await this.getViewer();
    if (!this.viewer || this.item !== it || !this.dlg.open) return;
    const v = this.viewer;
    v.attach($('.d-gl', d));
    v.resume();
    v.setAutoRotate(!reducedMotion());
    this.syncTools();
    if (retry) v.clear();
    await v.load(it);
  }

  /** viewer status for the detail stage (called by main for this viewer's events) */
  status(s: ViewerStatus) {
    const d = this.dlg;
    const stage = $('.d-stage', d);
    const msg = $('.v-status', d);
    const retry = $<HTMLButtonElement>('.v-retry', d);
    retry.hidden = true;
    if (s.itemId && this.item && s.itemId !== this.item.id) return;
    if (s.state === 'loading') {
      stage.dataset.state = 'loading';
      const pct = s.total ? Math.min(100, Math.round(((s.loaded ?? 0) / s.total) * 100)) : 0;
      msg.textContent = `Loading the 3D model · ${fmtBytes(s.loaded ?? 0)} of ${fmtBytes(s.total ?? 0)}`;
      stage.style.setProperty('--p', String(pct / 100));
    } else if (s.state === 'ready') {
      stage.dataset.state = 'live';
      msg.textContent = 'Live 3D. Drag to turn, scroll or pinch to zoom.';
    } else if (s.state === 'error' || s.state === 'lost') {
      stage.dataset.state = 'failed';
      if (s.message === 'nogl') msg.textContent = 'Still render. The 3D view needs WebGL, which is not available in this browser.';
      else {
        msg.textContent = `Still render. The 3D model could not be shown (${s.message ?? 'unknown error'}).`;
        retry.hidden = false;
      }
    } else {
      stage.dataset.state = 'still';
      msg.textContent = '';
    }
  }

  private syncTools() {
    const v = this.viewer;
    const rot = $<HTMLButtonElement>('[data-act="rotate"]', this.dlg);
    const bnd = $<HTMLButtonElement>('[data-act="bounds"]', this.dlg);
    rot.setAttribute('aria-pressed', String(!!v?.autoRotating));
    bnd.setAttribute('aria-pressed', String(!!v?.boundsOn));
  }

  private act(a: string, b: HTMLButtonElement) {
    const v = this.viewer;
    if (!v) return;
    if (a === 'reset') v.reset();
    else if (a === 'in') v.zoom(0.8);
    else if (a === 'out') v.zoom(1.25);
    else if (a === 'rotate') v.setAutoRotate(!v.autoRotating);
    else if (a === 'bounds') v.showBounds(!v.boundsOn);
    this.syncTools();
    b.focus();
  }

  private onStageKey(e: KeyboardEvent) {
    const v = this.viewer;
    if (!v || $('.d-stage', this.dlg).dataset.state !== 'live') return;
    const k = e.key;
    if (k === 'ArrowLeft') v.orbitBy(-15, 0);
    else if (k === 'ArrowRight') v.orbitBy(15, 0);
    else if (k === 'ArrowUp') v.orbitBy(0, 8);
    else if (k === 'ArrowDown') v.orbitBy(0, -8);
    else if (k === '+' || k === '=') v.zoom(0.8);
    else if (k === '-' || k === '_') v.zoom(1.25);
    else if (k === '0' || k === 'Home') v.reset();
    else return;
    e.preventDefault();
    v.setAutoRotate(false);
    this.syncTools();
  }

  private onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.close();
      return;
    }
    if (e.key !== 'Tab' || isEditable(null)) return;
    const els = [...this.dlg.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement);
    if (!els.length) return;
    const first = els[0], last = els[els.length - 1];
    const act = document.activeElement as HTMLElement;
    if (e.shiftKey && (act === first || !this.dlg.contains(act) || act.id === 'd-title')) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && act === last) {
      e.preventDefault();
      first.focus();
    }
  }
}

function $$rise(root: ParentNode) {
  return [...root.querySelectorAll<HTMLElement>('.d-info .mask > .line')].filter((el) => el.offsetParent !== null);
}
