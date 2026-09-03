import type { EventFilters, PaceBand, RegistrationInput, SocialOption, TransportMode } from "./types";

export interface RunnerProfile {
  displayName: string;
  email: string;
  homeCity: string | null;
  preferredPace: PaceBand | null;
  weeklyGoalKm: number;
  updatedAt: string;
}

export interface PassportUser {
  displayName: string;
  email: string;
}

export interface SavedRunPlan {
  id: string;
  filters: EventFilters;
  eventIds: string[];
  totalDistanceKm: number;
  createdAt: string;
}

export interface PassportRunPass {
  id: string;
  eventId: string;
  runnerName: string;
  email: string;
  pace: PaceBand;
  socialPreference: SocialOption;
  age20Plus: boolean;
  transportMode: TransportMode;
  status: "confirmed" | "cancelled";
  createdAt: string;
}

export interface SessionData {
  authenticated: boolean;
  user: PassportUser | null;
  profile: RunnerProfile | null;
}

export interface PassportData extends SessionData {
  savedPlans: SavedRunPlan[];
  passes: PassportRunPass[];
}

export class PassportApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const payload = (await response.json().catch(() => null)) as
    | T
    | { error?: { code?: string; message?: string } }
    | null;
  if (!response.ok) {
    const error = typeof payload === "object" && payload !== null && "error" in payload
      ? payload.error
      : undefined;
    throw new PassportApiError(
      response.status,
      error?.code ?? "request_failed",
      error?.message ?? "Runner Passport เชื่อมต่อไม่สำเร็จ",
    );
  }
  return payload as T;
}

export function chatGptSignInPath(returnTo = "/#passport"): string {
  const safeReturnTo = returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";
  return `/signin-with-chatgpt?return_to=${encodeURIComponent(safeReturnTo)}`;
}

export function chatGptSignOutPath(returnTo = "/"): string {
  const safeReturnTo = returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";
  return `/signout-with-chatgpt?return_to=${encodeURIComponent(safeReturnTo)}`;
}

export function getRunnerSession(): Promise<SessionData> {
  return apiJson<SessionData>("/api/session");
}

export function getRunnerPassport(): Promise<PassportData> {
  return apiJson<PassportData>("/api/passport");
}

export async function updateRunnerProfile(input: {
  displayName: string;
  homeCity: string | null;
  preferredPace: PaceBand | null;
  weeklyGoalKm: number;
}): Promise<RunnerProfile> {
  const result = await apiJson<{ profile: RunnerProfile }>("/api/profile", {
    method: "PUT",
    body: JSON.stringify(input),
  });
  return result.profile;
}

export async function persistRunPlan(input: {
  filters: EventFilters;
  eventIds: string[];
}): Promise<SavedRunPlan> {
  const result = await apiJson<{ plan: SavedRunPlan }>("/api/plans", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return result.plan;
}

export async function persistRunPass(input: RegistrationInput): Promise<PassportRunPass> {
  const result = await apiJson<{ pass: PassportRunPass }>("/api/passes", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return result.pass;
}

export async function cancelPersistentRunPass(passId: string): Promise<{ id: string; status: "cancelled" }> {
  const result = await apiJson<{ pass: { id: string; status: "cancelled" } }>(
    `/api/passes/${encodeURIComponent(passId)}/cancel`,
    { method: "POST", body: "{}" },
  );
  return result.pass;
}
