import "./style.css";
import { engine } from "./engine.js";
import {
  defaults,
  shapes,
  patterns,
  finishes,
  recipes,
  validateProject,
} from "./model.js";
import { download, imageFile, meshFile, shareOrDownload } from "./export.js";
const $ = (s) => document.querySelector(s),
  say = (t) => ($("#status").textContent = t);
let design = { ...defaults },
  pending = design.shape,
  history = [],
  e;
const push = () => {
  history.push(e.capture());
  if (history.length > 20) history.shift();
  $("#undo").disabled = false;
};
function syncUI() {
  for (const k of ["mix", "spring", "squish", "rebound", "colorA", "colorB"])
    $("#" + k.replace("colorA", "color-a").replace("colorB", "color-b")).value =
      design[k];
  for (const k of ["mix", "spring", "squish", "rebound"])
    $("#" + k + "-value").textContent =
      k === "mix"
        ? Math.round(design[k] * 100) + "%"
        : {
            spring: ["Mellow", "Bouncy", "Boing"],
            squish: ["Firm", "Soft", "Pillow-soft"],
            rebound: ["Unhurried", "Easy", "Snappy"],
          }[k][Math.min(2, Math.floor(design[k] * 3))];
  document
    .querySelectorAll("[data-pattern]")
    .forEach((b) =>
      b.setAttribute("aria-pressed", b.dataset.pattern === design.pattern),
    );
  document
    .querySelectorAll("[data-finish]")
    .forEach((b) =>
      b.setAttribute("aria-pressed", b.dataset.finish === design.finish),
    );
  pending = design.shape;
  document
    .querySelectorAll("[data-shape]")
    .forEach((b) =>
      b.setAttribute("aria-pressed", b.dataset.shape === pending),
    );
  const recipe = Object.entries(recipes).find(([, d]) =>
    Object.keys(defaults).every((k) => d[k] === design[k]),
  );
  $("#design-name").textContent = recipe?.[0] || "Your recipe";
  document
    .querySelectorAll("[data-recipe]")
    .forEach((b) =>
      b.setAttribute("aria-pressed", b.dataset.recipe === recipe?.[0]),
    );
  $("#pause").textContent = e.paused ? "▶ Play" : "Ⅱ Pause";
  $("#pause").setAttribute("aria-pressed", e.paused);
}
function button(parent, label, data, fn) {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = label;
  Object.assign(b.dataset, data);
  b.onclick = fn;
  $(parent).append(b);
  return b;
}
function setMode(mode) {
  e.setMode(mode);
  $("#stage").classList.toggle("scroll", mode === "scroll");
  document
    .querySelectorAll("[data-mode]")
    .forEach((b) => b.setAttribute("aria-pressed", b.dataset.mode === mode));
  $("#hint").textContent = {
    squeeze: "Drag to squeeze. Let go to rebound.",
    stretch: "Pull a little patch. Release to rebound.",
    orbit: "Drag to rotate. Pinch or scroll to zoom.",
    scroll: "Swipe to scroll the page. Choose Squeeze to play.",
  }[mode];
}
try {
  e = await engine($("#canvas"), push);
  e.create(design);
  $("#loading").hidden = true;
  for (const [k, label] of Object.entries(shapes)) {
    const b = button("#shapes", label, { shape: k }, () => {
      pending = k;
      document
        .querySelectorAll("[data-shape]")
        .forEach((b) =>
          b.setAttribute("aria-pressed", b.dataset.shape === pending),
        );
    });
    const icon = document.createElement("span");
    icon.className = "shape-icon " + k;
    b.prepend(icon);
  }
  $("#make-shape").onclick = () => {
    push();
    design = { ...design, shape: pending };
    e.create(design);
    syncUI();
    say("Fresh shape, same colours and feel. Undo brings your sculpture back.");
  };
  for (const [name, d] of Object.entries(recipes))
    button("#recipes", name, { recipe: name }, () => {
      push();
      design = { ...d };
      e.create(design);
      syncUI();
      say("New recipe. Undo restores your previous design.");
    });
  for (const p of patterns)
    button("#patterns", p, { pattern: p }, () => {
      push();
      design.pattern = p;
      e.update(design);
      syncUI();
    });
  for (const f of finishes)
    button("#finishes", f, { finish: f }, () => {
      push();
      design.finish = f;
      e.update(design);
      syncUI();
    });
  for (const k of ["mix", "spring", "squish", "rebound", "colorA", "colorB"]) {
    const input = $(
      "#" + k.replace("colorA", "color-a").replace("colorB", "color-b"),
    );
    let recorded = false,
      keyActive = false,
      pointerActive = false;
    const end = () => {
      recorded = false;
    };
    input.addEventListener("pointerdown", () => {
      pointerActive = true;
    });
    input.addEventListener("keydown", (event) => {
      if (
        [
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
          "Home",
          "End",
          "PageUp",
          "PageDown",
        ].includes(event.key)
      )
        keyActive = true;
    });
    input.addEventListener("input", () => {
      const value = k.startsWith("color") ? input.value : Number(input.value);
      if (value === design[k]) return;
      if (!recorded) {
        push();
        recorded = true;
      }
      design[k] = value;
      e.update(design);
      syncUI();
    });
    input.addEventListener("change", () => {
      if (!keyActive && !pointerActive) end();
    });
    input.addEventListener("keyup", () => {
      keyActive = false;
      end();
    });
    for (const event of ["pointerup", "pointercancel", "blur"])
      input.addEventListener(event, () => {
        pointerActive = false;
        keyActive = false;
        end();
      });
  }
  $("#undo").onclick = () => {
    const state = history.pop();
    if (!state) return;
    e.restore(state);
    design = { ...state.design };
    syncUI();
    $("#undo").disabled = !history.length;
    say("Previous design and sculpture restored.");
  };
  $("#reset").onclick = () => {
    push();
    e.create(design);
    say("Shape reset. Your colours and feel stay. Undo is available.");
  };
  $("#pause").onclick = () => {
    e.paused = !e.paused;
    syncUI();
  };
  $("#wobble").onclick = () => {
    push();
    e.paused = false;
    e.wobble();
    syncUI();
  };
  document
    .querySelectorAll("[data-mode]")
    .forEach((b) => (b.onclick = () => setMode(b.dataset.mode)));
  document.querySelectorAll("[data-tab]").forEach(
    (b) =>
      (b.onclick = () => {
        document.querySelectorAll("[data-tab]").forEach((t) => {
          const active = t === b;
          t.setAttribute("aria-selected", active);
          $("#" + t.dataset.tab + "-panel").hidden = !active;
        });
      }),
  );
  document.querySelectorAll("[data-tab]").forEach((b, i) =>
    b.addEventListener("keydown", (event) => {
      const tabs = [...document.querySelectorAll("[data-tab]")];
      let next;
      if (event.key === "ArrowRight") next = (i + 1) % tabs.length;
      if (event.key === "ArrowLeft") next = (i + tabs.length - 1) % tabs.length;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = tabs.length - 1;
      if (next !== undefined) {
        event.preventDefault();
        tabs[next].click();
        tabs[next].focus();
      }
    }),
  );
  $("#play").onclick = () => {
    setMode("squeeze");
    e.paused = false;
    syncUI();
    $("#stage").scrollIntoView({ behavior: "smooth", block: "center" });
  };
  $("#quality").onchange = () => {
    e.quality($("#quality").value);
    say(
      "Pixel quality changed. Your sculpture and undo history are preserved.",
    );
  };
  function project() {
    const s = e.capture();
    return {
      format: "assembl-squishy-project",
      version: 1,
      design: s.design,
      pose: s.pose,
      view: s.view,
    };
  }
  $("#save-project").onclick = () => {
    const p = validateProject(project());
    download(
      new Blob([JSON.stringify(p)], { type: "application/json" }),
      "squishy-lab.project.json",
    );
    say("Editable project saved locally.");
  };
  $("#load-project").onclick = () => $("#project-file").click();
  $("#project-file").onchange = async () => {
    const file = $("#project-file").files[0];
    if (!file) return;
    try {
      if (file.size > 262144)
        throw Error("Project must be smaller than 256 KB.");
      const p = validateProject(JSON.parse(await file.text()));
      push();
      e.restore({ ...p, paused: true });
      design = { ...p.design };
      syncUI();
      say(
        "Project loaded paused. Press Play to rebound. Undo restores your previous design.",
      );
    } catch (error) {
      say("Could not load project: " + error.message);
    } finally {
      $("#project-file").value = "";
    }
  };
  $("#open-export").onclick = () => {
    e.sync();
    e.mesh.geometry.computeBoundingBox();
    const box = e.mesh.geometry.boundingBox;
    $("#mesh-dimensions").textContent =
      `Current art bounds: ${["x", "y", "z"].map((k) => ((box.max[k] - box.min[k]) * 30).toFixed(1)).join(" × ")} mm (width × height × depth).`;
    $("#export-dialog").showModal();
  };
  $("#format").onchange = () => {
    const jpeg = $("#format").value === "jpeg";
    $("#transparent").disabled = jpeg;
    if (jpeg) $("#transparent").checked = false;
  };
  const options = () => ({
    format: $("#format").value,
    aspect: $("#aspect").value,
    transparent: $("#transparent").checked,
  });
  let exporting = false;
  async function exportAction(fn) {
    if (exporting) return;
    exporting = true;
    $("#export-status").textContent = "Preparing your file…";
    try {
      $("#export-status").textContent = await fn();
    } catch (error) {
      $("#export-status").textContent = "Export failed: " + error.message;
    } finally {
      exporting = false;
    }
  }
  $("#save-image").onclick = () =>
    exportAction(async () => {
      const file = await imageFile(e, options());
      download(file, file.name);
      return "Saved " + file.name;
    });
  $("#share-image").onclick = () =>
    exportAction(async () => shareOrDownload(await imageFile(e, options())));
  $("#save-glb").onclick = () =>
    exportAction(async () => {
      const file = await meshFile(e);
      download(file, file.name);
      return "Saved current art mesh. Not print-validated.";
    });
  syncUI();
  setInterval(() => {
    $("#fps").textContent =
      Math.round(e.stats().fps) +
      " FPS · " +
      e.stats().particles +
      " particles";
  }, 1000);
  window.__squishy = {
    capture: () => e.capture(),
    stats: () => e.stats(),
    meshPositions: () => Array.from(e.mesh.geometry.attributes.position.array),
    project,
    history: () => history.length,
  };
  say("Your factory is ready. Grab the shape, or make it your own.");
} catch (error) {
  $("#loading").textContent =
    "This 3D studio could not start. " + error.message;
  const a = document.createElement("a");
  a.href = "../soft-matter/?mode=2d";
  a.textContent = "Open the lighter 2D material study";
  $("#loading").append(document.createElement("br"), a);
  say("WebGL2 and WebAssembly are needed for the 3D factory.");
}
