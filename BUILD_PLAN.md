# Detailed Build Plan — Thailand Run Club × Optional Post-Run Social

## 1. Product direction

Working label only: **Thailand Run Club × Beer**. The participant must choose the final submission name.

Build a bilingual, mobile-first event platform where a runner and their browser agent can complete the same workflow together:

1. Discover suitable runs by city, distance, pace, date, and social preference.
2. Compare events using structured facts instead of scraping cards.
3. Read event, participation, alcohol, health, transport, and privacy rules.
4. Check whether the runner is ready to join without providing medical diagnosis.
5. Register for the run after an explicit user confirmation.
6. Produce a clear event-day plan and safe journey-home options.
7. Optionally sign in to save a Runner Passport, remembered weeks, and confirmed Run Passes.

The beer component is an optional, post-run social stop at a licensed venue. Registration never includes, discounts, gives away, sells, or requires alcohol. Alcohol-free choices are first-class.

## 2. Why WebMCP is central

The human interface uses cards, filters, forms, and a registration pass. The agent interface exposes the same application logic as structured tools, letting an agent turn a conversational request such as “Find me a relaxed 5 km Bangkok run this weekend, explain the rules, and prepare my registration” into an accurate multi-step workflow.

WebMCP is progressive enhancement: the human UI remains fully usable when `document.modelContext` is unavailable. In a supported browser, tools register through the imperative API with explicit JSON Schemas, accurate descriptions, read-only annotations, input validation, structured serializable results, shared UI state, and visible activity feedback.

## 3. MVP user journeys

### Journey A — Human

- Open landing page and understand the concept within five seconds.
- Filter event cards.
- Open an event and inspect route, pace groups, host, venue, and rules.
- Complete safety check and age declaration.
- Register and receive a locally persisted digital run pass.
- View a transport-home plan.

### Journey B — Agent collaboration

- Agent calls `discover_run_events` with structured preferences.
- Agent calls `compare_run_events` for the shortlist.
- Agent calls `get_event_rules` before any commitment.
- Agent calls `check_participation_readiness` with user-provided declarations.
- Agent calls `prepare_run_registration` to stage, but not finalize, a registration.
- User visibly confirms in the website.
- Agent calls `get_safe_return_options` to complete the event-day plan.

### Journey C — Demo

- Start on the landing page with WebMCP detected.
- Ask an agent for a social 5 km run in Bangkok with an alcohol-free option.
- Show discovery and comparison, then the selected card becoming active.
- Show rules/readiness result.
- Stage registration through WebMCP, visibly confirm as the human, and reveal the pass.
- Show safe return options and the WebMCP activity log.

## 4. WebMCP tool contract

### Read-only tools

- `plan_run_schedule`
  - Inputs: `city`, `distance_km`, `pace`, `social_preference`, `alcohol_free_required`.
  - Output: a chronological run week with a next match; updates the visible Runner Agent Week Board.
- `discover_run_events`
  - Inputs: `city`, `distance_km`, `pace`, `date`, `social_preference`, `alcohol_free_required`.
  - Output: matching event summaries and why each matches.
- `compare_run_events`
  - Inputs: `event_ids` (2–3).
  - Output: structured side-by-side facts and important rule differences.
- `get_run_event_details`
  - Inputs: `event_id`.
  - Output: schedule, route, pace groups, capacity, venue, accessibility, and availability.
- `get_event_rules`
  - Inputs: optional `event_id`, optional `topic`.
  - Output: participation, safety, alcohol, transport, privacy, cancellation, and legal-disclaimer rules.
- `check_participation_readiness`
  - Inputs: event, age declaration, hydration plan, transport plan, symptoms declaration, and alcohol preference.
  - Output: pass/attention/block state with rule-based reasons; no diagnosis.
- `get_safe_return_options`
  - Inputs: event and preferred mode.
  - Output: walking/transit/taxi/ride-with-sober-driver options; never recommends driving after drinking.
- `get_my_run_passes`
  - Inputs: none.
  - Output: D1-backed signed-in passes or browser-local guest passes, with emergency contact redacted.
- `get_runner_passport`
  - Inputs: none.
  - Output: current runner profile, remembered weeks, and pass count from D1.

### Consequential tools

- `save_run_schedule`
  - Inputs: city, distance, pace, social preference, and alcohol-free requirement.
  - Persists the exact matching week for the authenticated runner and updates the visible board.

- `prepare_run_registration`
  - Inputs: event, runner name, email, emergency contact, pace group, age declaration, alcohol preference, rules acceptance, privacy acceptance.
  - Validates inputs and stages a visible confirmation request; it does not finalize registration.
- `cancel_run_registration`
  - Inputs: pass ID and explicit confirmation flag.
  - Cancels only when the user clearly confirms.

## 5. Safety and Thailand alcohol guardrails

- Age declaration must be 20+ for any alcohol-related option; venue staff must verify government ID where required.
- Never serve or facilitate alcohol for anyone under 20 or visibly intoxicated.
- Beer is never bundled with entry, free, discounted, rewarded for running, or required.
- The app does not sell alcohol or process alcohol purchases.
- No alcohol brand names, logos, product claims, inducements, or promotional imagery.
- Drinking happens only after running, at an independently operated licensed venue, during lawful service hours.
- Alcohol-free beer, water, and food are always available as equal or primary choices.
- No drinking before/during the run. No driving after drinking. Safe-return options are shown before registration completes.
- Users with concerning symptoms are told not to participate and to seek appropriate professional help; the app does not diagnose.
- Event organizers remain responsible for permits, venue licenses, insurance, route safety, and applicable law.

## 6. UX and visual system

- Warm off-white canvas, near-black typography, electric lime run accent, restrained amber social accent.
- Editorial sports typography, bold numerical event facts, high contrast, reduced-motion support.
- Hero with a dynamic route line and “RUN FIRST / SOCIAL AFTER” message.
- Sticky filter rail, responsive event cards, route detail drawer, run-pass view, and agent activity console.
- Thai-first copy with concise English labels for judges.
- Accessibility: semantic landmarks, labels, keyboard navigation, visible focus, sufficient contrast, live regions, and no color-only status.

## 7. Technical architecture

- Vite + TypeScript, framework-free to reduce build risk and bundle size.
- Data and domain logic separated from DOM rendering.
- Cloudflare Worker API with stable Sites authenticated-user headers and per-user authorization.
- D1 persistence for profiles, saved weeks, and signed-in Run Passes; `localStorage` remains only for guest passes and staged confirmation.
- Drizzle-owned schema migrations with indexed per-runner reads.
- Imperative WebMCP registration through `document.modelContext.registerTool()`.
- WebMCP compatibility fallback and a development-only in-page tool harness for deterministic verification.
- Vitest for domain logic, schemas, tool execution, safety gates, and persistence behavior.
- Production build served on dedicated port `5187` with origin-isolation-friendly headers.

## 8. Acceptance criteria

- [x] Human UI supports discovery, details, rules, readiness, registration, pass, and return plan.
- [x] Twelve meaningful WebMCP tools register with bounded JSON Schemas.
- [x] Read-only tools are annotated correctly and return structured results.
- [x] Consequential registration requires a visible, explicit human confirmation.
- [x] WebMCP tool execution updates the same state and UI used by humans.
- [x] Safety and alcohol rules block under-age alcohol selection, pre-run drinking, schema-bypass attempts, and driving-after-drinking flows.
- [x] Automated tests and the server-backed production build pass.
- [x] App listens on `127.0.0.1:5187`; port was verified unused before launch.
- [ ] Browser smoke test proves core flow, but responsive viewport evidence remains pending because the connected browser ignored viewport override.
- [ ] WebMCP-capable browser test proves tool discovery and at least one end-to-end tool call.
- [x] Compliance log maps evidence to the four equally weighted judging criteria.

## 9. Delivery sequence

1. Scaffold project and domain model.
2. Build event discovery and visual experience.
3. Build event drawer, rules, readiness, and registration pass.
4. Register WebMCP tools with validation, annotations, and activity feedback.
5. Add tests and tool harness.
6. Build and run on port 5187.
7. Perform browser, accessibility, and compliance audits.
8. Prepare deployment, public repository/license, README, and demo script.
