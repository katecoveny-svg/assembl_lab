// Plan to 4D (drop tool): once a plan is in, offer its services in the same tab, where the plan is kept for the session
(() => {
  const KEEP = "assembl-twin-dropped-plan";
  const header = document.querySelector("header"); if (!header) return;
  const a = document.createElement("a");
  a.className = "pill"; a.href = "/plan-studio/twins/services/?plan=dropped"; a.textContent = "Services ↗";
  a.title = "Pipes, ducts and cables for this plan: laid in 3D, clash-checked and pre-checked";
  a.style.cssText = "text-decoration:none;display:none;align-items:center";
  header.insertBefore(a, header.querySelector('a.pill[href*="library"]') || document.getElementById("panelToggle"));
  const check = () => { let ok = false; try { ok = !!JSON.parse(sessionStorage.getItem(KEEP) || "null")?.plan?.buildings?.length; } catch { /* blocked */ } a.style.display = ok ? "inline-flex" : "none"; };
  check(); setInterval(check, 1500);
})();
