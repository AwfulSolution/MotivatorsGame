# Motivator Game

A bilingual (English/Persian) web app for HR facilitators to run motivator discovery sessions. Participants rank 52 workplace motivators down to their top 6, then score how well their current role supports each one. Reports are saved server-side and aggregated into team analytics.

## Local Development

Run the API server and the Vite dev server in two separate terminals.

**Terminal 1 — API server:**
```bash
npm install
npm run dev:server
```

**Terminal 2 — Vite dev server:**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Vite proxies all `/api` requests to the Express server on `:8080`.

The SQLite database is created automatically at `data/app.db`.

## Production Build

```bash
npm run build
npm run build:server
node --experimental-sqlite dist-server/index.js
```

Open [http://localhost:8080](http://localhost:8080). The Express server serves the built frontend as static files.

## Docker

```bash
docker compose up --build
```

Or manually:

```bash
docker build -t motivator-game .
docker run --rm -p 8080:8080 -v motivator-data:/data motivator-game
```

Mount a persistent volume at `/data` to preserve the SQLite database across restarts and deployments. The image works on Cloud Run, Render, Fly.io, Railway, and most container hosts.

## Roles & Auth

There are three roles:

| Role | Access | How to log in |
|---|---|---|
| **Participant** | Play the game, see own report | One click — no password |
| **Facilitator** | View & export reports for their company | Company access code + facilitator password |
| **Admin** | Manage companies, view all reports | Admin password |

Default admin password: **`admin123`** — change it from Settings after first login.

### Companies & Access Codes

The admin creates companies from the Admin Panel. Each company gets an 8-character access code (e.g. `ACMEX7K2`). Share it with participants as a URL:

```
https://your-domain.com/?code=ACMEX7K2
```

Participants who open this link have their session automatically linked to the company. They can also enter the code manually on the welcome screen. The code is optional — participants without one can still play and their report is saved without a company association.

### Resetting the admin password

```bash
node --experimental-sqlite -e "
const {DatabaseSync} = require('node:sqlite');
const crypto = require('node:crypto');
const db = new DatabaseSync('data/app.db');
const hash = crypto.createHash('sha256').update('admin123').digest('hex');
db.prepare(\"UPDATE settings SET value = ? WHERE key = 'admin_password_hash'\").run(hash);
console.log('Admin password reset to: admin123');
"
```
