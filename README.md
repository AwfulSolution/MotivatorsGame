# Motivator Game

A React/Vite web app for running an HR motivator selection game, scoring job alignment, and exporting participant reports.

## Local Development

Run the API server and the Vite dev server in two separate terminals.

**Terminal 1 — API server:**
```bash
npm install
npm run build:server
node --experimental-sqlite dist-server/index.js
```

**Terminal 2 — Vite dev server:**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The SQLite database is created at `data/app.db` in the project folder.

To stop, press `Ctrl+C` in each terminal.

## Production Build

```bash
npm run build
npm run build:server
```

The static frontend files are written to `dist/` and the compiled server to `dist-server/`.

To run the production build locally:
```bash
node --experimental-sqlite dist-server/index.js
```

Open [http://localhost:8080](http://localhost:8080).

## Docker

Build the production image:

```bash
docker build -t motivator-game .
```

Run it locally:

```bash
docker run --rm -p 8080:8080 -v motivator-data:/data --name motivator-game motivator-game
```

Open [http://localhost:8080](http://localhost:8080).

Stop the container:

```bash
docker stop motivator-game
```

Or run with Docker Compose:

```bash
docker compose up --build
```

Stop the Compose stack:

```bash
docker compose down
```

## Deployment Notes

The Docker image serves the built app with an Express/Node server on port `8080`, which works well for platforms such as Cloud Run, Render, Fly.io, Railway, and most container hosts.

Mount a persistent volume at `/data` to preserve the SQLite database across deployments.

## Data & Auth

- All reports are stored server-side in a SQLite database (`data/app.db`).
- The facilitator password is stored as a SHA-256 hash in the database, never in the browser.
- The default facilitator password is `facilitator123`. Change it from the Settings screen after first login.

**To reset a forgotten facilitator password**, run this against the database:
```bash
node --experimental-sqlite -e "
const {DatabaseSync} = require('node:sqlite');
const crypto = require('node:crypto');
const db = new DatabaseSync('data/app.db');
const hash = crypto.createHash('sha256').update('facilitator123').digest('hex');
db.prepare(\"UPDATE settings SET value = ? WHERE key = 'facilitator_password_hash'\").run(hash);
console.log('Password reset to: facilitator123');
"
```
