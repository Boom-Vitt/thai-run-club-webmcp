# Devpost Submission Draft — The WebMCP Challenge

> Draft only. Do not submit until every `[PARTICIPANT INPUT REQUIRED]` and `[EVIDENCE REQUIRED]` item is resolved. The participant must choose the final project name.

## Project identity

- **Project name:** `[PARTICIPANT INPUT REQUIRED — choose the final name]`
- **One-line summary:** A Thai-first Runner Agent that turns one natural-language goal into a run week, a safe return, a circular bring-borrow-refill-repair support loop, and a human-confirmed Run Pass.
- **Tagline:** `[PARTICIPANT INPUT REQUIRED — optional]`

## What it does

The Runner Agent turns a conversational city, distance, pace, and social request into a chronological week board the runner can use immediately. It can shortlist and compare events, open the chosen run in the visible interface, read participation rules, apply deterministic readiness gates, plan transport home, build a Runner Commons support loop, and prepare a registration. The same no-login planner is directly usable by a person in a standard browser; optional ChatGPT sign-in adds a D1-backed Runner Passport for saved weeks and confirmed passes.

The Runner Commons Loop is deliberately not a merchandise shop. It helps the runner bring what they own, borrow occasional-use items, refill, repair, and give back to the club before identifying any unresolved category. Its implemented Shopify Storefront MCP connector can search an explicitly configured store only after the runner asks, shows bounded external results in the shared UI, and stops before cart or checkout.

Registration is deliberately human-controlled. The agent can validate and stage the registration, but the pass does not exist until the participant reviews the visible confirmation dialog and presses the confirmation button. The optional post-run social stop treats alcohol-free and run-only participation as first-class choices. The platform never sells, bundles, discounts, gives away, or rewards alcohol, and it never recommends driving after drinking.

## Why this use case is a strong fit for WebMCP

The central experience is an agent completing a real runner job from start to handoff. Fourteen bounded WebMCP actions let it build and save the week board, read remembered goals, shortlist and compare suitable runs, open a selection, build circular support, search one confirmed remaining need, check rules and readiness, plan a safe return, prepare registration, read redacted passes, and request a confirmed cancellation. Every action uses the same domain logic and visible state as the human interface, while explicit confirmation keeps consequential decisions with the runner.

## How it creates a better user experience

The runner can express a complete goal conversationally instead of operating each control separately. Structured tool results reduce ambiguity when comparing pace, distance, availability, accessibility, social choices, and safety rules. The selected event opens in the same interface the runner sees, tool activity is visible, unsafe combinations are blocked deterministically, and consequential registration remains a human decision.

## What people and agents can do together that was difficult before

One request can become a reliable multi-step event plan: the agent finds and compares matching runs, checks the relevant rules, evaluates user-provided readiness declarations, stages a valid registration, and suggests safe return options. The human can inspect every important fact, change a choice, approve or decline the registration, and see the confirmed run pass without handing final control to the agent.

## How WebMCP was implemented

The site uses the imperative `document.modelContext.registerTool()` API to register fourteen tools:

1. `plan_run_schedule`
2. `save_run_schedule`
3. `get_runner_passport`
4. `build_runner_support_loop`
5. `search_runner_need`
6. `discover_run_events`
7. `compare_run_events`
8. `get_run_event_details`
9. `get_event_rules`
10. `check_participation_readiness`
11. `get_safe_return_options`
12. `prepare_run_registration`
13. `get_my_run_passes`
14. `cancel_run_registration`

Each tool uses a bounded JSON Schema with `additionalProperties: false`, runtime validation, and accurate read-only or state-changing annotations. Tool execution shares the human UI's domain layer and state. Registration is staged for visible human confirmation, pass lookup redacts emergency-contact data, cancellation requires an explicit confirmation flag, unsafe transport values are rejected even if a client bypasses schema validation, and user-entered tool output is marked as untrusted content.

## Built with

- TypeScript
- Vite
- WebMCP imperative API
- Vitest
- Cloudflare Worker APIs and D1 persistence through ChatGPT Sites
- Browser-local guest passes plus an optional signed-in Runner Passport
- Codex for implementation, review, testing, and submission preparation

## Testing instructions for judges

1. Open `https://thai-run-club-webmcp.humble-flea-4717.chatgpt.site` in ChatGPT's in-app browser or Google Chrome 149+ with `chrome://flags/#enable-webmcp-testing` enabled and Chrome relaunched.
2. Confirm the page reports **Runner Agent connected via WebMCP** and **14 actions ready for the browser agent**.
3. Ask: “Build my run schedule for relaxed 5 km runs in Bangkok with an alcohol-free option. Compare the best choices and open the most suitable event for me. Do not register yet.”
4. Confirm the agent updates the visible Week Board, uses the comparison/details flow, and opens the same event in the page.
5. Ask: “What should I prepare? Help me bring, borrow, refill, or repair before suggesting anything to buy.” Confirm the visible Runner Commons Loop appears and no product, cart, or checkout is created.
6. If an authorized Shopify store domain is configured, ask the agent to search one unresolved reusable-hydration need. Confirm results appear in the same panel and no cart or checkout is created. Otherwise, confirm the honest `store_required` state and no external request.
7. Ask the agent to check readiness and prepare an alcohol-free Bangkok 5K registration using test-only details. Confirm the visible dialog appears and no pass exists before pressing **ยืนยันการสมัคร**.
8. Press **ยืนยันการสมัคร** and confirm exactly one run pass appears.
9. Ask to show the run passes and verify that emergency-contact data is absent from the tool result.
10. Ask to cancel without confirmation and verify that the pass remains unchanged; then explicitly confirm and verify that the shared UI updates.

The complete expected evidence and negative-safety scenario are documented in `WEBMCP_LIVE_QA.md`.

## Verification completed so far

- 45 automated tests pass across the no-login Runner Agent UI, natural-language routing, Runner Commons Loop, Shopify adapter and disconnected API boundaries, schedule execution, domain behavior, safety, privacy redaction, WebMCP contracts, and browser registration mocks.
- The TypeScript production build succeeds.
- The public ChatGPT Site serves the Cloudflare Worker API, reports the D1 binding and three expected tables, and has no recent Worker errors.
- Live Chrome testing confirmed that a conversational Bangkok 5K request updates the public Week Board and that the Runner Commons path is covered by the same executable tool harness.
- Computer Use enabled Chrome's **WebMCP for testing** flag; native execution remains unverified until Chrome relaunch completes and live discovery/execution is captured.

These checks do **not** replace the required native WebMCP browser evidence. Native tool discovery and live agent execution remain `[EVIDENCE REQUIRED]` until recorded in a supported connected browser.

## Links and media

- **Live app:** `https://thai-run-club-webmcp.humble-flea-4717.chatgpt.site`
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
- Guest passes are browser-local; signed-in profiles, saved weeks, and confirmed passes use per-user D1 records.
- The Shopify Storefront MCP search adapter is implemented, but the public environment remains disconnected until the participant supplies an authorized permanent `*.myshopify.com` domain. Netlify and Render remain documented future adapters. No cart, checkout, purchase, external deployment, or background job is connected.
- Organizer verification, route permits, insurance, venue agreements, applicable licensing/legal review, and a production privacy policy are outside the prototype.
- Do not claim native WebMCP completion, public repository visibility, video publication, or Devpost submission until direct evidence is captured.

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
