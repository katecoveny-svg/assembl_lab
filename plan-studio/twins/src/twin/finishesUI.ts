import { encode, PRESETS, SURFACES, complete, scheduleCSV, scheduleHTML, type Schedule } from './finishes';
import type { App } from './app';

/** the finishes schedule card: presets, a choice per surface, apply (rebuilds with ?fin=…), download the schedule */
export function finishesPanel(app: App, s: Schedule, projectTitle: string) {
  const card = document.createElement('section');
  card.className = 'card';
  card.id = 'finishesCard';
  const groups = [...new Set(SURFACES.map((x) => x.group))];
  card.innerHTML = `<h3>Finishes schedule</h3>
    <p class="small">Choose a finish for each surface, then apply: the homes rebuild with it. Every room is furnished from its name; pieces come from your library first. All proposed, not drawn.</p>
    <div class="row wrap" id="finPresets">${Object.entries(PRESETS)
      .map(([k, v]) => `<button class="pill" data-preset="${k}">${v.name}</button>`)
      .join('')}</div>
    ${groups
      .map(
        (g) => `<fieldset class="finGroup"><legend>${g}</legend>${SURFACES.filter((x) => x.group === g)
          .map(
            (sf) => `<label class="slider">${sf.label}<select data-surface="${sf.key}">${sf.options
              .map((o) => `<option value="${o.id}" ${s[sf.key] === o.id ? 'selected' : ''} title="${o.spec.replace(/"/g, '&quot;')}">${o.label}</option>`)
              .join('')}</select></label>`,
          )
          .join('')}</fieldset>`,
      )
      .join('')}
    <div class="row wrap"><button class="pill primary" id="finApply">Apply finishes</button><button class="pill" id="finCSV">Schedule (CSV)</button><button class="pill" id="finHTML">Schedule (printable)</button><button class="pill" id="evening">See it at dusk</button></div>`;
  const current = (): Schedule => {
    const out: Partial<Schedule> = {};
    card.querySelectorAll<HTMLSelectElement>('select[data-surface]').forEach((el) => (out[el.dataset.surface!] = el.value));
    return complete(out);
  };
  card.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach((b) =>
    b.addEventListener('click', () => {
      const p = PRESETS[b.dataset.preset!].s;
      card.querySelectorAll<HTMLSelectElement>('select[data-surface]').forEach((el) => (el.value = p[el.dataset.surface!] ?? el.value));
      app.log(`${PRESETS[b.dataset.preset!].name}: press Apply finishes to rebuild with it.`);
    }),
  );
  card.querySelector('#finApply')!.addEventListener('click', () => {
    const u = new URL(location.href);
    u.searchParams.delete('palette');
    u.searchParams.set('fin', encode(current()));
    location.href = u.toString();
  });
  const save = (name: string, body: string, type: string) => {
    if (!app.save) return app.log('Downloads aren’t available in this view.');
    void app.save(name, new Blob([body], { type })).then(() => app.log(`${name} offered for download.`));
  };
  const slug = projectTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  card.querySelector('#finCSV')!.addEventListener('click', () => save(`${slug}-finishes.csv`, scheduleCSV(current(), projectTitle), 'text/csv'));
  card.querySelector('#finHTML')!.addEventListener('click', () => save(`${slug}-finishes.html`, scheduleHTML(current(), projectTitle), 'text/html'));
  card.querySelector('#evening')!.addEventListener('click', () => {
    const d = document.getElementById('sundate') as HTMLInputElement;
    const t = document.getElementById('suntime') as HTMLInputElement;
    d.value = `${new Date().getFullYear()}-12-21`;
    t.value = '21.5';
    t.dispatchEvent(new Event('input'));
  });
  return card;
}
