import { CLUB_RULES, EVENTS, PACE_LABELS, SOCIAL_LABELS } from "./data";
import type {
  EventFilters,
  ReadinessInput,
  ReadinessResult,
  Registration,
  RegistrationInput,
  RunEvent,
  SocialOption,
  TransportMode,
} from "./types";

export const STORAGE_KEYS = {
  registrations: "run-social-th:registrations",
  pendingRegistration: "run-social-th:pending-registration",
} as const;

export interface EventMatch {
  event: RunEvent;
  matchReasons: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const SAFE_TRANSPORT_MODES: readonly TransportMode[] = ["transit", "taxi", "walk", "sober_driver"];

export function findEvent(eventId: string): RunEvent | undefined {
  return EVENTS.find((event) => event.id === eventId);
}

export function discoverEvents(filters: EventFilters): EventMatch[] {
  return EVENTS.filter((event) => {
    if (filters.city && event.city !== filters.city) return false;
    if (filters.distanceKm && event.distanceKm !== filters.distanceKm) return false;
    if (filters.pace && !event.paceBands.includes(filters.pace)) return false;
    if (filters.date && event.date !== filters.date) return false;
    if (filters.socialPreference && !event.social.includes(filters.socialPreference)) return false;
    if (filters.alcoholFreeRequired && !event.social.includes("alcohol_free")) return false;
    return true;
  }).map((event) => {
    const matchReasons: string[] = [];
    if (filters.city) matchReasons.push(`จัดที่ ${event.city}`);
    if (filters.distanceKm) matchReasons.push(`ระยะ ${event.distanceKm} กม.`);
    if (filters.pace) matchReasons.push(PACE_LABELS[filters.pace]);
    if (filters.socialPreference) matchReasons.push(SOCIAL_LABELS[filters.socialPreference]);
    if (filters.alcoholFreeRequired) matchReasons.push("มีตัวเลือก alcohol-free");
    if (matchReasons.length === 0) matchReasons.push("เปิดรับสมัครและมีข้อมูลพร้อมเปรียบเทียบ");
    return { event, matchReasons };
  });
}

export function planRunSchedule(filters: EventFilters) {
  const matches = discoverEvents(filters).sort((left, right) =>
    `${left.event.date}T${left.event.startTime}`.localeCompare(
      `${right.event.date}T${right.event.startTime}`,
    ),
  );

  return {
    count: matches.length,
    totalDistanceKm: matches.reduce((total, { event }) => total + event.distanceKm, 0),
    nextEventId: matches[0]?.event.id ?? null,
    events: matches.map(({ event, matchReasons }) => ({
      id: event.id,
      city: event.city,
      neighborhood: event.neighborhood,
      date: event.date,
      startTime: event.startTime,
      distanceKm: event.distanceKm,
      paceBands: event.paceBands,
      socialOptions: event.social,
      spotsLeft: event.spotsLeft,
      matchReasons,
    })),
  };
}

export function compareEvents(eventIds: string[]) {
  const uniqueIds = [...new Set(eventIds)];
  if (uniqueIds.length < 2 || uniqueIds.length > 3) {
    throw new Error("เลือกอีเวนต์ 2–3 รายการเพื่อเปรียบเทียบ");
  }

  const events = uniqueIds.map((id) => {
    const event = findEvent(id);
    if (!event) throw new Error(`ไม่พบอีเวนต์ ${id}`);
    return event;
  });

  return events.map((event) => ({
    id: event.id,
    city: event.city,
    neighborhood: event.neighborhood,
    date: event.date,
    startTime: event.startTime,
    distanceKm: event.distanceKm,
    paceBands: event.paceBands.map((pace) => PACE_LABELS[pace]),
    priceThb: event.priceThb,
    spotsLeft: event.spotsLeft,
    socialOptions: event.social.map((option) => SOCIAL_LABELS[option]),
    safeReturn: event.transit,
  }));
}

export function getRules(topic?: string) {
  const normalizedTopic = topic?.trim().toLowerCase();
  const matchingRules = normalizedTopic
    ? CLUB_RULES.filter((rule) =>
        `${rule.id} ${rule.title} ${rule.body}`.toLowerCase().includes(normalizedTopic),
      )
    : CLUB_RULES;

  return {
    rules: matchingRules.length > 0 ? matchingRules : CLUB_RULES,
    alcoholPolicy:
      "เว็บไซต์ไม่ขาย ไม่แจก ไม่ลดราคา และไม่รวมแอลกอฮอล์ในค่าสมัคร ตัวเลือกแอลกอฮอล์มีเฉพาะหลังวิ่งสำหรับผู้มีอายุ 20+ ณ สถานที่ที่มีใบอนุญาต",
    legalDisclaimer:
      "ข้อมูลนี้เป็น operational safety policy ไม่ใช่คำแนะนำทางกฎหมาย ผู้จัดและสถานที่ต้องตรวจข้อกำหนดไทยฉบับปัจจุบันก่อนจัดงานจริง",
  };
}

export function checkReadiness(input: ReadinessInput): ReadinessResult {
  const event = findEvent(input.eventId);
  const reasons: string[] = [];
  const requiredActions: string[] = [];
  let isBlocked = false;

  if (!event) {
    return {
      status: "blocked",
      reasons: ["ไม่พบอีเวนต์ที่ระบุ"],
      requiredActions: ["เลือกอีเวนต์ที่เปิดรับสมัคร"],
      disclaimer: "แบบตรวจนี้เป็นกฎการเข้าร่วม ไม่ใช่การประเมินหรือวินิจฉัยทางการแพทย์",
    };
  }

  if (!event.social.includes(input.socialPreference)) {
    reasons.push("อีเวนต์นี้ไม่มี social option ที่เลือก");
    requiredActions.push("เลือกตัวเลือก social ที่อีเวนต์รองรับ");
    isBlocked = true;
  }

  if (input.socialPreference === "beer_optional" && !input.age20Plus) {
    reasons.push("ตัวเลือกแอลกอฮอล์สงวนสำหรับผู้มีอายุ 20 ปีขึ้นไป");
    requiredActions.push("เปลี่ยนเป็น alcohol-free หรือ run only");
    isBlocked = true;
  }

  if (input.hasConcerningSymptoms) {
    reasons.push("ผู้เข้าร่วมแจ้งว่ามีอาการน่ากังวล");
    requiredActions.push("งดเข้าร่วมและติดต่อผู้เชี่ยวชาญด้านสุขภาพหรือบริการฉุกเฉินตามความเหมาะสม");
    isBlocked = true;
  }

  if (!SAFE_TRANSPORT_MODES.includes(input.transportMode)) {
    reasons.push("แผนเดินทางกลับอยู่นอกตัวเลือกที่ปลอดภัยของกิจกรรม");
    requiredActions.push("เลือกขนส่งสาธารณะ แท็กซี่ เดินเมื่อปลอดภัย หรือคนขับที่ไม่ดื่ม");
    isBlocked = true;
  }

  if (input.socialPreference === "beer_optional" && input.transportMode === "sober_driver") {
    reasons.push("ต้องยืนยันว่าคนขับที่กำหนดจะไม่ดื่มตลอดงาน");
  }

  if (!input.hasHydrationPlan) {
    reasons.push("ยังไม่มีแผนดื่มน้ำ");
    requiredActions.push("เตรียมน้ำหรือใช้จุดเติมน้ำของงาน");
  }

  return {
    status: isBlocked ? "blocked" : reasons.length > 0 ? "attention" : "ready",
    reasons: reasons.length > 0 ? reasons : ["ผ่านกฎการเข้าร่วมที่ตรวจได้จากข้อมูลที่ให้มา"],
    requiredActions,
    disclaimer: "แบบตรวจนี้เป็นกฎการเข้าร่วม ไม่ใช่การประเมินหรือวินิจฉัยทางการแพทย์",
  };
}

export function validateRegistration(input: RegistrationInput): ValidationResult {
  const errors: string[] = [];
  const event = findEvent(input.eventId);

  if (!event) errors.push("ไม่พบอีเวนต์");
  if (event && event.spotsLeft <= 0) errors.push("อีเวนต์เต็มแล้ว");
  if (input.runnerName.trim().length < 2) errors.push("กรุณาระบุชื่อผู้วิ่ง");
  if (!/^\S+@\S+\.\S+$/.test(input.email)) errors.push("อีเมลไม่ถูกต้อง");
  if (input.emergencyContact.replace(/\D/g, "").length < 8) {
    errors.push("กรุณาระบุเบอร์ติดต่อฉุกเฉินที่ใช้งานได้");
  }
  if (event && !event.paceBands.includes(input.pace)) errors.push("อีเวนต์ไม่มีกลุ่มเพซที่เลือก");
  if (event && !event.social.includes(input.socialPreference)) {
    errors.push("อีเวนต์ไม่มี social option ที่เลือก");
  }
  if (!SAFE_TRANSPORT_MODES.includes(input.transportMode)) {
    errors.push("ต้องเลือกแผนเดินทางกลับที่ปลอดภัยจากตัวเลือกที่กำหนด");
  }
  if (input.socialPreference === "beer_optional" && !input.age20Plus) {
    errors.push("ต้องมีอายุ 20 ปีขึ้นไปสำหรับตัวเลือกแอลกอฮอล์");
  }
  if (!input.rulesAccepted) errors.push("ต้องยอมรับกฎกิจกรรม");
  if (!input.privacyAccepted) errors.push("ต้องยอมรับการใช้ข้อมูลเพื่อจัดกิจกรรม");

  return { valid: errors.length === 0, errors };
}

export function stageRegistration(storage: Storage, input: RegistrationInput) {
  const validation = validateRegistration(input);
  if (!validation.valid) {
    return { status: "validation_failed" as const, errors: validation.errors };
  }

  storage.setItem(STORAGE_KEYS.pendingRegistration, JSON.stringify(input));
  return {
    status: "pending_human_confirmation" as const,
    eventId: input.eventId,
    runnerName: input.runnerName,
    message: "ข้อมูลพร้อมแล้ว กรุณาตรวจบนหน้าเว็บและกด ‘ยืนยันการสมัคร’ ด้วยตัวเอง",
  };
}

export function readPendingRegistration(storage: Storage): RegistrationInput | null {
  const raw = storage.getItem(STORAGE_KEYS.pendingRegistration);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RegistrationInput;
  } catch {
    storage.removeItem(STORAGE_KEYS.pendingRegistration);
    return null;
  }
}

export function readRegistrations(storage: Storage): Registration[] {
  const raw = storage.getItem(STORAGE_KEYS.registrations);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Registration[];
  } catch {
    storage.removeItem(STORAGE_KEYS.registrations);
    return [];
  }
}

export function confirmPendingRegistration(storage: Storage): Registration {
  const input = readPendingRegistration(storage);
  if (!input) throw new Error("ไม่มีรายการที่รอยืนยัน");

  const existing = readRegistrations(storage);
  const registration: Registration = {
    ...input,
    id: `PASS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    createdAt: new Date().toISOString(),
    status: "confirmed",
  };

  storage.setItem(STORAGE_KEYS.registrations, JSON.stringify([registration, ...existing]));
  storage.removeItem(STORAGE_KEYS.pendingRegistration);
  return registration;
}

export function cancelRegistration(storage: Storage, passId: string): Registration {
  const registrations = readRegistrations(storage);
  const target = registrations.find((registration) => registration.id === passId);
  if (!target) throw new Error("ไม่พบ run pass ที่ระบุ");

  const updated = registrations.map((registration) =>
    registration.id === passId ? { ...registration, status: "cancelled" as const } : registration,
  );
  storage.setItem(STORAGE_KEYS.registrations, JSON.stringify(updated));
  return updated.find((registration) => registration.id === passId)!;
}

export function safeReturnOptions(eventId: string, socialPreference?: SocialOption) {
  const event = findEvent(eventId);
  if (!event) throw new Error("ไม่พบอีเวนต์");

  return {
    eventId,
    venue: event.finishVenue,
    options: [
      { mode: "transit", recommended: true, detail: event.transit },
      { mode: "taxi", recommended: true, detail: "เรียกรถจากจุดรับส่งของสถานที่หลัง social" },
      { mode: "walk", recommended: event.neighborhood !== "บึงแก่นนคร", detail: "เลือกเมื่อที่พักอยู่ใกล้และเส้นทางปลอดภัย" },
      { mode: "sober_driver", recommended: true, detail: "ผู้ขับต้องไม่ดื่มตลอดงาน" },
    ],
    warning:
      socialPreference === "beer_optional"
        ? "ห้ามขับรถหลังดื่ม เลือกขนส่งสาธารณะ แท็กซี่ เดิน หรือคนขับที่ไม่ดื่ม"
        : "วางแผนทางกลับก่อนออกวิ่งและเดินทางเป็นกลุ่มเมื่อทำได้",
  };
}
