---
name: run-motivator-game
description: Run, start, build, screenshot, or smoke-test the Motivator Game app. Use when asked to launch the app, verify a change works, take a screenshot, or test the UI.
---

# run-motivator-game

A bilingual React + Express + SQLite web app. Two drivers live in this skill directory:

- **`smoke.sh`** — starts servers, hits key API routes, takes headless Chrome screenshots
- **`participant-run.mjs`** — drives a full participant flow end-to-end with Puppeteer (login → form → play → score → results)

All paths are relative to the repo root.

---

## Prerequisites

- Node.js 22+ (required for `node:sqlite`)
- Google Chrome at `/Applications/Google Chrome.app/`
- `python3` in PATH
- `puppeteer-core` in `node_modules` (already installed — `npm install` if missing)

---

## Agent path 1 — smoke script (API + screenshots)

Starts both servers, checks all key API routes, takes two screenshots, stops servers:

```bash
bash .claude/skills/run-motivator-game/smoke.sh
```

Add `--keep` to leave servers running:

```bash
bash .claude/skills/run-motivator-game/smoke.sh --keep
```

Screenshots land in a temp dir printed by the script. Read them with the `Read` tool.

**Checks:** health, admin login, list companies, resolve company code (verifies departments array), list reports, screenshots of welcome and `?code=` pre-fill screens.

---

## Agent path 2 — full participant run (Puppeteer)

Drives a complete participant session: login → fill form → play all 52 motivators → level 2 scoring → results. Must be run from the repo root (so `node_modules` resolves). Servers must already be running (use `smoke.sh --keep` first).

```bash
bash .claude/skills/run-motivator-game/smoke.sh --keep 2>&1
node .claude/skills/run-motivator-game/participant-run.mjs 2>&1
```

Screenshots land in the job tmp dir (`/Users/taha/.claude/jobs/*/tmp/run-*.png`). Key screenshots:
- `run-05-playing.png` — Level 1 card selection screen
- `run-07-level2-intro.png` — Level 1 complete transition
- `run-09-scored.png` — Level 2 scoring with selected scores
- `run-10-results.png` — Final report with all fields

**State detection:** uses `localStorage.getItem('hr_motivator_game_simple')` to read the real game stage — more reliable than DOM text parsing.

---

## Human path

```bash
# Terminal 1
npm run dev:server   # API on :8080

# Terminal 2
npm run dev          # UI on :3000
```

Open http://localhost:3000. Admin password: `admin123`.

---

## Key URLs

| URL | What you see |
|---|---|
| `http://localhost:3000` | Role-select login screen |
| `http://localhost:3000/?code=XXXXXXXX` | Login with facilitator code pre-filled |
| `http://localhost:8080/api/health` | `{"ok":true}` |

---

## Production build

```bash
npm run build && npm run build:server
node --experimental-sqlite dist-server/index.js   # serves both on :8080
```

---

## Gotchas

- **`--experimental-sqlite` is required** — the server won't start without it. `npm run dev:server` already includes it.
- **Servers must both be running** — Vite proxies `/api` to `:8080`. Dead API = broken UI.
- **Sessions reset on server restart** — all admin/facilitator sessions are in-memory only.
- **`participant-run.mjs` must run from repo root** — `puppeteer-core` is in the project's `node_modules`.
- **Screenshot tmp path is hardcoded** to `/Users/taha/.claude/jobs/424df234/tmp/` — update if job ID changes.
- **Playing loop uses localStorage stage** not DOM text — DOM text parsing missed the `level2_intro` transition because it fires on a React state flush, not immediately.
