import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { open } from "@tauri-apps/plugin-dialog";
import {
  DESTINATIONS,
  FORMATS,
  previewShortcutPath,
  type Destination,
  type Format,
} from "./lib/logic";

// ----- State -----
let targetPath: string | null = null;
let destination: Destination = "programs";
let format: Format = "lnk";

// ----- DOM refs -----
const dropZone = document.getElementById("drop-zone") as HTMLLabelElement;
const dzTitle = document.getElementById("dz-title") as HTMLSpanElement;
const dzSub = document.getElementById("dz-sub") as HTMLSpanElement;
const dzIcon = document.getElementById("dz-icon") as HTMLSpanElement;
const fileStatus = document.getElementById("file-status") as HTMLParagraphElement;
const destList = document.getElementById("dest-list") as HTMLDivElement;
const formatList = document.getElementById("format-list") as HTMLDivElement;
const formatHint = document.getElementById("format-hint") as HTMLDivElement;
const preview = document.getElementById("preview") as HTMLElement;
const previewPath = document.getElementById("preview-path") as HTMLElement;
const createBtn = document.getElementById("create-btn") as HTMLButtonElement;
const toastEl = document.getElementById("toast") as HTMLDivElement;

// ----- Helpers -----
let toastTimer: number | undefined;
function showToast(message: string, kind: "success" | "error") {
  toastEl.textContent = message;
  toastEl.className = `pointer-events-none fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-lg border px-4 py-2 text-sm shadow-lg ${
    kind === "success"
      ? "border-neon/40 bg-panel text-neon"
      : "border-red-500/40 bg-red-950/90 text-red-300"
  }`;
  toastEl.classList.remove("hidden");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.add("hidden"), 2600);
}

function updateButtonState() {
  createBtn.disabled = !targetPath;
}

function updatePreview() {
  if (!targetPath) {
    preview.classList.add("hidden");
    return;
  }
  const p = previewShortcutPath(targetPath, destination, format, "");
  previewPath.textContent = p ?? "";
  preview.classList.remove("hidden");
}

function updateFormatHint() {
  const f = FORMATS.find((x) => x.id === format);
  formatHint.textContent = f?.hint ?? "";
}

function setFile(path: string | null) {
  targetPath = path || null;
  if (targetPath) {
    dzTitle.textContent = "File selected";
    dzSub.textContent = targetPath.split(/[\\/]/).pop() ?? "";
    dzIcon.textContent = "✅";
    fileStatus.textContent = targetPath;
    fileStatus.classList.remove("hidden");
  } else {
    dzTitle.textContent = "Choose a file or drop it here";
    dzSub.textContent = "exe · script · shortcut target";
    dzIcon.textContent = "📁";
    fileStatus.classList.add("hidden");
  }
  updateButtonState();
  updatePreview();
}

async function pickFile() {
  const selected = await open({
    multiple: false,
    title: "Choose a file",
  });
  // `open` returns string | string[] | null; single-select yields a string.
  if (typeof selected === "string" && selected) {
    setFile(selected);
  }
}

// ----- Render options -----
function renderDestinations() {
  destList.innerHTML = "";
  for (const d of DESTINATIONS) {
    const active = d.id === destination;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "rounded-xl border px-3 py-3 text-left transition " +
      (active
        ? "border-neon bg-neon/10 shadow-[0_0_14px_-4px_rgba(34,211,238,0.5)]"
        : "border-edge bg-panel hover:border-white/20");
    btn.innerHTML = `<div class="text-sm font-medium ${active ? "text-neon" : ""}">${d.label}</div>
      <div class="mt-0.5 text-[11px] text-muted">${d.hint}</div>`;
    btn.addEventListener("click", () => {
      destination = d.id;
      renderDestinations();
      updatePreview();
    });
    destList.appendChild(btn);
  }
}

function renderFormats() {
  formatList.innerHTML = "";
  for (const f of FORMATS) {
    const active = f.id === format;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "rounded-xl border px-3 py-2.5 text-center text-sm font-semibold transition " +
      (active
        ? "border-violet-400/60 bg-violet-500/15 text-violet-300"
        : "border-edge bg-panel text-muted hover:border-white/20 hover:text-ink");
    btn.textContent = f.label;
    btn.addEventListener("click", () => {
      format = f.id;
      renderFormats();
      updateFormatHint();
      updatePreview();
    });
    formatList.appendChild(btn);
  }
}

// ----- Events -----
dropZone.addEventListener("click", pickFile);

// real drag & drop via Tauri (returns real filesystem paths)
getCurrentWebviewWindow().onDragDropEvent((event) => {
  if (event.payload.type === "over") {
    dropZone.classList.add("border-neon", "bg-neon/5");
  } else if (event.payload.type === "leave") {
    dropZone.classList.remove("border-neon", "bg-neon/5");
  } else if (event.payload.type === "drop") {
    dropZone.classList.remove("border-neon", "bg-neon/5");
    const first = event.payload.paths[0];
    if (first) setFile(first);
  }
});

createBtn.addEventListener("click", async () => {
  if (!targetPath) return;
  createBtn.disabled = true;
  createBtn.textContent = "Creating…";
  try {
    const res = await invoke<{ path: string; format: string }>("create", {
      filepath: targetPath,
      destination,
      format,
    });
    showToast(`Created ${res.format} at ${res.path}`, "success");
  } catch (err) {
    showToast(String(err), "error");
  } finally {
    createBtn.textContent = "Create Shortcut";
    updateButtonState();
  }
});

document.getElementById("close-btn")?.addEventListener("click", () => {
  getCurrentWindow().close();
});

// ----- Init -----
renderDestinations();
renderFormats();
updateFormatHint();
