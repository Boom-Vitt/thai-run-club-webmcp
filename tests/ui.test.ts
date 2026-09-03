// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

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
});
