# Devpost Submission Draft — The WebMCP Challenge

> Draft only. Do not submit until every `[PARTICIPANT INPUT REQUIRED]` and `[EVIDENCE REQUIRED]` item is resolved. The participant must choose the final project name.

## Project identity

- **Project name:** `[PARTICIPANT INPUT REQUIRED — choose the final name]`
- **One-line summary:** A Thai-first run-club experience where people and browser agents discover suitable runs, check safety and participation rules, prepare a registration for human confirmation, and plan a safe journey home together.
- **Tagline:** `[PARTICIPANT INPUT REQUIRED — optional]`

## What it does

The project coordinates a complete run-club journey across one shared human-and-agent interface. A runner can ask an agent to find suitable events by city, distance, pace, date, and social preference; compare structured event facts; open the chosen event in the visible interface; read participation rules; apply deterministic readiness gates; prepare a registration; and plan transport home.

Registration is deliberately human-controlled. The agent can validate and stage the registration, but the pass does not exist until the participant reviews the visible confirmation dialog and presses the confirmation button. The optional post-run social stop treats alcohol-free and run-only participation as first-class choices. The platform never sells, bundles, discounts, gives away, or rewards alcohol, and it never recommends driving after drinking.

## Why this use case is a strong fit for WebMCP

A conventional event website forces an agent to infer intent from filters, cards, drawers, safety copy, and forms. This project exposes those intentions as nine bounded WebMCP tools backed by the same domain logic and browser state as the human interface. WebMCP is central to the workflow: it lets the agent reason over event facts and rules directly, while visible shared state and explicit confirmation keep the human in control.

## How it creates a better user experience

The runner can express a complete goal conversationally instead of operating each control separately. Structured tool results reduce ambiguity when comparing pace, distance, availability, accessibility, social choices, and safety rules. The selected event opens in the same interface the runner sees, tool activity is visible, unsafe combinations are blocked deterministically, and consequential registration remains a human decision.

## What people and agents can do together that was difficult before

One request can become a reliable multi-step event plan: the agent finds and compares matching runs, checks the relevant rules, evaluates user-provided readiness declarations, stages a valid registration, and suggests safe return options. The human can inspect every important fact, change a choice, approve or decline the registration, and see the confirmed run pass without handing final control to the agent.

## How WebMCP was implemented

The site uses the imperative `document.modelContext.registerTool()` API to register nine tools:

1. `discover_run_events`
2. `compare_run_events`
3. `get_run_event_details`
4. `get_event_rules`
5. `check_participation_readiness`
6. `get_safe_return_options`
7. `prepare_run_registration`
8. `get_my_run_passes`
9. `cancel_run_registration`

Each tool uses a bounded JSON Schema with `additionalProperties: false`, runtime validation, and accurate read-only or state-changing annotations. Tool execution shares the human UI's domain layer and state. Registration is staged for visible human confirmation, pass lookup redacts emergency-contact data, cancellation requires an explicit confirmation flag, unsafe transport values are rejected even if a client bypasses schema validation, and user-entered tool output is marked as untrusted content.

## Built with

- TypeScript
- Vite
- WebMCP imperative API
- Vitest
- Browser-local persistence for demo run passes
- Codex for implementation, review, testing, and submission preparation

## Testing instructions for judges

1. Open `[EVIDENCE REQUIRED — public live URL]` in ChatGPT's in-app browser or Google Chrome 149+ with `chrome://flags/#enable-webmcp-testing` enabled and Chrome relaunched.
2. Confirm the page reports **WebMCP tools are live** and **9 tools registered in this page**.
3. Ask: “Find a relaxed 5 km run in Bangkok with an alcohol-free option. Compare the best choices and open the most suitable event for me. Do not register yet.”
4. Confirm the agent uses the structured discovery/details flow and the same event opens visibly in the page.
5. Ask the agent to check readiness and prepare an alcohol-free Bangkok 5K registration using test-only details. Confirm the visible dialog appears and no pass exists before pressing **ยืนยันการสมัคร**.
6. Press **ยืนยันการสมัคร** and confirm exactly one run pass appears.
7. Ask to show the run passes and verify that emergency-contact data is absent from the tool result.
8. Ask to cancel without confirmation and verify that the pass remains unchanged; then explicitly confirm and verify that the shared UI updates.

The complete expected evidence and negative-safety scenario are documented in `WEBMCP_LIVE_QA.md`.

## Verification completed so far

- 20 automated tests pass across domain behavior, safety, privacy redaction, WebMCP contracts, and browser registration mocks.
- The TypeScript production build succeeds.
- The production preview serves HTTP 200 on the reserved strict local port `127.0.0.1:5187` with the required origin isolation and tools permission headers.
- Human-interface smoke testing has covered filtering, event details, under-age blocking, staged confirmation, and run-pass creation with no observed console errors.

These checks do **not** replace the required native WebMCP browser evidence. Native tool discovery and live agent execution remain `[EVIDENCE REQUIRED]` until recorded in a supported connected browser.

## Links and media

- **Live app:** `[EVIDENCE REQUIRED — public URL]`
- **Public source repository:** `[EVIDENCE REQUIRED — public GitHub, GitLab, or Bitbucket URL]`
- **Public YouTube demo under 3 minutes:** `[EVIDENCE REQUIRED — public URL]`
- **License:** MIT (`LICENSE` in the repository; public landing-page detection must still be verified)

## Required submission fields

- **Submitter type (individual, team, or organization):** `[PARTICIPANT INPUT REQUIRED]`
- **Country/countries:** `[PARTICIPANT INPUT REQUIRED]`
- **App status:** `[PARTICIPANT INPUT REQUIRED]`
- **Agents/clients tested:** `[EVIDENCE REQUIRED — list only clients actually tested]`
- **AI tools used:** Codex; `[PARTICIPANT INPUT REQUIRED — add any others actually used]`
- **WebMCP learning level:** `[PARTICIPANT INPUT REQUIRED]`
- **How participation supports career goals:** `[PARTICIPANT INPUT REQUIRED]`
- **Team members and acceptance status:** `[PARTICIPANT INPUT REQUIRED — or confirm individual submission]`

## Known limitations and claim boundary

- Event, venue, route, price, capacity, and host data are fictional demo data.
- Data is stored locally in the browser; this prototype has no production account or payment system.
- Organizer verification, route permits, insurance, venue agreements, applicable licensing/legal review, and a production privacy policy are outside the prototype.
- Do not claim native WebMCP completion, a public deployment, public repository visibility, video publication, or Devpost submission until direct evidence is captured.

## Final pre-submit gate

- [ ] Participant has replied exact `yes` to the official rules review in this workflow.
- [ ] Participant has chosen the final project name.
- [ ] Eligibility questions are confirmed by the participant.
- [ ] Native WebMCP discovery and end-to-end execution evidence is captured.
- [ ] Public live URL passes a fresh-session judge test.
- [ ] Public repository is visible while logged out and shows the MIT license in the repository landing page/About area.
- [ ] Public YouTube demo is under 03:00, contains audible narration, and shows the working WebMCP flow in the opening 10–15 seconds.
- [ ] All required Devpost fields are complete in English.
- [ ] Every teammate, if any, has accepted.
- [ ] Final Devpost page shows **submitted**, not draft, before 2026-09-04 03:00 Asia/Bangkok.
