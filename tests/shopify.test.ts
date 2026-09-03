import { describe, expect, it, vi } from "vitest";
import {
  createShopifyCatalogRequest,
  normalizeShopifyStoreDomain,
  parseShopifyCatalogResponse,
  searchShopifyCatalog,
  shopifyCommerceStatus,
  validateCommerceNeed,
} from "../worker/shopify";

const catalogPayload = {
  jsonrpc: "2.0",
  id: 1,
  result: {
    structuredContent: {
      products: [{
        id: "gid://shopify/Product/101",
        title: "Refillable trail flask",
        description: { plain: "Replaceable cap and long-life body" },
        url: "https://runner-circular.example/products/trail-flask",
        price_range: {
          min: { amount: 129000, currency: "THB" },
          max: { amount: 159000, currency: "THB" },
        },
        variants: [{ availability: { available: true } }],
      }],
      messages: [{ type: "info", content: "Pickup availability varies by location" }],
    },
  },
};

describe("Shopify Storefront MCP adapter", () => {
  it("accepts only a bare or HTTPS myshopify.com store domain", () => {
    expect(normalizeShopifyStoreDomain("runner-circular.myshopify.com")).toBe("runner-circular.myshopify.com");
    expect(normalizeShopifyStoreDomain("https://runner-circular.myshopify.com")).toBe("runner-circular.myshopify.com");
    expect(normalizeShopifyStoreDomain("https://runner-circular.myshopify.com/admin")).toBeNull();
    expect(normalizeShopifyStoreDomain("https://runner-circular.myshopify.com.evil.example")).toBeNull();
  });

  it("reports whether an authorized store is configured without exposing credentials", () => {
    expect(shopifyCommerceStatus(undefined)).toMatchObject({ configured: false, state: "store_required" });
    expect(shopifyCommerceStatus("runner-circular.myshopify.com")).toMatchObject({
      configured: true,
      state: "ready",
      storeName: "runner-circular",
      boundary: "search_only_no_cart_or_checkout",
    });
  });

  it("builds the official UCP catalog MCP request with Thailand context", () => {
    expect(createShopifyCatalogRequest("reusable_hydration")).toMatchObject({
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: "search_catalog",
        arguments: {
          meta: { "ucp-agent": { profile: expect.stringContaining("shopify.dev/ucp/agent-profiles") } },
          catalog: {
            query: expect.stringContaining("reusable"),
            context: { address_country: "TH", language: "th", currency: "THB" },
            pagination: { limit: 6 },
          },
        },
      },
    });
  });

  it("normalizes bounded, display-safe catalog output", () => {
    expect(parseShopifyCatalogResponse(catalogPayload)).toEqual({
      products: [{
        id: "gid://shopify/Product/101",
        title: "Refillable trail flask",
        description: "Replaceable cap and long-life body",
        url: "https://runner-circular.example/products/trail-flask",
        price: { amountMinor: 129000, currency: "THB" },
        available: true,
      }],
      messages: ["Pickup availability varies by location"],
    });
  });

  it("calls the configured store MCP endpoint and never calls a cart tool", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(JSON.stringify(catalogPayload), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
    const result = await searchShopifyCatalog({
      storeDomain: "runner-circular.myshopify.com",
      eventId: "bkk-riverside-5",
      need: "reusable_hydration",
      fetcher,
    });

    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls[0]?.[0]).toBe("https://runner-circular.myshopify.com/api/ucp/mcp");
    const request = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body));
    expect(request.params.name).toBe("search_catalog");
    expect(JSON.stringify(request)).not.toContain("cart");
    expect(result).toMatchObject({ products: [{ title: "Refillable trail flask" }], humanConfirmationRequired: true });
  });

  it("rejects unsupported need categories before any external request", () => {
    expect(() => validateCommerceNeed("beer")).toThrow("ประเภทสิ่งที่ต้องการค้นหาไม่ถูกต้อง");
  });
});
