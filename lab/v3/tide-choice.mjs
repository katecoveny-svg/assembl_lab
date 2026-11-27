// Use the published station table and the same harbour view as the full tool.
const section = document.querySelector('[data-tide-study]');
const get = name => section.querySelector('[data-' + name + ']');
const day = get('tide-day');
const events = get('tide-event');
const reading = get('tide-reading');
const link = get('full-tide');
const toggle = get('water-toggle');
const host = get('water-host');
const view = host.parentElement;
const sceneStatus = get('water-status');
const dateLabel = new Intl.DateTimeFormat('en-NZ', {dateStyle:'full', timeZone:'UTC'});
const localDay = new Intl.DateTimeFormat('en-CA', {year:'numeric', month:'2-digit', day:'2-digit', timeZone:'Pacific/Auckland'});
let days;
let frame;
let readyTimer;
let exitTimer;
let lossObserver;

function selectedURL(base) {
  const url = new URL(base, location.href);
  if (days?.[day.value]) {
    url.searchParams.set('date', day.value);
    url.searchParams.set('event', events.value);
  }
  return url;
}

function syncWater() {
  if (!frame || !view.hasAttribute('data-ready')) return;
  const child = frame.contentDocument;
  const change = (id, value) => {
    const input = child?.getElementById(id);
    if (input && input.value !== value) {
      input.value = value;
      input.dispatchEvent(new frame.contentWindow.Event('change', {bubbles:true}));
    }
  };
  change('day', day.value);
  change('eventChoice', events.value);
}

function selectEvent() {
  const [clock, height, , zone, kind] = days[day.value][Number(events.value)];
  reading.textContent = dateLabel.format(new Date(day.value + 'T12:00:00Z')) + ' · ' + kind + ' tide predicted at ' + clock + ' ' + zone + ', ' + height + ' m above chart datum.';
  link.href = selectedURL('https://assembl-waitemata-tides.pages.dev/');
  syncWater();
}

function selectDay(date, index = 0) {
  day.value = date;
  events.replaceChildren(...days[date].map(([clock,height,,zone,kind], i) =>
    new Option(kind + ' · ' + clock + ' ' + zone + ' · ' + height + ' m', String(i))));
  events.value = String(index);
  selectEvent();
}

async function loadPredictions() {
  try {
    const response = await fetch('/waitemata-tides/data/events.json');
    if (!response.ok) throw new Error();
    days = await response.json();
    const dates = Object.keys(days).sort();
    const parts = Object.fromEntries(localDay.formatToParts(new Date()).map(p => [p.type,p.value]));
    const today = [parts.year, parts.month, parts.day].join('-');
    day.min = dates[0];
    day.max = dates.at(-1);
    const date = days[today] ? today : today < day.min ? day.min : day.max;
    const upcoming = days[date].findIndex(record => record[2] * 1000 >= Date.now());
    selectDay(date, upcoming < 0 ? days[date].length - 1 : upcoming);
    get('tide-choices').hidden = false;
    day.addEventListener('change', () => {
      if (days[day.value]) selectDay(day.value);
      else day.value = new URL(link.href).searchParams.get('date');
    });
    events.addEventListener('change', selectEvent);
  } catch {
    reading.textContent = 'Open the full tide tables for the published predictions.';
  }
  toggle.hidden = false;
}

function closeWater(message = '') {
  clearTimeout(readyTimer);
  clearTimeout(exitTimer);
  lossObserver?.disconnect();
  frame?.remove();
  frame = null;
  delete view.dataset.ready;
  toggle.setAttribute('aria-expanded','false');
  toggle.textContent = 'Explore the harbour';
  sceneStatus.textContent = message;
}

toggle.addEventListener('click', () => {
  if (frame) { closeWater(); return; }
  frame = document.createElement('iframe');
  frame.title = 'Interactive Waitematā Harbour. Drag the yacht or focus it and use the arrow keys.';
  frame.tabIndex = -1;
  frame.referrerPolicy = 'origin';
  frame.src = selectedURL('/waitemata-tides/?view=harbour&plate=1');
  toggle.textContent = 'Close harbour';
  toggle.setAttribute('aria-expanded','true');
  sceneStatus.textContent = 'Opening the water…';
  host.append(frame);
  readyTimer = setTimeout(() => closeWater('The interactive water could not open. The tide tables are available below.'), 24000);
});

window.addEventListener('message', event => {
  if (!frame || event.origin !== location.origin || event.source !== frame.contentWindow || event.data?.type !== 'assembl:plate-ready') return;
  clearTimeout(readyTimer);
  frame.tabIndex = 0;
  view.dataset.ready = 'true';
  sceneStatus.textContent = 'Drag the yacht on the water, or focus it and use the arrow keys.';
  if (days) syncWater();
  const holder = frame.contentDocument?.getElementById('canvasHolder');
  if (holder) {
    lossObserver = new MutationObserver(() => {
      if (holder.dataset.fallback) closeWater('The water view closed. The tide tables are still available.');
    });
    lossObserver.observe(holder, {attributes:true, attributeFilter:['data-fallback']});
  }
});

if ('IntersectionObserver' in window) {
  const load = new IntersectionObserver(([entry], observer) => {
    if (entry.isIntersecting) { observer.disconnect(); loadPredictions(); }
  }, {rootMargin:'320px'});
  load.observe(section);
  new IntersectionObserver(([entry]) => {
    clearTimeout(exitTimer);
    if (frame && !entry.isIntersecting) exitTimer = setTimeout(closeWater, 1500);
  }).observe(section);
} else loadPredictions();
