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

    expect(document.querySelector("#hero-title")?.textContent).toContain("YOUR RUN WEEK");
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
});
