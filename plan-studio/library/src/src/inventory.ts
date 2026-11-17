// The practical inventory: search and filters over the same catalogue, a grid of real items, each with its download
// and a way into the detail view. Filters only offer values the catalogue actually holds.
import type { Catalogue, Item } from './types';
import { $, esc, fmtBytes, boundsText, sourceLine, COLLECTION_TITLES } from './util';

interface Filters {
  q: string;
  category: string;
  collection: string;
  material: string;
  licence: string;
  status: string;
  twin: boolean;
}

export class Inventory {
  private root: HTMLElement;
  private cat: Catalogue;
  private grid: HTMLUListElement;
  private count: HTMLElement;
  private form: HTMLFormElement;
  private hay = new Map<string, string>();
  onInspect: (item: Item, origin: HTMLElement, opener: HTMLElement) => void = () => {};

  constructor(root: HTMLElement, cat: Catalogue) {
    this.root = root;
    this.cat = cat;
    const opt = (v: string, t: string, n?: number) => `<option value="${esc(v)}">${esc(t)}${n !== undefined ? ` (${n})` : ''}</option>`;
    const countBy = (f: (x: Item) => string[]) => {
      const m = new Map<string, number>();
      for (const it of cat.items) for (const v of f(it)) m.set(v, (m.get(v) ?? 0) + 1);
      return [...m.entries()].sort((a, b) => b[1] - a[1]);
    };
    const mats = countBy((x) => x.materialTags);
    const lic = countBy((x) => [x.licence.name]);
    const sts = countBy((x) => [x.verification.sourceStatus]);
    root.innerHTML = `
      <form class="filters" role="search" aria-label="Search and filter the inventory">
        <label class="f-search"><span class="f-l mono">Search</span><input type="search" name="q" placeholder="Name, material, id or source" autocomplete="off" spellcheck="false"></label>
        <label><span class="f-l mono">Category</span><select name="category">${opt('', 'All categories')}${cat.categories.map((c) => opt(c.id, c.title, c.count)).join('')}</select></label>
        <label><span class="f-l mono">Source</span><select name="collection">${opt('', 'All sources')}${cat.collections.map((c) => opt(c.id, COLLECTION_TITLES[c.id] ?? c.title, c.count)).join('')}</select></label>
        <label><span class="f-l mono">Material family</span><select name="material">${opt('', 'All materials')}${mats.map(([k, n]) => opt(k, k[0].toUpperCase() + k.slice(1), n)).join('')}</select></label>
        <label><span class="f-l mono">Licence</span><select name="licence">${opt('', 'All licences')}${lic.map(([k, n]) => opt(k, k, n)).join('')}</select></label>
        <label><span class="f-l mono">Review status</span><select name="status">${opt('', 'All statuses')}${sts.map(([k, n]) => opt(k, k, n)).join('')}</select></label>
        <label class="f-check"><input type="checkbox" name="twin"><span>Used by the twin</span></label>
        <button type="reset" class="btn ghost small">Clear</button>
      </form>
      <div class="inv-bar">
        <p class="inv-count mono" role="status" aria-live="polite"></p>
        <p class="small inv-note">Material families are matched from each item’s material notes. Every file is a GLB; rights are the same for every item: ${esc(cat.rightsDefault.label)}.</p>
      </div>
      <ul class="inv-grid"></ul>
      <p class="inv-empty" hidden>No piece matches those filters. <button type="button" class="linkish">Clear the filters</button></p>`;
    this.grid = $('.inv-grid', root) as HTMLUListElement;
    this.count = $('.inv-count', root);
    this.form = $('form', root) as HTMLFormElement;
    for (const it of cat.items) {
      this.hay.set(it.id, [it.title, it.type, it.categoryTitle, it.description, ...it.materials, it.id, ...Object.values(it.sourceIds), it.twinRole ?? '', it.scientificName ?? '', sourceLine(it)].join(' ').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''));
      this.grid.append(this.card(it));
    }
    this.form.addEventListener('input', () => this.apply());
    this.form.addEventListener('submit', (e) => e.preventDefault());
    this.form.addEventListener('reset', () => setTimeout(() => this.apply(), 0));
    $('.inv-empty button', root).addEventListener('click', () => {
      this.form.reset();
      ($('input[name="q"]', root) as HTMLInputElement).focus();
    });
    this.apply();
  }

  private card(it: Item) {
    const li = document.createElement('li');
    li.className = 'inv-card';
    li.dataset.id = it.id;
    const f = it.files[0];
    li.innerHTML = `
      <div class="ic-img"><img src="${esc(it.preview.url)}" alt="" loading="lazy" decoding="async" width="720" height="720"></div>
      <div class="ic-body">
        <p class="ic-kind mono">${esc(it.categoryTitle)} · ${esc(it.type)}</p>
        <h3 class="ic-title">${esc(it.title)}</h3>
        <p class="ic-meta mono">${esc(boundsText(it))}${it.dimensions.scale ? ' · not to scale' : ''}</p>
        <p class="ic-src">${esc(sourceLine(it))}${it.twinRole ? ' · <span class="tw">in the twin</span>' : ''}</p>
        <p class="ic-chips"><span class="chip ring">Preview</span><span class="chip">${esc(it.licence.name)}</span></p>
        <div class="ic-actions">
          <button type="button" class="btn ghost small inspect" aria-label="Inspect ${esc(it.title)}">Inspect</button>
          <a class="btn linkish small" href="${esc(f.url)}" download="${esc(it.id)}.glb" aria-label="Download ${esc(it.title)} as GLB, ${fmtBytes(f.bytes)}">GLB · ${fmtBytes(f.bytes)}</a>
        </div>
      </div>`;
    const btn = li.querySelector('.inspect') as HTMLButtonElement;
    btn.addEventListener('click', () => this.onInspect(it, li.querySelector('.ic-img') as HTMLElement, btn));
    li.querySelector('.ic-img')!.addEventListener('click', () => btn.click());
    return li;
  }

  private read(): Filters {
    const fd = new FormData(this.form);
    return {
      q: String(fd.get('q') ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''),
      category: String(fd.get('category') ?? ''),
      collection: String(fd.get('collection') ?? ''),
      material: String(fd.get('material') ?? ''),
      licence: String(fd.get('licence') ?? ''),
      status: String(fd.get('status') ?? ''),
      twin: fd.get('twin') === 'on',
    };
  }

  private apply() {
    const f = this.read();
    const words = f.q.split(/\s+/).filter(Boolean);
    let n = 0;
    for (const it of this.cat.items) {
      const ok =
        (!f.category || it.category === f.category) &&
        (!f.collection || it.collections.includes(f.collection)) &&
        (!f.material || it.materialTags.includes(f.material)) &&
        (!f.licence || it.licence.name === f.licence) &&
        (!f.status || it.verification.sourceStatus === f.status) &&
        (!f.twin || !!it.twinRole) &&
        words.every((w) => this.hay.get(it.id)!.includes(w));
      const li = this.grid.querySelector<HTMLElement>(`[data-id="${it.id}"]`)!;
      li.hidden = !ok;
      if (ok) n++;
    }
    const total = this.cat.items.length;
    this.count.textContent = n === total ? `${total} pieces` : `${n} of ${total} pieces`;
    ($('.inv-empty', this.root) as HTMLElement).hidden = n > 0;
  }
}
