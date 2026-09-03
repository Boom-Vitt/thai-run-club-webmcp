import type { City, EventFilters, PaceBand, SocialOption } from "./types";
import type { CommerceNeed } from "./commerce";

export type RunnerIntentAction = "plan" | "compare" | "safe_return" | "support_loop" | "search_need" | "save_plan" | "show_passport";

export interface RunnerIntent {
  action: RunnerIntentAction;
  filters: EventFilters;
  commerceNeed?: CommerceNeed;
}

const cityPhrases: Array<[City, RegExp]> = [
  ["Bangkok", /กรุงเทพ|บางกอก|曼谷|bangkok|\bbkk\b/i],
  ["Chiang Mai", /เชียงใหม่|清迈|chiang\s*mai|\bcnx\b/i],
  ["Phuket", /ภูเก็ต|普吉|phuket|\bhkt\b/i],
  ["Khon Kaen", /ขอนแก่น|孔敬|khon\s*kaen|\bkkc\b/i],
];

const pacePhrases: Array<[PaceBand, RegExp]> = [
  ["tempo", /เทมโป|tempo|ทำเวลา|เร็วหน่อย|เร่งเพซ|节奏跑|快速/i],
  ["steady", /สเตดี้|steady|ต่อเนื่อง|กลาง\s*ๆ|เพซกลาง|稳定跑|中等配速/i],
  ["social", /โซเชียล|social|easy|ชิล|สบาย|มือใหม่|คุยได้|ไม่เน้นเร็ว|轻松|社交跑|新手/i],
];

const socialPhrases: Array<[SocialOption, RegExp]> = [
  ["alcohol_free", /ไม่ดื่ม|งดดื่ม|ไม่เอาเบียร์|ปลอดแอลกอฮอล์|alcohol[ -]?free|no alcohol|sober|无酒精|不喝酒/i],
  ["run_only", /วิ่งอย่างเดียว|วิ่งเสร็จแล้วกลับ|run only|仅跑步/i],
  ["beer_optional", /เบียร์ได้|ดื่มได้|beer optional|มีเบียร์|啤酒可选/i],
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
  const distanceMatch = request.match(/(3|5|7|10)\s*(?:k|km|กม\.?|กิโล(?:เมตร)?|公里)/i);

  if (city) filters.city = city;
  if (pace) filters.pace = pace;
  if (socialPreference) {
    filters.socialPreference = socialPreference;
    filters.alcoholFreeRequired = socialPreference === "alcohol_free" ? true : undefined;
  }
  if (distanceMatch) filters.distanceKm = Number(distanceMatch[1]);

  let action: RunnerIntentAction = "plan";
  let commerceNeed: CommerceNeed | undefined;
  if (/passport|พาสปอร์ต|打开.*(?:已保存|计划)|查看.*(?:已保存|计划)|เปิด.*(?:ตาราง|แผน).*บันทึก|ดู.*(?:ตาราง|แผน).*บันทึก/i.test(request)) {
    action = "show_passport";
  } else if (/บันทึก|จำ.*(?:ตาราง|แผน)|save.*(?:week|plan|schedule)|保存.*计划|记住.*计划/i.test(request)) {
    action = "save_plan";
  } else if (/ค้นหา.*(?:ของ|อุปกรณ์|ร้าน)|หา.*(?:ของที่ขาด|จากร้าน)|search.*(?:gear|catalog)|从商店.*搜索|搜索.*(?:装备|商店)|จากร้าน/i.test(request)) {
    action = "search_need";
    commerceNeed = /น้ำ|ขวด|hydration|bottle|水瓶|补水/i.test(request)
      ? "reusable_hydration"
      : /เชือก|ซ่อม|repair|lace|鞋带|维修/i.test(request)
        ? "repair_essentials"
        : undefined;
  } else if (/ต้องเตรียมอะไร|เอาอะไรไป|อุปกรณ์|ยืม|เติมน้ำ|ซ่อม|ก่อนซื้อ|support loop|what.*bring|准备什么|携带|借用|补充|维修/i.test(request)) {
    action = "support_loop";
  } else if (/ทางกลับ|กลับบ้าน|เดินทางกลับ|safe return|กลับยังไง|安全返程|怎么回去|规划返程/i.test(request)) {
    action = "safe_return";
  } else if (/เปรียบเทียบ|ช่วยเทียบ|เทียบ.*(?:งาน|run|ตัวเลือก)|เลือก.*ไหนดี|compare|比较.*(?:路线|跑步|选项)/i.test(request)) {
    action = "compare";
  }

  return { action, filters, commerceNeed };
}
