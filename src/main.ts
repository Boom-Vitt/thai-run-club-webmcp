import "./styles.css";
import { CLUB_RULES, EVENTS, PACE_LABELS, SOCIAL_LABELS } from "./data";
import {
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

const state: {
  filters: EventFilters;
  selectedEventId: string | null;
  activities: ActivityEntry[];
  webMcpSupported: boolean;
  session: SessionData | null;
  passport: PassportData | null;
  passportStatus: "loading" | "guest" | "ready" | "error";
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
  session: null,
  passport: null,
  passportStatus: "loading",
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("th-TH", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00+07:00`));
}

function eventSocialLine(social: SocialOption[]): string {
  if (social.includes("beer_optional")) return "Run + optional 20+ social";
  if (social.includes("alcohol_free")) return "Run + alcohol-free social";
  return "Run only";
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
    <svg viewBox="0 0 260 160" role="img" aria-label="ภาพเส้นทางเชิงสัญลักษณ์">
      <path class="route-grid" d="M0 32H260M0 80H260M0 128H260M52 0V160M130 0V160M208 0V160" />
      <path class="route-shadow" d="${path}" />
      <path class="route-line" d="${path}" pathLength="1" />
      <circle class="route-start" cx="18" cy="104" r="6" />
      <circle class="route-finish" cx="238" cy="94" r="8" />
    </svg>`;
}

function renderShell() {
  app.innerHTML = `
    <a class="skip-link" href="#runner-agent">ข้ามไปใช้ Runner Agent</a>
    <header class="site-header">
      <a class="wordmark" href="#top" aria-label="กลับด้านบน">
        <span class="wordmark-mark" aria-hidden="true">R/</span>
        <span>RUN SOCIAL TH <small>WORKING LABEL</small></span>
      </a>
      <nav aria-label="เมนูหลัก">
        <a href="#runner-agent">Agent</a>
        <a href="#passport">Passport</a>
        <a href="#events">Schedule</a>
        <a href="#rules">Rules</a>
      </nav>
      <div class="header-actions">
        <a class="header-account" id="headerAccount" href="#passport">Guest</a>
        <button class="header-pass" id="showPassesButton" type="button">
          My run pass <span id="passCount">0</span>
        </button>
      </div>
    </header>

    <main id="top">
      <section class="hero section-shell" id="runner-agent" aria-labelledby="hero-title">
        <div class="hero-copy">
          <p class="eyebrow"><span></span> RUNNER AGENT · GUEST READY · PASSPORT OPTIONAL</p>
          <h1 id="hero-title">YOUR RUN WEEK.<br /><em>READY TO GO.</em></h1>
          <p class="hero-lead">เพื่อนวิ่งที่ช่วยหา run ให้ตรงเพซ จัดตาราง เปรียบเทียบงาน เช็กความพร้อม วางทางกลับ และเตรียม Run Pass ให้คุณตรวจ—เปิดแล้วใช้ได้ทันที หรือ sign in เพื่อให้ Agent จำสัปดาห์ของคุณ</p>
          <div class="hero-actions">
            <a class="button button-primary" href="#agent-planner">ให้ Agent จัดตาราง <span>↘</span></a>
            <a class="button button-ghost" href="#events">ดู run ทั้งหมด <span>→</span></a>
          </div>
          <div class="hero-proof" aria-label="ข้อมูลสำคัญ">
            <span><strong>${EVENTS.length}</strong> runs in schedule</span>
            <span><strong>13</strong> agent actions</span>
            <span><strong>D1</strong> runner memory</span>
            <span><strong>1</strong> human final call</span>
          </div>
          <div class="agent-promise-grid" aria-label="สิ่งที่ Runner Agent ช่วยได้">
            <article><span>01 / SCOUT</span><strong>หา run ที่เข้ากับคุณ</strong><p>เมือง ระยะ เพซ วัน และ social choice</p></article>
            <article><span>02 / SORT</span><strong>จัดตารางและเทียบตัวเลือก</strong><p>เวลา ราคา ที่ว่าง และเส้นทางกลับ</p></article>
            <article><span>03 / CHECK</span><strong>เช็กก่อนออกวิ่ง</strong><p>กฎ ความพร้อม น้ำ และแผนเดินทาง</p></article>
            <article><span>04 / HANDOFF</span><strong>เตรียมให้ คุณเป็นคนยืนยัน</strong><p>Agent ส่งไม้ต่อก่อนสร้าง Run Pass</p></article>
          </div>
        </div>
        <section class="agent-desk" id="agent-planner" aria-labelledby="agent-planner-title">
          <div class="agent-desk-top"><span>R/ AGENT RELAY</span><strong>WEEK BOARD</strong><i id="agentIdentityMode">GUEST</i></div>
          <div class="agent-desk-intro">
            <p>เล่าได้ตามธรรมชาติ ไม่ต้องจำคำสั่ง</p>
            <h2 id="agent-planner-title">วันนี้อยากให้ช่วยอะไร?</h2>
          </div>
          <form class="agent-planner-form" id="agentPlannerForm" aria-label="ให้ Runner Agent จัดตารางวิ่ง">
            <label class="agent-request-label" for="runnerRequest"><span>คุยกับ Runner Agent</span><textarea id="runnerRequest" name="request" maxlength="240" rows="3" placeholder="เช่น สัปดาห์นี้อยากวิ่ง 5 กม. ในกรุงเทพแบบชิล ๆ และไม่ดื่ม"></textarea></label>
            <button type="submit"><span>✦</span> ให้ Agent คิดและจัดให้ <b>→</b></button>
            <details class="agent-filter-details">
              <summary>อยากระบุเอง? ปรับเมือง ระยะ เพซ และหลังวิ่ง</summary>
              <div class="agent-filter-grid">
                <label><span>เมือง</span><select name="city"><option value="">ทุกเมือง</option><option>Bangkok</option><option>Chiang Mai</option><option>Phuket</option><option>Khon Kaen</option></select></label>
                <label><span>ระยะ</span><select name="distance"><option value="">ทุกระยะ</option><option value="3">3 KM</option><option value="5">5 KM</option><option value="7">7 KM</option><option value="10">10 KM</option></select></label>
                <label><span>เพซ</span><select name="pace"><option value="">ทุกเพซ</option><option value="social">Social</option><option value="steady">Steady</option><option value="tempo">Tempo</option></select></label>
                <label><span>หลังวิ่ง</span><select name="social"><option value="">ทุกแบบ</option><option value="alcohol_free">Alcohol-free</option><option value="run_only">Run only</option><option value="beer_optional">Optional 20+</option></select></label>
              </div>
            </details>
          </form>
          <div class="agent-suggestions" aria-label="ตัวอย่างที่พูดกับ Runner Agent ได้">
            <button type="button" data-runner-request="อยากวิ่ง 5 กม. ในกรุงเทพแบบชิล ๆ และไม่ดื่ม">“อยากวิ่งชิล ๆ 5 กม.”</button>
            <button type="button" data-runner-request="ช่วยเทียบงานสาย social ที่มีทางกลับสะดวก">“ช่วยเทียบงานสาย social”</button>
            <button type="button" data-runner-request="เปิดงานวิ่งในกรุงเทพแล้วช่วยวางทางกลับบ้าน">“ช่วยวางทางกลับบ้าน”</button>
            <button type="button" data-runner-request="งานนี้ต้องเตรียมอะไร ยืม เติม หรือซ่อมก่อนซื้อได้ไหม">“งานนี้ต้องเตรียมอะไร?”</button>
          </div>
          <div class="agent-plan-summary" id="agentPlanSummary" role="status" aria-live="polite"></div>
          <div class="agent-schedule-board" id="agentScheduleBoard"></div>
          <aside class="support-loop" id="runnerSupportLoop" aria-live="polite" hidden></aside>
          <div class="agent-save-bar">
            <p id="saveWeekHint">จัดตารางได้ทันที · Sign in เมื่อต้องการให้ Agent จำ</p>
            <button id="saveWeekButton" type="button">SAVE TO PASSPORT <span>↗</span></button>
          </div>
        </section>
      </section>

      <section class="ticker" aria-label="หลักการกิจกรรม">
        <div>BUILD MY WEEK <span>✦</span> FIND MY PACE <span>✦</span> CHECK MY RUN <span>✦</span> PLAN MY WAY HOME <span>✦</span> HAND ME THE FINAL CALL <span>✦</span></div>
      </section>

      <section class="passport-section section-shell" id="passport" aria-labelledby="passport-title">
        <div class="passport-heading">
          <p class="eyebrow"><span></span> PERSISTENT RUNNER MEMORY</p>
          <h2 id="passport-title">RUNNER<br /><em>PASSPORT.</em></h2>
          <p>พื้นที่ส่วนตัวที่ให้ Runner Agent จำเมือง เพซ เป้าหมาย ตารางที่บันทึก และ Run Pass ของคุณข้ามการเปิดเว็บครั้งถัดไป</p>
        </div>
        <div class="passport-grid">
          <article class="passport-card" id="passportCard" aria-live="polite">
            <div class="passport-loading"><span>R/</span><p>กำลังเปิด Runner Passport…</p></div>
          </article>
          <section class="passport-ledger" id="passportLedger" aria-label="Saved run weeks">
            <div class="passport-loading"><span>00</span><p>กำลังอ่านตารางที่บันทึก…</p></div>
          </section>
        </div>
      </section>

      <section class="events-section section-shell" id="events" aria-labelledby="events-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow"><span></span> CURATED DEMO EVENTS</p>
            <h2 id="events-title">เลือกเมือง<br />เลือกเพซของคุณ</h2>
          </div>
          <p>อีเวนต์ตัวอย่างสำหรับพิสูจน์ end-to-end experience ข้อมูลจริงต้องได้รับการยืนยันจากผู้จัดก่อนเผยแพร่</p>
        </div>
        <form class="filter-rail" id="eventFilters" aria-label="ตัวกรองอีเวนต์">
          <label>
            <span>เมือง</span>
            <select name="city">
              <option value="">ทุกเมือง</option>
              <option>Bangkok</option>
              <option>Chiang Mai</option>
              <option>Phuket</option>
              <option>Khon Kaen</option>
            </select>
          </label>
          <label>
            <span>ระยะ</span>
            <select name="distance">
              <option value="">ทุกระยะ</option>
              <option value="3">3 KM</option>
              <option value="5">5 KM</option>
              <option value="7">7 KM</option>
              <option value="10">10 KM</option>
            </select>
          </label>
          <label>
            <span>เพซ</span>
            <select name="pace">
              <option value="">ทุกเพซ</option>
              <option value="social">Social</option>
              <option value="steady">Steady</option>
              <option value="tempo">Tempo</option>
            </select>
          </label>
          <label>
            <span>หลังวิ่ง</span>
            <select name="social">
              <option value="">ทุกแบบ</option>
              <option value="alcohol_free">Alcohol-free</option>
              <option value="beer_optional">Beer optional · 20+</option>
              <option value="run_only">Run only</option>
            </select>
          </label>
          <button class="filter-reset" type="reset">Reset ↺</button>
        </form>
        <div class="events-meta"><p><strong id="eventCount">${EVENTS.length}</strong> runs available</p><p>Demo data · not live events</p></div>
        <div class="event-grid" id="eventGrid"></div>
      </section>

      <section class="agent-section" id="webmcp" aria-labelledby="agent-title">
        <div class="section-shell agent-layout">
          <div class="agent-copy">
            <p class="eyebrow eyebrow-light"><span></span> RUNNER AGENT RELAY</p>
            <h2 id="agent-title">SCOUT. SORT.<br /><em>CHECK. HAND OFF.</em></h2>
            <p>Runner Agent เปลี่ยนเป้าหมายของคุณให้เป็นตารางที่ลงมือทำต่อได้: หาและเรียงงาน เปิดรายละเอียด เช็กกฎกับความพร้อม วางทางกลับ และเตรียมการสมัครไว้บนหน้าจอให้คุณตัดสินใจ</p>
            <div class="agent-status" id="webMcpStatus" role="status">
              <span class="status-dot"></span>
              <div><strong>Checking WebMCP…</strong><small>Human interface is already available</small></div>
            </div>
            <div class="agent-steps">
              <article><span>01</span><div><h3>BUILD THE BOARD</h3><p>จัดตารางตามเมือง ระยะ เพซ และตัวเลือกหลังวิ่ง</p></div></article>
              <article><span>02</span><div><h3>SHORTLIST THE FIT</h3><p>เทียบวัน เวลา ราคา ที่ว่าง และข้อมูลเดินทางกลับ</p></div></article>
              <article><span>03</span><div><h3>RUN THE CHECKS</h3><p>เช็กกฎ ความพร้อม น้ำ อายุ และแผนเดินทาง</p></div></article>
              <article><span>04</span><div><h3>PASS THE BATON</h3><p>เตรียม Run Pass แล้วหยุดรอคนกดยืนยันบนหน้าจอ</p></div></article>
            </div>
          </div>
          <div class="agent-console" aria-label="WebMCP activity">
            <div class="console-top"><span><i></i><i></i><i></i></span><strong>RUNNER AGENT ACTIVITY</strong><small id="toolCount">13 actions</small></div>
            <div class="console-prompt">
              <span>YOU</span>
              <p id="agentPromptText">“เปิดตารางวิ่งทั้งหมด แล้วช่วยจัดลำดับสิ่งที่ฉันทำต่อได้”</p>
            </div>
            <div class="activity-list" id="activityList" aria-live="polite"></div>
            <div class="console-actions" id="agentQuickActions">
              <button type="button" data-agent-action="plan-week">จัดตารางทุกงาน</button>
              <button type="button" data-agent-action="bangkok-easy">หา Bangkok easy 5K</button>
              <button type="button" data-agent-action="compare-social">เทียบสาย social</button>
              <button type="button" data-agent-action="return">วางทางกลับ</button>
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
          <p>กฎถูกออกแบบให้การวิ่งมาก่อน การดื่มเป็นทางเลือก และทุกคนกลับบ้านอย่างปลอดภัย</p>
        </div>
        <div class="rule-grid">
          ${CLUB_RULES.map(
            (rule, index) => `
              <article class="rule-card">
                <span>${String(index + 1).padStart(2, "0")}</span>
                <h3>${rule.title}</h3>
                <p>${rule.body}</p>
              </article>`,
          ).join("")}
        </div>
        <aside class="legal-note">
          <strong>IMPORTANT / สำคัญ</strong>
          <p>เว็บนี้ไม่ขายหรือโฆษณาเครื่องดื่มแอลกอฮอล์ กิจกรรมตัวอย่างต้องได้รับการตรวจด้านใบอนุญาต เวลา สถานที่ ประกัน และกฎหมายที่ใช้บังคับก่อนจัดจริง</p>
        </aside>
      </section>

      <section class="passes-section section-shell" id="passes" aria-labelledby="passes-title">
        <div class="passes-copy">
          <p class="eyebrow"><span></span> YOUR NEXT RUN</p>
          <h2 id="passes-title">RUN PASSES</h2>
          <p>Guest เก็บ Run Pass ใน browser นี้ ส่วนผู้ที่ sign in จะบันทึกอย่างถาวรใน Runner Passport โดย Agent เตรียมได้ แต่คุณต้องเป็นคนยืนยันการสมัครบนหน้าจอ</p>
        </div>
        <div class="passes-list" id="passesList"></div>
      </section>
    </main>

    <footer>
      <div class="footer-mark">R/<span>RUN SOCIAL TH</span></div>
      <p>DEMO PLATFORM · NOT MEDICAL OR LEGAL ADVICE</p>
      <div><a href="#rules">Rules</a><a href="#webmcp">WebMCP</a><a href="#top">Back to top ↑</a></div>
    </footer>

    <dialog class="event-dialog" id="eventDialog" aria-labelledby="eventDialogTitle">
      <button class="dialog-close" type="button" data-close-dialog="eventDialog" aria-label="ปิด">×</button>
      <div id="eventDialogContent"></div>
    </dialog>

    <dialog class="registration-dialog" id="registrationDialog" aria-labelledby="registrationTitle">
      <button class="dialog-close" type="button" data-close-dialog="registrationDialog" aria-label="ปิด">×</button>
      <div id="registrationContent"></div>
    </dialog>

    <dialog class="confirmation-dialog" id="confirmationDialog" aria-labelledby="confirmationTitle">
      <button class="dialog-close" type="button" data-close-dialog="confirmationDialog" aria-label="ปิด">×</button>
      <div id="confirmationContent"></div>
    </dialog>

    <div class="toast" id="toast" role="status" aria-live="polite"></div>
  `;
}

function scheduleDateParts(date: string) {
  const value = new Date(`${date}T12:00:00+07:00`);
  return {
    weekday: new Intl.DateTimeFormat("th-TH", { weekday: "short" }).format(value),
    day: new Intl.DateTimeFormat("th-TH", { day: "2-digit" }).format(value),
    month: new Intl.DateTimeFormat("th-TH", { month: "short" }).format(value),
  };
}

function filterDescription(filters: EventFilters): string {
  const details = [
    filters.city,
    filters.distanceKm ? `${filters.distanceKm} KM` : undefined,
    filters.pace ? PACE_LABELS[filters.pace] : undefined,
    filters.socialPreference ? SOCIAL_LABELS[filters.socialPreference] : undefined,
  ].filter(Boolean);
  return details.length > 0 ? details.join(" · ") : "ทุกเมือง · ทุกระยะ · เรียงตามวัน";
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
        <span>OFFLINE /</span><h3>เปิด Passport ไม่สำเร็จ</h3>
        <p>ตารางแบบ guest ยังใช้งานได้ตามปกติ แล้วลองเชื่อม Runner Passport อีกครั้ง</p>
        <button type="button" id="retryPassport">ลองอีกครั้ง ↻</button>
      </div>`;
    ledger.innerHTML = `<div class="passport-empty"><span>LOCAL MODE</span><p>แผนใหม่ยังจัดได้ แต่จะยังไม่ถูกบันทึกลงฐานข้อมูล</p></div>`;
    document.querySelector<HTMLButtonElement>("#retryPassport")?.addEventListener("click", () => void initializePassport());
    return;
  }

  if (!state.session?.authenticated || !state.session.user) {
    const signIn = chatGptSignInPath("/#passport");
    headerAccount.textContent = "Sign in";
    headerAccount.href = signIn;
    headerAccount.target = "_top";
    identityMode.textContent = "GUEST";
    saveHint.textContent = "แผนพร้อมใช้แล้ว · Sign in เมื่อต้องการให้ Agent จำ";
    card.innerHTML = `
      <div class="passport-cover">
        <div><span>R/</span><small>RUNNER ID / OPTIONAL</small></div>
        <strong>GUEST<br />RUNNER</strong>
        <p>ไม่ต้องมีบัญชีก็จัดตาราง ดูรายละเอียด เช็กความพร้อม และเตรียม Run Pass ได้</p>
        <a class="passport-signin" href="${signIn}" target="_top">SIGN IN WITH CHATGPT <span>↗</span></a>
        <small>Sign in เฉพาะเมื่อต้องการบันทึกข้อมูลข้ามอุปกรณ์และการเปิดเว็บครั้งถัดไป</small>
      </div>`;
    ledger.innerHTML = `
      <div class="passport-ledger-head"><div><span>AGENT MEMORY</span><h3>WHAT GETS SAVED</h3></div><strong>03</strong></div>
      <div class="passport-memory-list">
        <article><b>01</b><div><strong>Runner profile</strong><p>เมือง เพซ และเป้าหมายรายสัปดาห์</p></div></article>
        <article><b>02</b><div><strong>Saved run weeks</strong><p>ตารางที่ Agent จัดและตัวกรองที่ใช้</p></div></article>
        <article><b>03</b><div><strong>Run Passes</strong><p>รายการที่คุณตรวจและกดยืนยันเองแล้ว</p></div></article>
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
  identityMode.textContent = "MEMORY ON";
  saveHint.textContent = `${savedPlans.length} saved week${savedPlans.length === 1 ? "" : "s"} · Agent memory is on`;

  card.innerHTML = `
    <div class="passport-id-row"><span class="passport-avatar">${escapeHtml(runnerInitials(displayName))}</span><div><small>RUNNER PASSPORT / ACTIVE</small><h3>${escapeHtml(displayName)}</h3><p>${escapeHtml(user.email)}</p></div><i>DB<br />LIVE</i></div>
    <div class="passport-stamps" aria-label="Runner profile summary">
      <div><small>HOME</small><strong>${escapeHtml(profile?.homeCity ?? "OPEN")}</strong><span>01 / CITY</span></div>
      <div><small>PACE</small><strong>${profile?.preferredPace ? escapeHtml(PACE_LABELS[profile.preferredPace]) : "OPEN"}</strong><span>02 / BAND</span></div>
      <div><small>GOAL</small><strong>${profile?.weeklyGoalKm ?? 10} KM</strong><span>03 / WEEK</span></div>
    </div>
    <form class="passport-form" id="passportProfileForm">
      <label><span>ชื่อบน Passport</span><input name="displayName" maxlength="80" value="${escapeHtml(displayName)}" required /></label>
      <label><span>เมืองหลัก</span><select name="homeCity"><option value="">ยังไม่เลือก</option>${["Bangkok", "Chiang Mai", "Phuket", "Khon Kaen"].map((city) => `<option${profile?.homeCity === city ? " selected" : ""}>${city}</option>`).join("")}</select></label>
      <label><span>เพซที่ชอบ</span><select name="preferredPace"><option value="">ยังไม่เลือก</option>${(["social", "steady", "tempo"] as PaceBand[]).map((pace) => `<option value="${pace}"${profile?.preferredPace === pace ? " selected" : ""}>${PACE_LABELS[pace]}</option>`).join("")}</select></label>
      <label><span>เป้าหมาย / สัปดาห์</span><input name="weeklyGoalKm" type="number" min="1" max="100" value="${profile?.weeklyGoalKm ?? 10}" required /></label>
      <button type="submit">UPDATE PASSPORT <span>→</span></button>
    </form>
    <a class="passport-signout" href="${chatGptSignOutPath("/")}" target="_top">Sign out</a>`;

  ledger.innerHTML = `
    <div class="passport-ledger-head"><div><span>AGENT MEMORY</span><h3>SAVED RUN WEEKS</h3></div><strong>${String(savedPlans.length).padStart(2, "0")}</strong></div>
    <div class="passport-scoreline"><span><b>${savedPlans.length}</b> weeks</span><span><b>${activePasses}</b> active passes</span><span><b>${profile?.weeklyGoalKm ?? 10}</b> km goal</span></div>
    <div class="saved-week-list">
      ${savedPlans.length === 0
        ? `<div class="passport-empty"><span>NO SAVED WEEK</span><p>จัดตารางด้านบน แล้วกด SAVE TO PASSPORT เพื่อเริ่มความจำของ Agent</p></div>`
        : savedPlans.map((plan, index) => `
          <article class="saved-week-ticket">
            <div><span>W${String(savedPlans.length - index).padStart(2, "0")}</span><small>${new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(plan.createdAt))}</small></div>
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
      showToast("บันทึก Runner Passport แล้ว");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "บันทึก Passport ไม่สำเร็จ", true);
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
      void executeSchedulePlan(input, `“เปิดตารางที่บันทึกไว้: ${filterDescription(plan.filters)}”`);
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
    <div><span>AGENT PLAN</span><strong>${plan.count} run${plan.count === 1 ? "" : "s"} matched</strong></div>
    <p>${escapeHtml(filterDescription(filters))} · รวม ${plan.totalDistanceKm} KM</p>`;

  if (plan.events.length === 0) {
    board.innerHTML = `
      <div class="agent-schedule-empty">
        <strong>ยังไม่มี run ที่ตรงทุกข้อ</strong>
        <p>ลดเงื่อนไขหนึ่งอย่างแล้วให้ Runner Agent จัดตารางใหม่</p>
        <button type="button" data-agent-action="plan-week">เปิดตารางทั้งหมด</button>
      </div>`;
  } else {
    board.innerHTML = plan.events.map((event, index) => {
      const date = scheduleDateParts(event.date);
      return `
        <article class="agent-schedule-row ${index === 0 ? "is-next" : ""}">
          <time datetime="${event.date}T${event.startTime}:00+07:00"><span>${date.weekday}</span><strong>${date.day}</strong><small>${date.month}</small></time>
          <div class="agent-schedule-main">
            <span>${index === 0 ? "NEXT MATCH" : `OPTION ${String(index + 1).padStart(2, "0")}`}</span>
            <strong>${escapeHtml(event.city)} · ${escapeHtml(event.neighborhood)}</strong>
            <p>${event.distanceKm} KM · ${event.paceBands.map((pace) => PACE_LABELS[pace]).join(" / ")}</p>
          </div>
          <div class="agent-schedule-meta"><strong>${event.startTime}</strong><small>${event.spotsLeft} spots</small></div>
          <button type="button" data-schedule-open="${event.id}" aria-label="เปิดรายละเอียด ${escapeHtml(event.city)} ${event.distanceKm} กิโลเมตร">↗</button>
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
  panel.hidden = false;
  panel.innerHTML = `
    <div class="support-loop-head"><div><span>RUNNER COMMONS / SHOP LAST</span><strong>${escapeHtml(loop.eventLabel)}</strong></div><b>↺</b></div>
    <div class="support-loop-grid">
      ${loop.steps.map((step, index) => `
        <article><small>0${index + 1} / ${step.mode.toUpperCase()}</small><strong>${escapeHtml(step.title)}</strong><p>${escapeHtml(step.action)}</p><em>${escapeHtml(step.reason)}</em></article>`).join("")}
    </div>
    <div class="support-loop-giveback"><span>GIVE BACK</span><p>${escapeHtml(loop.giveBack)}</p></div>
    <div class="support-loop-handoff"><span>NEXT CONNECTOR / HUMAN FIRST</span><p>${escapeHtml(loop.merchantHandoff.rule)}</p></div>`;
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
        <span>0/</span><h3>ยังไม่เจอ run ที่ตรงทุกข้อ</h3>
        <p>ลองลดตัวกรองหนึ่งอย่าง หรือให้ agent ช่วยหาตัวเลือกที่ใกล้เคียง</p>
        <button class="button button-dark" type="button" id="emptyReset">ดูทั้งหมด</button>
      </div>`;
    document.querySelector<HTMLButtonElement>("#emptyReset")?.addEventListener("click", resetFilters);
    return;
  }

  grid.innerHTML = matches.map(({ event }, index) => `
    <article class="event-card accent-${event.accent}" data-event-id="${event.id}">
      <div class="event-card-top">
        <span>${event.city.toUpperCase()} / ${event.neighborhood}</span>
        <span>${String(index + 1).padStart(2, "0")}</span>
      </div>
      <div class="event-map">${routeGraphic(event.id)}</div>
      <div class="event-main-fact"><strong>${event.distanceKm}</strong><span>KM<br />${escapeHtml(event.routeLabel.toUpperCase())}</span></div>
      <div class="event-date"><strong>${formatDate(event.date)}</strong><span>${event.startTime} น.</span></div>
      <div class="event-tags">
        ${event.paceBands.map((pace) => `<span>${PACE_LABELS[pace]}</span>`).join("")}
        <span>${eventSocialLine(event.social)}</span>
      </div>
      <div class="event-card-bottom">
        <div><small>FROM</small><strong>฿${event.priceThb}</strong></div>
        <div><small>LEFT</small><strong>${event.spotsLeft}</strong></div>
        <button type="button" data-open-event="${event.id}" aria-label="ดูรายละเอียด ${event.city} ${event.distanceKm} กิโลเมตร">DETAILS <span>↗</span></button>
      </div>
    </article>`).join("");

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
      <time>${new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit" }).format(new Date(entry.time))}</time>
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
  const event = findEvent(eventId);
  const dialog = document.querySelector<HTMLDialogElement>("#eventDialog");
  const content = document.querySelector<HTMLDivElement>("#eventDialogContent");
  if (!event || !dialog || !content) return;
  state.selectedEventId = eventId;

  content.innerHTML = `
    <div class="dialog-kicker">${event.city.toUpperCase()} · ${event.neighborhood}</div>
    <div class="dialog-hero accent-${event.accent}">
      <div><p>${formatDate(event.date)} · ${event.startTime} น.</p><h2 id="eventDialogTitle">${event.distanceKm} KM<br /><em>${escapeHtml(event.routeLabel)}</em></h2></div>
      <div class="dialog-route">${routeGraphic(event.id)}</div>
    </div>
    <div class="dialog-grid">
      <section><small>MEET</small><strong>${event.meetingPoint}</strong></section>
      <section><small>FINISH</small><strong>${event.finishVenue}</strong></section>
      <section><small>ROUTE</small><strong>${event.routeNote}</strong></section>
      <section><small>GET HOME</small><strong>${event.transit}</strong></section>
    </div>
    <div class="dialog-options">
      <div><small>PACE GROUPS</small>${event.paceBands.map((pace) => `<span>${PACE_LABELS[pace]}</span>`).join("")}</div>
      <div><small>SOCIAL OPTIONS</small>${event.social.map((option) => `<span>${SOCIAL_LABELS[option]}</span>`).join("")}</div>
    </div>
    <div class="dialog-notice"><strong>CHOICE POLICY</strong><p>เบียร์ไม่รวมในค่าสมัครและไม่จำเป็นต่อการเข้าร่วม ผู้เลือกแอลกอฮอล์ต้องอายุ 20+ และใช้บริการแยกกับสถานที่ที่มีใบอนุญาต</p></div>
    <div class="dialog-footer">
      <div><small>${event.spotsLeft} / ${event.capacity} spots left</small><strong>฿${event.priceThb}</strong></div>
      <button class="button button-primary" type="button" data-register-event="${event.id}">เตรียมสมัคร <span>→</span></button>
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
  const event = findEvent(eventId);
  const dialog = document.querySelector<HTMLDialogElement>("#registrationDialog");
  const content = document.querySelector<HTMLDivElement>("#registrationContent");
  if (!event || !dialog || !content) return;

  const savedName = state.passport?.profile?.displayName ?? state.session?.user?.displayName ?? "";
  const savedEmail = state.passport?.profile?.email ?? state.session?.user?.email ?? "";
  const storageConsent = state.session?.authenticated
    ? "ฉันยินยอมให้บันทึกข้อมูลนี้ใน Runner Passport เพื่อจัดกิจกรรม *"
    : "ฉันยินยอมให้เก็บข้อมูลนี้ใน browser นี้เพื่อสร้าง Run Pass เดโม *";
  content.innerHTML = `
    <div class="form-heading">
      <p class="dialog-kicker">HUMAN CONFIRMATION FLOW</p>
      <h2 id="registrationTitle">เตรียม Run Pass</h2>
      <p>${event.city} · ${event.distanceKm} KM · ${formatDate(event.date)}</p>
    </div>
    <form id="registrationForm" class="registration-form" novalidate>
      <input type="hidden" name="eventId" value="${event.id}" />
      <div class="form-row">
        <label><span>ชื่อผู้วิ่ง *</span><input name="runnerName" autocomplete="name" maxlength="80" value="${escapeHtml(savedName)}" required /></label>
        <label><span>อีเมล *</span><input name="email" type="email" autocomplete="email" maxlength="120" value="${escapeHtml(savedEmail)}" required /></label>
      </div>
      <label><span>เบอร์ติดต่อฉุกเฉิน *</span><input name="emergencyContact" inputmode="tel" autocomplete="tel" maxlength="40" required /></label>
      <div class="form-row">
        <label><span>กลุ่มเพซ *</span><select name="pace" required>${event.paceBands.map((pace) => `<option value="${pace}">${PACE_LABELS[pace]}</option>`).join("")}</select></label>
        <label><span>หลังวิ่ง *</span><select name="socialPreference" id="socialPreference" required>${event.social.map((option) => `<option value="${option}">${SOCIAL_LABELS[option]}</option>`).join("")}</select></label>
      </div>
      <fieldset>
        <legend>แผนเดินทางกลับ *</legend>
        <label class="choice"><input type="radio" name="transportMode" value="transit" checked /><span>ขนส่งสาธารณะ</span></label>
        <label class="choice"><input type="radio" name="transportMode" value="taxi" /><span>แท็กซี่ / ride-hailing</span></label>
        <label class="choice"><input type="radio" name="transportMode" value="walk" /><span>เดินกลับ</span></label>
        <label class="choice"><input type="radio" name="transportMode" value="sober_driver" /><span>คนขับที่ไม่ดื่ม</span></label>
      </fieldset>
      <label class="check age-check" id="ageCheck"><input type="checkbox" name="age20Plus" /><span>ฉันยืนยันว่ามีอายุ 20 ปีขึ้นไปสำหรับตัวเลือกแอลกอฮอล์ และเข้าใจว่าสถานที่จะตรวจบัตร</span></label>
      <label class="check"><input type="checkbox" name="rulesAccepted" required /><span>ฉันอ่านและยอมรับ Club Code รวมถึง RUN FIRST และ NO DRINK & DRIVE *</span></label>
      <label class="check"><input type="checkbox" name="privacyAccepted" required /><span>${storageConsent}</span></label>
      <div class="form-errors" id="formErrors" role="alert"></div>
      <button class="button button-dark button-full" type="submit">ตรวจข้อมูลและไปหน้ายืนยัน <span>→</span></button>
      <p class="form-footnote">การกดปุ่มนี้ยังไม่สมัคร ระบบจะเปิดสรุปให้คุณยืนยันอีกครั้ง</p>
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
      if (errorBox) errorBox.innerHTML = `<strong>ยังไปต่อไม่ได้</strong><ul>${result.errors.map((error) => `<li>${escapeHtml(error)}</li>`).join("")}</ul>`;
      return;
    }
    addActivity({ source: "human", title: "Registration prepared", detail: "Waiting for final human confirmation" });
    dialog.close();
    showPendingConfirmation(input);
  });

  if (!dialog.open) dialog.showModal();
}

function showPendingConfirmation(input: RegistrationInput) {
  const event = findEvent(input.eventId);
  const dialog = document.querySelector<HTMLDialogElement>("#confirmationDialog");
  const content = document.querySelector<HTMLDivElement>("#confirmationContent");
  if (!event || !dialog || !content) return;
  const returnPlan = safeReturnOptions(event.id, input.socialPreference);

  content.innerHTML = `
    <div class="confirmation-icon" aria-hidden="true">✓?</div>
    <p class="dialog-kicker">REVIEW BEFORE COMMIT</p>
    <h2 id="confirmationTitle">คุณเป็นคนตัดสินใจ</h2>
    <p class="confirmation-lead">Agent หรือฟอร์มเตรียมข้อมูลได้ แต่ run pass จะเกิดขึ้นเมื่อคุณกดยืนยันเท่านั้น</p>
    <dl class="confirmation-list">
      <div><dt>RUNNER</dt><dd>${escapeHtml(input.runnerName)}</dd></div>
      <div><dt>EVENT</dt><dd>${event.city} · ${event.distanceKm} KM · ${formatDate(event.date)}</dd></div>
      <div><dt>PACE</dt><dd>${PACE_LABELS[input.pace]}</dd></div>
      <div><dt>SOCIAL</dt><dd>${SOCIAL_LABELS[input.socialPreference]}</dd></div>
      <div><dt>GET HOME</dt><dd>${escapeHtml(returnPlan.warning)}</dd></div>
    </dl>
    <div class="confirmation-actions">
      <button class="button button-ghost" type="button" id="editPending">กลับไปแก้</button>
      <button class="button button-primary" type="button" id="confirmPending">ยืนยันการสมัคร <span>→</span></button>
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
      showToast(state.session?.authenticated ? `บันทึก ${registration.id} ลง Passport แล้ว` : `สร้าง ${registration.id} แล้ว`);
      document.querySelector("#passes")?.scrollIntoView({ behavior: "smooth" });
    } catch (error) {
      showToast(error instanceof Error ? error.message : "ยืนยันไม่สำเร็จ", true);
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
    list.innerHTML = `<div class="pass-empty"><span>R/</span><div><strong>ยังไม่มี run pass</strong><p>เลือกอีเวนต์ หรือให้ agent เตรียมการสมัครให้คุณ</p></div><a href="#events">Browse runs ↗</a></div>`;
    return;
  }

  list.innerHTML = registrations.map((registration) => {
    const event = findEvent(registration.eventId);
    if (!event) return "";
    return `
      <article class="run-pass ${registration.status === "cancelled" ? "is-cancelled" : ""}">
        <div class="pass-edge"><span>R/</span><small>${registration.status.toUpperCase()}</small></div>
        <div class="pass-body">
          <p>${event.city.toUpperCase()} / ${event.neighborhood}</p>
          <h3>${event.distanceKm} KM <em>${escapeHtml(event.routeLabel)}</em></h3>
          <div><span>${formatDate(event.date)} · ${event.startTime}</span><span>${PACE_LABELS[registration.pace]}</span><span>${SOCIAL_LABELS[registration.socialPreference]}</span></div>
          ${registration.status === "confirmed" ? `<button type="button" data-cancel-pass="${escapeHtml(registration.id)}">ยกเลิก Run Pass</button>` : ""}
        </div>
        <div class="pass-code"><span>${escapeHtml(registration.id)}</span><div aria-hidden="true">▌▐▌▌▐▌▐</div></div>
      </article>`;
  }).join("");

  list.querySelectorAll<HTMLButtonElement>("[data-cancel-pass]").forEach((button) => {
    button.addEventListener("click", async () => {
      const passId = button.dataset.cancelPass ?? "";
      if (!window.confirm(`ยืนยันยกเลิก ${passId}?`)) return;
      button.disabled = true;
      try {
        await cancelPassForAgent(passId);
        addActivity({ source: "human", title: "Run pass cancelled", detail: passId });
        refreshPasses();
        showToast(`ยกเลิก ${passId} แล้ว`);
      } catch (error) {
        showToast(error instanceof Error ? error.message : "ยกเลิกไม่สำเร็จ", true);
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
      void executeSchedulePlan(input, `“จัดตาราง ${filterDescription(fallback)} ให้ฉัน”`);
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

function setAgentPrompt(message: string) {
  const prompt = document.querySelector<HTMLParagraphElement>("#agentPromptText");
  if (prompt) prompt.textContent = message;
}

async function executeSchedulePlan(input: Record<string, unknown>, prompt: string) {
  const harness = window.__RUN_SOCIAL_WEBMCP__;
  if (!harness) {
    showToast("Runner Agent ยังเริ่มไม่สำเร็จ กรุณาลองอีกครั้ง", true);
    return null;
  }
  const submit = document.querySelector<HTMLButtonElement>("#agentPlannerForm button[type='submit']");
  submit?.setAttribute("aria-busy", "true");
  if (submit) submit.disabled = true;
  setAgentPrompt(prompt);
  try {
    const result = await harness.execute("plan_run_schedule", input);
    const count = (result as { count?: number }).count ?? 0;
    showToast(count > 0 ? `Runner Agent จัดตาราง ${count} งานแล้ว` : "ยังไม่พบงาน ลองลดเงื่อนไขหนึ่งอย่าง");
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
    showToast(state.session?.authenticated ? "เปิด Runner Passport แล้ว" : "Sign in เมื่อต้องการเปิดความจำของ Agent");
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
        showToast("เจอตัวเลือกเดียว ลองเล่าเงื่อนไขให้กว้างขึ้น", true);
        return;
      }
      await harness.execute("compare_run_events", { event_ids: eventIds });
      showToast(`Runner Agent เทียบ ${eventIds.length} ตัวเลือกแล้ว`);
    } else if (intent.action === "support_loop" && first) {
      await harness.execute("build_runner_support_loop", { event_id: first.id });
      showToast("Runner Commons Loop พร้อมแล้ว");
    } else if (intent.action === "safe_return" && first) {
      const safeReturn = await harness.execute("get_safe_return_options", {
        event_id: first.id,
        social_preference: intent.filters.socialPreference ?? "alcohol_free",
      }) as { warning?: string };
      const summary = document.querySelector<HTMLDivElement>("#agentPlanSummary");
      if (summary) summary.innerHTML = `<div><span>SAFE RETURN</span><strong>เลือก run และวางทางกลับแล้ว</strong></div><p>${escapeHtml(safeReturn.warning ?? "เลือกทางกลับก่อนออกวิ่ง")}</p>`;
      showToast("Runner Agent วางทางกลับให้แล้ว");
    }
  } catch (error) {
    showToast(error instanceof Error ? error.message : "Runner Agent ทำงานไม่สำเร็จ", true);
  }
}

async function savePlanForAgent(filters: EventFilters, eventIds: string[]) {
  if (!state.session?.authenticated) {
    document.querySelector("#passport")?.scrollIntoView({ behavior: "smooth" });
    throw new Error("Sign in with ChatGPT ก่อนบันทึกตารางลง Runner Passport");
  }
  const plan = await persistRunPlan({ filters, eventIds });
  await refreshPassportData();
  addActivity({ source: "agent", title: "Agent saved this run week", detail: `${plan.eventIds.length} runs · ${plan.totalDistanceKm} KM` });
  return plan;
}

async function readPassportForAgent() {
  if (!state.session?.authenticated) {
    throw new Error("Sign in with ChatGPT ก่อนอ่าน Runner Passport");
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
    showToast("Sign in with ChatGPT เพื่อให้ Agent จำตารางนี้", true);
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
    showToast(`บันทึก ${result.event_count ?? 0} runs ลง Passport แล้ว`);
  } catch (error) {
    showToast(error instanceof Error ? error.message : "บันทึกตารางไม่สำเร็จ", true);
  } finally {
    button?.removeAttribute("aria-busy");
    if (button) button.disabled = false;
  }
}

async function runAgentAction(action: string) {
  const harness = window.__RUN_SOCIAL_WEBMCP__;
  if (!harness) {
    showToast("Runner Agent ยังเริ่มไม่สำเร็จ กรุณาลองอีกครั้ง", true);
    return;
  }

  try {
    if (action === "plan-week") {
      await executeSchedulePlan({}, "“เปิดตารางวิ่งทั้งหมดและเรียงงานถัดไปให้ฉัน”");
    } else if (action === "bangkok-easy") {
      const result = await executeSchedulePlan(
        { city: "Bangkok", distance_km: 5, pace: "social", social_preference: "alcohol_free", alcohol_free_required: true },
        "“หา Bangkok 5K เพซสบาย มี alcohol-free แล้วเปิดตัวที่เหมาะให้ฉัน”",
      );
      const first = result?.events[0];
      if (first) await harness.execute("get_run_event_details", { event_id: first.id });
    } else if (action === "compare-social") {
      const result = await executeSchedulePlan(
        { pace: "social", social_preference: "alcohol_free" },
        "“จัดตารางสาย social ที่มี alcohol-free แล้วเทียบสามตัวเลือกแรก”",
      );
      const ids = result?.events.slice(0, 3).map((event) => event.id) ?? [];
      if (ids.length >= 2) {
        await harness.execute("compare_run_events", { event_ids: ids });
        showToast(`Runner Agent เทียบ ${ids.length} ตัวเลือกแล้ว`);
      }
    } else if (action === "return") {
      setAgentPrompt("“เปิดงาน Bangkok 5K แล้ววางทางกลับที่ปลอดภัยให้ฉัน”");
      const result = await harness.execute("get_safe_return_options", {
        event_id: "bkk-riverside-5",
        social_preference: "alcohol_free",
      }) as { warning?: string };
      const summary = document.querySelector<HTMLDivElement>("#agentPlanSummary");
      if (summary) summary.innerHTML = `<div><span>SAFE RETURN</span><strong>แผนกลับพร้อมแล้ว</strong></div><p>${escapeHtml(result.warning ?? "เลือกทางกลับก่อนออกวิ่ง")}</p>`;
      showToast("Runner Agent วางทางกลับให้แล้ว");
    }
  } catch (error) {
    showToast(error instanceof Error ? error.message : "Runner Agent ทำงานไม่สำเร็จ", true);
  }
}

async function initializeWebMcp() {
  const result = await registerWebMcpTools(localStorage, {
    selectEvent: (eventId) => openEvent(eventId, "agent"),
    showSchedule: renderAgentSchedule,
    showSupportLoop: renderRunnerSupportLoop,
    showPendingRegistration: showPendingConfirmation,
    refreshPasses,
    readPassport: readPassportForAgent,
    saveSchedule: savePlanForAgent,
    readRunPasses: readPassesForAgent,
    cancelRunPass: cancelPassForAgent,
    logActivity: addActivity,
  });
  state.webMcpSupported = result.supported;

  const status = document.querySelector<HTMLDivElement>("#webMcpStatus");
  const toolCount = document.querySelector<HTMLElement>("#toolCount");
  if (toolCount) toolCount.textContent = `${result.registered.length || 13} actions`;
  if (status) {
    status.classList.toggle("is-live", result.supported);
    status.classList.toggle("is-fallback", !result.supported);
    status.innerHTML = result.supported
      ? `<span class="status-dot"></span><div><strong>Runner Agent connected via WebMCP</strong><small>${result.registered.length} actions ready for the browser agent</small></div>`
      : `<span class="status-dot"></span><div><strong>Runner Agent planner is ready</strong><small>Connect a WebMCP browser to let an external agent use the same actions</small></div>`;
  }
  addActivity({
    source: "system",
    title: result.supported ? "Runner Agent connected" : "Runner Agent local planner ready",
    detail: result.supported
      ? `${result.registered.length} task actions exposed to the browser agent`
      : "Schedule planning works now; external agent control needs a WebMCP browser",
  });
}

renderShell();
renderAgentSchedule({});
renderEvents();
renderActivity();
refreshPasses();
bindUi();
void initializePassport();

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
