<div id="top">

<!-- HEADER STYLE: MODERN -->
<div align="left" style="position: relative; width: 100%; height: 100%; ">

# <code>⚡ PyShortcut</code>

<em><em>A sleek, modern Windows shortcut creator — pick a file, choose a destination, and create a shortcut in one click.</em></em>

<!-- BADGES -->
![GitHub release](https://img.shields.io/github/v/release/AfroPK/pyshortcut?style=flat-square&color=22d3ee)
![Platform](https://img.shields.io/badge/Platform-Windows%2010%2F11-22d3ee?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-22d3ee?style=flat-square)

<em>Built with the tools and technologies:</em>

<img src="https://img.shields.io/badge/Rust-000000.svg?style=flat-square&logo=Rust&logoColor=white" alt="Rust">
<img src="https://img.shields.io/badge/TypeScript-3178C6.svg?style=flat-square&logo=TypeScript&logoColor=white" alt="TypeScript">
<img src="https://img.shields.io/badge/Tauri-24C8D8.svg?style=flat-square&logo=Tauri&logoColor=white" alt="Tauri">
<img src="https://img.shields.io/badge/Tailwind%20CSS-06B6D4.svg?style=flat-square&logo=TailwindCSS&logoColor=white" alt="Tailwind%20CSS">
<img src="https://img.shields.io/badge/Vite-646CFF.svg?style=flat-square&logo=Vite&logoColor=white" alt="Vite">
<img src="https://img.shields.io/badge/Vitest-6E9F18.svg?style=flat-square&logo=Vitest&logoColor=white" alt="Vitest">

</div>
</div>
<br clear="right">

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
    - [Usage](#usage)
    - [Testing](#testing)
- [License](#license)

---

## Overview

**PyShortcut** is a compact Windows utility that creates `.lnk`, `.vbs`, or `.bat`
shortcuts for any executable or script, placing them in:
- the **same folder** as the file,
- the Start Menu **Programs** folder, or
- the Start Menu **Startup** folder (run on login).

Built as a **Tauri 2** desktop app with a **vanilla TypeScript + Tailwind CSS v4 +
Preline** frontend, it ships as a single lightweight, non-resizable frameless window
with a dark-glass, neon-cyan aesthetic. A real `.lnk` is written through the native
Windows `IShellLink` COM interface.

**Why PyShortcut?**
- 🟦 **Sleek & minimal** — one screen, no clutter.
- 🟪 **Native** — genuine Windows shortcuts, not hacks.
- 🟧 **Snappy** — ~2 MB installer, no runtime dependencies beyond WebView2.
- 🟩 **Safe** — validates shortcut names and paths against Windows limits.

---

## Features

| Feature | Details |
|---------|---------|
| **Shortcut formats** | `.lnk` (native Shell COM), `.vbs`, `.bat` launchers |
| **Destinations** | Same folder · Start Menu Programs · Startup |
| **File picker** | Native dialog **and** drag-and-drop |
| **Live preview** | Shows the exact output path before you create |
| **Dark-glass UI** | Neon-cyan aesthetic, themed scrollbars |
| **Fixed window** | 460×620 frameless, non-resizable |
| **Hardened input** | Rejects invalid/reserved shortcut names & over-long paths |

---

## Project Structure

```sh
└── /
    ├── .github/
    │   ├── dependabot.yml
    │   └── workflows/            # ci.yml + codeql.yml (Windows runner)
    ├── index.html                 # UI shell
    ├── package.json               # frontend deps & scripts
    ├── src/
    │   ├── lib/logic.ts           # pure, testable path/name helpers
    │   ├── main.ts                # UI wiring (<-> Tauri invoke)
    │   └── styles.css             # Tailwind v4 theme + scrollbars
    ├── src-tauri/
    │   ├── capabilities/          # window/path/dialog permissions
    │   ├── icons/                 # app icon set
    │   ├── src/
    │   │   ├── lib.rs             # Tauri `create` command
    │   │   ├── main.rs
    │   │   └── shortcut.rs        # pure logic + IShellLink COM .lnk writer
    │   └── tauri.conf.json        # window + NSIS installer config
    ├── tests/
    │   └── logic.test.ts          # vitest unit tests
    ├── tsconfig.json
    └── vite.config.ts
```

---

## Getting Started

### Prerequisites

- **Rust** (MSVC toolchain) — backend
- **Node.js** ≥ 20 — frontend tooling
- **Windows 10 / 11** (x64) with **WebView2** (preinstalled on Win 11)

### Installation

Build the installer (produces a branded NSIS `.exe` + `.msi`):

```sh
# install frontend deps
npm install

# build + bundle (Tauri release)
npm run tauri build
```

The installer lands in `src-tauri/target/release/bundle/nsis/`.

### Usage

Run in development (hot-reload):

```sh
npm run tauri dev
```

Or grab the latest installer from the
[Releases](https://github.com/AfroPK/pyshortcut/releases) page. Then:

1. Click the target area (or drag a file onto it) to choose an exe/script.
2. Pick a **destination** (Same folder / Programs / Startup).
3. Choose a **format** (`.lnk` / `.vbs` / `.bat`).
4. Click **Create Shortcut**.

### Testing

```sh
# frontend unit tests (vitest)
npm test

# backend tests (shortcut.rs) + lint
cargo test --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets
```

---

## License

Released under the [MIT](LICENSE) license.

---

*README structure generated with [readme-ai](https://github.com/eli64s/readme-ai); prose authored for this project.*
