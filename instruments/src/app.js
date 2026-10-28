const kind = document.body.dataset.instrument;
const $ = (s) => document.querySelector(s);
export { $ };
export function status(s) {
  $("#status").textContent = s;
}
export function group(title, html) {
  const d = document.createElement("div");
  d.innerHTML = `<h2>${title}</h2>${html}`;
  $("#controls").append(d);
  return d;
}
export function choices(title, items, initial, fn) {
  const d = group(
    title,
    `<div class="choices">${items.map(([v, l]) => `<button data-value="${v}" aria-pressed="${v === initial}">${l}</button>`).join("")}</div>`,
  );
  d.onclick = (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    d.querySelectorAll("button").forEach((x) =>
      x.setAttribute("aria-pressed", x === b),
    );
    fn(b.dataset.value);
  };
  return d;
}
export function range(title, min, max, value, step, fn) {
  const d = group(
    "",
    `<label class="slider">${title}<span>${value}</span><input aria-label="${title}" type="range" min="${min}" max="${max}" value="${value}" step="${step}"></label>`,
  );
  const i = d.querySelector("input");
  i.oninput = () => {
    d.querySelector("span").textContent = i.value;
    fn(+i.value);
  };
  return i;
}
export function download(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}
export function history(capture, restore) {
  const stack = [];
  const button = $("#undo");
  return {
    push() {
      stack.push(capture());
      if (stack.length > 16) stack.shift();
      button.disabled = false;
    },
    clear() {
      stack.length = 0;
      button.disabled = true;
    },
    install() {
      button.onclick = () => {
        if (stack.length) {
          restore(stack.pop());
          button.disabled = !stack.length;
          status("One move undone.");
        }
      };
    },
  };
}
// Detect before creating a renderer; a Canvas2D study stays playable without WebGL2.
const gpu = !!document.createElement("canvas").getContext("webgl2");
const mode = new URLSearchParams(location.search).get("mode");
export function isLighterQuality(value) {
  return (
    value === "light" ||
    (value !== "full" &&
      (kind === "reality-remix" || matchMedia("(max-width:650px)").matches))
  );
}
export const light = isLighterQuality(mode);
let api;
async function start() {
  try {
    if (!gpu || mode === "2d")
      api = await (await import("./fallback.js")).start(kind);
    else
      api = await (
        await {
          "reality-remix": () => import("./reality-remix.js"),
          "soft-matter": () => import("./soft-matter.js"),
          "impossible-objects": () => import("./impossible-objects.js"),
        }[kind]()
      ).start();
    $("#loading").hidden = true;
    document.body.dataset.ready = "true";
    $("#reset").onclick = () => {
      api.reset();
      status("A fresh start.");
    };
    $("#freeze").onclick = () => {
      const frozen = $("#freeze").getAttribute("aria-pressed") !== "true";
      $("#freeze").setAttribute("aria-pressed", frozen);
      $("#freeze").textContent = frozen ? "▶ Resume" : "Ⅱ Freeze";
      api.freeze(frozen);
    };
    $("#quality").value = ["light", "full"].includes(mode) ? mode : "auto";
    $("#quality").disabled = !api.setQuality;
    $("#quality").onchange = () => {
      const u = new URL(location);
      const v = $("#quality").value;
      v === "auto"
        ? u.searchParams.delete("mode")
        : u.searchParams.set("mode", v);
      const note = api.setQuality(v);
      window.history.replaceState(null, "", u);
      status(note || "Rendering quality updated. Artwork and undo kept.");
    };
    async function blob() {
      await api.prepareCapture?.();
      api.render?.();
      return new Promise((resolve, reject) =>
        $("#canvas").toBlob(
          (b) =>
            b ? resolve(b) : reject(Error("Image could not be created.")),
          "image/png",
        ),
      );
    }
    $("#save").onclick = async () => {
      try {
        download(await blob(), `${kind}.png`);
        status("PNG image saved.");
      } catch (e) {
        status(e.message);
      }
    };
    $("#share").onclick = async () => {
      try {
        const file = new File([await blob()], `${kind}.png`, {
          type: "image/png",
        });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: document.title });
          status("Image shared.");
        } else {
          download(file, file.name);
          status("Sharing is unavailable here. PNG downloaded.");
        }
      } catch (e) {
        if (e.name !== "AbortError")
          status("Sharing failed. Use Save image instead.");
      }
    };
    const preparePrint = () => {
      // Native beforeprint cannot await promises; solid geometry supplies a synchronous flush.
      api.preparePrint?.();
      api.render?.();
      let img = $(".print-image");
      if (!img) {
        img = new Image();
        img.className = "print-image";
        $("#stage").append(img);
      }
      img.src = $("#canvas").toDataURL("image/png");
    };
    window.addEventListener("beforeprint", preparePrint);
    $("#print").onclick = async () => {
      await api.prepareCapture?.();
      preparePrint();
      window.print();
    };
    document.addEventListener("visibilitychange", () =>
      api.visible?.(!document.hidden),
    );
    window.__instrument = {
      kind,
      backend: api.backend,
      stats: () => api.stats?.(),
      capture: () => api.capture?.(),
    };
  } catch (e) {
    console.error(e);
    $("#loading").innerHTML =
      'This 3D material could not start.<br><br><a href="?mode=2d">Open the lighter 2D study</a>';
    status(e.message);
    document.body.dataset.failed = "true";
  }
}
const active = document.querySelector(`nav a[href="../${kind}/"]`);
active?.setAttribute("aria-current", "page");
start();
