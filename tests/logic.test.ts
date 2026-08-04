import { describe, expect, it } from "vitest";
import {
  fileStem,
  previewShortcutPath,
  shortPath,
  DESTINATIONS,
  FORMATS,
} from "../src/lib/logic";

describe("fileStem", () => {
  it("strips the last extension", () => {
    expect(fileStem("C:\\Tools\\MyApp.exe")).toBe("MyApp");
  });

  it("handles multiple dots, keeps all but last", () => {
    expect(fileStem("C:\\a\\file.name.v1.py")).toBe("file.name.v1");
  });

  it("returns basename when there is no extension", () => {
    expect(fileStem("C:\\a\\README")).toBe("README");
  });

  it("handles forward-slash paths", () => {
    expect(fileStem("/home/user/app.sh")).toBe("app");
  });
});

describe("shortPath", () => {
  it("leaves short paths unchanged", () => {
    expect(shortPath("C:\\x\\y.exe")).toBe("C:\\x\\y.exe");
  });

  it("truncates long paths with an ellipsis", () => {
    const long = "C:\\".padEnd(60, "a") + ".exe";
    const out = shortPath(long);
    expect(out.length).toBeLessThan(long.length);
    expect(out).toContain("…");
  });
});

describe("previewShortcutPath", () => {
  const home = "C:\\Users\\Freddy";

  it("builds sameDir path", () => {
    expect(previewShortcutPath("C:\\Data\\apps\\Tool.exe", "sameDir", "lnk", home)).toBe(
      "C:\\Data\\apps\\Tool.lnk",
    );
  });

  it("builds Programs path", () => {
    expect(previewShortcutPath("C:\\apps\\MyApp.exe", "programs", "vbs", home)).toBe(
      "C:\\Users\\Freddy\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs\\MyApp.vbs",
    );
  });

  it("builds Startup path", () => {
    expect(previewShortcutPath("C:\\apps\\MyApp.exe", "startup", "bat", home)).toBe(
      "C:\\Users\\Freddy\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\MyApp.bat",
    );
  });

  it("returns null when target is empty", () => {
    expect(previewShortcutPath("", "programs", "lnk", home)).toBeNull();
  });
});

describe("option lists", () => {
  it("has the three destinations", () => {
    expect(DESTINATIONS.map((d) => d.id)).toEqual(["sameDir", "programs", "startup"]);
  });

  it("has the three formats", () => {
    expect(FORMATS.map((f) => f.id)).toEqual(["lnk", "vbs", "bat"]);
  });
});
