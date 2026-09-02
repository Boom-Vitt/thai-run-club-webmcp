import { EVENTS, PACE_LABELS, SOCIAL_LABELS } from "./data";
import {
  cancelRegistration,
  checkReadiness,
  compareEvents,
  discoverEvents,
  findEvent,
  getRules,
  readRegistrations,
  safeReturnOptions,
  stageRegistration,
} from "./domain";
import type {
  ActivityEntry,
  City,
  EventFilters,
  PaceBand,
  ReadinessInput,
  RegistrationInput,
  SocialOption,
  TransportMode,
} from "./types";

type JsonSchema = Record<string, unknown>;

export interface WebMcpTool {
  name: string;
  title: string;
  description: string;
  inputSchema: JsonSchema;
  annotations: {
    readOnlyHint: boolean;
    untrustedContentHint: boolean;
  };
  execute: (input: Record<string, unknown>, options?: { signal?: AbortSignal }) => Promise<unknown>;
}

export interface ToolUiBridge {
  selectEvent: (eventId: string) => void;
  showPendingRegistration: (input: RegistrationInput) => void;
  refreshPasses: () => void;
  logActivity: (entry: Omit<ActivityEntry, "id" | "time">) => void;
}

export interface WebMcpRegistrationResult {
  supported: boolean;
  registered: string[];
  error?: string;
}

const citySchema = { type: "string", enum: ["Bangkok", "Chiang Mai", "Phuket", "Khon Kaen"] };
const paceSchema = { type: "string", enum: ["social", "steady", "tempo"] };
const socialSchema = { type: "string", enum: ["alcohol_free", "beer_optional", "run_only"] };
const transportSchema = { type: "string", enum: ["transit", "taxi", "walk", "sober_driver"] };

function assertActive(options?: { signal?: AbortSignal }) {
  if (options?.signal?.aborted) {
    throw options.signal.reason ?? new DOMException("Tool execution cancelled", "AbortError");
  }
}

function stringValue(value: unknown, field: string, maxLength = 160): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} is required`);
  }
  return value.trim().slice(0, maxLength);
}

function booleanValue(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") throw new Error(`${field} must be true or false`);
  return value;
}

function activity(bridge: ToolUiBridge, title: string, detail: string) {
  bridge.logActivity({ source: "agent", title, detail });
}

export function createToolDefinitions(storage: Storage, bridge: ToolUiBridge): WebMcpTool[] {
  return [
    {
      name: "discover_run_events",
      title: "Discover Thailand run events",
      description:
        "Find matching Thailand run-club events by city, distance, pace, date, and post-run social preference. Use this before comparing or registering. Alcohol is always optional.",
      inputSchema: {
        type: "object",
        properties: {
          city: citySchema,
          distance_km: { type: "number", enum: [3, 5, 7, 10] },
          pace: paceSchema,
          date: { type: "string", format: "date", maxLength: 10 },
          social_preference: socialSchema,
          alcohol_free_required: { type: "boolean", default: false },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: async (input, options) => {
        assertActive(options);
        const filters: EventFilters = {
          city: input.city as City | undefined,
          distanceKm: input.distance_km as number | undefined,
          pace: input.pace as PaceBand | undefined,
          date: input.date as string | undefined,
          socialPreference: input.social_preference as SocialOption | undefined,
          alcoholFreeRequired: input.alcohol_free_required as boolean | undefined,
        };
        const matches = discoverEvents(filters).map(({ event, matchReasons }) => ({
          id: event.id,
          city: event.city,
          neighborhood: event.neighborhood,
          date: event.date,
          start_time: event.startTime,
          distance_km: event.distanceKm,
          pace_groups: event.paceBands.map((pace) => PACE_LABELS[pace]),
          social_options: event.social.map((option) => SOCIAL_LABELS[option]),
          price_thb: event.priceThb,
          spots_left: event.spotsLeft,
          match_reasons: matchReasons,
        }));
        activity(bridge, "Agent searched events", `${matches.length} matches from structured filters`);
        return { count: matches.length, events: matches };
      },
    },
    {
      name: "compare_run_events",
      title: "Compare run events",
      description:
        "Compare two or three run events side by side using dates, distance, pace, price, capacity, social choices, and safe-return information.",
      inputSchema: {
        type: "object",
        properties: {
          event_ids: {
            type: "array",
            items: { type: "string", enum: EVENTS.map((event) => event.id) },
            minItems: 2,
            maxItems: 3,
            uniqueItems: true,
          },
        },
        required: ["event_ids"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: async (input, options) => {
        assertActive(options);
        const ids = Array.isArray(input.event_ids) ? input.event_ids.map(String) : [];
        const comparison = compareEvents(ids);
        activity(bridge, "Agent compared events", comparison.map((event) => event.id).join(" · "));
        return { events: comparison, note: "Beer is optional and purchased separately at a licensed venue." };
      },
    },
    {
      name: "get_run_event_details",
      title: "Get run event details",
      description:
        "Get full operational details for one event and make it visible in the shared human interface.",
      inputSchema: {
        type: "object",
        properties: { event_id: { type: "string", enum: EVENTS.map((event) => event.id) } },
        required: ["event_id"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: async (input, options) => {
        assertActive(options);
        const eventId = stringValue(input.event_id, "event_id", 80);
        const event = findEvent(eventId);
        if (!event) throw new Error("Event not found");
        bridge.selectEvent(event.id);
        activity(bridge, "Agent opened event", `${event.city} · ${event.distanceKm} km`);
        return {
          event,
          pace_labels: event.paceBands.map((pace) => PACE_LABELS[pace]),
          social_labels: event.social.map((option) => SOCIAL_LABELS[option]),
          responsible_social_policy: getRules(),
        };
      },
    },
    {
      name: "get_event_rules",
      title: "Read participation and social rules",
      description:
        "Read run safety, age, alcohol, licensed-venue, transport, health, and choice rules. Call this before preparing a registration.",
      inputSchema: {
        type: "object",
        properties: {
          event_id: { type: "string", enum: EVENTS.map((event) => event.id) },
          topic: { type: "string", maxLength: 40 },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: async (input, options) => {
        assertActive(options);
        const eventId = input.event_id ? stringValue(input.event_id, "event_id", 80) : undefined;
        if (eventId && !findEvent(eventId)) throw new Error("Event not found");
        const result = getRules(typeof input.topic === "string" ? input.topic : undefined);
        activity(bridge, "Agent checked the rules", `${result.rules.length} operational rules returned`);
        return { event_id: eventId ?? null, ...result };
      },
    },
    {
      name: "check_participation_readiness",
      title: "Check participation readiness",
      description:
        "Apply event safety rules to user-provided declarations. This is not medical advice or diagnosis. A blocked result must not be overridden by an agent.",
      inputSchema: {
        type: "object",
        properties: {
          event_id: { type: "string", enum: EVENTS.map((event) => event.id) },
          age_20_plus: { type: "boolean" },
          has_concerning_symptoms: { type: "boolean" },
          has_hydration_plan: { type: "boolean" },
          transport_mode: transportSchema,
          social_preference: socialSchema,
        },
        required: [
          "event_id",
          "age_20_plus",
          "has_concerning_symptoms",
          "has_hydration_plan",
          "transport_mode",
          "social_preference",
        ],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: async (input, options) => {
        assertActive(options);
        const readiness: ReadinessInput = {
          eventId: stringValue(input.event_id, "event_id", 80),
          age20Plus: booleanValue(input.age_20_plus, "age_20_plus"),
          hasConcerningSymptoms: booleanValue(input.has_concerning_symptoms, "has_concerning_symptoms"),
          hasHydrationPlan: booleanValue(input.has_hydration_plan, "has_hydration_plan"),
          transportMode: input.transport_mode as TransportMode,
          socialPreference: input.social_preference as SocialOption,
        };
        const result = checkReadiness(readiness);
        activity(bridge, "Agent ran readiness check", result.status.toUpperCase());
        return result;
      },
    },
    {
      name: "get_safe_return_options",
      title: "Plan a safe return",
      description:
        "Get event-specific public transport, taxi, walking, and sober-driver options. Never recommends driving after drinking.",
      inputSchema: {
        type: "object",
        properties: {
          event_id: { type: "string", enum: EVENTS.map((event) => event.id) },
          social_preference: socialSchema,
        },
        required: ["event_id"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: async (input, options) => {
        assertActive(options);
        const result = safeReturnOptions(
          stringValue(input.event_id, "event_id", 80),
          input.social_preference as SocialOption | undefined,
        );
        activity(bridge, "Agent planned the return", result.warning);
        return result;
      },
    },
    {
      name: "prepare_run_registration",
      title: "Prepare run registration",
      description:
        "Validate and stage a run registration in the visible page. This tool never finalizes registration; the human must review and press the confirmation button.",
      inputSchema: {
        type: "object",
        properties: {
          event_id: { type: "string", enum: EVENTS.map((event) => event.id) },
          runner_name: { type: "string", minLength: 2, maxLength: 80 },
          email: { type: "string", format: "email", maxLength: 120 },
          emergency_contact: { type: "string", minLength: 8, maxLength: 40 },
          pace: paceSchema,
          social_preference: socialSchema,
          age_20_plus: { type: "boolean" },
          transport_mode: transportSchema,
          rules_accepted: { type: "boolean", const: true },
          privacy_accepted: { type: "boolean", const: true },
        },
        required: [
          "event_id",
          "runner_name",
          "email",
          "emergency_contact",
          "pace",
          "social_preference",
          "age_20_plus",
          "transport_mode",
          "rules_accepted",
          "privacy_accepted",
        ],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: async (input, options) => {
        assertActive(options);
        const registration: RegistrationInput = {
          eventId: stringValue(input.event_id, "event_id", 80),
          runnerName: stringValue(input.runner_name, "runner_name", 80),
          email: stringValue(input.email, "email", 120),
          emergencyContact: stringValue(input.emergency_contact, "emergency_contact", 40),
          pace: input.pace as PaceBand,
          socialPreference: input.social_preference as SocialOption,
          age20Plus: booleanValue(input.age_20_plus, "age_20_plus"),
          transportMode: input.transport_mode as TransportMode,
          rulesAccepted: booleanValue(input.rules_accepted, "rules_accepted"),
          privacyAccepted: booleanValue(input.privacy_accepted, "privacy_accepted"),
        };
        const result = stageRegistration(storage, registration);
        if (result.status === "pending_human_confirmation") {
          bridge.showPendingRegistration(registration);
          activity(bridge, "Agent prepared registration", "Waiting for visible human confirmation");
        } else {
          activity(bridge, "Registration needs attention", result.errors.join(" · "));
        }
        return result;
      },
    },
    {
      name: "get_my_run_passes",
      title: "Get my run passes",
      description:
        "List run passes stored in this browser for the current user. Sensitive emergency-contact details are never returned.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: async (_input, options) => {
        assertActive(options);
        const registrations = readRegistrations(storage).map(({ emergencyContact: _private, ...safe }) => safe);
        activity(bridge, "Agent checked run passes", `${registrations.length} passes found in this browser`);
        return { count: registrations.length, passes: registrations };
      },
    },
    {
      name: "cancel_run_registration",
      title: "Cancel a run registration",
      description:
        "Cancel a run pass only after the user explicitly confirms cancellation. If confirmed is false, return confirmation_required without changing anything.",
      inputSchema: {
        type: "object",
        properties: {
          pass_id: { type: "string", minLength: 8, maxLength: 80 },
          confirmed: { type: "boolean" },
        },
        required: ["pass_id", "confirmed"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: async (input, options) => {
        assertActive(options);
        const passId = stringValue(input.pass_id, "pass_id", 80);
        const confirmed = booleanValue(input.confirmed, "confirmed");
        if (!confirmed) {
          return { status: "confirmation_required", pass_id: passId, changed: false };
        }
        const cancelled = cancelRegistration(storage, passId);
        bridge.refreshPasses();
        activity(bridge, "Agent cancelled a run pass", passId);
        return { status: cancelled.status, pass_id: passId, changed: true };
      },
    },
  ];
}

export async function registerWebMcpTools(
  storage: Storage,
  bridge: ToolUiBridge,
): Promise<WebMcpRegistrationResult> {
  const tools = createToolDefinitions(storage, bridge);
  window.__RUN_SOCIAL_WEBMCP__ = {
    tools,
    execute: async (name, input) => {
      const tool = tools.find((candidate) => candidate.name === name);
      if (!tool) throw new Error(`Unknown tool: ${name}`);
      return tool.execute(input);
    },
  };

  if (!document.modelContext?.registerTool) {
    return { supported: false, registered: tools.map((tool) => tool.name) };
  }

  window.__RUN_SOCIAL_WEBMCP_CONTROLLER__?.abort();
  const controller = new AbortController();
  window.__RUN_SOCIAL_WEBMCP_CONTROLLER__ = controller;

  try {
    for (const tool of tools) {
      await document.modelContext.registerTool(tool, { signal: controller.signal });
    }
    return { supported: true, registered: tools.map((tool) => tool.name) };
  } catch (error) {
    controller.abort();
    return {
      supported: false,
      registered: [],
      error: error instanceof Error ? error.message : "WebMCP registration failed",
    };
  }
}
