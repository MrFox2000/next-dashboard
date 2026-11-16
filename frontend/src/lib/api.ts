import type {
  AuthResponse,
  CurrentOrg,
  Member,
  Plan,
  ReportResult,
  Subscription,
  Quota,
} from "./types";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8002";
const ACCESS_KEY = "saas.access";
const REFRESH_KEY = "saas.refresh";

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(status: number, message: string, payload: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_KEY);
}

export function saveTokens(access: string, refresh?: string): void {
  window.localStorage.setItem(ACCESS_KEY, access);
  if (refresh) window.localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens(): void {
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
}

async function parseError(response: Response): Promise<ApiError> {
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  let message = response.statusText || `Request failed with ${response.status}`;
  if (typeof payload === "string") message = payload;
  else if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (typeof record.detail === "string") message = record.detail;
    else {
      const first = Object.values(record)[0];
      if (Array.isArray(first) && typeof first[0] === "string") message = first[0];
      else if (typeof first === "string") message = first;
    }
  }
  return new ApiError(response.status, message, payload);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const data = await request<AuthResponse>("/api/auth/token/", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    headers: { Authorization: "" },
  });
  if (data.access) saveTokens(data.access, data.refresh);
  return data;
}

export async function register(
  email: string,
  password: string,
  fullName: string,
  organizationName: string,
): Promise<AuthResponse> {
  const data = await request<AuthResponse>("/api/auth/register/", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      full_name: fullName,
      organization_name: organizationName,
    }),
    headers: { Authorization: "" },
  });
  if (data.access) saveTokens(data.access, data.refresh);
  return data;
}

export const fetchCurrentOrg = () => request<CurrentOrg>("/api/orgs/current/");
export const fetchPlans = () => request<Plan[]>("/api/billing/plans/");
export const fetchMembers = () => request<Member[]>("/api/orgs/members/");
export const fetchSubscription = () =>
  request<{ subscription: Subscription | null; quota: Quota; provider: string }>(
    "/api/billing/subscription/",
  );

export const inviteMember = (email: string, role: string) =>
  request<Member>("/api/orgs/members/", {
    method: "POST",
    body: JSON.stringify({ email, role }),
  });

export const removeMember = (id: number) =>
  request<void>(`/api/orgs/members/${id}/`, { method: "DELETE" });

export const generateReport = () =>
  request<ReportResult>("/api/orgs/report/", { method: "POST" });

export const startCheckout = (planCode: string) =>
  request<{ checkout_url: string; provider: string }>("/api/billing/checkout/", {
    method: "POST",
    body: JSON.stringify({ plan_code: planCode }),
  });

export const cancelSubscription = () =>
  request<Subscription>("/api/billing/cancel/", { method: "POST" });
