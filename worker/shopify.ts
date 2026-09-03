import {
  COMMERCE_NEED_LABELS,
  COMMERCE_NEEDS,
  type CommerceNeed,
  type CommerceProduct,
  type CommerceSearchResult,
  type CommerceStatus,
} from "../src/commerce";

const AGENT_PROFILE =
  "https://shopify.dev/ucp/agent-profiles/examples/2026-08-25/valid-with-capabilities.json";

const SEARCH_QUERIES: Record<CommerceNeed, string> = {
  reflective_visibility: "reusable reflective running light band safety visibility",
  reusable_hydration: "reusable refillable running water bottle hydration",
  repair_essentials: "running shoe laces repair patch kit replacement parts",
};

type UnknownRecord = Record<string, unknown>;

export class ShopifyMcpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function record(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : null;
}

function boundedString(value: unknown, maxLength: number): string | null {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, maxLength)
    : null;
}

function safeHttpsUrl(value: unknown): string | null {
  const raw = boundedString(value, 1_000);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function normalizeShopifyStoreDomain(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  const candidate = value.trim().toLowerCase();
  let url: URL;
  try {
    url = new URL(candidate.includes("://") ? candidate : `https://${candidate}`);
  } catch {
    return null;
  }
  if (
    url.protocol !== "https:"
    || url.username
    || url.password
    || url.port
    || (url.pathname !== "/" && url.pathname !== "")
    || url.search
    || url.hash
    || !/^[a-z0-9][a-z0-9-]{0,62}\.myshopify\.com$/.test(url.hostname)
  ) {
    return null;
  }
  return url.hostname;
}

export function shopifyCommerceStatus(value: string | undefined): CommerceStatus {
  const domain = normalizeShopifyStoreDomain(value);
  const hasValue = Boolean(value?.trim());
  return {
    provider: "shopify_storefront_mcp",
    configured: Boolean(domain),
    state: domain ? "ready" : hasValue ? "invalid_configuration" : "store_required",
    storeName: domain ? domain.slice(0, -".myshopify.com".length) : null,
    capabilities: ["catalog_search"],
    boundary: "search_only_no_cart_or_checkout",
  };
}

export function validateCommerceNeed(value: unknown): CommerceNeed {
  if (typeof value !== "string" || !COMMERCE_NEEDS.includes(value as CommerceNeed)) {
    throw new ShopifyMcpError(400, "invalid_need", "ประเภทสิ่งที่ต้องการค้นหาไม่ถูกต้อง");
  }
  return value as CommerceNeed;
}

export function createShopifyCatalogRequest(need: CommerceNeed): UnknownRecord {
  return {
    jsonrpc: "2.0",
    method: "tools/call",
    id: 1,
    params: {
      name: "search_catalog",
      arguments: {
        meta: { "ucp-agent": { profile: AGENT_PROFILE } },
        catalog: {
          query: SEARCH_QUERIES[need],
          context: {
            address_country: "TH",
            language: "th",
            currency: "THB",
            intent:
              "Runner has checked bring, borrow, refill, and repair first. Prefer reusable, repairable, rental, refill, or second-life options when available.",
          },
          pagination: { limit: 6 },
        },
      },
    },
  };
}

function descriptionText(value: unknown): string {
  const description = record(value);
  return boundedString(description?.plain, 220)
    ?? boundedString(description?.markdown, 220)
    ?? "";
}

function productPrice(product: UnknownRecord): CommerceProduct["price"] {
  const priceRange = record(product.price_range);
  const min = record(priceRange?.min);
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const firstVariant = record(variants[0]);
  const candidate = min ?? record(firstVariant?.price);
  const amount = Number(candidate?.amount);
  const currency = boundedString(candidate?.currency, 3)?.toUpperCase();
  if (!Number.isSafeInteger(amount) || amount < 0 || !currency?.match(/^[A-Z]{3}$/)) return null;
  return { amountMinor: amount, currency };
}

function normalizeProduct(value: unknown): CommerceProduct | null {
  const product = record(value);
  if (!product) return null;
  const id = boundedString(product.id, 240);
  const title = boundedString(product.title, 160);
  if (!id || !title) return null;
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const firstVariant = record(variants[0]);
  const availability = record(firstVariant?.availability);
  return {
    id,
    title,
    description: descriptionText(product.description),
    url: safeHttpsUrl(product.url) ?? safeHttpsUrl(firstVariant?.url),
    price: productPrice(product),
    available: typeof availability?.available === "boolean" ? availability.available : null,
  };
}

function parseContentText(result: UnknownRecord): UnknownRecord | null {
  if (!Array.isArray(result.content)) return null;
  for (const item of result.content) {
    const content = record(item);
    if (content?.type !== "text" || typeof content.text !== "string") continue;
    try {
      const parsed = record(JSON.parse(content.text));
      if (parsed) return parsed;
    } catch {
      continue;
    }
  }
  return null;
}

export function parseShopifyCatalogResponse(payload: unknown): {
  products: CommerceProduct[];
  messages: string[];
} {
  const envelope = record(payload);
  const rpcError = record(envelope?.error);
  if (rpcError) {
    throw new ShopifyMcpError(
      502,
      "shopify_mcp_error",
      boundedString(rpcError.message, 180) ?? "Shopify Storefront MCP ปฏิเสธคำขอ",
    );
  }
  const result = record(envelope?.result);
  const structured = record(result?.structuredContent) ?? (result ? parseContentText(result) : null);
  if (!structured) {
    throw new ShopifyMcpError(502, "shopify_invalid_response", "Shopify Storefront MCP ส่งข้อมูลที่อ่านไม่ได้");
  }
  const products = (Array.isArray(structured.products) ? structured.products : [])
    .map(normalizeProduct)
    .filter((product): product is CommerceProduct => Boolean(product))
    .slice(0, 6);
  const messages = (Array.isArray(structured.messages) ? structured.messages : [])
    .map((value) => boundedString(record(value)?.content, 180))
    .filter((message): message is string => Boolean(message))
    .slice(0, 4);
  return { products, messages };
}

export async function searchShopifyCatalog(input: {
  storeDomain: string | undefined;
  eventId: string;
  need: CommerceNeed;
  fetcher?: typeof fetch;
}): Promise<CommerceSearchResult> {
  const domain = normalizeShopifyStoreDomain(input.storeDomain);
  if (!domain) {
    throw new ShopifyMcpError(
      503,
      "shopify_not_configured",
      "ร้านพันธมิตรยังไม่เชื่อม กรุณาเพิ่มโดเมน Shopify ที่ได้รับอนุญาตก่อนค้นหาของจริง",
    );
  }
  const fetcher = input.fetcher ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  let response: Response;
  try {
    response = await fetcher(`https://${domain}/api/ucp/mcp`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(createShopifyCatalogRequest(input.need)),
      signal: controller.signal,
    });
  } catch (error) {
    throw new ShopifyMcpError(
      502,
      "shopify_unreachable",
      error instanceof DOMException && error.name === "AbortError"
        ? "Shopify Storefront MCP ใช้เวลาตอบนานเกินไป"
        : "เชื่อมต่อ Shopify Storefront MCP ไม่สำเร็จ",
    );
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) {
    throw new ShopifyMcpError(
      502,
      "shopify_upstream_error",
      `Shopify Storefront MCP ตอบกลับด้วยสถานะ ${response.status}`,
    );
  }
  const parsed = parseShopifyCatalogResponse(await response.json().catch(() => null));
  return {
    provider: "shopify_storefront_mcp",
    eventId: input.eventId,
    need: input.need,
    needLabel: COMMERCE_NEED_LABELS[input.need],
    query: SEARCH_QUERIES[input.need],
    products: parsed.products,
    messages: parsed.messages,
    humanConfirmationRequired: true,
    nextAction: "review_on_merchant_site",
  };
}
