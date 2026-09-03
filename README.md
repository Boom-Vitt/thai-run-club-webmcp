# Thailand Run Club × Optional Post-Run Social

> Working label only. The participant will choose the final Devpost project name.

A Thai-first Runner Agent that turns a runner's preferences into an actionable run schedule. It can shortlist and compare events, open the chosen run, check participation readiness, plan the journey home, and prepare a Run Pass for visible human confirmation—without requiring an account. Optional ChatGPT sign-in unlocks a D1-backed Runner Passport that remembers the runner's profile, saved weeks, and confirmed passes across visits.

The Runner Agent week board and thirteen WebMCP actions share the same domain logic, visible state, and persistence APIs. People can use the planner directly in any browser; compatible browsers can let an external agent drive the same actions through `document.modelContext.registerTool()`.

## Why this fits WebMCP

The Runner Agent completes a concrete sequence for the runner:

1. Build a chronological week board from city, distance, pace, and social preferences.
2. Shortlist and compare run dates, start times, prices, places, pace groups, and return options.
3. Open the chosen event in the shared visible interface.
4. Read the relevant participation and responsible-social rules.
5. Apply deterministic readiness gates from runner-provided declarations.
6. Plan a safe journey home.
7. Prepare a registration, stop, and hand the final confirmation to the runner.
8. Save the exact week to a signed-in Runner Passport and continue from remembered goals later.
9. Read browser-local guest passes or persistent signed-in passes with emergency-contact data redacted.
10. Build a Runner Commons Loop that prioritizes bring, borrow, refill, repair, and give-back before any optional merchant search.

This demonstrates the WebMCP goal of a shared, user-controlled human-and-agent workflow rather than a prompt wrapper.

## Run locally

Requirements: Node.js 22+ and npm.

```bash
npm install
npm run db:migrate:local
npm run dev
```

Open [http://127.0.0.1:5187](http://127.0.0.1:5187). Port `5187` is reserved for this project and Vite runs with `--strictPort`, so it fails safely instead of taking another service's port.

For WebMCP in Google Chrome 149 or later, enable `chrome://flags/#enable-webmcp-testing` and relaunch Chrome. ChatGPT's in-app browser supports WebMCP directly. WebMCP requires a secure, origin-isolated context; the Vite server and preview send `Origin-Agent-Cluster: ?1` and `Permissions-Policy: tools=(self)`.

## Quality checks

```bash
npm run check
```

This runs the guest Runner Agent UI flow, signed-in Passport rendering, schedule planning, domain behavior, safety, privacy redaction, WebMCP contracts, browser registration mocks, Worker type checks, and the production build.

After enabling native WebMCP, run the five live-agent scenarios in [WEBMCP_LIVE_QA.md](./WEBMCP_LIVE_QA.md). They separately prove tool discovery, intent routing, persistent Agent memory, schema-bypass resistance, visible human confirmation, privacy redaction, and cancellation control.

## WebMCP tools

| Tool | Role | Human-control behavior |
| --- | --- | --- |
| `plan_run_schedule` | Build and display a chronological week board from runner preferences | Updates the same visible schedule used by the human interface |
| `save_run_schedule` | Persist the exact matching week to D1 | Requires ChatGPT sign-in and updates the visible Passport |
| `get_runner_passport` | Read profile, remembered weeks, and pass count | Returns only the current signed-in runner's records |
| `build_runner_support_loop` | Build a circular preparation and community-support plan for one run | Shows the same loop in the UI; never creates a cart or checkout |
| `discover_run_events` | Search by city, distance, pace, date, and social preference | Updates activity log |
| `compare_run_events` | Compare 2–3 events | Read-only |
| `get_run_event_details` | Return details and open the same event in the UI | Visible shared state |
| `get_event_rules` | Return participation and responsible-social rules | Must be used before preparation |
| `check_participation_readiness` | Apply age, symptoms, hydration, transport, and event rules | A blocked result cannot be overridden |
| `get_safe_return_options` | Return transit, taxi, walking, and sober-driver options | Never recommends driving after drinking |
| `prepare_run_registration` | Validate and stage a registration | Never finalizes; human must press the visible confirmation button |
| `get_my_run_passes` | List persistent signed-in passes or browser-local guest passes | Emergency-contact data is redacted |
| `cancel_run_registration` | Cancel a pass | Requires an explicit `confirmed: true` input |

All tools use bounded JSON Schemas with `additionalProperties: false`. Read-only tools declare `readOnlyHint: true`; state-changing tools declare `readOnlyHint: false` and treat echoed user content as untrusted.

## Partner-ready next generation

The current demo does not connect any external store or hosting account. Its new Runner Commons Loop creates a useful, provider-neutral handoff point:

- Shopify Storefront MCP or UCP can later search only for a runner-confirmed remaining need and stop for human checkout review.
- Netlify Agent Runners and staging environments can later turn organizer corrections into reviewable route-update previews.
- Render workflows, workers, cron jobs, and MCP operations can later run route audits and stale-event checks outside the visitor request path.

The full capability map, confirmation boundaries, and official references are in [PARTNER_INTEGRATION_ROADMAP.md](./PARTNER_INTEGRATION_ROADMAP.md).

## Responsible social design

- The run always happens before the social stop.
- Alcohol is optional, never included with entry, never free, never discounted, and never a reward.
- The platform does not advertise, sell, serve, or process purchases of alcohol.
- Alcohol-related options are restricted to people declaring age 20+; venue staff remain responsible for official ID verification and refusal to intoxicated guests.
- Service occurs separately at a licensed venue, within applicable hours and location rules.
- Water, food, alcohol-free options, and run-only participation are first-class choices.
- The product never recommends driving after drinking.
- Readiness checks are rule-based and are not medical advice or diagnosis.

See [RUN_CLUB_RULES.md](./RUN_CLUB_RULES.md) for the complete bilingual operational policy.

## Demo flow

Use [DEMO_SCRIPT.md](./DEMO_SCRIPT.md) for the under-three-minute judging video. The core story is one conversational request becoming a safe, visible, human-confirmed event plan.

## Project structure

```text
src/
  data.ts        Demo event catalog and club rules
  domain.ts      Search, comparison, readiness, registration, persistence
  passport.ts    Identity-aware client for Runner Passport APIs
  main.ts        Human UI and shared-state bridge
  webmcp.ts      Thirteen imperative WebMCP tool definitions and registration
  styles.css     Responsive visual system
worker/
  index.ts       Authenticated Cloudflare Worker API and D1 ownership checks
db/
  schema.ts      Runner profile, saved-week, and Run Pass schema
drizzle/         Versioned D1 migration and metadata
tests/           Domain, safety, privacy, and WebMCP integration tests
```

## Official references

- [WebMCP specification](https://webmachinelearning.github.io/webmcp/)
- [Chrome WebMCP overview](https://developer.chrome.com/docs/ai/webmcp)
- [Chrome imperative API](https://developer.chrome.com/docs/ai/webmcp/imperative-api)
- [The WebMCP Challenge rules](https://webmcp.devpost.com/rules)

## Demo-data notice

All displayed events, hosts, capacity, prices, routes, and venues are fictional demo data. A production launch requires organizer verification, venue agreements, licensing and legal review, route permits, insurance, operational safety review, and an appropriate privacy policy.
