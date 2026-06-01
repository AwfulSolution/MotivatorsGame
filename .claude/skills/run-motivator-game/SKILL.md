---
name: run-motivator-game
description: Run, start, build, screenshot, or smoke-test the Motivator Game app. Use when asked to launch the app, verify a change works, take a screenshot, or test the UI.
---

# run-motivator-game

A bilingual React + Express + SQLite web app. The **agent path** is a shell smoke script that starts both servers, runs curl API checks, and takes headless Chrome screenshots. The human path is two terminals.

All paths below are relative to the repo root (`/Users/taha/Code/hr-motivator-game`).

---

## Prerequisites

- Node.js 22+ (required for `node:sqlite`)
- Google Chrome at `/Applications/Google Chrome.app/` (used for headless screenshots)
- `python3` (used in smoke script to parse JSON)

No extra `npm install` needed — deps are already installed.

---

## Agent path — smoke script

Starts servers, hits all key API routes, takes screenshots, stops servers:

```bash
bash .claude/skills/run-motivator-game/smoke.sh
```

Add `--keep` to leave the servers running after the script exits (useful when you need to keep driving the UI):

```bash
bash .claude/skills/run-motivator-game/smoke.sh --keep
```

Screenshots land in a temp dir printed by the script (e.g. `/tmp/motivator-smoke-<pid>/`). Read them with the `Read` tool to visually inspect the UI.

**What the script checks:**
- `GET /api/health` → `{"ok":true}`
- `POST /api/auth/admin` with `admin123` → token
- `GET /api/admin/companies` → list (requires token)
- `GET /api/companies/resolve?code=` → resolves first company, checks `departments` array
- `GET /api/reports` → list
- Screenshots: welcome screen, welcome screen with company code pre-filled via `?code=`

---

## Human path

Two terminals:

```bash
# Terminal 1 — API (port 8080)
npm run dev:server

# Terminal 2 — UI (port 3000, proxies /api → 8080)
npm run dev
```

Open http://localhost:3000. Default admin password: `admin123`.

---

## Key URLs

| URL | What you see |
|---|---|
| `http://localhost:3000` | Welcome screen (role select) |
| `http://localhost:3000/?code=XXXXXXXX` | Welcome with company code pre-filled in Facilitator and participant form |
| `http://localhost:8080/api/health` | `{"ok":true}` |

---

## Production build

```bash
npm run build        # Vite → dist/
npm run build:server # esbuild → dist-server/
node --experimental-sqlite dist-server/index.js  # serves both on :8080
```

---

## Gotchas

- **`--experimental-sqlite` is required.** The server won't start without it. `npm run dev:server` adds it via the tsx loader config; for manual runs always include it.
- **Servers must both be running for the UI to work.** Vite proxies `/api` to `:8080`. A running Vite with a dead API server shows a blank or broken app.
- **Sessions are in-memory and reset on server restart.** After restarting `dev:server`, all logged-in sessions (admin/facilitator) are invalidated. Re-login is required.
- **The SQLite DB file is at `data/app.db`.** It persists across restarts. Schema migrations run safely on every startup (try/catch ALTER TABLE).
- **Chrome headless screenshots need `--no-sandbox` on some systems.** Already included in the smoke script flags.
- **`?code=` pre-fills the Facilitator code field** (not the participant form directly). The participant form appears after clicking "Participant" on the welcome screen.
