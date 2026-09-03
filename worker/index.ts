import { EVENTS } from "../src/data";
import { searchShopifyCatalog, ShopifyMcpError, shopifyCommerceStatus, validateCommerceNeed } from "./shopify";
import type { City, EventFilters, PaceBand, Registration, RegistrationInput, SocialOption } from "../src/types";

interface Env {
  DB: D1Database;
  SHOPIFY_STORE_DOMAIN?: string;
}

interface AuthUser {
  userId: string;
  email: string;
  displayName: string;
  fullName: string | null;
}

const CITIES = ["Bangkok", "Chiang Mai", "Phuket", "Khon Kaen"] as const;
const PACES = ["social", "steady", "tempo"] as const;
const SOCIAL_OPTIONS = ["alcohol_free", "beer_optional", "run_only"] as const;

function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "private, no-store");
  return new Response(JSON.stringify(data), { ...init, headers });
}

function safeDecode(value: string | null): string | null {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function authenticatedUser(request: Request): AuthUser | null {
  const userId = request.headers.get("oai-authenticated-user-id");
  const email = request.headers.get("oai-authenticated-user-email");
  if (!userId || !email) return null;

  const fullName =
    request.headers.get("oai-authenticated-user-full-name-encoding") === "percent-encoded-utf-8"
      ? safeDecode(request.headers.get("oai-authenticated-user-full-name"))
      : null;

  return { userId, email, fullName, displayName: fullName ?? email };
}

function requireUser(request: Request): AuthUser {
  const user = authenticatedUser(request);
  if (!user) throw new ApiError(401, "sign_in_required", "กรุณา Sign in with ChatGPT เพื่อบันทึก Runner Passport");
  return user;
}

class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

async function bodyObject(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    throw new ApiError(415, "json_required", "คำขอนี้ต้องส่งเป็น JSON");
  }
  const value: unknown = await request.json().catch(() => {
    throw new ApiError(400, "invalid_json", "อ่านข้อมูล JSON ไม่สำเร็จ");
  });
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(400, "object_required", "ข้อมูลต้องเป็น object");
  }
  return value as Record<string, unknown>;
}

function writeRequestIsSameOrigin(request: Request, url: URL): boolean {
  const origin = request.headers.get("origin");
  return origin === null || origin === url.origin;
}

function optionalEnum<T extends string>(value: unknown, values: readonly T[], field: string): T | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !values.includes(value as T)) {
    throw new ApiError(400, "invalid_field", `${field} ไม่ถูกต้อง`);
  }
  return value as T;
}

function requiredString(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== "string" || value.trim().length === 0 || value.trim().length > maxLength) {
    throw new ApiError(400, "invalid_field", `${field} ไม่ถูกต้อง`);
  }
  return value.trim();
}

function parseEventIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > EVENTS.length) {
    throw new ApiError(400, "invalid_event_ids", "เลือกอีเวนต์อย่างน้อย 1 รายการ");
  }
  const ids = [...new Set(value.map((id) => requiredString(id, "event_id", 80)))];
  if (ids.some((id) => !EVENTS.some((event) => event.id === id))) {
    throw new ApiError(400, "unknown_event", "มีอีเวนต์ที่ไม่รู้จักในตาราง");
  }
  return ids;
}

function profileFromRow(row: Record<string, unknown> | null) {
  if (!row) return null;
  return {
    displayName: String(row.display_name),
    email: String(row.email),
    homeCity: row.home_city ? String(row.home_city) : null,
    preferredPace: row.preferred_pace ? String(row.preferred_pace) : null,
    weeklyGoalKm: Number(row.weekly_goal_km),
    updatedAt: String(row.updated_at),
  };
}

async function readProfile(db: D1Database, userId: string) {
  const row = await db
    .prepare(
      `SELECT display_name, email, home_city, preferred_pace, weekly_goal_km, updated_at
       FROM runner_profiles WHERE user_id = ? LIMIT 1`,
    )
    .bind(userId)
    .first<Record<string, unknown>>();
  return profileFromRow(row);
}

async function sessionResponse(request: Request, env: Env): Promise<Response> {
  const user = authenticatedUser(request);
  if (!user) return json({ authenticated: false, user: null, profile: null });
  return json({
    authenticated: true,
    user: { email: user.email, displayName: user.displayName },
    profile: await readProfile(env.DB, user.userId),
  });
}

async function passportResponse(request: Request, env: Env): Promise<Response> {
  const user = requireUser(request);
  const [profile, planResult, passResult] = await Promise.all([
    readProfile(env.DB, user.userId),
    env.DB.prepare(
      `SELECT id, filter_city, filter_distance_km, filter_pace, filter_social,
              event_ids_json, total_distance_km, created_at
       FROM saved_run_plans WHERE user_id = ? ORDER BY created_at DESC LIMIT 6`,
    )
      .bind(user.userId)
      .all<Record<string, unknown>>(),
    env.DB.prepare(
      `SELECT id, event_id, runner_name, email, pace, social_preference,
              age_20_plus, transport_mode, status, created_at
       FROM run_passes WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`,
    )
      .bind(user.userId)
      .all<Record<string, unknown>>(),
  ]);

  return json({
    authenticated: true,
    user: { email: user.email, displayName: user.displayName },
    profile,
    savedPlans: planResult.results.map((row) => ({
      id: String(row.id),
      filters: {
        city: row.filter_city ?? undefined,
        distanceKm: row.filter_distance_km ?? undefined,
        pace: row.filter_pace ?? undefined,
        socialPreference: row.filter_social ?? undefined,
      },
      eventIds: JSON.parse(String(row.event_ids_json)) as string[],
      totalDistanceKm: Number(row.total_distance_km),
      createdAt: String(row.created_at),
    })),
    passes: passResult.results.map((row) => ({
      id: String(row.id),
      eventId: String(row.event_id),
      runnerName: String(row.runner_name),
      email: String(row.email),
      pace: String(row.pace),
      socialPreference: String(row.social_preference),
      age20Plus: Boolean(row.age_20_plus),
      transportMode: String(row.transport_mode),
      status: String(row.status),
      createdAt: String(row.created_at),
    })),
  });
}

async function saveProfile(request: Request, env: Env): Promise<Response> {
  const user = requireUser(request);
  const body = await bodyObject(request);
  const displayName = requiredString(body.displayName ?? user.displayName, "display_name", 80);
  const homeCity = optionalEnum(body.homeCity, CITIES, "home_city");
  const preferredPace = optionalEnum(body.preferredPace, PACES, "preferred_pace");
  const weeklyGoalKm = Number(body.weeklyGoalKm);
  if (!Number.isInteger(weeklyGoalKm) || weeklyGoalKm < 1 || weeklyGoalKm > 100) {
    throw new ApiError(400, "invalid_goal", "เป้าหมายรายสัปดาห์ต้องอยู่ระหว่าง 1–100 KM");
  }
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO runner_profiles
       (user_id, email, display_name, home_city, preferred_pace, weekly_goal_km, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       email = excluded.email,
       display_name = excluded.display_name,
       home_city = excluded.home_city,
       preferred_pace = excluded.preferred_pace,
       weekly_goal_km = excluded.weekly_goal_km,
       updated_at = excluded.updated_at`,
  )
    .bind(user.userId, user.email, displayName, homeCity, preferredPace, weeklyGoalKm, now, now)
    .run();

  return json({ profile: await readProfile(env.DB, user.userId) });
}

async function savePlan(request: Request, env: Env): Promise<Response> {
  const user = requireUser(request);
  const body = await bodyObject(request);
  const eventIds = parseEventIds(body.eventIds);
  const rawFilters = body.filters && typeof body.filters === "object" && !Array.isArray(body.filters)
    ? (body.filters as Record<string, unknown>)
    : {};
  const filters: EventFilters = {
    city: optionalEnum(rawFilters.city, CITIES, "city") as City | undefined,
    distanceKm: rawFilters.distanceKm === undefined || rawFilters.distanceKm === null || rawFilters.distanceKm === ""
      ? undefined
      : Number(rawFilters.distanceKm),
    pace: optionalEnum(rawFilters.pace, PACES, "pace") as PaceBand | undefined,
    socialPreference: optionalEnum(rawFilters.socialPreference, SOCIAL_OPTIONS, "social_preference") as SocialOption | undefined,
  };
  if (filters.distanceKm !== undefined && ![3, 5, 7, 10].includes(filters.distanceKm)) {
    throw new ApiError(400, "invalid_distance", "distance_km ไม่ถูกต้อง");
  }

  const selectedEvents = eventIds.map((id) => EVENTS.find((event) => event.id === id)!);
  const totalDistanceKm = selectedEvents.reduce((total, event) => total + event.distanceKm, 0);
  const id = `WEEK-${crypto.randomUUID()}`;
  const createdAt = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO saved_run_plans
       (id, user_id, filter_city, filter_distance_km, filter_pace, filter_social,
        event_ids_json, total_distance_km, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      user.userId,
      filters.city ?? null,
      filters.distanceKm ?? null,
      filters.pace ?? null,
      filters.socialPreference ?? null,
      JSON.stringify(eventIds),
      totalDistanceKm,
      createdAt,
    )
    .run();

  return json({ plan: { id, filters, eventIds, totalDistanceKm, createdAt } }, { status: 201 });
}

function registrationInput(body: Record<string, unknown>): RegistrationInput {
  return {
    eventId: requiredString(body.eventId, "event_id", 80),
    runnerName: requiredString(body.runnerName, "runner_name", 80),
    email: requiredString(body.email, "email", 120),
    emergencyContact: requiredString(body.emergencyContact, "emergency_contact", 40),
    pace: requiredString(body.pace, "pace", 20) as RegistrationInput["pace"],
    socialPreference: requiredString(body.socialPreference, "social_preference", 30) as RegistrationInput["socialPreference"],
    age20Plus: body.age20Plus === true,
    transportMode: requiredString(body.transportMode, "transport_mode", 30) as RegistrationInput["transportMode"],
    rulesAccepted: body.rulesAccepted === true,
    privacyAccepted: body.privacyAccepted === true,
  };
}

function validateServerRegistration(input: RegistrationInput): string[] {
  const errors: string[] = [];
  const event = EVENTS.find((candidate) => candidate.id === input.eventId);
  if (!event) errors.push("ไม่พบอีเวนต์");
  if (event && event.spotsLeft <= 0) errors.push("อีเวนต์เต็มแล้ว");
  if (!/^\S+@\S+\.\S+$/.test(input.email)) errors.push("อีเมลไม่ถูกต้อง");
  if (input.emergencyContact.replace(/\D/g, "").length < 8) errors.push("เบอร์ติดต่อฉุกเฉินไม่ถูกต้อง");
  if (!PACES.includes(input.pace)) errors.push("เพซไม่ถูกต้อง");
  if (!SOCIAL_OPTIONS.includes(input.socialPreference)) errors.push("social option ไม่ถูกต้อง");
  if (!['transit', 'taxi', 'walk', 'sober_driver'].includes(input.transportMode)) errors.push("แผนเดินทางกลับไม่ถูกต้อง");
  if (event && !event.paceBands.includes(input.pace)) errors.push("อีเวนต์ไม่มีกลุ่มเพซที่เลือก");
  if (event && !event.social.includes(input.socialPreference)) errors.push("อีเวนต์ไม่มี social option ที่เลือก");
  if (input.socialPreference === "beer_optional" && !input.age20Plus) errors.push("ต้องมีอายุ 20 ปีขึ้นไป");
  if (!input.rulesAccepted) errors.push("ต้องยอมรับกฎกิจกรรม");
  if (!input.privacyAccepted) errors.push("ต้องยอมรับการใช้ข้อมูลเพื่อจัดกิจกรรม");
  return errors;
}

async function createPass(request: Request, env: Env): Promise<Response> {
  const user = requireUser(request);
  const input = registrationInput(await bodyObject(request));
  const errors = validateServerRegistration(input);
  if (errors.length > 0) {
    throw new ApiError(400, "registration_invalid", errors.join(" · "));
  }
  const now = new Date().toISOString();
  const registration: Registration = {
    ...input,
    id: `PASS-${crypto.randomUUID()}`,
    createdAt: now,
    status: "confirmed",
  };

  await env.DB.prepare(
    `INSERT INTO run_passes
       (id, user_id, event_id, runner_name, email, emergency_contact, pace,
        social_preference, age_20_plus, transport_mode, rules_accepted,
        privacy_accepted, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      registration.id,
      user.userId,
      registration.eventId,
      registration.runnerName,
      registration.email,
      registration.emergencyContact,
      registration.pace,
      registration.socialPreference,
      registration.age20Plus ? 1 : 0,
      registration.transportMode,
      registration.rulesAccepted ? 1 : 0,
      registration.privacyAccepted ? 1 : 0,
      registration.status,
      now,
      now,
    )
    .run();

  const safeRegistration = { ...registration } as Partial<Registration>;
  delete safeRegistration.emergencyContact;
  return json({ pass: safeRegistration }, { status: 201 });
}

async function cancelPass(request: Request, env: Env, passId: string): Promise<Response> {
  const user = requireUser(request);
  const now = new Date().toISOString();
  const result = await env.DB.prepare(
    `UPDATE run_passes SET status = 'cancelled', updated_at = ?
     WHERE id = ? AND user_id = ? AND status != 'cancelled'`,
  )
    .bind(now, passId, user.userId)
    .run();
  if (result.meta.changes !== 1) {
    throw new ApiError(404, "pass_not_found", "ไม่พบ Run Pass ที่ยกเลิกได้");
  }
  return json({ pass: { id: passId, status: "cancelled", updatedAt: now } });
}

async function commerceSearch(request: Request, env: Env): Promise<Response> {
  const body = await bodyObject(request);
  const eventId = requiredString(body.eventId, "event_id", 80);
  if (!EVENTS.some((event) => event.id === eventId)) {
    throw new ApiError(400, "unknown_event", "ไม่พบอีเวนต์สำหรับค้นหาของที่ขาด");
  }
  const need = validateCommerceNeed(body.need);
  return json(await searchShopifyCatalog({
    storeDomain: env.SHOPIFY_STORE_DOMAIN,
    eventId,
    need,
  }));
}

async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/")) return new Response(null, { status: 404 });
  if (request.method !== "GET" && !writeRequestIsSameOrigin(request, url)) {
    throw new ApiError(403, "origin_mismatch", "ปฏิเสธคำขอจาก origin อื่น");
  }

  if (request.method === "GET" && url.pathname === "/api/session") return sessionResponse(request, env);
  if (request.method === "GET" && url.pathname === "/api/commerce/status") {
    return json(shopifyCommerceStatus(env.SHOPIFY_STORE_DOMAIN));
  }
  if (request.method === "GET" && url.pathname === "/api/passport") return passportResponse(request, env);
  if (request.method === "PUT" && url.pathname === "/api/profile") return saveProfile(request, env);
  if (request.method === "POST" && url.pathname === "/api/plans") return savePlan(request, env);
  if (request.method === "POST" && url.pathname === "/api/passes") return createPass(request, env);
  if (request.method === "POST" && url.pathname === "/api/commerce/search") {
    return commerceSearch(request, env);
  }

  const cancelMatch = url.pathname.match(/^\/api\/passes\/([^/]+)\/cancel$/);
  if (request.method === "POST" && cancelMatch) {
    return cancelPass(request, env, decodeURIComponent(cancelMatch[1]));
  }

  throw new ApiError(404, "not_found", "ไม่พบ API นี้");
}

export default {
  async fetch(request, env): Promise<Response> {
    try {
      return await route(request, env);
    } catch (error) {
      if (error instanceof ApiError) {
        return json({ error: { code: error.code, message: error.message } }, { status: error.status });
      }
      if (error instanceof ShopifyMcpError) {
        return json({ error: { code: error.code, message: error.message } }, { status: error.status });
      }
      console.error("Runner API error", error);
      return json({ error: { code: "internal_error", message: "Runner Passport ใช้งานไม่ได้ชั่วคราว" } }, { status: 500 });
    }
  },
} satisfies ExportedHandler<Env>;
