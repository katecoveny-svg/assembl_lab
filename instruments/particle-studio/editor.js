// Particle Studio · a small code editor: a textarea over a tinted mirror, with line numbers, an error line, Tab for two spaces and
// Cmd/Ctrl+Enter to run now. Written for the studio (no vendored editor, no CDN): the design is short, and a textarea is reachable
// by keyboard and screen readers as it stands.
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const TOKEN = /(\/\/[^\n]*)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|(\b(?:export|default|return|const|let|var|function|if|else|for|of|in|new|true|false|null|undefined)\b)|(\b-?\d+(?:\.\d+)?(?:e[+-]?\d+)?\b)|([A-Za-z_$][\w$]*)(?=\s*:)|(\bstudio\b)/g;
export function tint(src) {
  return esc(src).replace(TOKEN, (m, c, s, k, n, key, api) => c ? `<i class="c">${m}</i>` : s ? `<i class="s">${m}</i>` : k ? `<i class="k">${m}</i>` : n ? `<i class="n">${m}</i>` : key ? `<i class="p">${m}</i>` : api ? `<i class="a">${m}</i>` : m);
}

export function createEditor(root, { onChange, onRun, label = "Design code" }) {
  root.classList.add("ps-editor");
  root.innerHTML = `<div class="ps-ed-gutter" aria-hidden="true"></div><div class="ps-ed-body"><pre class="ps-ed-mirror" aria-hidden="true"><code></code></pre><textarea class="ps-ed-text" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" wrap="off" aria-label="${label}"></textarea></div><div class="ps-ed-error v2-mono" role="status" aria-live="polite" hidden></div>`;
  const gutter = root.querySelector(".ps-ed-gutter"), mirror = root.querySelector("code"), ta = root.querySelector("textarea"), err = root.querySelector(".ps-ed-error");
  let errLine = null, timer = null, quiet = false;
  function paint() {
    const v = ta.value, lines = v.split("\n");
    gutter.innerHTML = lines.map((_, i) => `<span class="${errLine === i + 1 ? "bad" : ""}">${i + 1}</span>`).join("");
    mirror.innerHTML = tint(v) + (v.endsWith("\n") ? " " : "");
    if (errLine) { const mark = root.querySelector(".ps-ed-mark"); const el = mark || document.createElement("div"); el.className = "ps-ed-mark"; el.style.top = `${(errLine - 1) * LH}px`; if (!mark) root.querySelector(".ps-ed-body").prepend(el); }
    else root.querySelector(".ps-ed-mark")?.remove();
  }
  const LH = 19.5;
  function sync() { mirror.parentElement.scrollTop = ta.scrollTop; mirror.parentElement.scrollLeft = ta.scrollLeft; gutter.scrollTop = ta.scrollTop; }
  ta.addEventListener("scroll", sync);
  ta.addEventListener("input", () => { paint(); if (quiet) return; clearTimeout(timer); timer = setTimeout(() => onChange?.(ta.value), 420); });
  ta.addEventListener("keydown", (e) => {
    if (e.key === "Tab" && !e.shiftKey && !e.ctrlKey && !e.metaKey) { e.preventDefault(); const s = ta.selectionStart, en = ta.selectionEnd; ta.setRangeText("  ", s, en, "end"); ta.dispatchEvent(new Event("input")); }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); clearTimeout(timer); onRun?.(ta.value); }
    if (e.key === "Escape") ta.blur();
  });
  return {
    get value() { return ta.value; },
    set(v) { if (ta.value === v) return; quiet = true; const top = ta.scrollTop; ta.value = v; paint(); ta.scrollTop = top; sync(); quiet = false; },
    error(message, line) { errLine = line || null; if (message) { err.hidden = false; err.textContent = (line ? `Line ${line}: ` : "") + message; } else { err.hidden = true; err.textContent = ""; } paint(); },
    focus() { ta.focus(); }, textarea: ta,
  };
}
