/* assembl lab · live and latest feeds client.
   The lab build gives each page <html data-feeds="fuel,fpi" data-place="auckland" data-district="waikato">. On load this
   asks /api/live/?feeds=… once (8 s timeout, fails silently), then sets window.__assemblLive and fires a window
   "assembl:live" event with the whole answer as detail: { type:"assembl.feeds", version:2, feeds:{ id: envelope|{id,error} } }.
   Each envelope carries value, values, unit, period, truth ("Live" | "Latest published"), truthLabel, source {name,url} and
   status ("live" | "cached" | "snapshot": how the answer was obtained; see assemblFeeds.status for the client-side reading).
   Pages listen and update their own tiles; anything missing or failed leaves the page on its built-in snapshot.
   Pages with data-place also get the small LIVE strip (weather and wholesale power) that /live.js used to draw. */
(function () {
  const root = document.documentElement;
  const list = (s) => (s || "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
  const state = { feeds: list(root.dataset.feeds), place: root.dataset.feedsPlace || root.dataset.place || "auckland", district: root.dataset.district || root.dataset.feedsDistrict || "" };
  const strip = !!root.dataset.place && root.dataset.strip !== "off";
  if (strip) for (const f of ["weather", "power"]) if (!state.feeds.includes(f)) state.feeds.push(f);
  let seq = 0;

  const A = window.assemblFeeds = {
    data: null, // last good answer
    // ok(id) → the feed's envelope, or null if it is missing or failed
    ok(id) { const f = A.data && A.data.feeds && A.data.feeds[id]; return f && !f.error ? f : null; },
    // refetch, optionally with a different place, district or feed list; resolves to the answer or null
    request(opts) {
      opts = opts || {};
      if (opts.place) state.place = opts.place;
      if (opts.district != null) state.district = opts.district;
      if (opts.feeds) state.feeds = Array.isArray(opts.feeds) ? opts.feeds : list(opts.feeds);
      if (!state.feeds.length) return Promise.resolve(null);
      const my = ++seq;
      const q = new URLSearchParams({ feeds: state.feeds.join(","), place: state.place });
      if (state.district) q.set("district", state.district);
      const ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
      const t = setTimeout(() => ctl && ctl.abort(), 8000);
      return fetch("/api/live/?" + q, { signal: ctl ? ctl.signal : undefined, headers: { accept: "application/json" } })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          clearTimeout(t);
          if (my !== seq || !j || j.type !== "assembl.feeds" || !j.feeds) return null;
          A.data = j; window.__assemblLive = j;
          try { window.dispatchEvent(new CustomEvent("assembl:live", { detail: j })); } catch (e) { /* a page listener threw; others still ran */ }
          try { window.dispatchEvent(new CustomEvent("assembl:feeds", { detail: j })); } catch (e) { /* ignore */ }
          if (strip) drawStrip(j);
          return j;
        })
        .catch(() => { clearTimeout(t); return null; });
    },
    // small helpers pages may use
    when(env) { return env ? env.truthLabel : ""; },
    srcLink(env, text) { return env && env.source ? `<a href="${env.source.url}" target="_blank" rel="noopener">${text || env.source.name}</a>` : ""; },
    // "LIVE" or "LATEST PUBLISHED" for a chip; pages style it themselves
    chip(env) { return env ? (env.truth === "Live" ? "Live" : "Latest published") : "Snapshot"; },
    // which rung of the ladder the answer came from: "live" (fetched for this answer), "cached" (an earlier answer kept at
    // the edge or in a warm function, or the last good one while the upstream is down) or "snapshot" (built in, nothing
    // fetched: the grocery report, or the ED history when Health NZ did not answer). A missing or failed feed is "fallback":
    // the page shows its own built-in figures.
    status(env) {
      if (!env || env.error) return "fallback";
      if (env.status === "snapshot") return "snapshot";
      const age = Date.now() - Date.parse(env.fetchedAt);
      return env.status === "cached" || env.stale || age > 120e3 ? "cached" : "live";
    },
    statusLabel(env) {
      const st = A.status(env);
      if (st === "fallback") return "snapshot · built into this page";
      if (st === "snapshot") return env.statusLabel || "snapshot";
      const t = new Date(env.fetchedAt).toLocaleTimeString("en-NZ", { hour: "numeric", minute: "2-digit" });
      return st === "live" ? "fetched " + t : "cached · fetched " + t + (env.stale ? " · upstream not answering" : "");
    },
  };

  const css = `.alive{position:fixed;left:max(12px,env(safe-area-inset-left,0px));bottom:max(12px,env(safe-area-inset-bottom,0px));z-index:40;max-width:min(560px,calc(100vw - 24px));
  display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:8px 12px 8px 10px;border-radius:14px;font:500 12px/1.35 "IBM Plex Mono",ui-monospace,monospace;color:#492B3E;
  background:rgba(255,253,251,.78);border:1px solid rgba(73,43,62,.14);-webkit-backdrop-filter:blur(12px) saturate(1.3);backdrop-filter:blur(12px) saturate(1.3);box-shadow:0 18px 40px -24px rgba(73,43,62,.45)}
  @media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .alive{color:#F5F1F2;background:rgba(36,11,33,.72);border-color:rgba(245,241,242,.14)}}
  :root[data-theme="dark"] .alive{color:#F5F1F2;background:rgba(36,11,33,.72);border-color:rgba(245,241,242,.14)}
  .alive .dot{width:8px;height:8px;border-radius:50%;background:#3F9A68;box-shadow:0 0 0 0 rgba(63,154,104,.6);animation:alp 2.4s infinite}
  @keyframes alp{0%{box-shadow:0 0 0 0 rgba(63,154,104,.55)}70%{box-shadow:0 0 0 9px rgba(63,154,104,0)}100%{box-shadow:0 0 0 0 rgba(63,154,104,0)}}
  @media (prefers-reduced-motion:reduce){.alive .dot{animation:none}}
  @media (max-width:560px){.alive{bottom:calc(72px + env(safe-area-inset-bottom,0px))}}
  .alive b{font-weight:600}.alive a{color:inherit;opacity:.7}.alive button{all:unset;cursor:pointer;opacity:.6;padding:0 2px}`;
  let stripEl = null, closed = false;
  function drawStrip(j) {
    if (closed) return;
    const w = j.feeds.weather && !j.feeds.weather.error ? j.feeds.weather.values : null;
    const p = j.feeds.power && !j.feeds.power.error ? j.feeds.power.values : null;
    if (!w && !p) return;
    if (!stripEl) {
      const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s);
      stripEl = document.createElement("div"); stripEl.className = "alive"; stripEl.setAttribute("role", "status"); document.body.appendChild(stripEl);
    }
    const t = w ? new Date(w.at).toLocaleTimeString("en-NZ", { hour: "numeric", minute: "2-digit" }) : "";
    stripEl.innerHTML = `<span class="dot" aria-hidden="true"></span><b>LIVE</b>` +
      (w ? `<span>${w.place.split(" ").slice(-1)[0]} ${Math.round(w.tempC)}°C · wind ${Math.round(w.windKmh)} km/h${w.isDay ? ` · sun ${Math.round(w.solarWm2)} W/m²` : ""} · ${t}</span>` : "") +
      (p ? `<span>Wholesale power ${p.date.slice(5)}: avg ${p.avgCentsPerKWh}c/kWh</span>` : "") +
      `<a href="https://open-meteo.com/" target="_blank" rel="noopener">sources</a><button aria-label="Hide live strip">✕</button>`;
    stripEl.querySelector("button").onclick = () => { closed = true; stripEl.remove(); };
  }

  if (state.feeds.length) A.request();
})();
