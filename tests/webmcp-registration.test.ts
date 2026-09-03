// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { registerWebMcpTools, type ToolUiBridge, type WebMcpTool } from "../src/webmcp";

const bridge: ToolUiBridge = {
  selectEvent: vi.fn(),
  showSchedule: vi.fn(),
  showSupportLoop: vi.fn(),
  searchRunnerNeed: vi.fn(async (eventId, need) => ({
    provider: "shopify_storefront_mcp" as const,
    eventId,
    need,
    needLabel: "Runner need",
    query: "runner need",
    products: [],
    messages: [],
    humanConfirmationRequired: true as const,
    nextAction: "review_on_merchant_site" as const,
  })),
  showPendingRegistration: vi.fn(),
  refreshPasses: vi.fn(),
  readPassport: vi.fn(async () => ({ profile: null, savedWeeks: [], runPassCount: 0 })),
  saveSchedule: vi.fn(async () => ({ id: "WEEK-test" })),
  readRunPasses: vi.fn(async () => []),
  cancelRunPass: vi.fn(async () => ({ status: "cancelled" })),
  logActivity: vi.fn(),
};

afterEach(() => {
  window.__RUN_SOCIAL_WEBMCP_CONTROLLER__?.abort();
  window.__RUN_SOCIAL_WEBMCP_CONTROLLER__ = undefined;
  window.__RUN_SOCIAL_WEBMCP__ = undefined;
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("browser WebMCP registration", () => {
  it("registers all tools through document.modelContext and exposes an executable QA harness", async () => {
    const registered: WebMcpTool[] = [];
    const registerTool = vi.fn(async (tool: WebMcpTool) => {
      registered.push(tool);
    });
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: { registerTool, getTools: vi.fn() },
    });

    const result = await registerWebMcpTools(localStorage, bridge);

    expect(result.supported).toBe(true);
    expect(result.registered).toHaveLength(14);
    expect(registerTool).toHaveBeenCalledTimes(14);
    expect(registered.map((tool) => tool.name)).toContain("prepare_run_registration");
    expect(registered.map((tool) => tool.name)).toContain("build_runner_support_loop");
    expect(registered.map((tool) => tool.name)).toContain("search_runner_need");

    const discovery = await window.__RUN_SOCIAL_WEBMCP__?.execute("discover_run_events", {
      city: "Bangkok",
      distance_km: 5,
    });
    expect(discovery).toMatchObject({ count: 1 });
  });

  it("keeps the human experience available when modelContext is absent", async () => {
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: undefined,
    });

    const result = await registerWebMcpTools(localStorage, bridge);
    expect(result.supported).toBe(false);
    expect(result.registered).toHaveLength(14);
    expect(window.__RUN_SOCIAL_WEBMCP__).toBeDefined();
  });
});
