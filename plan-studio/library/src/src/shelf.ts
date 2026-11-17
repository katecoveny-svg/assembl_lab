// The shelf: a horizontal, endlessly wrapping row of catalogue cards. Each card is a thin box in CSS 3D: a slim
// spine (index, swatch sampled from the render, name, category) and a wide face (the render, and the live model once
// it loads). Cards stand spine-out; the active one turns to face the visitor and its neighbours part to make room.
// Motion is transform and opacity only. Reduced motion swaps state at once.
import type { Item } from './types';
import { $, esc, pad2, reducedMotion, boundsText, sourceLine, isEditable } from './util';

export interface ShelfHooks {
  onOpen: (item: Item, origin: HTMLElement) => void;
  /** the active card has stopped moving: a good moment to load its model */
  onSettle: (item: Item, card: HTMLElement) => void;
  /** the active card is about to change */
  onLeave: (item: Item, card: HTMLElement) => void;
}

interface Geo {
  W: number; // face width
  H: number; // card height
  D: number; // spine width
  step: number;
  gap: number;
  maxK: number;
}

export class Shelf {
  private all: Item[];
  private list: Item[];
  private index = 0;
  private cat = 'all';
  private cards = new Map<string, HTMLLIElement>();
  private prevK = new Map<string, number>();
  private ul: HTMLUListElement;
  private stage: HTMLElement;
  private live: HTMLElement;
  private settleTimer = 0;
  private geo!: Geo;
  private dragging = false;
  private suppressClick = false;
  private hooks: ShelfHooks;
  private root: HTMLElement;
  private categories: { id: string; title: string; count: number }[];
  private lastDir = 1;

  constructor(root: HTMLElement, items: Item[], categories: { id: string; title: string; count: number }[], hooks: ShelfHooks) {
    this.root = root;
    this.all = items;
    this.list = items;
    this.hooks = hooks;
    this.categories = categories;
    root.innerHTML = this.markup();
    this.ul = $('.cards', root) as HTMLUListElement;
    this.stage = $('.shelf-stage', root);
    this.live = $('.shelf-live', root);
    for (const it of items) this.ul.append(this.card(it));
    this.bindTabs();
    this.bindNav();
    this.bindDrag();
    this.measure();
    new ResizeObserver(() => {
      this.measure();
      this.layout(true);
      this.moveInk();
    }).observe(this.stage);
    this.layout(true);
    this.caption(true);
    this.moveInk();
  }

  private markup() {
    const tabs = [{ id: 'all', title: 'All', count: this.all.length }, ...this.categories]
      .map((c, i) => `<button type="button" role="tab" class="tab" id="tab-${c.id}" data-cat="${c.id}" aria-selected="${i === 0}" aria-controls="shelf-stage" tabindex="${i === 0 ? 0 : -1}">${esc(c.title)} <span class="n mono">${c.count}</span></button>`)
      .join('');
    return `
      <div class="shelf-head">
        <div class="tabs" role="tablist" aria-label="Shelf categories">${tabs}<span class="tab-ink" aria-hidden="true"></span></div>
        <p class="pos mono" aria-hidden="true"><span class="pos-n">01</span><span class="pos-sep"> / </span><span class="pos-t">${pad2(this.all.length)}</span></p>
      </div>
      <div class="shelf-stage" id="shelf-stage" role="tabpanel" aria-labelledby="tab-all">
        <div class="shelf-floor" aria-hidden="true"></div>
        <ul class="cards" aria-label="Pieces on the shelf. Left and right arrow keys move along it; Enter opens a piece." aria-roledescription="carousel"></ul>
      </div>
      <div class="caption">
        <div class="cap-text">
          <p class="cap-eyebrow mono"><span class="mask"><span class="line"></span></span></p>
          <p class="cap-title"><span class="mask"><span class="line"></span></span></p>
          <p class="cap-meta mono"><span class="mask"><span class="line"></span></span></p>
        </div>
        <div class="cap-actions">
          <div class="cap-row">
          <button type="button" class="nav prev" aria-label="Previous piece"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7"/></svg></button>
          <button type="button" class="nav next" aria-label="Next piece"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></button>
          <button type="button" class="btn primary explore">Explore asset<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
          </div>
          <div class="progress" aria-hidden="true"><span class="progress-tick"></span></div>
        </div>
      </div>
      <p class="vh shelf-live" aria-live="polite" aria-atomic="true"></p>`;
  }

  private card(it: Item) {
    const li = document.createElement('li');
    li.className = 'card';
    li.dataset.id = it.id;
    if (it.swatch) li.style.setProperty('--sw', it.swatch);
    li.innerHTML = `
      <button type="button" class="card-btn" tabindex="-1" aria-label="${esc(it.title)}, ${esc(it.categoryTitle)}">
        ${['l', 'r'].map((side) => `<span class="spine ${side}" aria-hidden="true">
          <span class="sp-no mono"></span>
          <span class="sp-thumb"><img alt="" data-src="${esc(it.preview.url)}" decoding="async" width="72" height="72"></span>
          <span class="sp-title">${esc(it.title)}</span>
          <span class="sp-cat mono">${esc(it.type)}</span>
          <span class="sp-chip"></span>
        </span>`).join('')}
        <span class="face" aria-hidden="true">
          <img class="still" alt="" data-src="${esc(it.preview.url)}" decoding="async" width="720" height="720">
          <span class="slot"></span>
          <span class="face-cat mono">${esc(it.categoryTitle)}</span>
          <span class="face-mode mono"><i></i><span>Still</span></span>
          <span class="face-size mono">${esc(boundsText(it))}</span>
        </span>
      </button>`;
    li.querySelector('.card-btn')!.addEventListener('click', (e) => this.onCardClick(it, e as MouseEvent));
    this.cards.set(it.id, li);
    return li;
  }

  get active() {
    return this.list[this.index];
  }

  activeCard() {
    return this.cards.get(this.active.id)!;
  }

  private measure() {
    const w = this.stage.clientWidth;
    const h = this.stage.clientHeight;
    const small = w < 640;
    const H = Math.round(Math.min(h - (small ? 28 : 56), small ? 420 : 470));
    const W = Math.round(small ? Math.min(w * 0.8, H * 1.05) : Math.min(w * 0.46, H * 1.28, 620));
    const D = small ? 46 : 74;
    const step = small ? D * 0.62 : D * 0.82;
    const gap = small ? 10 : 26;
    const maxK = Math.max(2, Math.ceil((w / 2 - W / 2 - gap) / step) + 1);
    this.geo = { W, H, D, step, gap, maxK };
    this.stage.style.setProperty('--W', `${W}px`);
    this.stage.style.setProperty('--H', `${H}px`);
    this.stage.style.setProperty('--D', `${D}px`);
  }

  private wrapK(i: number) {
    const n = this.list.length;
    let k = (((i - this.index) % n) + n) % n;
    if (k > n / 2) k -= n;
    return k;
  }

  private layout(instant = false) {
    const { W, D, step, gap, maxK } = this.geo;
    const n = this.list.length;
    const inList = new Set(this.list.map((x) => x.id));
    for (const [id, li] of this.cards) {
      if (!inList.has(id)) {
        li.classList.remove('is-active');
        li.classList.add('off');
        li.hidden = true;
        this.prevK.delete(id);
      }
    }
    const rm = reducedMotion();
    this.list.forEach((it, i) => {
      const li = this.cards.get(it.id)!;
      const k = this.wrapK(i);
      const prev = this.prevK.get(it.id);
      const ak = Math.abs(k);
      const vis = ak <= maxK;
      const near = ak <= maxK + 2;
      li.hidden = false;
      const jump = instant || rm || prev === undefined || Math.abs(k - prev) > n / 2 || (!vis && (prev === undefined || Math.abs(prev) > maxK));
      this.prevK.set(it.id, k);
      let x = 0, z = 0, ry = 0;
      if (k !== 0) {
        const s = Math.sign(k);
        x = s * (W / 2 + gap + D / 2 + (ak - 1) * step);
        ry = s < 0 ? -84 : 84;
        z = -W / 2 - ak * 3;
      } else {
        z = 24;
      }
      li.classList.toggle('jump', jump);
      li.style.setProperty('--x', `${x.toFixed(1)}px`);
      li.style.setProperty('--z', `${z.toFixed(1)}px`);
      li.style.setProperty('--ry', `${ry}deg`);
      li.style.zIndex = String(200 - ak);
      li.classList.toggle('is-active', k === 0);
      li.classList.toggle('off', !vis);
      li.setAttribute('aria-hidden', String(!vis));
      const btn = li.querySelector<HTMLButtonElement>('.card-btn')!;
      btn.tabIndex = k === 0 ? 0 : -1;
      if (!vis) btn.setAttribute('tabindex', '-1');
      for (const no of li.querySelectorAll<HTMLElement>('.sp-no')) no.textContent = pad2(i + 1);
      li.setAttribute('aria-posinset', String(i + 1));
      li.setAttribute('aria-setsize', String(n));
      if (near) for (const img of li.querySelectorAll<HTMLImageElement>('img[data-src]')) {
        img.src = img.dataset.src!;
        img.removeAttribute('data-src');
      }
    });
    if (!rm && !instant) {
      // let jumped cards take their new place without a transition, then restore transitions
      requestAnimationFrame(() => requestAnimationFrame(() => {
        for (const li of this.cards.values()) li.classList.remove('jump');
      }));
    } else {
      requestAnimationFrame(() => {
        for (const li of this.cards.values()) li.classList.remove('jump');
      });
    }
    const pn = $('.pos-n', this.root), pt = $('.pos-t', this.root);
    pn.textContent = pad2(this.index + 1);
    pt.textContent = pad2(n);
    const tick = $('.progress-tick', this.root);
    tick.style.transform = `translateX(${n > 1 ? (this.index / (n - 1)) * 100 : 0}%)`;
    tick.style.width = `${100 / n}%`;
    this.root.querySelector('.cards')!.setAttribute('aria-label', `Pieces on the shelf, ${n} in this view. Left and right arrow keys move along it; Enter opens a piece.`);
    const single = n <= 1;
    ($('.nav.prev', this.root) as HTMLButtonElement).disabled = single;
    ($('.nav.next', this.root) as HTMLButtonElement).disabled = single;
  }

  private swap(el: HTMLElement, text: string, dir: number, instant: boolean) {
    const mask = el.querySelector('.mask')!;
    const cur = mask.querySelector('.line:not(.out)') as HTMLElement | null;
    if (cur && cur.textContent === text) return;
    if (instant || reducedMotion() || !cur) {
      mask.innerHTML = `<span class="line">${esc(text)}</span>`;
      return;
    }
    mask.querySelectorAll('.line.out').forEach((n) => n.remove());
    const nu = document.createElement('span');
    nu.className = `line in ${dir < 0 ? 'down' : 'up'}`;
    nu.textContent = text;
    cur.classList.add('out', dir < 0 ? 'down' : 'up');
    mask.append(nu);
    setTimeout(() => cur.remove(), 700);
  }

  private caption(instant = false) {
    const it = this.active;
    if (!it) return;
    const d = this.lastDir;
    this.swap($('.cap-eyebrow', this.root), `${it.categoryTitle} · ${it.type}`, d, instant);
    this.swap($('.cap-title', this.root), it.title, d, instant);
    this.swap($('.cap-meta', this.root), `${boundsText(it)} model bounds · ${sourceLine(it)} · ${it.licence.name}`, d, instant);
  }

  /** move by delta places; wraps around */
  go(delta: number, opts: { focus?: boolean } = {}) {
    const n = this.list.length;
    if (n < 2 || !delta) return;
    this.hooks.onLeave(this.active, this.activeCard());
    this.lastDir = Math.sign(delta);
    this.index = (((this.index + delta) % n) + n) % n;
    this.layout();
    this.caption();
    this.announce();
    if (opts.focus) this.activeCard().querySelector<HTMLButtonElement>('.card-btn')!.focus({ preventScroll: true });
    this.scheduleSettle();
  }

  /** make an item active by id (switching to All if the current category hides it) */
  show(id: string) {
    let i = this.list.findIndex((x) => x.id === id);
    if (i < 0) {
      this.setCategory('all');
      i = this.list.findIndex((x) => x.id === id);
    }
    if (i < 0 || i === this.index) return;
    this.hooks.onLeave(this.active, this.activeCard());
    this.lastDir = Math.sign(this.wrapK(i)) || 1;
    this.index = i;
    this.layout();
    this.caption();
    this.scheduleSettle();
  }

  private announce() {
    const it = this.active;
    this.live.textContent = `${it.title}. ${it.categoryTitle}. ${this.index + 1} of ${this.list.length}.`;
  }

  private scheduleSettle() {
    clearTimeout(this.settleTimer);
    this.settleTimer = window.setTimeout(() => this.hooks.onSettle(this.active, this.activeCard()), reducedMotion() ? 120 : 650);
  }

  settleNow() {
    this.scheduleSettle();
  }

  private onCardClick(it: Item, e: MouseEvent) {
    if (this.suppressClick) {
      e.preventDefault();
      return;
    }
    const i = this.list.findIndex((x) => x.id === it.id);
    if (i === this.index) this.hooks.onOpen(it, this.activeCard().querySelector('.face') as HTMLElement);
    else this.go(this.wrapK(i), { focus: e.detail === 0 });
  }

  // ------------------------------------------------------------------------------------------- tabs

  setCategory(cat: string) {
    if (cat === this.cat && this.list.length) return;
    const keep = this.active?.id;
    this.hooks.onLeave(this.active, this.activeCard());
    this.cat = cat;
    this.list = cat === 'all' ? this.all : this.all.filter((x) => x.category === cat);
    const ki = this.list.findIndex((x) => x.id === keep);
    this.index = ki >= 0 ? ki : 0;
    for (const t of this.root.querySelectorAll<HTMLButtonElement>('.tab')) {
      const on = t.dataset.cat === cat;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    }
    this.stage.setAttribute('aria-labelledby', `tab-${cat}`);
    this.lastDir = 1;
    this.layout();
    this.caption();
    this.moveInk();
    this.announce();
    this.scheduleSettle();
  }

  private moveInk() {
    const sel = this.root.querySelector<HTMLElement>(`.tab[data-cat="${this.cat}"]`);
    const ink = $('.tab-ink', this.root);
    if (!sel) return;
    ink.style.width = `${sel.offsetWidth}px`;
    ink.style.transform = `translateX(${sel.offsetLeft}px)`;
  }

  private bindTabs() {
    const tabs = [...this.root.querySelectorAll<HTMLButtonElement>('.tab')];
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => {
        this.setCategory(t.dataset.cat!);
        t.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
      });
      t.addEventListener('keydown', (e) => {
        let j = -1;
        if (e.key === 'ArrowRight') j = (i + 1) % tabs.length;
        else if (e.key === 'ArrowLeft') j = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') j = 0;
        else if (e.key === 'End') j = tabs.length - 1;
        if (j < 0) return;
        e.preventDefault();
        tabs[j].focus();
        tabs[j].click();
      });
    });
  }

  // ------------------------------------------------------------------------------------------- input

  private bindNav() {
    $('.nav.prev', this.root).addEventListener('click', () => this.go(-1));
    $('.nav.next', this.root).addEventListener('click', () => this.go(1));
    $('.explore', this.root).addEventListener('click', () => this.hooks.onOpen(this.active, this.activeCard().querySelector('.face') as HTMLElement));
    this.ul.addEventListener('keydown', (e) => {
      if (isEditable(e.target)) return;
      const n = this.list.length;
      if (e.key === 'ArrowRight') this.go(1, { focus: true });
      else if (e.key === 'ArrowLeft') this.go(-1, { focus: true });
      else if (e.key === 'Home') this.go(-this.index, { focus: true });
      else if (e.key === 'End') this.go(n - 1 - this.index, { focus: true });
      else return;
      e.preventDefault();
    });
    // trackpads: a horizontal swipe moves the shelf; vertical scrolling is left to the page
    let acc = 0, last = 0, lockUntil = 0;
    this.stage.addEventListener('wheel', (e) => {
      const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0;
      if (!dx) return;
      e.preventDefault();
      const now = performance.now();
      if (now < lockUntil) return; // let a trackpad's momentum die away after each step
      if (now - last > 500) acc = 0;
      last = now;
      acc += e.deltaMode === 1 ? dx * 16 : dx;
      if (Math.abs(acc) >= 50) {
        this.go(Math.sign(acc));
        acc = 0;
        lockUntil = now + 320;
      }
    }, { passive: false });
    // a face follows the pointer a little (the live model tilts with it)
    this.ul.addEventListener('pointermove', (e) => {
      const face = (e.target as HTMLElement).closest?.('.is-active .face') as HTMLElement | null;
      if (!face) return;
      const r = face.getBoundingClientRect();
      this.root.dispatchEvent(new CustomEvent('facetilt', { detail: { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: ((e.clientY - r.top) / r.height) * 2 - 1 } }));
    });
    this.ul.addEventListener('pointerleave', () => this.root.dispatchEvent(new CustomEvent('facetilt', { detail: { x: 0, y: 0 } })));
  }

  private bindDrag() {
    let x0 = 0, y0 = 0, id = -1, base = 0, locked: 'x' | 'y' | null = null;
    const setShift = (px: number) => this.ul.style.setProperty('--shift', `${px.toFixed(1)}px`);
    this.stage.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || (e.target as HTMLElement).closest('.nav')) return;
      id = e.pointerId;
      x0 = e.clientX;
      y0 = e.clientY;
      base = 0;
      locked = null;
      this.suppressClick = false;
    });
    this.stage.addEventListener('pointermove', (e) => {
      if (e.pointerId !== id) return;
      const dx = e.clientX - x0, dy = e.clientY - y0;
      if (!locked) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        locked = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        if (locked === 'x') {
          this.dragging = true;
          this.ul.classList.add('dragging');
          try { this.stage.setPointerCapture(id); } catch { /* the pointer may already be gone */ }
        }
      }
      if (locked !== 'x') return;
      this.suppressClick = true;
      const step = this.geo.step * 1.4;
      let off = dx - base;
      while (off <= -step) { this.go(1); base -= step; off += step; }
      while (off >= step) { this.go(-1); base += step; off -= step; }
      setShift(off * 0.6);
    });
    const end = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = -1;
      if (this.dragging) {
        this.dragging = false;
        this.ul.classList.remove('dragging');
        setShift(0);
        setTimeout(() => (this.suppressClick = false), 0);
      }
    };
    this.stage.addEventListener('pointerup', end);
    this.stage.addEventListener('pointercancel', end);
  }

  /** set the face's mode label: Still, Loading 3D, Live 3D */
  setMode(card: HTMLElement, mode: 'still' | 'loading' | 'live' | 'failed', text: string) {
    card.dataset.mode = mode;
    const span = card.querySelector('.face-mode span');
    if (span) span.textContent = text;
  }

  focusActive() {
    this.activeCard().querySelector<HTMLButtonElement>('.card-btn')?.focus({ preventScroll: true });
  }
}
