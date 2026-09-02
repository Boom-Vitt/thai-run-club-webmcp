import { describe, expect, it, vi } from "vitest";
import { createToolDefinitions, type ToolUiBridge } from "../src/webmcp";
import { confirmPendingRegistration } from "../src/domain";
import { MemoryStorage } from "./helpers";

function setup() {
  const storage = new MemoryStorage();
  const bridge: ToolUiBridge = {
    selectEvent: vi.fn(),
    showPendingRegistration: vi.fn(),
    refreshPasses: vi.fn(),
    logActivity: vi.fn(),
  };
  return { storage, bridge, tools: createToolDefinitions(storage, bridge) };
}

describe("WebMCP tool contract", () => {
  it("exposes nine unique, valid tool names and serializable schemas", () => {
    const { tools } = setup();
    const names = tools.map((tool) => tool.name);

    expect(tools).toHaveLength(9);
    expect(new Set(names).size).toBe(9);
    for (const tool of tools) {
      expect(tool.name).toMatch(/^[A-Za-z0-9_.-]{1,128}$/);
      expect(tool.description.length).toBeGreaterThan(20);
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
    expect(JSON.stringify(result)).not.toContain("0812345678");
  });

  it("does not cancel a pass when explicit confirmation is false", async () => {
    const { tools } = setup();
    const cancel = tools.find((candidate) => candidate.name === "cancel_run_registration")!;
    const result = await cancel.execute({ pass_id: "PASS-DEMO-1234", confirmed: false });
    expect(result).toEqual({ status: "confirmation_required", pass_id: "PASS-DEMO-1234", changed: false });
  });
});
