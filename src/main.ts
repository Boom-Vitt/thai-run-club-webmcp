import "./styles.css";
import { CLUB_RULES, EVENTS } from "./data";
import { BRAND } from "./brand";
import {
  getLocale,
  formatLocalizedDate,
  initializeLocale,
  LOCALES,
  localizeDomainText,
  localizedEvent,
  localizedRuleBody,
  localeTag,
  paceLabel,
  setLocale,
  socialLabel,
  tr,
  type Locale,
} from "./i18n";
import {
  buildRunnerSupportLoop,
  cancelRegistration,
  checkReadiness,
  clearPendingRegistration,
  confirmPendingRegistration,
  discoverEvents,
  findEvent,
  planRunSchedule,
  readPendingRegistration,
  readRegistrations,
  safeReturnOptions,
  stageRegistration,
} from "./domain";
import type { RunnerSupportLoop } from "./domain";
import {
  getCommerceStatus,
  searchCommerceCatalog,
  type CommerceNeed,
  type CommerceSearchResult,
  type CommerceStatus,
} from "./commerce";
import type {
  ActivityEntry,
  City,
  EventFilters,
  PaceBand,
  Registration,
  RegistrationInput,
  SocialOption,
  TransportMode,
} from "./types";
import {
  cancelPersistentRunPass,
  chatGptSignInPath,
  chatGptSignOutPath,
  getRunnerPassport,
  getRunnerSession,
  persistRunPass,
  persistRunPlan,
  updateRunnerProfile,
  type PassportData,
  type PassportRunPass,
  type SessionData,
} from "./passport";
import { interpretRunnerRequest } from "./intent";
import { registerWebMcpTools } from "./webmcp";

const app = document.querySelector<HTMLDivElement>("#app")!;
if (!app) throw new Error("App root not found");
initializeLocale(localStorage);

const state: {
  filters: EventFilters;
  selectedEventId: string | null;
  activities: ActivityEntry[];
  webMcpSupported: boolean;
  webMcpActionCount: number;
  session: SessionData | null;
  passport: PassportData | null;
  passportStatus: "loading" | "guest" | "ready" | "error";
  commerceStatus: CommerceStatus | null;
  activeSupportLoop: RunnerSupportLoop | null;
} = {
  filters: {},
  selectedEventId: null,
  activities: [
    {
      id: "boot",
      time: new Date().toISOString(),
      source: "system",
      title: "Shared context ready",
      detail: `${EVENTS.length} demo events loaded · human UI active`,
    },
  ],
  webMcpSupported: false,
  webMcpActionCount: 0,
  session: null,
  passport: null,
  passportStatus: "loading",
  commerceStatus: null,
  activeSupportLoop: null,
};

let runWorldMount: { destroy: () => void } | null = null;
let runWorldLoadToken = 0;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(date: string): string {
  return formatLocalizedDate(date);
}

function eventSocialLine(social: SocialOption[]): string {
  if (social.includes("beer_optional")) return tr("Run + optional 20+ social", "วิ่ง + สังสรรค์ 20+ แบบเลือกได้", "跑步 + 20岁以上自选社交");
  if (social.includes("alcohol_free")) return tr("Run + alcohol-free social", "วิ่ง + สังสรรค์แบบไม่มีแอลกอฮอล์", "跑步 + 无酒精社交");
  return socialLabel("run_only");
}

function routeGraphic(eventId: string) {
  const paths: Record<string, string> = {
    "bkk-riverside-5": "M18 104 C58 22 84 146 132 72 S202 20 238 94",
    "bkk-oldtown-7": "M18 96 C44 38 76 44 91 92 S154 146 176 79 S217 30 242 55",
    "cnx-moat-5": "M28 100 L52 36 L171 25 L230 74 L196 128 L76 135 Z",
    "hkt-oldtown-3": "M18 108 C72 98 48 34 109 42 S158 122 238 57",
    "kkc-lake-10": "M35 78 C35 22 218 20 224 75 S55 148 35 78 Z",
    "bkk-green-3": "M22 112 C42 46 89 28 124 81 S191 126 239 50",
  };
  const path = paths[eventId] ?? paths["bkk-riverside-5"];
  return `
    <svg viewBox="0 0 260 160" role="img" aria-label="${tr("Symbolic route map", "ภาพเส้นทางเชิงสัญลักษณ์", "路线示意图")}">
      <path class="route-grid" d="M0 32H260M0 80H260M0 128H260M52 0V160M130 0V160M208 0V160" />
      <path class="route-shadow" d="${path}" />
      <path class="route-line" d="${path}" pathLength="1" />
      <circle class="route-start" cx="18" cy="104" r="6" />
      <circle class="route-finish" cx="238" cy="94" r="8" />
    </svg>`;
}

function renderShell() {
  const exampleRequests = [
    tr("Plan an easy alcohol-free 5K in Bangkok", "อยากวิ่ง 5 กม. ในกรุงเทพแบบชิล ๆ และไม่ดื่ม", "帮我安排曼谷轻松无酒精5公里跑"),
    tr("Compare social runs with an easy return", "ช่วยเทียบงานสาย social ที่มีทางกลับสะดวก", "比较返程方便的社交跑"),
    tr("Open a Bangkok run and plan my return", "เปิดงานวิ่งในกรุงเทพแล้วช่วยวางทางกลับบ้าน", "打开曼谷跑步活动并规划返程"),
    tr("What can I bring, borrow, refill, or repair?", "งานนี้ต้องเตรียมอะไร ยืม เติม หรือซ่อมก่อนซื้อได้ไหม", "我可以携带、借用、补充或维修什么？"),
  ];
  app.innerHTML = `
    <a class="skip-link" href="#runner-agent">${tr("Skip to Runner Agent", "ข้ามไปใช้ Runner Agent", "跳至跑步智能体")}</a>
    <header class="site-header">
      <a class="wordmark" href="#top" aria-label="${tr("Back to top", "กลับด้านบน", "返回顶部")}">
        <span class="wordmark-mark" aria-hidden="true">R/</span>
        <span>${BRAND.workingName} <small>${BRAND.statusLabel}</small></span>
      </a>
      <nav aria-label="${tr("Main navigation", "เมนูหลัก", "主导航")}">
        <a href="#runner-agent">Agent</a>
        <a href="#passport">Passport</a>
        <a href="#events">Schedule</a>
        <a href="#rules">Rules</a>
      </nav>
      <div class="header-actions">
        <div class="locale-switcher" role="group" aria-label="${tr("Choose language", "เลือกภาษา", "选择语言")}">
          ${LOCALES.map((locale) => `<button type="button" data-locale="${locale.code}" class="${getLocale() === locale.code ? "is-active" : ""}" aria-pressed="${getLocale() === locale.code}" aria-label="${locale.label}">${locale.short}</button>`).join("")}
        </div>
        <a class="header-account" id="headerAccount" href="#passport">${tr("Guest", "ผู้เยี่ยมชม", "访客")}</a>
        <button class="header-pass" id="showPassesButton" type="button">
          ${tr("My run pass", "Run Pass ของฉัน", "我的跑步通行证")} <span id="passCount">0</span>
        </button>
      </div>
    </header>

    <main id="top">
      <section class="hero section-shell" id="runner-agent" aria-labelledby="hero-title">
        <div class="hero-copy">
          <p class="eyebrow"><span></span> ${tr("THAILAND · RUNNER AGENT · HUMAN IN CONTROL", "ประเทศไทย · RUNNER AGENT · คุณเป็นคนตัดสินใจ", "泰国 · 跑步智能体 · 由你决定")}</p>
          <h1 id="hero-title">${tr("MOVE WITH\nTHAILAND.", "วิ่งไปกับ\nประเทศไทย", "与泰国\n一起跑") .split("\n").map((line, index) => index === 1 ? `<em>${line}</em>` : line).join("<br />")}</h1>
          <p class="hero-lead">${tr(
            "One intention becomes a visual run week: matched pace, readiness, safe return, and a human-approved Run Pass.",
            "หนึ่งความตั้งใจกลายเป็นสัปดาห์วิ่งที่เห็นภาพ: เพซที่ตรงกัน ความพร้อม ทางกลับที่ปลอดภัย และ Run Pass ที่คุณกดยืนยันเอง",
            "一个想法变成清晰的跑步周计划：匹配配速、检查准备、规划安全返程，并由你亲自确认通行证。",
          )}</p>
          <div class="hero-actions">
            <a class="button button-primary" href="#agent-planner">${tr("Build my run week", "จัดสัปดาห์วิ่งให้ฉัน", "生成我的跑步周")} <span>↘</span></a>
            <a class="button button-ghost" href="#events">${tr("Explore routes", "ดูเส้นทาง", "探索路线")} <span>→</span></a>
          </div>
          <div class="hero-proof" aria-label="${tr("Key facts", "ข้อมูลสำคัญ", "关键信息")}">
            <span><strong>${EVENTS.length}</strong> ${tr("routes", "เส้นทาง", "条路线")}</span>
            <span><strong>14</strong> ${tr("agent actions", "คำสั่ง Agent", "项智能体操作")}</span>
            <span><strong>D1</strong> ${tr("memory", "ความจำ", "记忆")}</span>
            <span><strong>1</strong> ${tr("human decision", "การตัดสินใจของคน", "次人工决定")}</span>
          </div>
          <div class="agent-promise-grid" aria-label="${tr("Runner Agent journey", "เส้นทางการทำงานของ Runner Agent", "跑步智能体流程")}">
            <article><i aria-hidden="true">⌁</i><span>01 / SCOUT</span><strong>${tr("Find the fit", "หารันที่ใช่", "找到合适路线")}</strong></article>
            <article><i aria-hidden="true">⇅</i><span>02 / SORT</span><strong>${tr("Shape the week", "จัดสัปดาห์", "安排一周")}</strong></article>
            <article><i aria-hidden="true">✓</i><span>03 / CHECK</span><strong>${tr("Run the checks", "เช็กความพร้อม", "检查准备")}</strong></article>
            <article><i aria-hidden="true">↗</i><span>04 / PASS</span><strong>${tr("You decide", "คุณตัดสินใจ", "由你决定")}</strong></article>
          </div>
        </div>
        <div class="run-world" role="img" aria-label="${tr("An interactive Thai pace sculpture built from red, white, and blue motion blades", "ประติมากรรมเพซแบบอินเทอร์แอ็กทีฟ สร้างจากเส้นการเคลื่อนไหวสีแดง ขาว และน้ำเงิน", "由红白蓝动态翼片构成的互动泰式配速雕塑")}">
          <div class="run-world-stage" data-run-world>
            <div class="run-world-fallback" aria-hidden="true"><span></span><span></span><span></span><b></b></div>
            <div class="world-index" aria-hidden="true"><span>01</span><i></i><span>04</span></div>
            <div class="world-signal" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
            <div class="world-caption"><strong>${tr("THAI PACE", "จังหวะไทย", "泰式节奏")}</strong><span>${tr("SCROLL TO ORBIT", "เลื่อนเพื่อหมุนมุมมอง", "滚动切换视角")}</span></div>
            <div class="world-credit"><span>BLENDER / THREE.JS</span><b>${tr("ORIGINAL 3D", "สามมิติต้นฉบับ", "原创三维")}</b></div>
          </div>
        </div>
        <section class="agent-desk" id="agent-planner" aria-labelledby="agent-planner-title">
          <div class="agent-desk-top"><span>R/ AGENT RELAY</span><strong>WEEK BOARD</strong><i id="agentIdentityMode">GUEST</i></div>
          <div class="agent-desk-intro">
            <p>${tr("Say it naturally. No commands to memorise.", "เล่าได้ตามธรรมชาติ ไม่ต้องจำคำสั่ง", "自然描述即可，无需记住指令。")}</p>
            <h2 id="agent-planner-title">${tr("Where should we run?", "วันนี้อยากวิ่งที่ไหน?", "我们去哪里跑？")}</h2>
          </div>
          <form class="agent-planner-form" id="agentPlannerForm" aria-label="${tr("Ask Runner Agent to build a run week", "ให้ Runner Agent จัดตารางวิ่ง", "让跑步智能体生成跑步周")}">
            <label class="agent-request-label" for="runnerRequest"><span>${tr("Talk to Runner Agent", "คุยกับ Runner Agent", "与跑步智能体对话")}</span><textarea id="runnerRequest" name="request" maxlength="240" rows="3" placeholder="${exampleRequests[0]}"></textarea></label>
            <button type="submit"><span>✦</span> ${tr("Build the plan", "คิดและจัดให้", "生成计划")} <b>→</b></button>
            <details class="agent-filter-details">
              <summary>${tr("Prefer controls? Set city, distance, pace, and social choice.", "อยากระบุเอง? ปรับเมือง ระยะ เพซ และหลังวิ่ง", "偏好手动设置？选择城市、距离、配速与社交选项。")}</summary>
              <div class="agent-filter-grid">
                <label><span>${tr("City", "เมือง", "城市")}</span><select name="city"><option value="">${tr("Every city", "ทุกเมือง", "所有城市")}</option><option>Bangkok</option><option>Chiang Mai</option><option>Phuket</option><option>Khon Kaen</option></select></label>
                <label><span>${tr("Distance", "ระยะ", "距离")}</span><select name="distance"><option value="">${tr("Any distance", "ทุกระยะ", "不限距离")}</option><option value="3">3 KM</option><option value="5">5 KM</option><option value="7">7 KM</option><option value="10">10 KM</option></select></label>
                <label><span>${tr("Pace", "เพซ", "配速")}</span><select name="pace"><option value="">${tr("Any pace", "ทุกเพซ", "不限配速")}</option><option value="social">${paceLabel("social")}</option><option value="steady">${paceLabel("steady")}</option><option value="tempo">${paceLabel("tempo")}</option></select></label>
                <label><span>${tr("After the run", "หลังวิ่ง", "跑后")}</span><select name="social"><option value="">${tr("Any choice", "ทุกแบบ", "不限")}</option><option value="alcohol_free">${socialLabel("alcohol_free")}</option><option value="run_only">${socialLabel("run_only")}</option><option value="beer_optional">${socialLabel("beer_optional")}</option></select></label>
              </div>
            </details>
          </form>
          <div class="agent-suggestions" aria-label="${tr("Runner Agent examples", "ตัวอย่างที่พูดกับ Runner Agent ได้", "跑步智能体示例")}">
            ${exampleRequests.map((request) => `<button type="button" data-runner-request="${escapeHtml(request)}">“${escapeHtml(request)}”</button>`).join("")}
          </div>
          <div class="agent-plan-summary" id="agentPlanSummary" role="status" aria-live="polite"></div>
          <div class="agent-schedule-board" id="agentScheduleBoard"></div>
          <aside class="support-loop" id="runnerSupportLoop" aria-live="polite" hidden></aside>
          <div class="agent-save-bar">
            <p id="saveWeekHint">${tr("The plan works now · Sign in only to remember it", "จัดตารางได้ทันที · Sign in เมื่อต้องการให้ Agent จำ", "计划立即可用 · 仅在需要记忆时登录")}</p>
            <button id="saveWeekButton" type="button">${tr("SAVE TO PASSPORT", "บันทึกใน PASSPORT", "保存至通行证")} <span>↗</span></button>
          </div>
        </section>
      </section>

      <section class="ticker" aria-label="${tr("Runner principles", "หลักการกิจกรรม", "跑者原则")}">
        <div>${tr("BUILD MY WEEK", "จัดสัปดาห์ของฉัน", "生成我的一周")} <span>✦</span> ${tr("USE WHAT I HAVE", "ใช้ของที่มี", "先用已有装备")} <span>✦</span> ${tr("BORROW · REFILL · REPAIR", "ยืม · เติม · ซ่อม", "借用 · 补充 · 维修")} <span>✦</span> ${tr("HUMAN MAKES THE CALL", "คนเป็นผู้ตัดสินใจ", "由人做决定")} <span>✦</span></div>
      </section>

      <section class="passport-section section-shell" id="passport" aria-labelledby="passport-title">
        <div class="passport-heading">
          <p class="eyebrow"><span></span> ${tr("PERSISTENT RUNNER MEMORY", "ความจำของนักวิ่ง", "持久跑者记忆")}</p>
          <h2 id="passport-title">RUNNER<br /><em>PASSPORT.</em></h2>
          <p>${tr("Your private place for remembered cities, pace, goals, saved weeks, and human-confirmed passes.", "พื้นที่ส่วนตัวที่ให้ Runner Agent จำเมือง เพซ เป้าหมาย ตารางที่บันทึก และ Run Pass ที่คุณยืนยันเอง", "你的私密空间，用于记住城市、配速、目标、已保存计划与本人确认的通行证。")}</p>
        </div>
        <div class="passport-grid">
          <article class="passport-card" id="passportCard" aria-live="polite">
            <div class="passport-loading"><span>R/</span><p>${tr("Opening Runner Passport…", "กำลังเปิด Runner Passport…", "正在打开跑者通行证…")}</p></div>
          </article>
          <section class="passport-ledger" id="passportLedger" aria-label="${tr("Saved run weeks", "สัปดาห์วิ่งที่บันทึก", "已保存的跑步周")}">
            <div class="passport-loading"><span>00</span><p>${tr("Reading saved weeks…", "กำลังอ่านตารางที่บันทึก…", "正在读取已保存计划…")}</p></div>
          </section>
        </div>
      </section>

      <section class="events-section section-shell" id="events" aria-labelledby="events-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow"><span></span> CURATED DEMO EVENTS</p>
            <h2 id="events-title">${tr("PICK A CITY.<br />FIND YOUR PACE.", "เลือกเมือง<br />เลือกเพซของคุณ", "选择城市<br />找到你的配速")}</h2>
          </div>
          <p>${tr("Visual route cards make every choice scannable. These are fictional demo events and require organiser verification before launch.", "การ์ดเส้นทางช่วยให้เทียบได้จากภาพ อีเวนต์ทั้งหมดเป็นข้อมูลเดโมและต้องได้รับการยืนยันจากผู้จัดก่อนใช้งานจริง", "路线卡片让选择一目了然。所有活动均为虚构演示，上线前须由主办方核实。")}</p>
        </div>
        <form class="filter-rail" id="eventFilters" aria-label="${tr("Event filters", "ตัวกรองอีเวนต์", "活动筛选")}">
          <label>
            <span>${tr("City", "เมือง", "城市")}</span>
            <select name="city">
              <option value="">${tr("Every city", "ทุกเมือง", "所有城市")}</option>
              <option>Bangkok</option>
              <option>Chiang Mai</option>
              <option>Phuket</option>
              <option>Khon Kaen</option>
            </select>
          </label>
          <label>
            <span>${tr("Distance", "ระยะ", "距离")}</span>
            <select name="distance">
              <option value="">${tr("Any distance", "ทุกระยะ", "不限距离")}</option>
              <option value="3">3 KM</option>
              <option value="5">5 KM</option>
              <option value="7">7 KM</option>
              <option value="10">10 KM</option>
            </select>
          </label>
          <label>
            <span>${tr("Pace", "เพซ", "配速")}</span>
            <select name="pace">
              <option value="">${tr("Any pace", "ทุกเพซ", "不限配速")}</option>
              <option value="social">${paceLabel("social")}</option>
              <option value="steady">${paceLabel("steady")}</option>
              <option value="tempo">${paceLabel("tempo")}</option>
            </select>
          </label>
          <label>
            <span>${tr("After the run", "หลังวิ่ง", "跑后")}</span>
            <select name="social">
              <option value="">${tr("Any choice", "ทุกแบบ", "不限")}</option>
              <option value="alcohol_free">${socialLabel("alcohol_free")}</option>
              <option value="beer_optional">${socialLabel("beer_optional")}</option>
              <option value="run_only">${socialLabel("run_only")}</option>
            </select>
          </label>
          <button class="filter-reset" type="reset">Reset ↺</button>
        </form>
        <div class="events-meta"><p><strong id="eventCount">${EVENTS.length}</strong> ${tr("runs available", "รายการที่เลือกได้", "条可选路线")}</p><p>${tr("Demo data · not live events", "ข้อมูลเดโม · ไม่ใช่อีเวนต์จริง", "演示数据 · 非真实活动")}</p></div>
        <div class="event-grid" id="eventGrid"></div>
      </section>

      <section class="agent-section" id="webmcp" aria-labelledby="agent-title">
        <div class="section-shell agent-layout">
          <div class="agent-copy">
            <p class="eyebrow eyebrow-light"><span></span> RUNNER AGENT RELAY</p>
            <h2 id="agent-title">SCOUT. SORT.<br /><em>CHECK. HAND OFF.</em></h2>
            <p>${tr("The agent turns intent into visible actions: scout, sort, check, plan the return, and stop for your confirmation.", "Agent เปลี่ยนเป้าหมายให้เป็นขั้นตอนที่มองเห็นได้: ค้นหา เรียง เช็ก วางทางกลับ และหยุดรอให้คุณยืนยัน", "智能体把意图转为可见操作：探索、排序、检查、规划返程，并停下来等待你确认。")}</p>
            <div class="agent-status" id="webMcpStatus" role="status">
              <span class="status-dot"></span>
              <div><strong>Checking WebMCP…</strong><small>Human interface is already available</small></div>
            </div>
            <div class="agent-steps">
              <article><span>01</span><div><h3>BUILD THE BOARD</h3><p>${tr("City · distance · pace · social choice", "เมือง · ระยะ · เพซ · ตัวเลือกหลังวิ่ง", "城市 · 距离 · 配速 · 社交选择")}</p></div></article>
              <article><span>02</span><div><h3>SHORTLIST THE FIT</h3><p>${tr("Date · time · price · spots · return", "วัน · เวลา · ราคา · ที่ว่าง · ทางกลับ", "日期 · 时间 · 价格 · 名额 · 返程")}</p></div></article>
              <article><span>03</span><div><h3>RUN THE CHECKS</h3><p>${tr("Rules · readiness · water · age", "กฎ · ความพร้อม · น้ำ · อายุ", "规则 · 准备 · 补水 · 年龄")}</p></div></article>
              <article><span>04</span><div><h3>PASS THE BATON</h3><p>${tr("The screen stops for your final call", "หน้าจอหยุดรอให้คุณตัดสินใจ", "屏幕停下，等待你的最终决定")}</p></div></article>
            </div>
          </div>
          <div class="agent-console" aria-label="WebMCP activity">
            <div class="console-top"><span><i></i><i></i><i></i></span><strong>RUNNER AGENT ACTIVITY</strong><small id="toolCount">14 actions</small></div>
            <div class="console-prompt">
              <span>YOU</span>
              <p id="agentPromptText">“${tr("Show every run and put my next move first", "เปิดตารางวิ่งทั้งหมด แล้วจัดสิ่งที่ฉันทำต่อได้ไว้ก่อน", "显示所有路线，并优先给出下一步") }”</p>
            </div>
            <div class="activity-list" id="activityList" aria-live="polite"></div>
            <div class="console-actions" id="agentQuickActions">
              <button type="button" data-agent-action="plan-week">${tr("Build full week", "จัดตารางทุกงาน", "生成完整一周")}</button>
              <button type="button" data-agent-action="bangkok-easy">${tr("Find Bangkok easy 5K", "หา Bangkok easy 5K", "寻找曼谷轻松5公里")}</button>
              <button type="button" data-agent-action="compare-social">${tr("Compare social runs", "เทียบสาย social", "比较社交跑")}</button>
              <button type="button" data-agent-action="return">${tr("Plan safe return", "วางทางกลับ", "规划安全返程")}</button>
            </div>
          </div>
        </div>
      </section>

      <section class="rules-section section-shell" id="rules" aria-labelledby="rules-title">
        <div class="section-heading rules-heading">
          <div>
            <p class="eyebrow"><span></span> CLUB CODE</p>
            <h2 id="rules-title">GOOD RUN.<br />GOOD CALLS.</h2>
          </div>
          <p>${tr("Run first. Every social choice is optional. Everyone gets home safely.", "วิ่งก่อน การสังสรรค์ทุกแบบเป็นทางเลือก และทุกคนกลับบ้านอย่างปลอดภัย", "跑步优先，所有社交选择均为自愿，每个人都安全回家。")}</p>
        </div>
        <div class="rule-grid">
          ${CLUB_RULES.map(
            (rule, index) => `
              <article class="rule-card">
                <span>${String(index + 1).padStart(2, "0")}</span>
                <h3>${rule.title}</h3>
                <p>${localizedRuleBody(rule.id, rule.body)}</p>
              </article>`,
          ).join("")}
        </div>
        <aside class="legal-note">
          <strong>${tr("IMPORTANT", "สำคัญ", "重要")}</strong>
          <p>${tr("This site does not sell or advertise alcohol. Every demo event needs current licence, venue, insurance, timing, and legal checks before launch.", "เว็บนี้ไม่ขายหรือโฆษณาแอลกอฮอล์ อีเวนต์เดโมทุกงานต้องตรวจใบอนุญาต สถานที่ ประกัน เวลา และกฎหมายปัจจุบันก่อนจัดจริง", "本网站不销售或宣传酒精。所有演示活动上线前均需核查牌照、场地、保险、时间与现行法规。")}</p>
        </aside>
      </section>

      <section class="passes-section section-shell" id="passes" aria-labelledby="passes-title">
        <div class="passes-copy">
          <p class="eyebrow"><span></span> YOUR NEXT RUN</p>
          <h2 id="passes-title">RUN PASSES</h2>
          <p>${tr("Guest passes stay in this browser. Sign-in can keep them in your Passport. The agent prepares; you confirm.", "Guest เก็บ Run Pass ใน browser นี้ ส่วนผู้ที่ sign in จะเก็บไว้ใน Passport โดย Agent เป็นผู้เตรียม แต่คุณเป็นผู้ยืนยัน", "访客通行证保存在当前浏览器；登录后可存入通行证。智能体负责准备，由你确认。")}</p>
        </div>
        <div class="passes-list" id="passesList"></div>
      </section>
    </main>

    <footer>
      <div class="footer-mark">R/<span>${BRAND.workingName}</span></div>
      <p>DEMO PLATFORM · NOT MEDICAL OR LEGAL ADVICE</p>
      <div><a href="#rules">Rules</a><a href="#webmcp">WebMCP</a><a href="#top">Back to top ↑</a></div>
    </footer>

    <dialog class="event-dialog" id="eventDialog" aria-labelledby="eventDialogTitle">
      <button class="dialog-close" type="button" data-close-dialog="eventDialog" aria-label="${tr("Close", "ปิด", "关闭")}">×</button>
      <div id="eventDialogContent"></div>
    </dialog>

    <dialog class="registration-dialog" id="registrationDialog" aria-labelledby="registrationTitle">
      <button class="dialog-close" type="button" data-close-dialog="registrationDialog" aria-label="${tr("Close", "ปิด", "关闭")}">×</button>
      <div id="registrationContent"></div>
    </dialog>

    <dialog class="confirmation-dialog" id="confirmationDialog" aria-labelledby="confirmationTitle">
      <button class="dialog-close" type="button" data-close-dialog="confirmationDialog" aria-label="${tr("Close", "ปิด", "关闭")}">×</button>
      <div id="confirmationContent"></div>
    </dialog>

    <div class="toast" id="toast" role="status" aria-live="polite"></div>
  `;
}

function scheduleDateParts(date: string) {
  const value = new Date(`${date}T12:00:00+07:00`);
  return {
    weekday: new Intl.DateTimeFormat(localeTag(), { weekday: "short" }).format(value),
    day: new Intl.DateTimeFormat(localeTag(), { day: "2-digit" }).format(value),
    month: new Intl.DateTimeFormat(localeTag(), { month: "short" }).format(value),
  };
}

function filterDescription(filters: EventFilters): string {
  const details = [
    filters.city,
    filters.distanceKm ? `${filters.distanceKm} KM` : undefined,
    filters.pace ? paceLabel(filters.pace) : undefined,
    filters.socialPreference ? socialLabel(filters.socialPreference) : undefined,
  ].filter(Boolean);
  return details.length > 0 ? details.join(" · ") : tr("Every city · any distance · chronological", "ทุกเมือง · ทุกระยะ · เรียงตามวัน", "所有城市 · 不限距离 · 按日期排序");
}

function runnerInitials(value: string): string {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "R/";
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join("");
}

function renderPassport() {
  const card = document.querySelector<HTMLElement>("#passportCard");
  const ledger = document.querySelector<HTMLElement>("#passportLedger");
  const headerAccount = document.querySelector<HTMLAnchorElement>("#headerAccount");
  const identityMode = document.querySelector<HTMLElement>("#agentIdentityMode");
  const saveHint = document.querySelector<HTMLElement>("#saveWeekHint");
  if (!card || !ledger || !headerAccount || !identityMode || !saveHint) return;

  if (state.passportStatus === "loading") return;

  if (state.passportStatus === "error") {
    card.innerHTML = `
      <div class="passport-state passport-error">
        <span>OFFLINE /</span><h3>${tr("Passport did not open", "เปิด Passport ไม่สำเร็จ", "通行证无法打开")}</h3>
        <p>${tr("Guest planning still works. Try connecting Runner Passport again.", "ตารางแบบ guest ยังใช้งานได้ตามปกติ แล้วลองเชื่อม Runner Passport อีกครั้ง", "访客规划仍可使用，请再次尝试连接跑者通行证。")}</p>
        <button type="button" id="retryPassport">${tr("Try again", "ลองอีกครั้ง", "重试")} ↻</button>
      </div>`;
    ledger.innerHTML = `<div class="passport-empty"><span>LOCAL MODE</span><p>${tr("New plans work, but will not be saved to the database yet.", "แผนใหม่ยังจัดได้ แต่จะยังไม่ถูกบันทึกลงฐานข้อมูล", "仍可生成新计划，但暂不会保存至数据库。")}</p></div>`;
    document.querySelector<HTMLButtonElement>("#retryPassport")?.addEventListener("click", () => void initializePassport());
    return;
  }

  if (!state.session?.authenticated || !state.session.user) {
    const signIn = chatGptSignInPath("/#passport");
    headerAccount.textContent = tr("Sign in", "เข้าสู่ระบบ", "登录");
    headerAccount.href = signIn;
    headerAccount.target = "_top";
    identityMode.textContent = "GUEST";
    saveHint.textContent = tr("The plan works now · Sign in only to remember it", "แผนพร้อมใช้แล้ว · Sign in เมื่อต้องการให้ Agent จำ", "计划立即可用 · 仅在需要记忆时登录");
    card.innerHTML = `
      <div class="passport-cover">
        <div><span>R/</span><small>RUNNER ID / OPTIONAL</small></div>
        <strong>GUEST<br />RUNNER</strong>
        <p>${tr("Plan, explore, check readiness, and prepare a Run Pass without an account.", "ไม่ต้องมีบัญชีก็จัดตาราง ดูรายละเอียด เช็กความพร้อม และเตรียม Run Pass ได้", "无需账户即可规划、查看、检查准备并生成跑步通行证。")}</p>
        <a class="passport-signin" href="${signIn}" target="_top">${tr("SIGN IN WITH CHATGPT", "เข้าสู่ระบบด้วย CHATGPT", "使用 CHATGPT 登录")} <span>↗</span></a>
        <small>${tr("Sign in only to remember your data across visits and devices.", "Sign in เฉพาะเมื่อต้องการบันทึกข้อมูลข้ามอุปกรณ์และการเปิดเว็บครั้งถัดไป", "仅在需要跨设备和跨访问保存数据时登录。")}</small>
      </div>`;
    ledger.innerHTML = `
      <div class="passport-ledger-head"><div><span>AGENT MEMORY</span><h3>WHAT GETS SAVED</h3></div><strong>03</strong></div>
      <div class="passport-memory-list">
        <article><b>01</b><div><strong>Runner profile</strong><p>${tr("City, pace, and weekly goal", "เมือง เพซ และเป้าหมายรายสัปดาห์", "城市、配速与每周目标")}</p></div></article>
        <article><b>02</b><div><strong>Saved run weeks</strong><p>${tr("Agent-built schedules and filters", "ตารางที่ Agent จัดและตัวกรองที่ใช้", "智能体生成的计划与筛选条件")}</p></div></article>
        <article><b>03</b><div><strong>Run Passes</strong><p>${tr("Passes you reviewed and confirmed", "รายการที่คุณตรวจและกดยืนยันเองแล้ว", "由你检查并确认的通行证")}</p></div></article>
      </div>`;
    return;
  }

  const passport = state.passport;
  const user = state.session.user;
  const profile = passport?.profile ?? state.session.profile;
  const savedPlans = passport?.savedPlans ?? [];
  const passes = passport?.passes ?? [];
  const activePasses = passes.filter((pass) => pass.status === "confirmed").length;
  const displayName = profile?.displayName ?? user.displayName;
  headerAccount.textContent = runnerInitials(displayName);
  headerAccount.href = "#passport";
  headerAccount.removeAttribute("target");
  identityMode.textContent = tr("MEMORY ON", "เปิดความจำ", "记忆已开启");
  saveHint.textContent = tr(
    `${savedPlans.length} saved week${savedPlans.length === 1 ? "" : "s"} · Agent memory is on`,
    `บันทึกแล้ว ${savedPlans.length} สัปดาห์ · เปิดความจำของ Agent`,
    `已保存 ${savedPlans.length} 周 · 智能体记忆已开启`,
  );

  card.innerHTML = `
    <div class="passport-id-row"><span class="passport-avatar">${escapeHtml(runnerInitials(displayName))}</span><div><small>RUNNER PASSPORT / ACTIVE</small><h3>${escapeHtml(displayName)}</h3><p>${escapeHtml(user.email)}</p></div><i>DB<br />LIVE</i></div>
    <div class="passport-stamps" aria-label="Runner profile summary">
      <div><small>HOME</small><strong>${escapeHtml(profile?.homeCity ?? "OPEN")}</strong><span>01 / CITY</span></div>
      <div><small>PACE</small><strong>${profile?.preferredPace ? escapeHtml(paceLabel(profile.preferredPace)) : "OPEN"}</strong><span>02 / BAND</span></div>
      <div><small>GOAL</small><strong>${profile?.weeklyGoalKm ?? 10} KM</strong><span>03 / WEEK</span></div>
    </div>
    <form class="passport-form" id="passportProfileForm">
      <label><span>${tr("Passport name", "ชื่อบน Passport", "通行证姓名")}</span><input name="displayName" maxlength="80" value="${escapeHtml(displayName)}" required /></label>
      <label><span>${tr("Home city", "เมืองหลัก", "常驻城市")}</span><select name="homeCity"><option value="">${tr("Not selected", "ยังไม่เลือก", "未选择")}</option>${["Bangkok", "Chiang Mai", "Phuket", "Khon Kaen"].map((city) => `<option${profile?.homeCity === city ? " selected" : ""}>${city}</option>`).join("")}</select></label>
      <label><span>${tr("Preferred pace", "เพซที่ชอบ", "偏好配速")}</span><select name="preferredPace"><option value="">${tr("Not selected", "ยังไม่เลือก", "未选择")}</option>${(["social", "steady", "tempo"] as PaceBand[]).map((pace) => `<option value="${pace}"${profile?.preferredPace === pace ? " selected" : ""}>${paceLabel(pace)}</option>`).join("")}</select></label>
      <label><span>${tr("Weekly goal", "เป้าหมาย / สัปดาห์", "每周目标")}</span><input name="weeklyGoalKm" type="number" min="1" max="100" value="${profile?.weeklyGoalKm ?? 10}" required /></label>
      <button type="submit">${tr("UPDATE PASSPORT", "อัปเดต PASSPORT", "更新通行证")} <span>→</span></button>
    </form>
    <a class="passport-signout" href="${chatGptSignOutPath("/")}" target="_top">Sign out</a>`;

  ledger.innerHTML = `
    <div class="passport-ledger-head"><div><span>AGENT MEMORY</span><h3>SAVED RUN WEEKS</h3></div><strong>${String(savedPlans.length).padStart(2, "0")}</strong></div>
    <div class="passport-scoreline"><span><b>${savedPlans.length}</b> ${tr("weeks", "สัปดาห์", "周")}</span><span><b>${activePasses}</b> ${tr("active passes", "พาสที่ใช้งาน", "张有效通行证")}</span><span><b>${profile?.weeklyGoalKm ?? 10}</b> ${tr("km goal", "กม. เป้าหมาย", "公里目标")}</span></div>
    <div class="saved-week-list">
      ${savedPlans.length === 0
        ? `<div class="passport-empty"><span>NO SAVED WEEK</span><p>${tr("Build a week above, then save it to begin Agent memory.", "จัดตารางด้านบน แล้วกดบันทึกเพื่อเริ่มความจำของ Agent", "在上方生成一周计划，再保存以开启智能体记忆。")}</p></div>`
        : savedPlans.map((plan, index) => `
          <article class="saved-week-ticket">
            <div><span>W${String(savedPlans.length - index).padStart(2, "0")}</span><small>${new Intl.DateTimeFormat(localeTag(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(plan.createdAt))}</small></div>
            <section><strong>${plan.eventIds.length} RUNS · ${plan.totalDistanceKm} KM</strong><p>${escapeHtml(filterDescription(plan.filters))}</p></section>
            <button type="button" data-resume-plan="${escapeHtml(plan.id)}">LOAD ↗</button>
          </article>`).join("")}
    </div>`;

  document.querySelector<HTMLFormElement>("#passportProfileForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const button = form.querySelector<HTMLButtonElement>("button[type='submit']");
    const data = new FormData(form);
    button?.setAttribute("aria-busy", "true");
    if (button) button.disabled = true;
    try {
      const updated = await updateRunnerProfile({
        displayName: String(data.get("displayName") ?? ""),
        homeCity: String(data.get("homeCity") || "") || null,
        preferredPace: (String(data.get("preferredPace") || "") || null) as PaceBand | null,
        weeklyGoalKm: Number(data.get("weeklyGoalKm")),
      });
      if (state.passport) state.passport.profile = updated;
      if (state.session) state.session.profile = updated;
      renderPassport();
      addActivity({ source: "human", title: "Runner Passport updated", detail: `${updated.weeklyGoalKm} KM weekly goal` });
      showToast(tr("Runner Passport saved", "บันทึก Runner Passport แล้ว", "跑者通行证已保存"));
    } catch (error) {
      showToast(error instanceof Error ? error.message : tr("Passport could not be saved", "บันทึก Passport ไม่สำเร็จ", "通行证无法保存"), true);
    } finally {
      button?.removeAttribute("aria-busy");
      if (button) button.disabled = false;
    }
  });

  document.querySelectorAll<HTMLButtonElement>("[data-resume-plan]").forEach((button) => {
    button.addEventListener("click", () => {
      const plan = savedPlans.find((candidate) => candidate.id === button.dataset.resumePlan);
      if (!plan) return;
      const input: Record<string, unknown> = {};
      if (plan.filters.city) input.city = plan.filters.city;
      if (plan.filters.distanceKm) input.distance_km = plan.filters.distanceKm;
      if (plan.filters.pace) input.pace = plan.filters.pace;
      if (plan.filters.socialPreference) input.social_preference = plan.filters.socialPreference;
      void executeSchedulePlan(input, `“${tr("Open saved week", "เปิดตารางที่บันทึกไว้", "打开已保存计划")}: ${filterDescription(plan.filters)}”`);
      document.querySelector("#runner-agent")?.scrollIntoView({ behavior: "smooth" });
    });
  });
}

async function refreshPassportData(): Promise<PassportData> {
  const passport = await getRunnerPassport();
  state.passport = passport;
  state.session = { authenticated: passport.authenticated, user: passport.user, profile: passport.profile };
  state.passportStatus = "ready";
  renderPassport();
  refreshPasses();
  return passport;
}

async function initializePassport() {
  state.passportStatus = "loading";
  try {
    const session = await getRunnerSession();
    state.session = session;
    if (!session.authenticated) {
      state.passport = null;
      state.passportStatus = "guest";
      renderPassport();
      return;
    }
    await refreshPassportData();
    addActivity({ source: "system", title: "Runner memory connected", detail: "Profile, saved weeks, and Run Passes loaded from D1" });
  } catch (error) {
    state.passportStatus = "error";
    renderPassport();
    console.warn("Runner Passport unavailable", error);
  }
}

function syncFilterForm(formId: string, filters: EventFilters) {
  const form = document.querySelector<HTMLFormElement>(`#${formId}`);
  if (!form) return;
  const setValue = (name: string, value: string | number | undefined) => {
    const field = form.elements.namedItem(name);
    if (field instanceof HTMLSelectElement) field.value = value === undefined ? "" : String(value);
  };
  setValue("city", filters.city);
  setValue("distance", filters.distanceKm);
  setValue("pace", filters.pace);
  setValue("social", filters.socialPreference);
}

function renderAgentSchedule(filters: EventFilters) {
  const summary = document.querySelector<HTMLDivElement>("#agentPlanSummary");
  const board = document.querySelector<HTMLDivElement>("#agentScheduleBoard");
  if (!summary || !board) return;

  const plan = planRunSchedule(filters);
  state.filters = { ...filters };
  syncFilterForm("agentPlannerForm", filters);
  syncFilterForm("eventFilters", filters);
  renderEvents();

  summary.innerHTML = `
    <div><span>AGENT PLAN</span><strong>${tr(`${plan.count} run${plan.count === 1 ? "" : "s"} matched`, `ตรงเงื่อนไข ${plan.count} งาน`, `匹配 ${plan.count} 条路线`)}</strong></div>
    <p>${escapeHtml(filterDescription(filters))} · ${tr(`${plan.totalDistanceKm} KM total`, `รวม ${plan.totalDistanceKm} KM`, `共 ${plan.totalDistanceKm} 公里`)}</p>`;

  if (plan.events.length === 0) {
    board.innerHTML = `
      <div class="agent-schedule-empty">
        <strong>${tr("No run matches every choice yet", "ยังไม่มี run ที่ตรงทุกข้อ", "暂无完全匹配的路线")}</strong>
        <p>${tr("Remove one filter and let Runner Agent rebuild the week.", "ลดเงื่อนไขหนึ่งอย่างแล้วให้ Runner Agent จัดตารางใหม่", "减少一个筛选条件，让跑步智能体重新生成。")}</p>
        <button type="button" data-agent-action="plan-week">${tr("Show every run", "เปิดตารางทั้งหมด", "显示所有路线")}</button>
      </div>`;
  } else {
    board.innerHTML = plan.events.map((sourceEvent, index) => {
      const completeEvent = findEvent(sourceEvent.id);
      if (!completeEvent) return "";
      const event = localizedEvent(completeEvent);
      const date = scheduleDateParts(event.date);
      return `
        <article class="agent-schedule-row ${index === 0 ? "is-next" : ""}">
          <time datetime="${event.date}T${event.startTime}:00+07:00"><span>${date.weekday}</span><strong>${date.day}</strong><small>${date.month}</small></time>
          <div class="agent-schedule-main">
            <span>${index === 0 ? "NEXT MATCH" : `OPTION ${String(index + 1).padStart(2, "0")}`}</span>
            <strong>${escapeHtml(event.city)} · ${escapeHtml(event.neighborhood)}</strong>
            <p>${event.distanceKm} KM · ${event.paceBands.map((pace) => paceLabel(pace)).join(" / ")}</p>
          </div>
          <div class="agent-schedule-meta"><strong>${event.startTime}</strong><small>${tr(`${event.spotsLeft} spots`, `เหลือ ${event.spotsLeft} ที่`, `剩余 ${event.spotsLeft} 个名额`)}</small></div>
          <button type="button" data-schedule-open="${event.id}" aria-label="${tr(`Open ${event.city} ${event.distanceKm} kilometre details`, `เปิดรายละเอียด ${event.city} ${event.distanceKm} กิโลเมตร`, `打开 ${event.city} ${event.distanceKm} 公里详情`)}">↗</button>
        </article>`;
    }).join("");
  }

  board.querySelectorAll<HTMLButtonElement>("[data-schedule-open]").forEach((button) => {
    button.addEventListener("click", () => openEvent(button.dataset.scheduleOpen ?? "", "human"));
  });
  board.querySelectorAll<HTMLButtonElement>("[data-agent-action]").forEach((button) => {
    button.addEventListener("click", () => void runAgentAction(button.dataset.agentAction ?? ""));
  });
}

function renderRunnerSupportLoop(loop: RunnerSupportLoop) {
  const panel = document.querySelector<HTMLElement>("#runnerSupportLoop");
  if (!panel) return;
  state.activeSupportLoop = loop;
  const status = state.commerceStatus;
  const statusLabel = status?.configured
    ? `CATALOG MCP CONNECTED · ${status.storeName?.toUpperCase()}`
    : status?.state === "invalid_configuration"
      ? "STORE CONNECTION NEEDS FIXING"
      : "CONNECTOR READY · STORE REQUIRED";
  const merchantControls = loop.unresolvedNeeds.length === 0
    ? `<p>${tr("Nothing else needs searching. Continue with Runner Commons without opening a store.", "แผนนี้ไม่มีของที่ต้องค้นหาเพิ่ม ใช้ Runner Commons ต่อได้โดยไม่ต้องเปิดร้านค้า", "无需再搜索物品，可继续使用跑者共享，无需打开商店。")}</p>`
    : status?.configured
      ? `<form class="merchant-search-form" id="merchantSearchForm">
          <label><span>${tr("Remaining need", "ของที่ยังขาด", "仍需物品")}</span><select name="need">${loop.unresolvedNeeds.map((need) => `<option value="${need.key}">${escapeHtml(localizeDomainText(need.label))}</option>`).join("")}</select></label>
          <button type="submit">${tr("Search the live catalogue", "ค้นหาแค็ตตาล็อกจริง", "搜索实时目录")} <b>↗</b></button>
        </form>`
      : `<p>${tr("The connector is ready, but no partner store is attached, so no query leaves this site.", "ตัวเชื่อมต่อทำงานแล้ว แต่ยังไม่ผูกร้านพันธมิตร จึงยังไม่ส่งคำค้นไปยังร้านภายนอก", "连接器已就绪，但尚未绑定合作商店，因此不会向外部商店发送查询。")}</p>`;
  const supportEvent = localizedEvent(findEvent(loop.eventId)!);
  const eventLabel = `${supportEvent.city} · ${supportEvent.neighborhood} · ${supportEvent.distanceKm} KM`;
  panel.hidden = false;
  panel.innerHTML = `
    <div class="support-loop-head"><div><span>RUNNER COMMONS / SHOP LAST</span><strong>${escapeHtml(eventLabel)}</strong></div><b>↺</b></div>
    <div class="support-loop-grid">
      ${loop.steps.map((step, index) => `
        <article><small>0${index + 1} / ${step.mode.toUpperCase()}</small><strong>${escapeHtml(localizeDomainText(step.title))}</strong><p>${escapeHtml(localizeDomainText(step.action))}</p><em>${escapeHtml(localizeDomainText(step.reason))}</em></article>`).join("")}
    </div>
    <div class="support-loop-giveback"><span>GIVE BACK</span><p>${escapeHtml(localizeDomainText(loop.giveBack))}</p></div>
    <div class="support-loop-handoff"><span>NEXT CONNECTOR / HUMAN FIRST</span><p>${escapeHtml(localizeDomainText(loop.merchantHandoff.rule))}</p></div>
    <section class="merchant-connector" aria-labelledby="merchantConnectorTitle">
      <div><span id="merchantConnectorTitle">${escapeHtml(statusLabel)}</span><strong>NEED, NOT MERCH.</strong></div>
      ${merchantControls}
      <div class="merchant-results" id="merchantSearchResults" aria-live="polite"></div>
    </section>`;
  bindMerchantSearch(loop);
}

function formatMerchantPrice(price: CommerceSearchResult["products"][number]["price"]): string {
  if (!price) return tr("Check price at store", "ดูราคาที่ร้าน", "到商店查看价格");
  try {
    return new Intl.NumberFormat(localeTag(), {
      style: "currency",
      currency: price.currency,
    }).format(price.amountMinor / 100);
  } catch {
    return `${price.amountMinor / 100} ${price.currency}`;
  }
}

function renderMerchantSearchResult(result: CommerceSearchResult) {
  const target = document.querySelector<HTMLDivElement>("#merchantSearchResults");
  if (!target) return;
  const products = result.products.length > 0
    ? result.products.map((product) => `
        <article class="merchant-result-card">
          <small>${product.available === false ? "UNAVAILABLE" : "MERCHANT RESULT"}</small>
          <strong>${escapeHtml(product.title)}</strong>
          <p>${escapeHtml(product.description || tr("Review details, terms, and fit directly with the store.", "ตรวจรายละเอียด เงื่อนไข และความเหมาะสมกับร้านโดยตรง", "请直接向商店核对详情、条款与适用性。"))}</p>
          <div><b>${escapeHtml(formatMerchantPrice(product.price))}</b>${product.url ? `<a href="${escapeHtml(product.url)}" target="_blank" rel="noopener noreferrer">${tr("Review at store", "ตรวจที่ร้าน", "到商店查看")} ↗</a>` : ""}</div>
        </article>`).join("")
    : `<div class="merchant-empty"><strong>${tr("No matching result yet", "ร้านนี้ยังไม่มีผลลัพธ์ที่ตรง", "暂无匹配结果")}</strong><p>${tr("Return to use, borrow, refill, or repair without creating a cart.", "กลับไปใช้ ยืม เติม หรือซ่อม โดยไม่สร้างตะกร้า", "返回使用、借用、补充或维修，不创建购物车。")}</p></div>`;
  target.innerHTML = `
    <div class="merchant-result-head"><span>LIVE EXTERNAL RESULTS</span><strong>${escapeHtml(localizeDomainText(result.needLabel))}</strong><p>${tr(`${result.products.length} results · no cart or checkout`, `${result.products.length} รายการ · ยังไม่มี cart หรือ checkout`, `${result.products.length} 个结果 · 不创建购物车或结账`)}</p></div>
    <div class="merchant-result-grid">${products}</div>`;
}

async function searchRunnerNeed(eventId: string, need: CommerceNeed): Promise<CommerceSearchResult> {
  if (state.activeSupportLoop?.eventId !== eventId) {
    renderRunnerSupportLoop(buildRunnerSupportLoop(eventId));
  }
  const target = document.querySelector<HTMLDivElement>("#merchantSearchResults");
  if (target) target.innerHTML = `<div class="merchant-loading"><span></span><p>${tr("Asking Shopify Storefront MCP…", "กำลังถาม Shopify Storefront MCP…", "正在查询 Shopify Storefront MCP…")}</p></div>`;
  try {
    const result = await searchCommerceCatalog({ eventId, need });
    renderMerchantSearchResult(result);
    return result;
  } catch (error) {
    if (target) {
      const message = error instanceof Error ? error.message : tr("Catalogue search failed", "ค้นหาแค็ตตาล็อกไม่สำเร็จ", "目录搜索失败");
      target.innerHTML = `<div class="merchant-empty is-error"><strong>${tr("Live search is unavailable", "ยังค้นหาของจริงไม่ได้", "实时搜索不可用")}</strong><p>${escapeHtml(message)}</p></div>`;
    }
    throw error;
  }
}

function bindMerchantSearch(loop: RunnerSupportLoop) {
  document.querySelector<HTMLFormElement>("#merchantSearchForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const need = String(new FormData(form).get("need") ?? "") as CommerceNeed;
    const button = form.querySelector<HTMLButtonElement>("button[type='submit']");
    if (button) button.disabled = true;
    void searchRunnerNeed(loop.eventId, need)
      .then((result) => showToast(tr(`Found ${result.products.length} results for you to review`, `พบ ${result.products.length} รายการให้คุณตรวจเอง`, `找到 ${result.products.length} 个结果供你查看`)))
      .catch((error) => showToast(error instanceof Error ? error.message : tr("Search failed", "ค้นหาไม่สำเร็จ", "搜索失败"), true))
      .finally(() => { if (button) button.disabled = false; });
  });
}

async function initializeCommerceStatus() {
  try {
    state.commerceStatus = await getCommerceStatus();
  } catch {
    state.commerceStatus = null;
  }
  if (state.activeSupportLoop) renderRunnerSupportLoop(state.activeSupportLoop);
}

function renderEvents() {
  const grid = document.querySelector<HTMLDivElement>("#eventGrid");
  const count = document.querySelector<HTMLElement>("#eventCount");
  if (!grid || !count) return;
  const matches = discoverEvents(state.filters);
  count.textContent = String(matches.length);

  if (matches.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <span>0/</span><h3>${tr("No exact run yet", "ยังไม่เจอ run ที่ตรงทุกข้อ", "暂无完全匹配的路线")}</h3>
        <p>${tr("Remove one filter or let the agent find the nearest choice.", "ลองลดตัวกรองหนึ่งอย่าง หรือให้ agent ช่วยหาตัวเลือกที่ใกล้เคียง", "减少一个筛选条件，或让智能体寻找最接近的选择。")}</p>
        <button class="button button-dark" type="button" id="emptyReset">${tr("Show all", "ดูทั้งหมด", "显示全部")}</button>
      </div>`;
    document.querySelector<HTMLButtonElement>("#emptyReset")?.addEventListener("click", resetFilters);
    return;
  }

  grid.innerHTML = matches.map(({ event: sourceEvent }, index) => {
    const event = localizedEvent(sourceEvent);
    return `
    <article class="event-card accent-${event.accent}" data-event-id="${event.id}">
      <div class="event-card-top">
        <span>${event.city.toUpperCase()} / ${event.neighborhood}</span>
        <span>${String(index + 1).padStart(2, "0")}</span>
      </div>
      <div class="event-map">${routeGraphic(event.id)}</div>
      <div class="event-main-fact"><strong>${event.distanceKm}</strong><span>KM<br />${escapeHtml(event.routeLabel.toUpperCase())}</span></div>
      <div class="event-date"><strong>${formatDate(event.date)}</strong><span>${event.startTime}</span></div>
      <div class="event-tags">
        ${event.paceBands.map((pace) => `<span>${paceLabel(pace)}</span>`).join("")}
        <span>${eventSocialLine(event.social)}</span>
      </div>
      <div class="event-card-bottom">
        <div><small>FROM</small><strong>฿${event.priceThb}</strong></div>
        <div><small>LEFT</small><strong>${event.spotsLeft}</strong></div>
        <button type="button" data-open-event="${event.id}" aria-label="${tr(`Open ${event.city} ${event.distanceKm} kilometre details`, `ดูรายละเอียด ${event.city} ${event.distanceKm} กิโลเมตร`, `打开 ${event.city} ${event.distanceKm} 公里详情`)}">${tr("DETAILS", "รายละเอียด", "详情")} <span>↗</span></button>
      </div>
    </article>`;
  }).join("");

  grid.querySelectorAll<HTMLButtonElement>("[data-open-event]").forEach((button) => {
    button.addEventListener("click", () => openEvent(button.dataset.openEvent ?? "", "human"));
  });
}

function renderActivity() {
  const list = document.querySelector<HTMLDivElement>("#activityList");
  if (!list) return;
  list.innerHTML = state.activities.slice(0, 6).map((entry) => `
    <article class="activity-item source-${entry.source}">
      <span>${entry.source === "agent" ? "✦" : entry.source === "human" ? "↗" : "•"}</span>
      <div><strong>${escapeHtml(entry.title)}</strong><p>${escapeHtml(entry.detail)}</p></div>
      <time>${new Intl.DateTimeFormat(localeTag(), { hour: "2-digit", minute: "2-digit" }).format(new Date(entry.time))}</time>
    </article>`).join("");
}

function addActivity(entry: Omit<ActivityEntry, "id" | "time">) {
  state.activities.unshift({
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    time: new Date().toISOString(),
  });
  renderActivity();
}

function openEvent(eventId: string, source: "human" | "agent") {
  const sourceEvent = findEvent(eventId);
  const dialog = document.querySelector<HTMLDialogElement>("#eventDialog");
  const content = document.querySelector<HTMLDivElement>("#eventDialogContent");
  if (!sourceEvent || !dialog || !content) return;
  const event = localizedEvent(sourceEvent);
  state.selectedEventId = eventId;

  content.innerHTML = `
    <div class="dialog-kicker">${event.city.toUpperCase()} · ${event.neighborhood}</div>
    <div class="dialog-hero accent-${event.accent}">
      <div><p>${formatDate(event.date)} · ${event.startTime}</p><h2 id="eventDialogTitle">${event.distanceKm} KM<br /><em>${escapeHtml(event.routeLabel)}</em></h2></div>
      <div class="dialog-route">${routeGraphic(event.id)}</div>
    </div>
    <div class="dialog-grid">
      <section><small>MEET</small><strong>${event.meetingPoint}</strong></section>
      <section><small>FINISH</small><strong>${event.finishVenue}</strong></section>
      <section><small>ROUTE</small><strong>${event.routeNote}</strong></section>
      <section><small>GET HOME</small><strong>${event.transit}</strong></section>
    </div>
    <div class="dialog-options">
      <div><small>PACE GROUPS</small>${event.paceBands.map((pace) => `<span>${paceLabel(pace)}</span>`).join("")}</div>
      <div><small>SOCIAL OPTIONS</small>${event.social.map((option) => `<span>${socialLabel(option)}</span>`).join("")}</div>
    </div>
    <div class="dialog-notice"><strong>CHOICE POLICY</strong><p>${tr("Beer is never bundled with entry and is not required. Alcohol is 20+ only and served separately by a licensed venue.", "เบียร์ไม่รวมในค่าสมัครและไม่จำเป็นต่อการเข้าร่วม ผู้เลือกแอลกอฮอล์ต้องอายุ 20+ และใช้บริการแยกกับสถานที่ที่มีใบอนุญาต", "啤酒不包含在报名费内，也不是参加条件。酒精仅限20岁以上，并由持牌场所独立提供。")}</p></div>
    <div class="dialog-footer">
      <div><small>${event.spotsLeft} / ${event.capacity} spots left</small><strong>฿${event.priceThb}</strong></div>
      <button class="button button-primary" type="button" data-register-event="${event.id}">${tr("Prepare Run Pass", "เตรียม Run Pass", "准备跑步通行证")} <span>→</span></button>
    </div>`;

  content.querySelector<HTMLButtonElement>("[data-register-event]")?.addEventListener("click", () => {
    dialog.close();
    openRegistration(event.id);
  });
  if (!dialog.open) dialog.showModal();
  if (source === "human") {
    addActivity({ source: "human", title: "Opened event details", detail: `${event.city} · ${event.distanceKm} km` });
  }
}

function openRegistration(eventId: string) {
  const sourceEvent = findEvent(eventId);
  const dialog = document.querySelector<HTMLDialogElement>("#registrationDialog");
  const content = document.querySelector<HTMLDivElement>("#registrationContent");
  if (!sourceEvent || !dialog || !content) return;
  const event = localizedEvent(sourceEvent);

  const savedName = state.passport?.profile?.displayName ?? state.session?.user?.displayName ?? "";
  const savedEmail = state.passport?.profile?.email ?? state.session?.user?.email ?? "";
  const storageConsent = state.session?.authenticated
    ? tr("I consent to save this data in Runner Passport for event coordination *", "ฉันยินยอมให้บันทึกข้อมูลนี้ใน Runner Passport เพื่อจัดกิจกรรม *", "我同意将这些数据保存至跑者通行证，用于活动协调 *")
    : tr("I consent to store this data in this browser for a demo Run Pass *", "ฉันยินยอมให้เก็บข้อมูลนี้ใน browser นี้เพื่อสร้าง Run Pass เดโม *", "我同意将这些数据保存在此浏览器，用于生成演示通行证 *");
  content.innerHTML = `
    <div class="form-heading">
      <p class="dialog-kicker">HUMAN CONFIRMATION FLOW</p>
      <h2 id="registrationTitle">${tr("Prepare Run Pass", "เตรียม Run Pass", "准备跑步通行证")}</h2>
      <p>${event.city} · ${event.distanceKm} KM · ${formatDate(event.date)}</p>
    </div>
    <form id="registrationForm" class="registration-form" novalidate>
      <input type="hidden" name="eventId" value="${event.id}" />
      <div class="form-row">
        <label><span>${tr("Runner name", "ชื่อผู้วิ่ง", "跑者姓名")} *</span><input name="runnerName" autocomplete="name" maxlength="80" value="${escapeHtml(savedName)}" required /></label>
        <label><span>${tr("Email", "อีเมล", "电子邮箱")} *</span><input name="email" type="email" autocomplete="email" maxlength="120" value="${escapeHtml(savedEmail)}" required /></label>
      </div>
      <label><span>${tr("Emergency contact", "เบอร์ติดต่อฉุกเฉิน", "紧急联系人")} *</span><input name="emergencyContact" inputmode="tel" autocomplete="tel" maxlength="40" required /></label>
      <div class="form-row">
        <label><span>${tr("Pace group", "กลุ่มเพซ", "配速组")} *</span><select name="pace" required>${event.paceBands.map((pace) => `<option value="${pace}">${paceLabel(pace)}</option>`).join("")}</select></label>
        <label><span>${tr("After the run", "หลังวิ่ง", "跑后")} *</span><select name="socialPreference" id="socialPreference" required>${event.social.map((option) => `<option value="${option}">${socialLabel(option)}</option>`).join("")}</select></label>
      </div>
      <fieldset>
        <legend>${tr("Return plan", "แผนเดินทางกลับ", "返程计划")} *</legend>
        <label class="choice"><input type="radio" name="transportMode" value="transit" checked /><span>${tr("Public transport", "ขนส่งสาธารณะ", "公共交通")}</span></label>
        <label class="choice"><input type="radio" name="transportMode" value="taxi" /><span>${tr("Taxi / ride-hailing", "แท็กซี่ / ride-hailing", "出租车 / 网约车")}</span></label>
        <label class="choice"><input type="radio" name="transportMode" value="walk" /><span>${tr("Walk", "เดินกลับ", "步行")}</span></label>
        <label class="choice"><input type="radio" name="transportMode" value="sober_driver" /><span>${tr("Sober driver", "คนขับที่ไม่ดื่ม", "未饮酒司机")}</span></label>
      </fieldset>
      <label class="check age-check" id="ageCheck"><input type="checkbox" name="age20Plus" /><span>${tr("I am 20+ for the alcohol option and understand the venue will check ID.", "ฉันยืนยันว่ามีอายุ 20 ปีขึ้นไปสำหรับตัวเลือกแอลกอฮอล์ และเข้าใจว่าสถานที่จะตรวจบัตร", "我已满20岁并选择酒精选项，且理解场所会查验身份证件。")}</span></label>
      <label class="check"><input type="checkbox" name="rulesAccepted" required /><span>${tr("I have read and accept the Club Code, including RUN FIRST and NO DRINK & DRIVE *", "ฉันอ่านและยอมรับ Club Code รวมถึง RUN FIRST และ NO DRINK & DRIVE *", "我已阅读并接受跑团守则，包括先跑步与酒后不开车 *")}</span></label>
      <label class="check"><input type="checkbox" name="privacyAccepted" required /><span>${storageConsent}</span></label>
      <div class="form-errors" id="formErrors" role="alert"></div>
      <button class="button button-dark button-full" type="submit">${tr("Review before confirmation", "ตรวจข้อมูลและไปหน้ายืนยัน", "检查后进入确认")} <span>→</span></button>
      <p class="form-footnote">${tr("This does not register you yet. A final review appears next.", "การกดปุ่มนี้ยังไม่สมัคร ระบบจะเปิดสรุปให้คุณยืนยันอีกครั้ง", "此步骤尚未完成报名，下一步会显示最终确认。")}</p>
    </form>`;

  const form = content.querySelector<HTMLFormElement>("#registrationForm");
  const socialSelect = content.querySelector<HTMLSelectElement>("#socialPreference");
  const ageCheck = content.querySelector<HTMLElement>("#ageCheck");
  const updateAgeVisibility = () => ageCheck?.classList.toggle("is-required", socialSelect?.value === "beer_optional");
  socialSelect?.addEventListener("change", updateAgeVisibility);
  updateAgeVisibility();

  form?.addEventListener("submit", (event_) => {
    event_.preventDefault();
    const formData = new FormData(form);
    const input: RegistrationInput = {
      eventId,
      runnerName: String(formData.get("runnerName") ?? ""),
      email: String(formData.get("email") ?? ""),
      emergencyContact: String(formData.get("emergencyContact") ?? ""),
      pace: String(formData.get("pace")) as PaceBand,
      socialPreference: String(formData.get("socialPreference")) as SocialOption,
      age20Plus: formData.get("age20Plus") === "on",
      transportMode: String(formData.get("transportMode")) as TransportMode,
      rulesAccepted: formData.get("rulesAccepted") === "on",
      privacyAccepted: formData.get("privacyAccepted") === "on",
    };
    const result = stageRegistration(localStorage, input);
    const errorBox = content.querySelector<HTMLDivElement>("#formErrors");
    if (result.status === "validation_failed") {
      if (errorBox) errorBox.innerHTML = `<strong>${tr("Check these details", "ยังไปต่อไม่ได้", "请检查以下信息")}</strong><ul>${result.errors.map((error) => `<li>${escapeHtml(localizeDomainText(error))}</li>`).join("")}</ul>`;
      return;
    }
    addActivity({ source: "human", title: "Registration prepared", detail: "Waiting for final human confirmation" });
    dialog.close();
    showPendingConfirmation(input);
  });

  if (!dialog.open) dialog.showModal();
}

function showPendingConfirmation(input: RegistrationInput) {
  const sourceEvent = findEvent(input.eventId);
  const dialog = document.querySelector<HTMLDialogElement>("#confirmationDialog");
  const content = document.querySelector<HTMLDivElement>("#confirmationContent");
  if (!sourceEvent || !dialog || !content) return;
  const event = localizedEvent(sourceEvent);
  const returnPlan = safeReturnOptions(event.id, input.socialPreference);

  content.innerHTML = `
    <div class="confirmation-icon" aria-hidden="true">✓?</div>
    <p class="dialog-kicker">REVIEW BEFORE COMMIT</p>
    <h2 id="confirmationTitle">${tr("You make the call", "คุณเป็นคนตัดสินใจ", "由你做决定")}</h2>
    <p class="confirmation-lead">${tr("The agent can prepare the details. A Run Pass exists only after you confirm.", "Agent เตรียมข้อมูลได้ แต่ Run Pass จะเกิดขึ้นเมื่อคุณกดยืนยันเท่านั้น", "智能体可以准备信息，但只有你确认后才会生成跑步通行证。")}</p>
    <dl class="confirmation-list">
      <div><dt>RUNNER</dt><dd>${escapeHtml(input.runnerName)}</dd></div>
      <div><dt>EVENT</dt><dd>${event.city} · ${event.distanceKm} KM · ${formatDate(event.date)}</dd></div>
      <div><dt>PACE</dt><dd>${paceLabel(input.pace)}</dd></div>
      <div><dt>SOCIAL</dt><dd>${socialLabel(input.socialPreference)}</dd></div>
      <div><dt>GET HOME</dt><dd>${escapeHtml(localizeDomainText(returnPlan.warning))}</dd></div>
    </dl>
    <div class="confirmation-actions">
      <button class="button button-ghost" type="button" id="editPending">${tr("Go back", "กลับไปแก้", "返回修改")}</button>
      <button class="button button-primary" type="button" id="confirmPending">${tr("Confirm Run Pass", "ยืนยัน Run Pass", "确认跑步通行证")} <span>→</span></button>
    </div>`;

  content.querySelector<HTMLButtonElement>("#editPending")?.addEventListener("click", () => {
    dialog.close();
    openRegistration(input.eventId);
  });
  content.querySelector<HTMLButtonElement>("#confirmPending")?.addEventListener("click", async (event) => {
    const button = event.currentTarget as HTMLButtonElement;
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    try {
      const registration = state.session?.authenticated
        ? await persistRunPass(input)
        : confirmPendingRegistration(localStorage);
      if (state.session?.authenticated) {
        clearPendingRegistration(localStorage);
        await refreshPassportData();
      }
      addActivity({ source: "human", title: "Run pass confirmed", detail: registration.id });
      dialog.close();
      refreshPasses();
      showToast(state.session?.authenticated
        ? tr(`${registration.id} saved to Passport`, `บันทึก ${registration.id} ลง Passport แล้ว`, `${registration.id} 已保存至通行证`)
        : tr(`${registration.id} created`, `สร้าง ${registration.id} แล้ว`, `${registration.id} 已生成`));
      document.querySelector("#passes")?.scrollIntoView({ behavior: "smooth" });
    } catch (error) {
      showToast(error instanceof Error ? error.message : tr("Confirmation failed", "ยืนยันไม่สำเร็จ", "确认失败"), true);
    } finally {
      button.disabled = false;
      button.removeAttribute("aria-busy");
    }
  });
  if (!dialog.open) dialog.showModal();
}

function refreshPasses() {
  const list = document.querySelector<HTMLDivElement>("#passesList");
  const count = document.querySelector<HTMLElement>("#passCount");
  if (!list || !count) return;
  const registrations: Array<Registration | PassportRunPass> = state.session?.authenticated
    ? state.passport?.passes ?? []
    : readRegistrations(localStorage);
  const active = registrations.filter((registration) => registration.status === "confirmed");
  count.textContent = String(active.length);

  if (registrations.length === 0) {
    list.innerHTML = `<div class="pass-empty"><span>R/</span><div><strong>${tr("No Run Pass yet", "ยังไม่มี Run Pass", "暂无跑步通行证")}</strong><p>${tr("Choose a route or ask the agent to prepare one.", "เลือกอีเวนต์ หรือให้ Agent เตรียมการสมัครให้คุณ", "选择一条路线，或让智能体为你准备。")}</p></div><a href="#events">${tr("Browse runs", "ดูรายการวิ่ง", "浏览路线")} ↗</a></div>`;
    return;
  }

  list.innerHTML = registrations.map((registration) => {
    const sourceEvent = findEvent(registration.eventId);
    if (!sourceEvent) return "";
    const event = localizedEvent(sourceEvent);
    return `
      <article class="run-pass ${registration.status === "cancelled" ? "is-cancelled" : ""}">
        <div class="pass-edge"><span>R/</span><small>${registration.status.toUpperCase()}</small></div>
        <div class="pass-body">
          <p>${event.city.toUpperCase()} / ${event.neighborhood}</p>
          <h3>${event.distanceKm} KM <em>${escapeHtml(event.routeLabel)}</em></h3>
          <div><span>${formatDate(event.date)} · ${event.startTime}</span><span>${paceLabel(registration.pace)}</span><span>${socialLabel(registration.socialPreference)}</span></div>
          ${registration.status === "confirmed" ? `<button type="button" data-cancel-pass="${escapeHtml(registration.id)}">${tr("Cancel Run Pass", "ยกเลิก Run Pass", "取消跑步通行证")}</button>` : ""}
        </div>
        <div class="pass-code"><span>${escapeHtml(registration.id)}</span><div aria-hidden="true">▌▐▌▌▐▌▐</div></div>
      </article>`;
  }).join("");

  list.querySelectorAll<HTMLButtonElement>("[data-cancel-pass]").forEach((button) => {
    button.addEventListener("click", async () => {
      const passId = button.dataset.cancelPass ?? "";
      if (!window.confirm(tr(`Cancel ${passId}?`, `ยืนยันยกเลิก ${passId}?`, `确认取消 ${passId}？`))) return;
      button.disabled = true;
      try {
        await cancelPassForAgent(passId);
        addActivity({ source: "human", title: "Run pass cancelled", detail: passId });
        refreshPasses();
        showToast(tr(`${passId} cancelled`, `ยกเลิก ${passId} แล้ว`, `${passId} 已取消`));
      } catch (error) {
        showToast(error instanceof Error ? error.message : tr("Cancellation failed", "ยกเลิกไม่สำเร็จ", "取消失败"), true);
      } finally {
        button.disabled = false;
      }
    });
  });
}

function resetFilters() {
  const form = document.querySelector<HTMLFormElement>("#eventFilters");
  form?.reset();
  state.filters = {};
  renderEvents();
}

function showToast(message: string, isError = false) {
  const toast = document.querySelector<HTMLDivElement>("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.toggle("is-error", isError);
  toast.classList.add("is-visible");
  window.setTimeout(() => toast.classList.remove("is-visible"), 3400);
}

function bindUi() {
  document.querySelectorAll<HTMLButtonElement>("[data-locale]").forEach((button) => {
    button.addEventListener("click", () => {
      const locale = button.dataset.locale as Locale;
      if (locale === getLocale()) return;
      setLocale(locale, localStorage);
      renderLocalizedInterface();
      showToast(tr("Language changed", "เปลี่ยนภาษาแล้ว", "语言已切换"));
    });
  });
  document.querySelector<HTMLFormElement>("#eventFilters")?.addEventListener("change", (event) => {
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    state.filters = {
      city: (data.get("city") || undefined) as City | undefined,
      distanceKm: data.get("distance") ? Number(data.get("distance")) : undefined,
      pace: (data.get("pace") || undefined) as PaceBand | undefined,
      socialPreference: (data.get("social") || undefined) as SocialOption | undefined,
    };
    renderEvents();
  });
  document.querySelector<HTMLFormElement>("#eventFilters")?.addEventListener("reset", () => {
    window.setTimeout(() => {
      state.filters = {};
      renderEvents();
    }, 0);
  });
  document.querySelector<HTMLButtonElement>("#showPassesButton")?.addEventListener("click", () => {
    document.querySelector("#passes")?.scrollIntoView({ behavior: "smooth" });
  });
  document.querySelectorAll<HTMLButtonElement>("[data-close-dialog]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelector<HTMLDialogElement>(`#${button.dataset.closeDialog}`)?.close();
    });
  });
  document.querySelectorAll<HTMLDialogElement>("dialog").forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
  });
  document.querySelector<HTMLFormElement>("#agentPlannerForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const input: Record<string, unknown> = {};
    if (data.get("city")) input.city = String(data.get("city"));
    if (data.get("distance")) input.distance_km = Number(data.get("distance"));
    if (data.get("pace")) input.pace = String(data.get("pace"));
    if (data.get("social")) input.social_preference = String(data.get("social"));
    const request = String(data.get("request") ?? "").trim();
    const fallback = {
      city: input.city as City | undefined,
      distanceKm: input.distance_km as number | undefined,
      pace: input.pace as PaceBand | undefined,
      socialPreference: input.social_preference as SocialOption | undefined,
    };
    if (request) {
      void runNaturalAgentRequest(request, fallback);
    } else {
      void executeSchedulePlan(input, `“${tr("Build a plan for", "จัดตารางให้ฉัน", "为我生成计划")}: ${filterDescription(fallback)}”`);
    }
  });
  document.querySelectorAll<HTMLButtonElement>("[data-runner-request]").forEach((button) => {
    button.addEventListener("click", () => {
      const request = button.dataset.runnerRequest ?? "";
      const field = document.querySelector<HTMLTextAreaElement>("#runnerRequest");
      if (field) field.value = request;
      void runNaturalAgentRequest(request);
    });
  });
  document.querySelectorAll<HTMLButtonElement>("[data-agent-preset]").forEach((button) => {
    button.addEventListener("click", () => void runAgentAction(button.dataset.agentPreset ?? ""));
  });
  document.querySelectorAll<HTMLButtonElement>("[data-agent-action]").forEach((button) => {
    button.addEventListener("click", () => void runAgentAction(button.dataset.agentAction ?? ""));
  });
  document.querySelector<HTMLButtonElement>("#saveWeekButton")?.addEventListener("click", () => void saveCurrentWeek());
}

function renderWebMcpStatus() {
  if (state.webMcpActionCount === 0) return;
  const status = document.querySelector<HTMLDivElement>("#webMcpStatus");
  const toolCount = document.querySelector<HTMLElement>("#toolCount");
  if (toolCount) toolCount.textContent = tr(
    `${state.webMcpActionCount} actions`,
    `${state.webMcpActionCount} คำสั่ง`,
    `${state.webMcpActionCount} 项操作`,
  );
  if (!status) return;
  status.classList.toggle("is-live", state.webMcpSupported);
  status.classList.toggle("is-fallback", !state.webMcpSupported);
  status.innerHTML = state.webMcpSupported
    ? `<span class="status-dot"></span><div><strong>${tr("Runner Agent connected via WebMCP", "Runner Agent เชื่อมต่อผ่าน WebMCP", "跑步智能体已通过 WebMCP 连接")}</strong><small>${tr(`${state.webMcpActionCount} actions ready for the browser agent`, `${state.webMcpActionCount} คำสั่งพร้อมให้ browser agent ใช้งาน`, `${state.webMcpActionCount} 项操作已供浏览器智能体使用`)}</small></div>`
    : `<span class="status-dot"></span><div><strong>${tr("Runner Agent planner is ready", "Runner Agent พร้อมจัดตาราง", "跑步智能体规划器已就绪")}</strong><small>${tr("Connect a WebMCP browser to let an external agent use the same actions", "เชื่อมต่อ browser ที่รองรับ WebMCP เพื่อให้ Agent ภายนอกใช้คำสั่งเดียวกัน", "连接支持 WebMCP 的浏览器，让外部智能体使用相同操作")}</small></div>`;
}

function renderLocalizedInterface() {
  document.documentElement.lang = getLocale() === "zh" ? "zh-CN" : getLocale() === "th" ? "th" : "en";
  runWorldMount?.destroy();
  runWorldMount = null;
  runWorldLoadToken += 1;
  renderShell();
  renderAgentSchedule(state.filters);
  renderActivity();
  renderPassport();
  refreshPasses();
  if (state.activeSupportLoop) renderRunnerSupportLoop(state.activeSupportLoop);
  bindUi();
  renderWebMcpStatus();
  const stage = document.querySelector<HTMLElement>("[data-run-world]");
  if (stage) void mountCurrentRunWorld(stage, runWorldLoadToken);
}

async function mountCurrentRunWorld(stage: HTMLElement, token: number) {
  if (typeof window.WebGLRenderingContext === "undefined") {
    stage.dataset.renderState = "fallback";
    return;
  }
  try {
    const { mountRunWorld } = await import("./run-world");
    const mount = mountRunWorld(stage);
    if (token !== runWorldLoadToken || !stage.isConnected) {
      mount.destroy();
      return;
    }
    runWorldMount = mount;
  } catch (error) {
    stage.dataset.renderState = "fallback";
    console.warn("3D run world unavailable; using static visual", error);
  }
}

function setAgentPrompt(message: string) {
  const prompt = document.querySelector<HTMLParagraphElement>("#agentPromptText");
  if (prompt) prompt.textContent = message;
}

async function executeSchedulePlan(input: Record<string, unknown>, prompt: string) {
  const harness = window.__RUN_SOCIAL_WEBMCP__;
  if (!harness) {
    showToast(tr("Runner Agent is not ready. Try again.", "Runner Agent ยังเริ่มไม่สำเร็จ กรุณาลองอีกครั้ง", "跑步智能体尚未就绪，请重试。"), true);
    return null;
  }
  const submit = document.querySelector<HTMLButtonElement>("#agentPlannerForm button[type='submit']");
  submit?.setAttribute("aria-busy", "true");
  if (submit) submit.disabled = true;
  setAgentPrompt(prompt);
  try {
    const result = await harness.execute("plan_run_schedule", input);
    const count = (result as { count?: number }).count ?? 0;
    showToast(count > 0
      ? tr(`Runner Agent built ${count} run${count === 1 ? "" : "s"}`, `Runner Agent จัดตาราง ${count} งานแล้ว`, `跑步智能体已生成 ${count} 条路线`)
      : tr("No run found. Remove one filter.", "ยังไม่พบงาน ลองลดเงื่อนไขหนึ่งอย่าง", "未找到路线，请减少一个筛选条件。"));
    return result as { count: number; events: Array<{ id: string }> };
  } catch (error) {
    showToast(error instanceof Error ? error.message : "Tool call failed", true);
    return null;
  } finally {
    submit?.removeAttribute("aria-busy");
    if (submit) submit.disabled = false;
  }
}

function filtersToToolInput(filters: EventFilters): Record<string, unknown> {
  const input: Record<string, unknown> = {};
  if (filters.city) input.city = filters.city;
  if (filters.distanceKm) input.distance_km = filters.distanceKm;
  if (filters.pace) input.pace = filters.pace;
  if (filters.socialPreference) input.social_preference = filters.socialPreference;
  if (filters.alcoholFreeRequired) input.alcohol_free_required = true;
  return input;
}

async function runNaturalAgentRequest(request: string, fallback: EventFilters = {}) {
  const intent = interpretRunnerRequest(request, fallback);
  const prompt = `“${request}”`;
  setAgentPrompt(prompt);

  if (intent.action === "show_passport") {
    document.querySelector("#passport")?.scrollIntoView({ behavior: "smooth" });
    showToast(state.session?.authenticated
      ? tr("Runner Passport opened", "เปิด Runner Passport แล้ว", "跑者通行证已打开")
      : tr("Sign in only when you want Agent memory", "Sign in เมื่อต้องการเปิดความจำของ Agent", "仅在需要智能体记忆时登录"));
    return;
  }

  const result = await executeSchedulePlan(filtersToToolInput(intent.filters), prompt);
  if (!result) return;
  const harness = window.__RUN_SOCIAL_WEBMCP__;
  if (!harness) return;

  try {
    if (intent.action === "save_plan") {
      await saveCurrentWeek();
      return;
    }

    const first = result.events[0];
    if (intent.action === "compare") {
      const eventIds = result.events.slice(0, 3).map((event) => event.id);
      if (eventIds.length < 2) {
        showToast(tr("Only one choice matched. Broaden the request.", "เจอตัวเลือกเดียว ลองเล่าเงื่อนไขให้กว้างขึ้น", "仅匹配一个选项，请放宽条件。"), true);
        return;
      }
      await harness.execute("compare_run_events", { event_ids: eventIds });
      showToast(tr(`Runner Agent compared ${eventIds.length} choices`, `Runner Agent เทียบ ${eventIds.length} ตัวเลือกแล้ว`, `跑步智能体已比较 ${eventIds.length} 个选项`));
    } else if ((intent.action === "support_loop" || intent.action === "search_need") && first) {
      const support = await harness.execute("build_runner_support_loop", { event_id: first.id }) as {
        unresolved_needs?: Array<{ key?: CommerceNeed }>;
      };
      if (intent.action === "search_need") {
        const need = intent.commerceNeed ?? support.unresolved_needs?.[0]?.key ?? "repair_essentials";
        const merchant = await harness.execute("search_runner_need", {
          event_id: first.id,
          need,
        }) as { products?: unknown[] };
        showToast(tr(`Found ${merchant.products?.length ?? 0} results for you to review`, `พบ ${merchant.products?.length ?? 0} รายการให้คุณตรวจเอง`, `找到 ${merchant.products?.length ?? 0} 个结果供你查看`));
      } else {
        showToast(tr("Runner Commons Loop is ready", "Runner Commons Loop พร้อมแล้ว", "跑者共享循环已就绪"));
      }
    } else if (intent.action === "safe_return" && first) {
      const safeReturn = await harness.execute("get_safe_return_options", {
        event_id: first.id,
        social_preference: intent.filters.socialPreference ?? "alcohol_free",
      }) as { warning?: string };
      const summary = document.querySelector<HTMLDivElement>("#agentPlanSummary");
      if (summary) summary.innerHTML = `<div><span>SAFE RETURN</span><strong>${tr("Run selected. Return planned.", "เลือก run และวางทางกลับแล้ว", "路线已选择，返程已规划。")}</strong></div><p>${escapeHtml(localizeDomainText(safeReturn.warning ?? tr("Choose a return before the run", "เลือกทางกลับก่อนออกวิ่ง", "跑步前请选择返程方式")))}</p>`;
      showToast(tr("Runner Agent planned your return", "Runner Agent วางทางกลับให้แล้ว", "跑步智能体已规划返程"));
    }
  } catch (error) {
    showToast(error instanceof Error ? error.message : tr("Runner Agent could not complete the action", "Runner Agent ทำงานไม่สำเร็จ", "跑步智能体无法完成操作"), true);
  }
}

async function savePlanForAgent(filters: EventFilters, eventIds: string[]) {
  if (!state.session?.authenticated) {
    document.querySelector("#passport")?.scrollIntoView({ behavior: "smooth" });
    throw new Error(tr("Sign in with ChatGPT before saving to Runner Passport", "Sign in with ChatGPT ก่อนบันทึกตารางลง Runner Passport", "请先使用 ChatGPT 登录，再保存至跑者通行证"));
  }
  const plan = await persistRunPlan({ filters, eventIds });
  await refreshPassportData();
  addActivity({ source: "agent", title: "Agent saved this run week", detail: `${plan.eventIds.length} runs · ${plan.totalDistanceKm} KM` });
  return plan;
}

async function readPassportForAgent() {
  if (!state.session?.authenticated) {
    throw new Error(tr("Sign in with ChatGPT before reading Runner Passport", "Sign in with ChatGPT ก่อนอ่าน Runner Passport", "请先使用 ChatGPT 登录，再读取跑者通行证"));
  }
  const passport = await refreshPassportData();
  return {
    profile: passport.profile,
    savedWeeks: passport.savedPlans.map((plan) => ({
      id: plan.id,
      filters: plan.filters,
      eventIds: plan.eventIds,
      totalDistanceKm: plan.totalDistanceKm,
      createdAt: plan.createdAt,
    })),
    runPassCount: passport.passes.length,
  };
}

async function readPassesForAgent() {
  if (state.session?.authenticated) {
    return (await refreshPassportData()).passes;
  }
  return readRegistrations(localStorage).map((registration) => {
    const safe = { ...registration } as Partial<Registration>;
    delete safe.emergencyContact;
    return safe;
  });
}

async function cancelPassForAgent(passId: string) {
  if (state.session?.authenticated) {
    const cancelled = await cancelPersistentRunPass(passId);
    await refreshPassportData();
    return cancelled;
  }
  return cancelRegistration(localStorage, passId);
}

async function saveCurrentWeek() {
  if (!state.session?.authenticated) {
    document.querySelector("#passport")?.scrollIntoView({ behavior: "smooth" });
    showToast(tr("Sign in with ChatGPT to remember this week", "Sign in with ChatGPT เพื่อให้ Agent จำตารางนี้", "使用 ChatGPT 登录以记住本周计划"), true);
    return;
  }
  const harness = window.__RUN_SOCIAL_WEBMCP__;
  if (!harness) return;
  const input: Record<string, unknown> = {};
  if (state.filters.city) input.city = state.filters.city;
  if (state.filters.distanceKm) input.distance_km = state.filters.distanceKm;
  if (state.filters.pace) input.pace = state.filters.pace;
  if (state.filters.socialPreference) input.social_preference = state.filters.socialPreference;
  const button = document.querySelector<HTMLButtonElement>("#saveWeekButton");
  button?.setAttribute("aria-busy", "true");
  if (button) button.disabled = true;
  try {
    const result = await harness.execute("save_run_schedule", input) as { event_count?: number };
    showToast(tr(`${result.event_count ?? 0} runs saved to Passport`, `บันทึก ${result.event_count ?? 0} runs ลง Passport แล้ว`, `${result.event_count ?? 0} 条路线已保存至通行证`));
  } catch (error) {
    showToast(error instanceof Error ? error.message : tr("The week could not be saved", "บันทึกตารางไม่สำเร็จ", "本周计划无法保存"), true);
  } finally {
    button?.removeAttribute("aria-busy");
    if (button) button.disabled = false;
  }
}

async function runAgentAction(action: string) {
  const harness = window.__RUN_SOCIAL_WEBMCP__;
  if (!harness) {
    showToast(tr("Runner Agent is not ready. Try again.", "Runner Agent ยังเริ่มไม่สำเร็จ กรุณาลองอีกครั้ง", "跑步智能体尚未就绪，请重试。"), true);
    return;
  }

  try {
    if (action === "plan-week") {
      await executeSchedulePlan({}, `“${tr("Show every run and put my next move first", "เปิดตารางวิ่งทั้งหมดและเรียงงานถัดไปให้ฉัน", "显示所有路线，并优先给出下一步") }”`);
    } else if (action === "bangkok-easy") {
      const result = await executeSchedulePlan(
        { city: "Bangkok", distance_km: 5, pace: "social", social_preference: "alcohol_free", alcohol_free_required: true },
        `“${tr("Find an easy alcohol-free Bangkok 5K and open the best fit", "หา Bangkok 5K เพซสบาย มี alcohol-free แล้วเปิดตัวที่เหมาะให้ฉัน", "寻找曼谷轻松无酒精5公里，并打开最合适的路线") }”`,
      );
      const first = result?.events[0];
      if (first) await harness.execute("get_run_event_details", { event_id: first.id });
    } else if (action === "compare-social") {
      const result = await executeSchedulePlan(
        { pace: "social", social_preference: "alcohol_free" },
        `“${tr("Plan alcohol-free social runs and compare the first three", "จัดตารางสาย social ที่มี alcohol-free แล้วเทียบสามตัวเลือกแรก", "规划无酒精社交跑并比较前三个选项") }”`,
      );
      const ids = result?.events.slice(0, 3).map((event) => event.id) ?? [];
      if (ids.length >= 2) {
        await harness.execute("compare_run_events", { event_ids: ids });
        showToast(tr(`Runner Agent compared ${ids.length} choices`, `Runner Agent เทียบ ${ids.length} ตัวเลือกแล้ว`, `跑步智能体已比较 ${ids.length} 个选项`));
      }
    } else if (action === "return") {
      setAgentPrompt(`“${tr("Open the Bangkok 5K and plan a safe return", "เปิดงาน Bangkok 5K แล้ววางทางกลับที่ปลอดภัยให้ฉัน", "打开曼谷5公里路线并规划安全返程") }”`);
      const result = await harness.execute("get_safe_return_options", {
        event_id: "bkk-riverside-5",
        social_preference: "alcohol_free",
      }) as { warning?: string };
      const summary = document.querySelector<HTMLDivElement>("#agentPlanSummary");
      if (summary) summary.innerHTML = `<div><span>SAFE RETURN</span><strong>${tr("Return plan ready", "แผนกลับพร้อมแล้ว", "返程计划已就绪")}</strong></div><p>${escapeHtml(localizeDomainText(result.warning ?? tr("Choose a return before the run", "เลือกทางกลับก่อนออกวิ่ง", "跑步前请选择返程方式")))}</p>`;
      showToast(tr("Runner Agent planned your return", "Runner Agent วางทางกลับให้แล้ว", "跑步智能体已规划返程"));
    }
  } catch (error) {
    showToast(error instanceof Error ? error.message : tr("Runner Agent could not complete the action", "Runner Agent ทำงานไม่สำเร็จ", "跑步智能体无法完成操作"), true);
  }
}

async function initializeWebMcp() {
  const result = await registerWebMcpTools(localStorage, {
    selectEvent: (eventId) => openEvent(eventId, "agent"),
    showSchedule: renderAgentSchedule,
    showSupportLoop: renderRunnerSupportLoop,
    searchRunnerNeed,
    showPendingRegistration: showPendingConfirmation,
    refreshPasses,
    readPassport: readPassportForAgent,
    saveSchedule: savePlanForAgent,
    readRunPasses: readPassesForAgent,
    cancelRunPass: cancelPassForAgent,
    logActivity: addActivity,
  });
  state.webMcpSupported = result.supported;
  state.webMcpActionCount = result.registered.length || 14;
  renderWebMcpStatus();
  addActivity({
    source: "system",
    title: result.supported ? "Runner Agent connected" : "Runner Agent local planner ready",
    detail: result.supported
      ? `${result.registered.length} task actions exposed to the browser agent`
      : "Schedule planning works now; external agent control needs a WebMCP browser",
  });
}

renderLocalizedInterface();
void initializePassport();
void initializeCommerceStatus();

const pending = readPendingRegistration(localStorage);
if (pending) showPendingConfirmation(pending);

void initializeWebMcp();

const readinessDemo = checkReadiness({
  eventId: "bkk-riverside-5",
  age20Plus: true,
  hasConcerningSymptoms: false,
  hasHydrationPlan: true,
  transportMode: "transit",
  socialPreference: "alcohol_free",
});
if (readinessDemo.status === "blocked") {
  console.warn("Baseline readiness check failed", readinessDemo);
}
