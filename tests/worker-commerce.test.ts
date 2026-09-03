import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "../worker/index";

afterEach(() => vi.restoreAllMocks());

function workerRequest(url: string, init?: RequestInit): Parameters<typeof worker.fetch>[0] {
  return new Request(url, init) as unknown as Parameters<typeof worker.fetch>[0];
}

describe("commerce Worker API", () => {
  it("reports a safe disconnected state without a store domain", async () => {
    const response = await worker.fetch(
      workerRequest("https://runner.example/api/commerce/status"),
      { DB: {} as D1Database },
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      provider: "shopify_storefront_mcp",
      configured: false,
      state: "store_required",
    });
  });

  it("returns a clear configuration error before contacting any merchant", async () => {
    const upstream = vi.spyOn(globalThis, "fetch");
    const response = await worker.fetch(
      workerRequest("https://runner.example/api/commerce/search", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "https://runner.example" },
        body: JSON.stringify({ eventId: "bkk-riverside-5", need: "reflective_visibility" }),
      }),
      { DB: {} as D1Database },
    );
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "shopify_not_configured" } });
    expect(upstream).not.toHaveBeenCalled();
  });
});
