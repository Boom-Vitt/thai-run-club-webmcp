# Devpost Submission Draft — The WebMCP Challenge

> Draft only. Do not submit until every `[PARTICIPANT INPUT REQUIRED]` and `[EVIDENCE REQUIRED]` item is resolved. The participant must choose the final project name.

## Project identity

- **Project name:** `[PARTICIPANT INPUT REQUIRED — choose the final name]`
- **One-line summary:** A Thai-first Runner Agent that builds an actionable run schedule, compares the best fit, checks participation readiness, plans the journey home, and prepares a Run Pass for human confirmation without requiring an account.
- **Tagline:** `[PARTICIPANT INPUT REQUIRED — optional]`

## What it does

The Runner Agent turns city, distance, pace, and social preferences into a chronological week board the runner can use immediately. It can shortlist and compare events, open the chosen run in the visible interface, read participation rules, apply deterministic readiness gates, plan transport home, and prepare a registration. The same no-login planner is also directly usable by a person in a standard browser.

Registration is deliberately human-controlled. The agent can validate and stage the registration, but the pass does not exist until the participant reviews the visible confirmation dialog and presses the confirmation button. The optional post-run social stop treats alcohol-free and run-only participation as first-class choices. The platform never sells, bundles, discounts, gives away, or rewards alcohol, and it never recommends driving after drinking.

## Why this use case is a strong fit for WebMCP

The central experience is an agent completing a real runner job from start to handoff. Ten bounded WebMCP actions let it build the week board, shortlist and compare suitable runs, open a selection, check rules and readiness, plan a safe return, prepare registration, read redacted passes, and request a confirmed cancellation. Every action uses the same domain logic and visible state as the human interface, while explicit confirmation keeps consequential decisions with the runner.

## How it creates a better user experience

The runner can express a complete goal conversationally instead of operating each control separately. Structured tool results reduce ambiguity when comparing pace, distance, availability, accessibility, social choices, and safety rules. The selected event opens in the same interface the runner sees, tool activity is visible, unsafe combinations are blocked deterministically, and consequential registration remains a human decision.

## What people and agents can do together that was difficult before

One request can become a reliable multi-step event plan: the agent finds and compares matching runs, checks the relevant rules, evaluates user-provided readiness declarations, stages a valid registration, and suggests safe return options. The human can inspect every important fact, change a choice, approve or decline the registration, and see the confirmed run pass without handing final control to the agent.

## How WebMCP was implemented

The site uses the imperative `document.modelContext.registerTool()` API to register ten tools:

1. `plan_run_schedule`
2. `discover_run_events`
3. `compare_run_events`
4. `get_run_event_details`
5. `get_event_rules`
6. `check_participation_readiness`
7. `get_safe_return_options`
8. `prepare_run_registration`
9. `get_my_run_passes`
10. `cancel_run_registration`

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
2. Confirm the page reports **Runner Agent connected via WebMCP** and **10 actions ready for the browser agent**.
3. Ask: “Build my run schedule for relaxed 5 km runs in Bangkok with an alcohol-free option. Compare the best choices and open the most suitable event for me. Do not register yet.”
4. Confirm the agent updates the visible Week Board, uses the comparison/details flow, and opens the same event in the page.
5. Ask the agent to check readiness and prepare an alcohol-free Bangkok 5K registration using test-only details. Confirm the visible dialog appears and no pass exists before pressing **ยืนยันการสมัคร**.
6. Press **ยืนยันการสมัคร** and confirm exactly one run pass appears.
7. Ask to show the run passes and verify that emergency-contact data is absent from the tool result.
8. Ask to cancel without confirmation and verify that the pass remains unchanged; then explicitly confirm and verify that the shared UI updates.

The complete expected evidence and negative-safety scenario are documented in `WEBMCP_LIVE_QA.md`.

## Verification completed so far

- 23 automated tests pass across the no-login Runner Agent UI, schedule execution, domain behavior, safety, privacy redaction, WebMCP contracts, and browser registration mocks.
- The TypeScript production build succeeds.
- The production preview serves HTTP 200 on the reserved strict local port `127.0.0.1:5187` with the required origin isolation and tools permission headers.
- Human-interface smoke testing has covered filtering, event details, under-age blocking, staged confirmation, and run-pass creation with no observed console errors.

These checks do **not** replace the required native WebMCP browser evidence. Native tool discovery and live agent execution remain `[EVIDENCE REQUIRED]` until recorded in a supported connected browser.

## Links and media

- **Live app:** `[EVIDENCE REQUIRED — public URL]`
- **Current owner-only production preview:** `https://thai-run-club-webmcp.humble-flea-4717.chatgpt.site` (not valid for judges until public access is approved and verified)
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
