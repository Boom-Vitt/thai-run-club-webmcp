import type { PaceBand, RunEvent, SocialOption } from "./types";

export type Locale = "en" | "th" | "zh";

export const LOCALE_STORAGE_KEY = "run-social-locale";

let activeLocale: Locale = "en";

export const LOCALES: Array<{ code: Locale; short: string; label: string }> = [
  { code: "en", short: "EN", label: "English" },
  { code: "th", short: "TH", label: "ไทย" },
  { code: "zh", short: "中文", label: "简体中文" },
];

export function initializeLocale(storage: Pick<Storage, "getItem">): Locale {
  const saved = storage.getItem(LOCALE_STORAGE_KEY);
  activeLocale = saved === "th" || saved === "zh" ? saved : "en";
  return activeLocale;
}

export function getLocale(): Locale {
  return activeLocale;
}

export function setLocale(locale: Locale, storage: Pick<Storage, "setItem">): void {
  activeLocale = locale;
  storage.setItem(LOCALE_STORAGE_KEY, locale);
}

export function tr(english: string, thai: string, chinese: string): string {
  if (activeLocale === "th") return thai;
  if (activeLocale === "zh") return chinese;
  return english;
}

export function localeTag(): string {
  return activeLocale === "th" ? "th-TH" : activeLocale === "zh" ? "zh-CN" : "en-GB";
}

export function formatLocalizedDate(date: string, withYear = true): string {
  return new Intl.DateTimeFormat(localeTag(), {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
  }).format(new Date(`${date}T12:00:00+07:00`));
}

export function paceLabel(pace: PaceBand): string {
  const labels: Record<PaceBand, [string, string, string]> = {
    social: ["Social · 7:00–8:30", "ชิล · 7:00–8:30", "轻松跑 · 7:00–8:30"],
    steady: ["Steady · 5:45–6:59", "สม่ำเสมอ · 5:45–6:59", "稳定跑 · 5:45–6:59"],
    tempo: ["Tempo · under 5:45", "เทมโป · ต่ำกว่า 5:45", "节奏跑 · 低于 5:45"],
  };
  const label = labels[pace];
  return tr(label[0], label[1], label[2]);
}

export function socialLabel(option: SocialOption): string {
  const labels: Record<SocialOption, [string, string, string]> = {
    alcohol_free: ["Alcohol-free social", "สังสรรค์แบบไม่มีแอลกอฮอล์", "无酒精社交"],
    beer_optional: ["Optional beer · 20+", "เบียร์เป็นตัวเลือก · 20+", "啤酒可选 · 20岁以上"],
    run_only: ["Run only", "วิ่งอย่างเดียว", "仅跑步"],
  };
  const label = labels[option];
  return tr(label[0], label[1], label[2]);
}

type LocalizedEventCopy = Pick<
  RunEvent,
  "neighborhood" | "meetingPoint" | "finishVenue" | "routeLabel" | "routeNote" | "transit" | "host"
> & { accessibility: string[] };

const EVENT_COPY: Record<string, { en: LocalizedEventCopy; zh: LocalizedEventCopy }> = {
  "bkk-riverside-5": {
    en: {
      neighborhood: "Charoen Krung",
      meetingPoint: "Central Post Office plaza, Bang Rak",
      finishVenue: "Partner food hall near BTS Saphan Taksin",
      routeLabel: "River lights loop",
      routeNote: "A flat riverside city loop with marshals at every turn.",
      transit: "8-minute walk from BTS Saphan Taksin; taxis and river boats available.",
      host: "Community host — demo event",
      accessibility: ["Bag drop", "Refill station", "Near BTS"],
    },
    zh: {
      neighborhood: "石龙军路",
      meetingPoint: "曼谷中央邮局广场",
      finishVenue: "郑皇桥轻轨站附近的合作美食空间",
      routeLabel: "河畔灯光环线",
      routeNote: "平坦的河畔城市路线，每个转弯处均设引导员。",
      transit: "步行8分钟至郑皇桥轻轨站，也可搭乘出租车或渡船。",
      host: "社区领跑员 — 演示活动",
      accessibility: ["寄包", "补水站", "临近轻轨"],
    },
  },
  "bkk-oldtown-7": {
    en: {
      neighborhood: "Phra Nakhon",
      meetingPoint: "Sanam Luang, museum side",
      finishVenue: "Community kitchen and café in Phra Nakhon",
      routeLabel: "Old town tempo",
      routeNote: "Old-city streets and pavements with several crossings; designed for continuous runners.",
      transit: "Public transport from MRT Sanam Chai; taxi recommended for the return.",
      host: "Community host — demo event",
      accessibility: ["Bag drop", "First aid", "Smaller pace groups"],
    },
    zh: {
      neighborhood: "拍那空",
      meetingPoint: "皇家田博物馆一侧",
      finishVenue: "拍那空社区厨房与咖啡馆",
      routeLabel: "老城节奏跑",
      routeNote: "穿过老城街道与人行道，设有多处路口，适合持续跑者。",
      transit: "从沙南猜地铁站转乘公共交通；返程建议搭出租车。",
      host: "社区领跑员 — 演示活动",
      accessibility: ["寄包", "急救", "小型配速组"],
    },
  },
  "cnx-moat-5": {
    en: {
      neighborhood: "Old City Moat",
      meetingPoint: "Tha Phae Gate plaza",
      finishVenue: "Local restaurant in Chang Moi",
      routeLabel: "Moat golden hour",
      routeNote: "An evening lap of the moat focused on social pace and group running.",
      transit: "Walk from Tha Phae Gate; ride pickup is outside the finish venue.",
      host: "Community host — demo event",
      accessibility: ["Refill station", "First-timer friendly", "English pace lead"],
    },
    zh: {
      neighborhood: "古城护城河",
      meetingPoint: "塔佩门广场",
      finishVenue: "长美区当地餐厅",
      routeLabel: "护城河金色时刻",
      routeNote: "傍晚环绕护城河，强调轻松配速与结伴跑步。",
      transit: "从塔佩门步行；终点餐厅外设网约车上车点。",
      host: "社区领跑员 — 演示活动",
      accessibility: ["补水站", "新手友好", "英文配速领跑员"],
    },
  },
  "hkt-oldtown-3": {
    en: {
      neighborhood: "Phuket Old Town",
      meetingPoint: "72nd Anniversary Queen Sirikit Park",
      finishVenue: "Old Town food centre",
      routeLabel: "Old town easy three",
      routeNote: "A short first-timer route through Phuket's old-town architecture.",
      transit: "Public transport and taxi pickup are available near the finish.",
      host: "Community host — demo event",
      accessibility: ["Walk-run welcome", "Refill station", "First-timer friendly"],
    },
    zh: {
      neighborhood: "普吉老城",
      meetingPoint: "诗丽吉王后72周年纪念公园",
      finishVenue: "老城美食中心",
      routeLabel: "老城轻松3公里",
      routeNote: "适合新手的短路线，穿过普吉老城建筑街区。",
      transit: "终点附近有公共交通与出租车上车点。",
      host: "社区领跑员 — 演示活动",
      accessibility: ["欢迎跑走结合", "补水站", "新手友好"],
    },
  },
  "kkc-lake-10": {
    en: {
      neighborhood: "Kaen Nakhon Lake",
      meetingPoint: "Kaen Nakhon public park",
      finishVenue: "Lakeside restaurant",
      routeLabel: "Lake double loop",
      routeNote: "Two lakeside laps for runners with a 10K base.",
      transit: "Public pickup point and designated-driver meeting point.",
      host: "Community host — demo event",
      accessibility: ["2 refill stations", "First aid", "Bag drop"],
    },
    zh: {
      neighborhood: "敬纳空湖",
      meetingPoint: "敬纳空公共公园",
      finishVenue: "湖畔餐厅",
      routeLabel: "湖畔双环线",
      routeNote: "绕湖两圈，适合具备10公里基础的跑者。",
      transit: "设公共交通上车点与指定代驾集合点。",
      host: "社区领跑员 — 演示活动",
      accessibility: ["2个补水站", "急救", "寄包"],
    },
  },
  "bkk-green-3": {
    en: {
      neighborhood: "Benjakitti Park",
      meetingPoint: "Park entrance by MRT Queen Sirikit Centre",
      finishVenue: "Food zone near MRT Queen Sirikit Centre",
      routeLabel: "Green mile social",
      routeNote: "A flat park route with no post-run alcohol; open to every runner.",
      transit: "MRT Queen Sirikit National Convention Centre.",
      host: "Community host — demo event",
      accessibility: ["Wheelchair-friendly meeting point", "Walk-run welcome", "Near MRT"],
    },
    zh: {
      neighborhood: "班嘉奇蒂公园",
      meetingPoint: "诗丽吉王后国家会议中心地铁站一侧入口",
      finishVenue: "诗丽吉王后国家会议中心地铁站附近美食区",
      routeLabel: "绿色轻松社交跑",
      routeNote: "平坦公园路线，跑后无酒精，欢迎所有跑者。",
      transit: "诗丽吉王后国家会议中心地铁站。",
      host: "社区领跑员 — 演示活动",
      accessibility: ["无障碍集合点", "欢迎跑走结合", "临近地铁"],
    },
  },
};

export function localizedEvent(event: RunEvent): RunEvent {
  if (activeLocale === "th") return event;
  const copy = EVENT_COPY[event.id]?.[activeLocale];
  return copy ? { ...event, ...copy } : event;
}

const RULE_BODY: Record<string, [string, string]> = {
  "run-first": [
    "No drinking before or during the run. The social begins only after the route closes.",
    "跑步前及跑步期间不得饮酒。社交环节仅在路线关闭后开始。",
  ],
  choice: [
    "Beer is optional: never bundled, free, discounted, or a running reward. Water, food, and alcohol-free choices have equal status.",
    "啤酒完全自选，不与报名捆绑、不免费、不打折，也不是跑步奖励。水、食物与无酒精选项同等重要。",
  ],
  age: [
    "Alcohol options are for guests aged 20+. The licensed venue checks ID and may refuse service.",
    "酒精选项仅限20岁以上参与者。持牌场所负责查验身份证件并可拒绝服务。",
  ],
  "safe-return": [
    "Anyone choosing alcohol must return by transit, taxi, walking, or with a sober driver.",
    "选择饮酒者必须乘公共交通、出租车、步行或由未饮酒司机送返。",
  ],
  health: [
    "Stop or do not join when symptoms are concerning. Hydrate appropriately and seek professional help when needed. This site does not diagnose.",
    "出现令人担忧的症状时请停止或不要参加。适当补水，并在需要时寻求专业帮助。本网站不提供诊断。",
  ],
  "licensed-venue": [
    "Food and drink service is separate and operated by a licensed venue under current Thai rules. The run organiser does not sell alcohol here.",
    "餐饮服务由持牌场所依据泰国现行规定独立提供；跑步组织者不在本平台销售酒精。",
  ],
};

export function localizedRuleBody(id: string, thaiBody: string): string {
  const copy = RULE_BODY[id];
  if (!copy || activeLocale === "th") return thaiBody;
  return activeLocale === "zh" ? copy[1] : copy[0];
}

const DOMAIN_COPY: Record<string, [string, string]> = {
  "เอาของที่มีไปก่อน": ["Bring what you own", "先带上已有装备"],
  "ยืมในคลับ": ["Borrow from the club", "向跑团借用"],
  "เติมแทนซื้อซ้ำ": ["Refill, don't rebuy", "补充而非重复购买"],
  "เช็กและซ่อม": ["Check and repair", "检查并维修"],
  "ไฟหรือแถบสะท้อนแสง": ["Reflective light or strip", "反光灯或反光条"],
  "ไฟหรืออุปกรณ์สะท้อนแสง": ["Reflective light or gear", "反光灯或反光装备"],
  "ภาชนะน้ำพกพาแบบใช้ซ้ำ": ["Reusable hydration bottle", "可重复使用水瓶"],
  "ภาชนะน้ำใช้ซ้ำ": ["Reusable hydration", "可重复使用水具"],
  "อุปกรณ์ซ่อมชิ้นเล็ก": ["Small repair essentials", "小型维修用品"],
  "โทรศัพท์ บัตรโดยสาร ภาชนะน้ำใช้ซ้ำ และอุปกรณ์วิ่งที่คุ้นเคย": [
    "Phone, transit card, reusable bottle, and familiar running gear.",
    "手机、交通卡、可重复使用水瓶与熟悉的跑步装备。",
  ],
  "ลดของใหม่และลดความเสี่ยงจากอุปกรณ์ที่ยังไม่เคยลอง": [
    "Buy less and avoid race-day risk from untested gear.",
    "减少购买新物品，并避免使用未经测试装备的风险。",
  ],
  "ขอยืมไฟหรือแถบสะท้อนแสงจาก Runner Commons": [
    "Borrow a light or reflective strip from Runner Commons.",
    "从跑者共享借用灯具或反光条。",
  ],
  "แชร์อุปกรณ์สำรองกับเพื่อนวิ่งก่อนหาของใหม่": [
    "Share spare gear with another runner before searching for something new.",
    "购买新品前，先与跑友共享备用装备。",
  ],
  "ใช้ของร่วมกันสำหรับสิ่งที่ต้องใช้เป็นครั้งคราว": [
    "Share items that are needed only occasionally.",
    "共享仅偶尔需要的物品。",
  ],
  "นำขวดใช้ซ้ำและเติมที่จุดน้ำของงาน": [
    "Bring a reusable bottle and refill at the event station.",
    "携带可重复使用水瓶，并在活动补水站加水。",
  ],
  "เติมน้ำก่อนออกวิ่งและยืนยันจุดเติมกับผู้จัด": [
    "Fill up before the run and confirm refill points with the organiser.",
    "跑前补水，并向主办方确认补水点。",
  ],
  "งานระบุว่ามีจุดเติมน้ำ": ["The event lists a refill station.", "活动标注设有补水站。"],
  "ข้อมูลจุดเติมยังต้องยืนยัน": ["Refill details still need confirmation.", "补水点信息仍需确认。"],
  "เช็กพื้นรองเท้า เชือก และอุปกรณ์สะท้อนแสง; ซ่อมหรือเปลี่ยนชิ้นส่วนย่อยก่อนซื้อใหม่": [
    "Check soles, laces, and visibility gear; repair or replace small parts before buying new.",
    "检查鞋底、鞋带与反光装备；购买新品前先维修或更换小部件。",
  ],
  "ยืดอายุของที่มีโดยไม่ให้ Agent วินิจฉัยความเหมาะสมทางการแพทย์": [
    "Extend gear life without asking the agent to make medical judgements.",
    "延长装备寿命，同时不让智能体进行医疗判断。",
  ],
  "อาสาวิ่งคู่กับนักวิ่งใหม่ หรือช่วยชี้จุดเติมน้ำและทางกลับ": [
    "Run with a newcomer or help point out refill stations and the route home.",
    "陪同新跑者，或帮助指出补水站与返程路线。",
  ],
  "ส่งบันทึกจุดเสี่ยงและข้อมูลเดินทางกลับให้ผู้จัดตรวจ ก่อนอัปเดตงาน": [
    "Send hazard and return notes to the organiser for review before the event is updated.",
    "将风险点与返程信息提交主办方审核后再更新活动。",
  ],
  "ค้นหาแค็ตตาล็อกจริงเฉพาะเมื่อผู้วิ่งขอและยังมีของที่ขาด จากนั้นเปิดให้คนตรวจที่ร้านเอง โดยระบบนี้ไม่สร้าง cart หรือ checkout": [
    "Search a live catalogue only when the runner asks and a need remains. The human reviews at the store; this system creates no cart or checkout.",
    "仅在跑者提出请求且仍有缺少物品时搜索实时目录。由本人到商店审核；系统不会创建购物车或结账。",
  ],
  "ห้ามขับรถหลังดื่ม เลือกขนส่งสาธารณะ แท็กซี่ เดิน หรือคนขับที่ไม่ดื่ม": [
    "Never drive after drinking. Use transit, taxi, walking, or a sober driver.",
    "饮酒后切勿驾车。请选择公共交通、出租车、步行或未饮酒司机。",
  ],
  "วางแผนทางกลับก่อนออกวิ่งและเดินทางเป็นกลุ่มเมื่อทำได้": [
    "Plan the return before the run and travel as a group when possible.",
    "跑步前规划返程，并尽可能结伴出行。",
  ],
  "ไม่พบอีเวนต์": ["Event not found", "未找到活动"],
  "อีเวนต์เต็มแล้ว": ["This event is full", "活动名额已满"],
  "กรุณาระบุชื่อผู้วิ่ง": ["Enter the runner's name", "请输入跑者姓名"],
  "อีเมลไม่ถูกต้อง": ["Enter a valid email", "请输入有效邮箱"],
  "กรุณาระบุเบอร์ติดต่อฉุกเฉินที่ใช้งานได้": ["Enter a valid emergency contact", "请输入有效紧急联系人"],
  "อีเวนต์ไม่มีกลุ่มเพซที่เลือก": ["The selected pace group is unavailable", "所选配速组不可用"],
  "อีเวนต์ไม่มี social option ที่เลือก": ["The selected social option is unavailable", "所选社交选项不可用"],
  "ต้องเลือกแผนเดินทางกลับที่ปลอดภัยจากตัวเลือกที่กำหนด": ["Choose a safe return plan", "请选择安全返程计划"],
  "ต้องมีอายุ 20 ปีขึ้นไปสำหรับตัวเลือกแอลกอฮอล์": ["You must be 20+ for the alcohol option", "酒精选项仅限20岁以上"],
  "ต้องยอมรับกฎกิจกรรม": ["Accept the event rules", "请接受活动规则"],
  "ต้องยอมรับการใช้ข้อมูลเพื่อจัดกิจกรรม": ["Accept the event data-use notice", "请接受活动数据使用说明"],
  "ดูราคาที่ร้าน": ["Check price at store", "到商店查看价格"],
};

export function localizeDomainText(value: string): string {
  if (activeLocale === "th") return value;
  const direct = DOMAIN_COPY[value];
  if (direct) return activeLocale === "zh" ? direct[1] : direct[0];
  return value;
}
