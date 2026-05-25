# Motivator Game

A React/Vite web app for running an HR motivator selection game, scoring job alignment, and exporting participant reports.

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To stop the local dev server, press `Ctrl+C` in the terminal running `npm run dev`.

## Production Build

```bash
npm run build
```

The static production files are written to `dist/`.

## Docker

Build the production image:

```bash
docker build -t motivator-game .
```

Run it locally:

```bash
docker run --rm -p 8080:8080 --name motivator-game motivator-game
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

The Docker image serves the built app with nginx on port `8080`, which works well for platforms such as Cloud Run, Render, Fly.io, Railway, and most container hosts.

Reports saved inside the app are stored in the user's browser `localStorage`. Exported PDFs are created through the browser print/save-as-PDF flow and are saved wherever the user's browser saves downloads or printed PDFs.
