// Pure, dependency-free frontend helpers for PyShortcut.
// Kept separate from the DOM wiring so they can be unit-tested with vitest.

export type Destination = "sameDir" | "programs" | "startup";
export type Format = "lnk" | "vbs" | "bat";

export interface DestOption {
  id: Destination;
  label: string;
  hint: string;
}

export const DESTINATIONS: DestOption[] = [
  { id: "sameDir", label: "Same folder", hint: "Next to the file" },
  { id: "programs", label: "Start Menu", hint: "Programs folder" },
  { id: "startup", label: "Startup", hint: "Run on login" },
];

export const FORMATS: { id: Format; label: string; hint: string }[] = [
  { id: "lnk", label: ".lnk", hint: "Standard Windows shortcut" },
  { id: "vbs", label: ".vbs", hint: "VBScript launcher" },
  { id: "bat", label: ".bat", hint: "Batch launcher" },
];

/** Base name of a file path minus its extension. */
export function fileStem(path: string): string {
  const base = path.split(/[\\/]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(0, dot) : base;
}

/** Short, human-friendly display of a full path (used in the status line). */
export function shortPath(path: string, max = 46): string {
  if (path.length <= max) return path;
  const head = path.slice(0, Math.floor(max / 2) - 1);
  const tail = path.slice(-(Math.floor(max / 2) - 1));
  return `${head}…${tail}`;
}

/** Preview of the final shortcut file path. */
export function previewShortcutPath(
  target: string,
  destination: Destination,
  format: Format,
  homeDir: string,
): string | null {
  if (!target) return null;
  const dir =
    destination === "sameDir"
      ? target.split(/[\\/]/).slice(0, -1).join("\\") || "."
      : destination === "programs"
        ? `${homeDir}\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs`
        : `${homeDir}\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs\\Startup`;
  return `${dir}\\${fileStem(target)}.${format}`;
}
