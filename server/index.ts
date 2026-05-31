import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import express from "express";

const PORT = process.env.PORT || 8080;
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "app.db");
const DIST_DIR = path.join(process.cwd(), "dist");
const DEFAULT_ADMIN_PASSWORD = "admin123";

fs.mkdirSync(DATA_DIR, { recursive: true });

function hashPassword(pw: string): string {
  return crypto.createHash("sha256").update(pw).digest("hex");
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function generateAccessCode(): string {
  // Avoids visually ambiguous chars (0/O, 1/I/L)
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(8);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    access_code TEXT UNIQUE NOT NULL,
    facilitator_password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    participant_name TEXT NOT NULL,
    participant_position TEXT NOT NULL,
    company_name TEXT NOT NULL,
    language TEXT NOT NULL,
    active_cards TEXT NOT NULL,
    scores TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  INSERT OR IGNORE INTO settings (key, value) VALUES ('admin_password_hash', '${hashPassword(DEFAULT_ADMIN_PASSWORD)}');
`);

// Schema migrations — safe to re-run
try { db.exec("ALTER TABLE reports ADD COLUMN company_id TEXT"); } catch { /* column already exists */ }

// ── Session store ─────────────────────────────────────────────────────────────

type Session = { role: "admin" | "facilitator"; companyId?: string };
const sessions = new Map<string, Session>();

function getSession(req: express.Request): Session | undefined {
  const token = req.headers["x-session-token"] as string;
  return token ? sessions.get(token) : undefined;
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const session = getSession(req);
  if (!session || session.role !== "admin") { res.status(401).json({ error: "Unauthorized" }); return; }
  next();
}

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const session = getSession(req);
  if (!session) { res.status(401).json({ error: "Unauthorized" }); return; }
  (req as any).session = session;
  next();
}

const app = express();
app.use(express.json());

// ── Admin auth ────────────────────────────────────────────────────────────────

app.post("/api/auth/admin", (req, res) => {
  const { password } = req.body as { password: string };
  const row = db.prepare("SELECT value FROM settings WHERE key = 'admin_password_hash'").get() as { value: string } | undefined;
  if (!row || hashPassword(password) !== row.value) { res.status(401).json({ error: "Wrong password" }); return; }
  const token = generateToken();
  sessions.set(token, { role: "admin" });
  res.json({ token });
});

app.post("/api/auth/admin/password", requireAdmin, (req, res) => {
  const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };
  const row = db.prepare("SELECT value FROM settings WHERE key = 'admin_password_hash'").get() as { value: string } | undefined;
  if (!row || hashPassword(currentPassword) !== row.value) { res.status(401).json({ error: "Wrong current password" }); return; }
  db.prepare("UPDATE settings SET value = ? WHERE key = 'admin_password_hash'").run(hashPassword(newPassword));
  for (const [token, s] of sessions) if (s.role === "admin") sessions.delete(token);
  res.json({ ok: true });
});

// ── Facilitator auth ──────────────────────────────────────────────────────────

app.post("/api/auth/facilitator", (req, res) => {
  const { companyCode, password } = req.body as { companyCode: string; password: string };
  const company = db.prepare("SELECT * FROM companies WHERE access_code = ?").get(
    companyCode.toUpperCase().trim()
  ) as any;
  if (!company || hashPassword(password) !== company.facilitator_password_hash) {
    res.status(401).json({ error: "Wrong company code or password" });
    return;
  }
  const token = generateToken();
  sessions.set(token, { role: "facilitator", companyId: company.id });
  res.json({ token, companyId: company.id, companyName: company.name });
});

app.post("/api/auth/signout", (req, res) => {
  const token = req.headers["x-session-token"] as string;
  if (token) sessions.delete(token);
  res.json({ ok: true });
});

// ── Companies — public code resolution ───────────────────────────────────────

app.get("/api/companies/resolve", (req, res) => {
  const code = ((req.query.code as string) || "").toUpperCase().trim();
  if (!code) { res.status(400).json({ error: "code required" }); return; }
  const company = db.prepare("SELECT id, name, access_code FROM companies WHERE access_code = ?").get(code) as any;
  if (!company) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ id: company.id, name: company.name, code: company.access_code });
});

// ── Companies — admin CRUD ────────────────────────────────────────────────────

app.get("/api/admin/companies", requireAdmin, (_req, res) => {
  const rows = db.prepare(`
    SELECT c.id, c.name, c.access_code, c.created_at, COUNT(r.id) AS report_count
    FROM companies c
    LEFT JOIN reports r ON r.company_id = c.id
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `).all() as any[];
  res.json(rows.map((c) => ({
    id: c.id,
    name: c.name,
    accessCode: c.access_code,
    createdAt: c.created_at,
    reportCount: c.report_count,
  })));
});

app.post("/api/admin/companies", requireAdmin, (req, res) => {
  const { name, facilitatorPassword } = req.body as { name: string; facilitatorPassword: string };
  if (!name?.trim() || !facilitatorPassword) {
    res.status(400).json({ error: "name and facilitatorPassword required" });
    return;
  }
  const id = crypto.randomUUID();
  const code = generateAccessCode();
  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO companies (id, name, access_code, facilitator_password_hash, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(id, name.trim(), code, hashPassword(facilitatorPassword), now);
  res.json({ id, name: name.trim(), accessCode: code, createdAt: now, reportCount: 0 });
});

app.patch("/api/admin/companies/:id/password", requireAdmin, (req, res) => {
  const { newPassword } = req.body as { newPassword: string };
  if (!newPassword) { res.status(400).json({ error: "newPassword required" }); return; }
  db.prepare("UPDATE companies SET facilitator_password_hash = ? WHERE id = ?").run(hashPassword(newPassword), req.params.id);
  for (const [token, s] of sessions) if (s.role === "facilitator" && s.companyId === req.params.id) sessions.delete(token);
  res.json({ ok: true });
});

app.post("/api/admin/companies/:id/reset-code", requireAdmin, (req, res) => {
  const newCode = generateAccessCode();
  db.prepare("UPDATE companies SET access_code = ? WHERE id = ?").run(newCode, req.params.id);
  res.json({ accessCode: newCode });
});

app.delete("/api/admin/companies/:id", requireAdmin, (req, res) => {
  db.prepare("DELETE FROM companies WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ── Reports ───────────────────────────────────────────────────────────────────

app.get("/api/reports", requireAuth, (req, res) => {
  const session = (req as any).session as Session;
  const rows: any[] = session.role === "admin"
    ? (db.prepare("SELECT * FROM reports ORDER BY updated_at DESC").all() as any[])
    : (db.prepare("SELECT * FROM reports WHERE company_id = ? ORDER BY updated_at DESC").all(session.companyId!) as any[]);
  res.json(rows.map(dbToReport));
});

app.post("/api/reports", (req, res) => {
  const r = req.body;
  db.prepare(`
    INSERT INTO reports (id, created_at, updated_at, participant_name, participant_position, company_name, language, active_cards, scores, company_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      updated_at = excluded.updated_at,
      participant_name = excluded.participant_name,
      participant_position = excluded.participant_position,
      company_name = excluded.company_name,
      language = excluded.language,
      active_cards = excluded.active_cards,
      scores = excluded.scores,
      company_id = excluded.company_id
  `).run(
    r.id, r.createdAt, r.updatedAt, r.participantName, r.participantPosition,
    r.companyName, r.language, JSON.stringify(r.activeCards), JSON.stringify(r.scores),
    r.companyId ?? null
  );
  res.json({ ok: true });
});

app.delete("/api/reports/:id", requireAuth, (req, res) => {
  const session = (req as any).session as Session;
  if (session.role === "facilitator") {
    db.prepare("DELETE FROM reports WHERE id = ? AND company_id = ?").run(req.params.id, session.companyId!);
  } else {
    db.prepare("DELETE FROM reports WHERE id = ?").run(req.params.id);
  }
  res.json({ ok: true });
});

// ── Static ────────────────────────────────────────────────────────────────────

app.get("/api/health", (_req, res) => res.json({ ok: true }));

if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get("*", (_req, res) => res.sendFile(path.join(DIST_DIR, "index.html")));
}

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

function dbToReport(row: any) {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    participantName: row.participant_name,
    participantPosition: row.participant_position,
    companyName: row.company_name,
    language: row.language,
    activeCards: JSON.parse(row.active_cards),
    scores: JSON.parse(row.scores),
    companyId: row.company_id ?? null,
  };
}
