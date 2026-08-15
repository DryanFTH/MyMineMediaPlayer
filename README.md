# My Mine Media Player

A **desktop anime library manager and media player**, built with **Tauri v2 (Rust)** on the backend and **React + TypeScript** on the frontend.

![Status](https://img.shields.io/badge/status-learning%20project-orange)
![License](https://img.shields.io/badge/license-MIT-blue)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux-lightgrey)
![Tauri](https://img.shields.io/badge/Tauri-v2-24C8DB)
![Rust](https://img.shields.io/badge/Rust-backend-000000)
![Typescript](https://img.shields.io/badge/Typescript-frontend-000000)
![Version](https://img.shields.io/github/release/DryanFTH/MyMineMediaPlayer/all.svg?colorB=97CA00&label=latest%20version)

---

## ⚠️ Project Status

This project exists **purely as a learning exercise** for Rust and Tauri — covering command/event architecture, state management, SQLite databases, and integrating with the filesystem and external processes (sidecar binaries).

It is **not** intended for public distribution or production use. There's no guarantee of stability, security, or long-term support, so keep that in mind if you're poking around the code.

Development has spanned a long stretch of time rather than a single push, so this repo also doubles as a bit of a personal learning log — some parts reflect earlier stages of figuring things out, others are more recent iterations.

This project is **not officially affiliated** with Otakudesu, RARLAB (WinRAR/UnRAR), MEGA, or PixelDrain. All integrations with these services exist purely for technical exploration — web scraping, HTTP clients, download management, and so on.

---

## ✨ Features

- **Dashboard** — collection stats, recently updated anime, genre distribution chart, and random picks.
- **Otakudesu Browser** — search, browse ongoing anime, seasonal anime, and genre listings straight from the source.
- **Library Management** — local anime collection with pagination, genre filtering, and per-episode details.
- **Add from Archive (Batch Import)** — extract videos from `.zip`/`.rar` files, with metadata auto-filled from Otakudesu.
- **Download Manager** — download episodes per resolution (360p/480p/720p) from multiple providers (PixelDrain, Mega, DesuDrive), with real-time progress and cancellation support.
- **Custom Video Player** — a native `<video>`-based player with custom controls: playback speed, volume, fullscreen, keyboard seeking, and persisted user preferences.
- **Local Streaming Server** — a local HTTP server (Axum) that streams video files straight from disk, with `Range` request support (seeking/scrubbing) and directory access restrictions.
- **Watch Progress Tracking** — tracks watch status per episode and per resolution.
- **Onboarding & Settings** — configure download folders, Otakudesu source URL, and other preferences.

---

## 🛠️ Tech Stack

### Frontend

| Category | Technology |
| --- | --- |
| Framework | React 19 + TypeScript, Vite |
| Routing | React Router (`HashRouter`) |
| State & Data Fetching | TanStack Query |
| Forms & Validation | React Hook Form + Zod |
| UI Components | shadcn/ui, Radix UI (`radix-ui`) |
| Styling | Tailwind CSS v4 |
| Data Visualization | Recharts |
| Icons | Lucide React |

### Backend (Rust)

| Category | Technology |
| --- | --- |
| Desktop Framework | Tauri v2 |
| Type-safe Bindings | `tauri-specta` (auto-generates TypeScript types from Rust commands) |
| Database | SQLite via `sqlx`, with migrations |
| Local Streaming Server | Axum (with HTTP Range request support) |
| Web Scraping | `scraper` + `reqwest` (Otakudesu integration) |
| Archive Extraction | `zip` crate for ZIP, `unrar` sidecar binary for RAR (via `tauri-plugin-shell`) |
| Download Providers | `mega` crate (Mega.nz), custom HTTP client (PixelDrain, DesuDrive) |
| Async Runtime | Tokio |
| Others | `chrono`, `regex`, `strum`, `mime_guess`, `percent-encoding` |

### Build & Tooling

- **Package Manager**: pnpm
- **CI/CD**: GitHub Actions — matrix build for Windows (NSIS) and Linux (deb, AppImage), automatically prepares the `unrar` sidecar per platform and creates a draft release.

---

## 📁 Project Structure

```text
my-mine-media-player/
├── src/                        # Frontend (React + TypeScript)
│   ├── components/             # UI components (MediaPlayer, layout, library, settings, ui)
│   ├── pages/                  # Pages: Dashboard, Library, Otakudesu, Settings, Onboarding
│   ├── hooks/                  # Custom hooks
│   ├── lib/                    # Query client, validation, utilities
│   └── types/                  # TypeScript bindings generated from Rust (tauri-specta)
│
├── src-tauri/                  # Backend (Rust)
│   ├── src/
│   │   ├── commands/           # Tauri commands (frontend ↔ backend bridge)
│   │   ├── services/           # Business logic (anime services, HTTP client)
│   │   ├── model/               # Data models & database queries
│   │   ├── database/           # Migrations & SQLite initialization
│   │   ├── providers/          # Download provider integrations (Mega, PixelDrain, DesuDrive)
│   │   ├── extractor/          # ZIP/RAR archive extraction
│   │   ├── protocols/          # Local streaming server (Axum)
│   │   ├── internal_scraper/   # Otakudesu scraper
│   │   ├── download/           # Download state, progress tracking, events
│   │   └── store/              # Persistent settings (tauri-plugin-store)
│   └── capabilities/           # Tauri permission configuration
│
├── scripts/                    # unrar sidecar setup scripts (Windows/Linux)
└── .github/workflows/          # CI/CD (automated build & release)
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS) & [pnpm](https://pnpm.io/)
- [Rust](https://www.rust-lang.org/tools/install) (stable toolchain)
- System dependencies for Tauri v2 depending on your OS — follow the [official Tauri guide](https://v2.tauri.app/start/prerequisites/)
- **For RAR extraction**: the `unrar`/`UnRAR.exe` binary needs to be set up as a sidecar (see below). On Windows, the setup script requires [7-Zip](https://www.7-zip.org/) to be available on `PATH`.

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/DryanFTH/MyMineMediaPlayer.git
cd MyMineMediaPlayer
pnpm install
```

### 2. Set Up the `unrar` Sidecar

RAR archive extraction relies on the `unrar` binary, which is **not bundled in this repository** and gets downloaded directly from RARLAB's official site the first time you run this:

```bash
node scripts/prepare-sidecar.mjs
```

### 3. Run in Development Mode

```bash
pnpm tauri dev
```

### 4. Build for Production

```bash
pnpm tauri build
```

Configured build targets: `deb` & `appimage` (Linux), `nsis` (Windows).

---

## 🤝 Contributing

Since this is a learning project, contributions of any kind — bug fixes, architectural suggestions, refactors, or just a better way of doing something — are **very welcome**, whether they help me learn or benefit anyone else who stumbles across this repo.

Feel free to open an issue to discuss something, or just go ahead and send a pull request.

---

## 📄 License

The source code in this repository is licensed under the **[MIT License](./LICENSE)** — free to use, modify, and reuse (including in other projects), as long as attribution is kept intact.

**Important note:** this MIT license **only covers the code in this repository**. The project uses/integrates third-party components that remain subject to their own respective licenses, including but not limited to:

- **`unrar`** — a binary downloaded directly from [RARLAB](https://www.rarlab.com/) as a sidecar (it is not distributed as part of this repo's source code). Its use is governed by RARLAB's own license/EULA, not this project's MIT license.
- All Rust (`crates.io`) and Node.js (`npm`) dependencies follow their respective licenses as listed in `Cargo.toml` and `package.json`.
- Anime data is sourced from **Otakudesu**; rights to the displayed content remain with their respective copyright holders.

---

## 🙏 Acknowledgments

- [Tauri](https://tauri.app/) — the desktop app framework powering this
- [shadcn/ui](https://ui.shadcn.com/) — UI components
- [RARLAB](https://www.rarlab.com/) — the `unrar` utility
- Otakudesu — the anime data source used for web scraping exploration

---

Built as part of learning Rust & Tauri 🦀
