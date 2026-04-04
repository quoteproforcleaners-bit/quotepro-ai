const TOKEN_KEY = "employeeToken";
const EMPLOYEE_KEY = "employeeData";

export interface EmployeeUser {
  id: string;
  name: string;
  email: string;
  businessId: string;
  color: string;
  role: string;
}

export interface EmployeeJob {
  assignmentId: string;
  jobId: string;
  status: "assigned" | "en_route" | "checked_in" | "completed" | "no_show";
  assignedDate: string;
  checkinTime: string | null;
  checkoutTime: string | null;
  durationMinutes: number | null;
  employeeNotes: string | null;
  checkinPhotoUrl: string | null;
  checkoutPhotoUrl: string | null;
  scheduledTime: string;
  endDatetime: string | null;
  estimatedDurationMinutes: number | null;
  serviceType: string;
  address: string;
  customerName: string;
  customerPhone: string | null;
  specialRequests: string | null;
  accessCode: string | null;
  parkingNotes: string | null;
  keyLocation: string | null;
  roomCount: number | null;
  squareFootage: number | null;
  internalNotes: string;
}

export interface UpcomingGroup {
  date: string;
  jobs: EmployeeJob[];
}

// ─── Token management ─────────────────────────────────────────────────────────

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string, employee: EmployeeUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(EMPLOYEE_KEY, JSON.stringify(employee));
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EMPLOYEE_KEY);
}

export function getStoredEmployee(): EmployeeUser | null {
  try {
    const s = localStorage.getItem(EMPLOYEE_KEY);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

// ─── API helper ───────────────────────────────────────────────────────────────

async function empFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
  });

  let data: any;
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    throw new Error(data?.message || `Request failed (${res.status})`);
  }
  return data as T;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function loginEmployee(email: string, pin: string): Promise<{ token: string; employee: EmployeeUser }> {
  return empFetch("/api/employee/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, pin }),
  });
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export async function getTodayJobs(): Promise<EmployeeJob[]> {
  return empFetch("/api/employee/jobs/today");
}

export async function getUpcomingJobs(): Promise<UpcomingGroup[]> {
  return empFetch("/api/employee/jobs/upcoming");
}

export async function getJobDetail(assignmentId: string): Promise<EmployeeJob> {
  return empFetch(`/api/employee/jobs/${assignmentId}`);
}

export async function setEnRoute(assignmentId: string): Promise<void> {
  await empFetch(`/api/employee/jobs/${assignmentId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: "en_route" }),
  });
}

export async function checkIn(
  assignmentId: string,
  opts: { lat?: number; lng?: number; photoUrl?: string }
): Promise<void> {
  await empFetch(`/api/employee/jobs/${assignmentId}/checkin`, {
    method: "POST",
    body: JSON.stringify(opts),
  });
}

export async function checkOut(
  assignmentId: string,
  opts: { lat?: number; lng?: number; photoUrl?: string; employeeNotes?: string }
): Promise<void> {
  await empFetch(`/api/employee/jobs/${assignmentId}/checkout`, {
    method: "POST",
    body: JSON.stringify(opts),
  });
}
