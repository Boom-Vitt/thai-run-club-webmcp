import type { City, EventFilters, PaceBand, SocialOption } from "./types";
import type { CommerceNeed } from "./commerce";

export type RunnerIntentAction = "plan" | "compare" | "safe_return" | "support_loop" | "search_need" | "save_plan" | "show_passport";

export interface RunnerIntent {
  action: RunnerIntentAction;
  filters: EventFilters;
  commerceNeed?: CommerceNeed;
}

const cityPhrases: Array<[City, RegExp]> = [
  ["Bangkok", /กรุงเทพ|บางกอก|bangkok|\bbkk\b/i],
  ["Chiang Mai", /เชียงใหม่|chiang\s*mai|\bcnx\b/i],
  ["Phuket", /ภูเก็ต|phuket|\bhkt\b/i],
  ["Khon Kaen", /ขอนแก่น|khon\s*kaen|\bkkc\b/i],
];

const pacePhrases: Array<[PaceBand, RegExp]> = [
  ["tempo", /เทมโป|tempo|ทำเวลา|เร็วหน่อย|เร่งเพซ/i],
  ["steady", /สเตดี้|steady|ต่อเนื่อง|กลาง\s*ๆ|เพซกลาง/i],
  ["social", /โซเชียล|social|easy|ชิล|สบาย|มือใหม่|คุยได้|ไม่เน้นเร็ว/i],
];

const socialPhrases: Array<[SocialOption, RegExp]> = [
  ["alcohol_free", /ไม่ดื่ม|งดดื่ม|ไม่เอาเบียร์|ปลอดแอลกอฮอล์|alcohol[ -]?free|no alcohol|sober/i],
  ["run_only", /วิ่งอย่างเดียว|วิ่งเสร็จแล้วกลับ|run only/i],
  ["beer_optional", /เบียร์ได้|ดื่มได้|beer optional|มีเบียร์/i],
];

function firstMatch<T>(value: string, choices: Array<[T, RegExp]>): T | undefined {
  return choices.find(([, pattern]) => pattern.test(value))?.[0];
}

export function interpretRunnerRequest(value: string, fallback: EventFilters = {}): RunnerIntent {
  const request = value.normalize("NFC").trim();
  const filters: EventFilters = { ...fallback };
  const city = firstMatch(request, cityPhrases);
  const pace = firstMatch(request, pacePhrases);
  const socialPreference = firstMatch(request, socialPhrases);
  const distanceMatch = request.match(/(?:^|\s)(3|5|7|10)\s*(?:k|km|กม\.?|กิโล(?:เมตร)?)(?:\s|$|[,.!?])/i);

  if (city) filters.city = city;
  if (pace) filters.pace = pace;
  if (socialPreference) {
    filters.socialPreference = socialPreference;
    filters.alcoholFreeRequired = socialPreference === "alcohol_free" ? true : undefined;
  }
  if (distanceMatch) filters.distanceKm = Number(distanceMatch[1]);

  let action: RunnerIntentAction = "plan";
  let commerceNeed: CommerceNeed | undefined;
  if (/passport|พาสปอร์ต|เปิด.*(?:ตาราง|แผน).*บันทึก|ดู.*(?:ตาราง|แผน).*บันทึก/i.test(request)) {
    action = "show_passport";
  } else if (/บันทึก|จำ.*(?:ตาราง|แผน)|save.*(?:week|plan|schedule)/i.test(request)) {
    action = "save_plan";
  } else if (/ค้นหา.*(?:ของ|อุปกรณ์|ร้าน)|หา.*(?:ของที่ขาด|จากร้าน)|search.*(?:gear|catalog)|จากร้าน/i.test(request)) {
    action = "search_need";
    commerceNeed = /น้ำ|ขวด|hydration|bottle/i.test(request)
      ? "reusable_hydration"
      : /เชือก|ซ่อม|repair|lace/i.test(request)
        ? "repair_essentials"
        : undefined;
  } else if (/ต้องเตรียมอะไร|เอาอะไรไป|อุปกรณ์|ยืม|เติมน้ำ|ซ่อม|ก่อนซื้อ|support loop|what.*bring/i.test(request)) {
    action = "support_loop";
  } else if (/ทางกลับ|กลับบ้าน|เดินทางกลับ|safe return|กลับยังไง/i.test(request)) {
    action = "safe_return";
  } else if (/เปรียบเทียบ|ช่วยเทียบ|เทียบ.*(?:งาน|run|ตัวเลือก)|เลือก.*ไหนดี|compare/i.test(request)) {
    action = "compare";
  }

  return { action, filters, commerceNeed };
}
