import { describe, expect, it, vi } from "vitest";
import { createToolDefinitions, type ToolUiBridge } from "../src/webmcp";
import { confirmPendingRegistration } from "../src/domain";
import { MemoryStorage } from "./helpers";

function setup() {
  const storage = new MemoryStorage();
    const bridge: ToolUiBridge = {
      selectEvent: vi.fn(),
      showSchedule: vi.fn(),
      showPendingRegistration: vi.fn(),
    refreshPasses: vi.fn(),
    logActivity: vi.fn(),
  };
  return { storage, bridge, tools: createToolDefinitions(storage, bridge) };
}

describe("WebMCP tool contract", () => {
  it("exposes ten unique, valid tool names and serializable schemas", () => {
    const { tools } = setup();
    const names = tools.map((tool) => tool.name);

    expect(tools).toHaveLength(10);
    expect(new Set(names).size).toBe(10);
    for (const tool of tools) {
      expect(tool.name).toMatch(/^[A-Za-z0-9_.-]{1,128}$/);
      expect(tool.name.length).toBeLessThanOrEqual(30);
      expect(tool.description.length).toBeGreaterThan(20);
      expect(tool.description.length).toBeLessThanOrEqual(500);
      expect(tool.inputSchema).toMatchObject({ type: "object", additionalProperties: false });
      expect(() => JSON.stringify(tool.inputSchema)).not.toThrow();
    }
  });

  it("annotates discovery as read-only and registration as consequential", () => {
    const { tools } = setup();
    expect(tools.find((tool) => tool.name === "discover_run_events")?.annotations.readOnlyHint).toBe(true);
    expect(tools.find((tool) => tool.name === "prepare_run_registration")?.annotations.readOnlyHint).toBe(false);
  });

  it("returns structured discovery results", async () => {
    const { tools } = setup();
    const tool = tools.find((candidate) => candidate.name === "discover_run_events")!;
    const result = await tool.execute({ city: "Bangkok", distance_km: 5 });

    expect(result).toMatchObject({ count: 1 });
    expect((result as { events: Array<{ id: string }> }).events[0]?.id).toBe("bkk-riverside-5");
  });

  it("builds a chronological schedule and updates the shared week board", async () => {
    const { tools, bridge } = setup();
    const tool = tools.find((candidate) => candidate.name === "plan_run_schedule")!;
    const result = await tool.execute({ city: "Bangkok", pace: "social" });

    expect(result).toMatchObject({ count: 2, total_distance_km: 8, next_event_id: "bkk-riverside-5" });
    expect(bridge.showSchedule).toHaveBeenCalledWith({ city: "Bangkok", pace: "social" });
  });

  it("prepares registration without finalizing it and requests visible human review", async () => {
    const { tools, storage, bridge } = setup();
    const tool = tools.find((candidate) => candidate.name === "prepare_run_registration")!;
    const result = await tool.execute({
      event_id: "bkk-riverside-5",
      runner_name: "Nok Runner",
      email: "nok@example.com",
      emergency_contact: "0812345678",
      pace: "social",
      social_preference: "alcohol_free",
      age_20_plus: false,
      transport_mode: "transit",
      rules_accepted: true,
      privacy_accepted: true,
    });

    expect(result).toMatchObject({ status: "pending_human_confirmation" });
    expect(bridge.showPendingRegistration).toHaveBeenCalledOnce();
    expect(storage.getItem("run-social-th:registrations")).toBeNull();
  });

  it("redacts emergency-contact data from get_my_run_passes", async () => {
    const { tools, storage } = setup();
    const prepare = tools.find((candidate) => candidate.name === "prepare_run_registration")!;
    await prepare.execute({
      event_id: "bkk-riverside-5",
      runner_name: "Nok Runner",
      email: "nok@example.com",
      emergency_contact: "0812345678",
      pace: "social",
      social_preference: "alcohol_free",
      age_20_plus: false,
      transport_mode: "transit",
      rules_accepted: true,
      privacy_accepted: true,
    });
    confirmPendingRegistration(storage);

    const getPasses = tools.find((candidate) => candidate.name === "get_my_run_passes")!;
    const result = await getPasses.execute({});
    expect(getPasses.annotations.untrustedContentHint).toBe(true);
    expect(JSON.stringify(result)).not.toContain("0812345678");
  });

  it("rejects unsafe enum values even when a client bypasses JSON Schema", async () => {
    const { tools } = setup();
    const readiness = tools.find((candidate) => candidate.name === "check_participation_readiness")!;
    const prepare = tools.find((candidate) => candidate.name === "prepare_run_registration")!;

    await expect(
      readiness.execute({
        event_id: "bkk-riverside-5",
        age_20_plus: true,
        has_concerning_symptoms: false,
        has_hydration_plan: true,
        transport_mode: "drive",
        social_preference: "beer_optional",
      }),
    ).rejects.toThrow("transport_mode must be one of");

    await expect(
      prepare.execute({
        event_id: "bkk-riverside-5",
        runner_name: "Nok Runner",
        email: "nok@example.com",
        emergency_contact: "0812345678",
        pace: "social",
        social_preference: "beer_optional",
        age_20_plus: true,
        transport_mode: "drive",
        rules_accepted: true,
        privacy_accepted: true,
      }),
    ).rejects.toThrow("transport_mode must be one of");
  });

  it("honors an already-aborted execution signal", async () => {
    const { tools } = setup();
    const controller = new AbortController();
    controller.abort(new Error("user cancelled"));

    await expect(
      tools.find((candidate) => candidate.name === "discover_run_events")!.execute({}, {
        signal: controller.signal,
      }),
    ).rejects.toThrow("user cancelled");
  });

  it("keeps representative tool outputs inside the recommended 1.5K-character budget", async () => {
    const { tools } = setup();
    const cases: Array<[string, Record<string, unknown>]> = [
      ["plan_run_schedule", {}],
      ["discover_run_events", { city: "Bangkok", distance_km: 5 }],
      ["compare_run_events", { event_ids: ["bkk-riverside-5", "bkk-oldtown-7"] }],
      ["get_run_event_details", { event_id: "bkk-riverside-5" }],
      ["get_event_rules", {}],
      [
        "check_participation_readiness",
        {
          event_id: "bkk-riverside-5",
          age_20_plus: true,
          has_concerning_symptoms: false,
          has_hydration_plan: true,
          transport_mode: "transit",
          social_preference: "alcohol_free",
        },
      ],
      ["get_safe_return_options", { event_id: "bkk-riverside-5", social_preference: "alcohol_free" }],
      ["get_my_run_passes", {}],
      ["cancel_run_registration", { pass_id: "PASS-DEMO-1234", confirmed: false }],
    ];

    for (const [name, input] of cases) {
      const tool = tools.find((candidate) => candidate.name === name)!;
      const result = await tool.execute(input);
      expect(JSON.stringify(result).length, `${name} output`).toBeLessThanOrEqual(1500);
    }
  });

  it("does not cancel a pass when explicit confirmation is false", async () => {
    const { tools } = setup();
    const cancel = tools.find((candidate) => candidate.name === "cancel_run_registration")!;
    const result = await cancel.execute({ pass_id: "PASS-DEMO-1234", confirmed: false });
    expect(result).toEqual({ status: "confirmation_required", pass_id: "PASS-DEMO-1234", changed: false });
  });
});
