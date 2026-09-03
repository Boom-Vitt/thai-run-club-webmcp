export const COMMERCE_NEEDS = [
  "reflective_visibility",
  "reusable_hydration",
  "repair_essentials",
] as const;

export type CommerceNeed = (typeof COMMERCE_NEEDS)[number];

export const COMMERCE_NEED_LABELS: Record<CommerceNeed, string> = {
  reflective_visibility: "ไฟหรืออุปกรณ์สะท้อนแสง",
  reusable_hydration: "ภาชนะน้ำใช้ซ้ำ",
  repair_essentials: "อุปกรณ์ซ่อมชิ้นเล็ก",
};

export interface CommerceStatus {
  provider: "shopify_storefront_mcp";
  configured: boolean;
  state: "ready" | "store_required" | "invalid_configuration";
  storeName: string | null;
  capabilities: ["catalog_search"];
  boundary: "search_only_no_cart_or_checkout";
}

export interface CommerceProduct {
  id: string;
  title: string;
  description: string;
  url: string | null;
  price: { amountMinor: number; currency: string } | null;
  available: boolean | null;
}

export interface CommerceSearchResult {
  provider: "shopify_storefront_mcp";
  eventId: string;
  need: CommerceNeed;
  needLabel: string;
  query: string;
  products: CommerceProduct[];
  messages: string[];
  humanConfirmationRequired: true;
  nextAction: "review_on_merchant_site";
}

export class CommerceApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const payload = (await response.json().catch(() => null)) as
    | T
    | { error?: { code?: string; message?: string } }
    | null;
  if (!response.ok) {
    const error = typeof payload === "object" && payload !== null && "error" in payload
      ? payload.error
      : undefined;
    throw new CommerceApiError(
      response.status,
      error?.code ?? "commerce_request_failed",
      error?.message ?? "เชื่อมต่อแค็ตตาล็อกร้านค้าไม่สำเร็จ",
    );
  }
  return payload as T;
}

export function getCommerceStatus(): Promise<CommerceStatus> {
  return apiJson<CommerceStatus>("/api/commerce/status");
}

export function searchCommerceCatalog(input: {
  eventId: string;
  need: CommerceNeed;
}): Promise<CommerceSearchResult> {
  return apiJson<CommerceSearchResult>("/api/commerce/search", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
