# Thailand Run Club × Optional Post-Run Social

> Working label only. The participant will choose the final Devpost project name.

A Thai-first, WebMCP-native event experience where people and browser agents discover runs, compare facts, check participation rules, prepare registration, and plan a safe journey home together.

The human interface and WebMCP tools share the same domain logic and browser state. WebMCP is a progressive enhancement: the site stays fully functional without browser support, while compatible browsers receive nine structured tools through `document.modelContext.registerTool()`.

## Why this fits WebMCP

A normal event site makes an agent interpret filters, cards, drawers, safety copy, and forms one control at a time. This project exposes the intent directly:

1. Discover a shortlist using structured preferences.
2. Compare event facts without scraping.
3. Read safety and responsible-social rules.
4. Apply deterministic readiness gates.
5. Prepare a registration without silently finalizing it.
6. Let the human review and confirm in the shared interface.
7. Return a safe transport plan and locally stored run pass.

This demonstrates the WebMCP goal of a shared, user-controlled human-and-agent workflow rather than a prompt wrapper.

## Run locally

Requirements: Node.js 22+ and npm.

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:5187](http://127.0.0.1:5187). Port `5187` is reserved for this project and Vite runs with `--strictPort`, so it fails safely instead of taking another service's port.

For WebMCP in Google Chrome 149 or later, enable `chrome://flags/#enable-webmcp-testing` and relaunch Chrome. ChatGPT's in-app browser supports WebMCP directly. WebMCP requires a secure, origin-isolated context; the Vite server and preview send `Origin-Agent-Cluster: ?1` and `Permissions-Policy: tools=(self)`.

## Quality checks

```bash
npm run check
```

This runs domain, safety, privacy-redaction, WebMCP contract, browser-registration, and production-build checks.

## WebMCP tools

| Tool | Role | Human-control behavior |
| --- | --- | --- |
| `discover_run_events` | Search by city, distance, pace, date, and social preference | Updates activity log |
| `compare_run_events` | Compare 2–3 events | Read-only |
| `get_run_event_details` | Return details and open the same event in the UI | Visible shared state |
| `get_event_rules` | Return participation and responsible-social rules | Must be used before preparation |
| `check_participation_readiness` | Apply age, symptoms, hydration, transport, and event rules | A blocked result cannot be overridden |
| `get_safe_return_options` | Return transit, taxi, walking, and sober-driver options | Never recommends driving after drinking |
| `prepare_run_registration` | Validate and stage a registration | Never finalizes; human must press the visible confirmation button |
| `get_my_run_passes` | List locally stored passes | Emergency-contact data is redacted |
| `cancel_run_registration` | Cancel a pass | Requires an explicit `confirmed: true` input |

All tools use bounded JSON Schemas with `additionalProperties: false`. Read-only tools declare `readOnlyHint: true`; state-changing tools declare `readOnlyHint: false` and treat echoed user content as untrusted.

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
  main.ts        Human UI and shared-state bridge
  webmcp.ts      Nine imperative WebMCP tool definitions and registration
  styles.css     Responsive visual system
tests/           Domain, safety, privacy, and WebMCP integration tests
```

## Official references

- [WebMCP specification](https://webmachinelearning.github.io/webmcp/)
- [Chrome WebMCP overview](https://developer.chrome.com/docs/ai/webmcp)
- [Chrome imperative API](https://developer.chrome.com/docs/ai/webmcp/imperative-api)
- [The WebMCP Challenge rules](https://webmcp.devpost.com/rules)

## Demo-data notice

All displayed events, hosts, capacity, prices, routes, and venues are fictional demo data. A production launch requires organizer verification, venue agreements, licensing and legal review, route permits, insurance, operational safety review, and an appropriate privacy policy.
