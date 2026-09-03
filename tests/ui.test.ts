// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("Runner Agent working surface", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    document.body.innerHTML = '<div id="app"></div>';
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: undefined,
    });
  });

  afterEach(() => {
    window.__RUN_SOCIAL_WEBMCP_CONTROLLER__?.abort();
    window.__RUN_SOCIAL_WEBMCP_CONTROLLER__ = undefined;
    window.__RUN_SOCIAL_WEBMCP__ = undefined;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("plans and renders a no-login Bangkok run schedule through the tool execution path", async () => {
    await import("../src/main");
    await Promise.resolve();

    expect(document.querySelector("#hero-title")?.textContent).toContain("MOVE WITH");
    expect(document.querySelector(".run-world")?.getAttribute("aria-label")).toContain("Thai pace sculpture");
    expect(document.querySelector(".run-world")?.textContent).toContain("THAI PACE");
    expect(document.querySelector(".run-world")?.textContent).not.toContain("THAI MOTION LOOM");
    expect(document.querySelectorAll(".agent-schedule-row")).toHaveLength(6);

    const form = document.querySelector<HTMLFormElement>("#agentPlannerForm")!;
    (form.elements.namedItem("city") as HTMLSelectElement).value = "Bangkok";
    (form.elements.namedItem("distance") as HTMLSelectElement).value = "5";
    (form.elements.namedItem("pace") as HTMLSelectElement).value = "social";
    (form.elements.namedItem("social") as HTMLSelectElement).value = "alcohol_free";
    form.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }));

    await vi.waitFor(() => {
      expect(document.querySelector("#agentPlanSummary")?.textContent).toContain("1 run matched");
    });
    expect(document.querySelectorAll(".agent-schedule-row")).toHaveLength(1);
    expect(document.querySelectorAll("#eventGrid .event-card")).toHaveLength(1);
    expect(document.querySelector("#agentPromptText")?.textContent).toContain("Bangkok");
  });

  it("accepts a conversational Thai request and runs the matching schedule action", async () => {
    await import("../src/main");
    const form = document.querySelector<HTMLFormElement>("#agentPlannerForm")!;
    const request = form.elements.namedItem("request") as HTMLTextAreaElement;
    request.value = "อยากวิ่ง 5 กม. ในกรุงเทพแบบชิล ๆ และไม่ดื่ม";
    form.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }));

    await vi.waitFor(() => {
      expect(document.querySelectorAll(".agent-schedule-row")).toHaveLength(1);
    });
    expect(document.querySelector("#agentPromptText")?.textContent).toContain("อยากวิ่ง 5 กม.");
    expect(document.querySelector("#agentPlanSummary")?.textContent).toContain("Alcohol-free");
  });

  it("turns a preparation question into a visible Runner Commons loop", async () => {
    await import("../src/main");
    const form = document.querySelector<HTMLFormElement>("#agentPlannerForm")!;
    const request = form.elements.namedItem("request") as HTMLTextAreaElement;
    request.value = "อยากวิ่ง 5 กม. ในกรุงเทพ งานนี้ต้องเตรียมอะไร ยืมหรือเติมก่อนซื้อได้ไหม";
    form.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }));

    await vi.waitFor(() => {
      expect(document.querySelector<HTMLElement>("#runnerSupportLoop")?.hidden).toBe(false);
    });
    expect(document.querySelector("#runnerSupportLoop")?.textContent).toContain("RUNNER COMMONS");
    expect(document.querySelector("#runnerSupportLoop")?.textContent).toContain("Borrow from the club");
    expect(document.querySelector("#runnerSupportLoop")?.textContent).toContain("no cart or checkout");
    expect(document.querySelector("#runnerSupportLoop")?.textContent).toContain("STORE REQUIRED");
  });

  it("searches a connected catalog from natural language and renders external results", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      const data = url.endsWith("/api/commerce/status")
        ? {
            provider: "shopify_storefront_mcp",
            configured: true,
            state: "ready",
            storeName: "runner-circular",
            capabilities: ["catalog_search"],
            boundary: "search_only_no_cart_or_checkout",
          }
        : url.endsWith("/api/commerce/search")
          ? {
              provider: "shopify_storefront_mcp",
              eventId: "bkk-riverside-5",
              need: "reflective_visibility",
              needLabel: "ไฟหรืออุปกรณ์สะท้อนแสง",
              query: "reflective running safety",
              products: [{
                id: "gid://shopify/Product/1",
                title: "Repairable safety light",
                description: "เปลี่ยนแบตเตอรี่ได้",
                url: "https://runner-circular.example/products/safety-light",
                price: { amountMinor: 89000, currency: "THB" },
                available: true,
              }],
              messages: [],
              humanConfirmationRequired: true,
              nextAction: "review_on_merchant_site",
            }
          : { authenticated: false, user: null, profile: null };
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }));

    await import("../src/main");
    await vi.waitFor(() => {
      expect(document.body.textContent).toContain("14 agent actions");
    });

    const form = document.querySelector<HTMLFormElement>("#agentPlannerForm")!;
    const request = form.elements.namedItem("request") as HTMLTextAreaElement;
    request.value = "กรุงเทพ 5 กม. ช่วยหาของที่ขาดจากร้านให้ด้วย";
    form.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }));

    await vi.waitFor(() => {
      expect(document.querySelector("#merchantSearchResults")?.textContent).toContain("Repairable safety light");
    });
    expect(document.querySelector("#merchantSearchResults")?.textContent).toContain("no cart or checkout");
  });

  it("loads a signed-in D1-backed Runner Passport and saved week", async () => {
    const session = {
      authenticated: true,
      user: { displayName: "Seedy Runner", email: "seedy@sites.test" },
      profile: {
        displayName: "Seedy Runner",
        email: "seedy@sites.test",
        homeCity: "Bangkok",
        preferredPace: "social",
        weeklyGoalKm: 15,
        updatedAt: "2026-09-03T07:00:00.000Z",
      },
    };
    const passport = {
      ...session,
      savedPlans: [{
        id: "WEEK-test",
        filters: { city: "Bangkok", pace: "social" },
        eventIds: ["bkk-riverside-5", "bkk-green-3"],
        totalDistanceKm: 8,
        createdAt: "2026-09-03T07:00:00.000Z",
      }],
      passes: [],
    };
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      const data = url.endsWith("/api/passport") ? passport : session;
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }));

    await import("../src/main");

    await vi.waitFor(() => {
      expect(document.querySelector("#agentIdentityMode")?.textContent).toBe("MEMORY ON");
    });
    expect(document.querySelector("#headerAccount")?.textContent).toBe("SR");
    expect(document.querySelector("#passportCard")?.textContent).toContain("15 KM");
    expect(document.querySelectorAll(".saved-week-ticket")).toHaveLength(1);
  });

  it("defaults to English and switches the complete shell to Chinese and Thai", async () => {
    await import("../src/main");

    expect(document.documentElement.lang).toBe("en");
    expect(document.querySelector("#hero-title")?.textContent).toContain("THAILAND");
    expect(document.querySelector("#runnerRequest")?.getAttribute("placeholder")).toContain("Bangkok");

    document.querySelector<HTMLButtonElement>('[data-locale="zh"]')?.click();
    expect(document.documentElement.lang).toBe("zh-CN");
    expect(document.querySelector("#hero-title")?.textContent).toContain("与泰国");
    expect(document.querySelector("#runnerRequest")?.getAttribute("placeholder")).toContain("曼谷");

    document.querySelector<HTMLButtonElement>('[data-locale="th"]')?.click();
    expect(document.documentElement.lang).toBe("th");
    expect(document.querySelector("#hero-title")?.textContent).toContain("ประเทศไทย");
    expect(localStorage.getItem("run-social-locale")).toBe("th");
  });
});
