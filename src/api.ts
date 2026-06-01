// All communication with the backend API.
// The session token is stored in localStorage (not the password).

const TOKEN_KEY = "hr_motivator_session_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function headers(): Record<string, string> {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { "x-session-token": token } : {}),
  };
}

async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: headers(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw Object.assign(new Error(err.error || res.statusText), { status: res.status });
  }
  return res.json();
}

// ── Admin auth ────────────────────────────────────────────────────────────────

export async function verifyAdminPassword(password: string): Promise<boolean> {
  try {
    const { token } = await api<{ token: string }>("POST", "/api/auth/admin", { password });
    setToken(token);
    return true;
  } catch {
    return false;
  }
}

export async function changeAdminPassword(currentPassword: string, newPassword: string): Promise<boolean> {
  try {
    await api("POST", "/api/auth/admin/password", { currentPassword, newPassword });
    clearToken();
    return true;
  } catch {
    return false;
  }
}

// ── Facilitator auth ──────────────────────────────────────────────────────────

export async function verifyFacilitatorPassword(
  companyCode: string,
  password: string
): Promise<{ companyId: string; companyName: string } | null> {
  try {
    const res = await api<{ token: string; companyId: string; companyName: string }>(
      "POST", "/api/auth/facilitator", { companyCode, password }
    );
    setToken(res.token);
    return { companyId: res.companyId, companyName: res.companyName };
  } catch {
    return null;
  }
}

export async function signOut(): Promise<void> {
  try { await api("POST", "/api/auth/signout"); } catch {}
  clearToken();
}

// ── Companies ─────────────────────────────────────────────────────────────────

export interface Department {
  name: string;
  limit?: number | null;
}

export interface Company {
  id: string;
  name: string;
  accessCode: string;
  createdAt: string;
  reportCount: number;
  departments: Department[];
  testLimit: number | null;
}

export async function resolveCompanyCode(code: string): Promise<{ id: string; name: string; code: string; departments: Department[] } | null> {
  try {
    return await api("GET", `/api/companies/resolve?code=${encodeURIComponent(code)}`);
  } catch {
    return null;
  }
}

export async function fetchCompanies(): Promise<Company[]> {
  return api("GET", "/api/admin/companies");
}

export async function createCompany(name: string, facilitatorPassword: string): Promise<Company> {
  return api("POST", "/api/admin/companies", { name, facilitatorPassword });
}

export async function updateCompanyFacilitatorPassword(id: string, newPassword: string): Promise<void> {
  await api("PATCH", `/api/admin/companies/${id}/password`, { newPassword });
}

export async function updateCompanySettings(
  id: string,
  departments: Department[],
  testLimit: number | null
): Promise<void> {
  await api("PATCH", `/api/admin/companies/${id}/settings`, { departments, testLimit });
}

export async function resetCompanyCode(id: string): Promise<string> {
  const res = await api<{ accessCode: string }>("POST", `/api/admin/companies/${id}/reset-code`);
  return res.accessCode;
}

export async function deleteCompany(id: string): Promise<void> {
  await api("DELETE", `/api/admin/companies/${id}`);
}

// ── Reports ───────────────────────────────────────────────────────────────────

export interface SavedReportDTO {
  id: string;
  createdAt: string;
  updatedAt: string;
  participantName: string;
  participantPosition: string;
  companyName: string;
  language: "en" | "fa";
  activeCards: unknown[];
  scores: Record<string, number>;
  companyId?: string | null;
  yearOfBirth?: number | null;
  sex?: string | null;
  seniority?: string | null;
  department?: string | null;
}

export async function fetchReports(): Promise<SavedReportDTO[]> {
  return api("GET", "/api/reports");
}

export async function upsertReport(report: SavedReportDTO): Promise<void> {
  await api("POST", "/api/reports", report);
}

export async function patchReport(id: string, fields: { participantName?: string; participantPosition?: string; companyName?: string; companyId?: string | null }): Promise<void> {
  await api("PATCH", `/api/reports/${id}`, fields);
}

export async function deleteReport(id: string): Promise<void> {
  await api("DELETE", `/api/reports/${id}`);
}
