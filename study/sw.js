/* The study app's service worker. Scope: /study/ only.
   Everything is network first, so a new deploy shows up straight away and pages never mix old and new code;
   the last good copy is kept so a visited machine still opens when the signal drops.
   Never cached: Allen's API (/api/*), walkthrough videos (large; they stream), anything from another origin. */
const VERSION = "study-v1";
const SHELL = ["/study/", "/study/kit.css", "/study/kit.js", "/study/guide.js", "/study/tutor.js", "/study/app.js", "/study/app/icon-192.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("study-") && k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

const skip = url => url.origin !== location.origin || url.pathname.startsWith("/api/") || /\.(mp4|webm|vtt)$/i.test(url.pathname);

self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url); if (skip(url)) return;
  const page = req.mode === "navigate";
  e.respondWith(fetch(req).then(r => {
    if (r.ok && r.type === "basic") { const c = r.clone(); caches.open(VERSION).then(x => x.put(req, c)); }
    return r;
  }).catch(() => caches.match(req).then(r => r || (page ? caches.match("/study/") : Response.error()))));
});
