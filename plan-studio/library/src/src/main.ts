// assembl design inventory: page bootstrap. Reads catalogue.json (a static snapshot), builds the shelf, the
// searchable inventory and the detail view, and loads three.js only when a model is first needed.
import './style.css';
import type { Catalogue, Item } from './types';
import type { Viewer, ViewerStatus } from './viewer';
import { $, esc, fmtBytes, webglAvailable, reducedMotion } from './util';
import { mountInk } from './ink';
import { Shelf } from './shelf';
import { Inventory } from './inventory';
import { Detail } from './detail';

const params = new URLSearchParams(location.search);

async function boot() {
  document.documentElement.classList.add('js');
  if (!webglAvailable()) document.documentElement.classList.add('no-gl');
  mountInk();
  let cat: Catalogue;
  try {
    const res = await fetch('./catalogue.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`catalogue.json answered ${res.status}`);
    cat = await res.json();
  } catch (err) {
    const m = $('#boot-error');
    m.hidden = false;
    m.textContent = `The catalogue could not be loaded (${(err as Error).message}). Nothing is shown rather than guessing at it.`;
    document.documentElement.classList.add('boot-failed');
    return;
  }
  const byId = new Map(cat.items.map((x) => [x.id, x]));
  fillCounts(cat);

  // viewers are made on demand and kept (one WebGL context each for the shelf and the detail view)
  let mod: Promise<typeof import('./viewer')> | null = null;
  const viewerModule = () => (mod ??= import('./viewer'));
  let shelfViewer: Viewer | null = null;
  let detailViewer: Viewer | null = null;

  const detail = new Detail($('#detail') as HTMLDialogElement, cat, async () => {
    if (!webglAvailable()) return null;
    try {
      const { Viewer } = await viewerModule();
      detailViewer ??= new Viewer({ interactive: true, autoRotate: !reducedMotion(), label: '3D view', onStatus: (s: ViewerStatus) => detail.status(s) });
      return detailViewer;
    } catch (err) {
      detail.status({ state: 'error', message: (err as Error).message });
      return null;
    }
  });

  // ---------------------------------------------------------------------------------------------- shelf
  const shelfRoot = $('#shelf-root');
  let shelfVisible = true;
  let liveCard: HTMLElement | null = null;
  const shelf: Shelf = new Shelf(shelfRoot, cat.items, cat.categories, {
    onOpen: (item, origin) => openItem(item, origin, document.activeElement as HTMLElement),
    onLeave: (_item, card) => {
      if (liveCard === card) {
        shelf.setMode(card, 'still', 'Still');
        liveCard = null;
      }
      shelfViewer?.clear();
    },
    onSettle: async (item, card) => {
      if (!webglAvailable() || !shelfVisible || detail.isOpen) return;
      if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return;
      try {
        const { Viewer } = await viewerModule();
        shelfViewer ??= new Viewer({
          interactive: false,
          autoRotate: !reducedMotion(),
          label: 'Shelf 3D',
          onStatus: (s) => {
            const c = liveCard;
            if (!c || s.itemId !== c.dataset.id) return;
            if (s.state === 'loading') shelf.setMode(c, 'loading', 'Loading 3D');
            else if (s.state === 'ready') shelf.setMode(c, 'live', 'Live 3D');
            else if (s.state === 'error' || s.state === 'lost') shelf.setMode(c, 'failed', 'Still · 3D unavailable');
          },
        });
        if (shelf.active.id !== item.id) return;
        liveCard = card;
        shelfViewer.attach(card.querySelector('.slot') as HTMLElement);
        shelfViewer.resume();
        await shelfViewer.load(item);
      } catch {
        shelf.setMode(card, 'failed', 'Still · 3D unavailable');
      }
    },
  });
  shelfRoot.addEventListener('facetilt', (e) => shelfViewer?.setTilt((e as CustomEvent).detail.x, (e as CustomEvent).detail.y));
  new IntersectionObserver((entries) => {
    shelfVisible = entries[0].isIntersecting;
    if (!shelfVisible) shelfViewer?.pause();
    else if (!detail.isOpen) {
      shelfViewer?.resume();
      if (!shelfViewer?.currentId) shelf.settleNow();
    }
  }, { threshold: 0.15 }).observe($('.shelf-stage', shelfRoot));
  shelf.settleNow();

  // ---------------------------------------------------------------------------------------------- inventory
  const inv = new Inventory($('#inventory-root'), cat);
  inv.onInspect = (item, origin, opener) => openItem(item, origin, opener);

  // ---------------------------------------------------------------------------------------------- routing
  function openItem(item: Item, origin: HTMLElement | null, opener: HTMLElement | null) {
    shelfViewer?.pause();
    setUrl(item.id);
    detail.open(item, origin, opener);
  }
  detail.onNavigate = (item) => setUrl(item.id);
  detail.onClose = () => {
    setUrl(null);
    if (shelfVisible) shelfViewer?.resume();
  };
  function setUrl(id: string | null) {
    const u = new URL(location.href);
    u.searchParams.delete('twin');
    if (id) u.searchParams.set('item', id);
    else u.searchParams.delete('item');
    history.replaceState(null, '', u);
  }
  // ?item=<inventory id> or ?twin=<twin library id> opens a piece; ?category=<id> picks a shelf tab
  const wantCat = params.get('category');
  if (wantCat && cat.categories.some((c) => c.id === wantCat)) shelf.setCategory(wantCat);
  const want = params.get('item') ? byId.get(params.get('item')!) : params.get('twin') ? cat.items.find((x) => x.twin?.id === params.get('twin')) : undefined;
  if (want) {
    shelf.show(want.id);
    requestAnimationFrame(() => openItem(want, null, null));
  } else if (params.get('item') || params.get('twin')) {
    $('#route-note').hidden = false;
    $('#route-note').textContent = `No piece in this catalogue has the id “${params.get('item') ?? params.get('twin')}”. Showing the whole shelf.`;
  }
  (window as unknown as { __inventory: unknown }).__inventory = { cat, shelf, detail, viewers: () => ({ shelf: shelfViewer, detail: detailViewer }) };
  document.documentElement.classList.add('ready');
}

function fillCounts(cat: Catalogue) {
  for (const el of document.querySelectorAll<HTMLElement>('[data-count]')) {
    const k = el.dataset.count!;
    if (k === 'items') el.textContent = String(cat.items.length);
    else if (k === 'glb') el.textContent = fmtBytes(cat.totals.glbBytes);
    else if (k === 'snapshot') el.textContent = new Date(cat.snapshot + 'T00:00:00').toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' });
    else el.textContent = String(cat.collections.find((c) => c.id === k)?.count ?? '');
  }
  const list = $('#collections-list');
  if (list) {
    list.innerHTML = cat.collections
      .map((c) => `<li><span class="cl-n mono">${c.count}</span><span class="cl-t">${esc(c.title)}</span><span class="cl-s small">${esc(c.note)}</span></li>`)
      .join('');
  }
}

boot();
