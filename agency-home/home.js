// assembl.co.nz home: the one moving part. In "How we work" a draft travels from the agents to you and stops.
// It only goes out when a person presses Approve. Nothing is sent anywhere: it shows the rule, it doesn't run it.
// Without this script, or with reduced motion, the row rests on its still frame: a draft waiting for a yes.
const flow = document.getElementById("flow"), btn = document.getElementById("approve"), status = document.getElementById("flow-status");
if (flow && btn && status) {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const set = (p, state, text) => { flow.style.setProperty("--p", p); flow.dataset.state = state; if (text) status.textContent = text; };
  const wait = () => { set(1, "waiting", "Draft ready. Waiting for a yes."); btn.textContent = "Approve"; };
  btn.hidden = false;
  if (!reduce && "IntersectionObserver" in window) {
    // start with the draft still with the agents, and bring it to you once the row is on screen
    set(0, "preparing", "Agents are preparing a draft.");
    const io = new IntersectionObserver((es) => {
      if (!es.some((e) => e.isIntersecting)) return;
      io.disconnect(); setTimeout(() => { if (flow.dataset.state === "preparing") wait(); }, 500);
    }, { threshold: 0.5 });
    io.observe(flow);
  }
  btn.addEventListener("click", () => {
    const state = flow.dataset.state;
    if (state === "preparing") wait();                 // pressed early: the draft arrives, and still waits for a yes
    else if (state === "waiting") { set(2, "approved", "Approved by you. Out it goes."); btn.textContent = "Start again"; }
    else { set(0, "preparing", "Agents are preparing a draft."); btn.textContent = "Approve"; setTimeout(() => { if (flow.dataset.state === "preparing") wait(); }, reduce ? 0 : 700); }
  });
}
