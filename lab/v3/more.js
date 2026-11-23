// lab home · "More from the lab": a tile whose page is still being built stays hidden until that page is served.
// The host answers an unknown path with the home page, so the page's own words are checked, not only the status.
for (const a of document.querySelectorAll("[data-needs]")) {
  fetch(a.dataset.needs, { headers: { accept: "text/html" } })
    .then((r) => (r.ok ? r.text() : ""))
    .then((t) => { if (a.dataset.needsText && t.includes(a.dataset.needsText)) a.hidden = false; })
    .catch(() => {});
}
