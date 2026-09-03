# WebMCP Challenge Compliance Audit

Audit date: 2026-09-03 Asia/Bangkok

Statuses: **PASS** = direct evidence exists; **PARTIAL** = implementation exists but required external proof is missing; **OPEN** = required artifact or action does not yet exist.

## Build and judging criteria

| Requirement | Status | Evidence | Remaining work |
| --- | --- | --- | --- |
| WebMCP-powered web app | PARTIAL | `src/webmcp.ts` registers fourteen imperative tools; 45 automated tests pass; mocked browser integration verifies all fourteen `registerTool()` calls; the no-login Week Board, Runner Commons Loop, and guarded catalog handoff execute the same tool paths | Relaunch Chrome after enabling WebMCP and capture live tool discovery/execution evidence |
| Meaningful WebMCP leverage | PASS (code) | Scheduling, persistent memory, circular support, guarded merchant search, discovery, comparison, details, rules, readiness, safe return, staged registration, pass lookup, and cancellation use bounded schemas and shared domain logic | Live browser evidence still required for submission proof |
| Complete human product experience | PASS | Public Chrome smoke tests covered natural-language planning and the production API; prior flow evidence covers details, under-age block, staged confirmation, and confirmed Run Pass behavior | Capture native WebMCP evidence after enabling the Chrome flag |
| Human/agent shared context | PASS (code) | `get_run_event_details` opens the visible drawer; `prepare_run_registration` opens the confirmation UI; activity log records agent actions | Capture these actions from a real WebMCP client |
| Consequential-action control | PASS | Registration can only be staged by tool; finalization requires the visible human button; cancellation requires `confirmed: true` |
| Potential impact | PASS (concept) | The Thai running use case now combines coordination with lower-cost, lower-waste bring/borrow/refill/repair support and club reciprocity | Validate with real organizers/runners after hackathon |
| Creativity and ambition | PASS (concept) | One request coordinates discovery, persistent memory, circular support, rules, readiness, confirmation, privacy, and safe return rather than exposing a novelty storefront | Demonstrate clearly in video |
| Responsive, accessible UI | PARTIAL | Semantic DOM snapshot shows headings, regions, labelled form controls, buttons, dialogs, and live status; CSS contains mobile and reduced-motion breakpoints | Browser viewport override did not apply in the connected extension; capture mobile evidence later |

## Safety and Thailand alcohol guardrails

| Requirement | Status | Evidence |
| --- | --- | --- |
| Run before social | PASS | Visible Club Code, `RUN_CLUB_RULES.md`, tool rule output |
| Alcohol optional | PASS | Run-only and alcohol-free choices; no alcohol required |
| No sale, giveaway, discount, bundle, reward, or brand promotion | PASS | UI, policy file, domain response, and tests; no alcohol brand assets or product purchase flow |
| Age 20+ gate | PASS | Human form blocks optional beer without declaration; automated negative test; browser negative test |
| Refuse intoxicated service and licensed venue only | PASS (policy) | Visible rules and policy document; real venue enforcement remains organizer responsibility |
| No drink and drive | PASS | Safe-return tool has no self-drive option and returns an explicit warning; execution and domain tests reject `drive` even when a client bypasses JSON Schema |
| No medical diagnosis | PASS | Rule-based readiness output includes explicit disclaimer and blocks concerning symptoms |
| Privacy minimization | PASS | Guest passes remain browser-local; signed-in data is owner-scoped in D1; emergency contact is omitted from `get_my_run_passes`; automated redaction and authorization tests pass |

## Required submission package

| Deliverable | Status | Evidence / blocker |
| --- | --- | --- |
| Working hosted URL | PASS | The public Site at `https://thai-run-club-webmcp.humble-flea-4717.chatgpt.site` serves the UI and Worker API; Sites reports public access and the expected D1 binding/tables | Keep available through judging and recheck after the final deployment |
| Public repository | OPEN | Source and `.gitignore` are ready; repository has not been published |
| Open-source license | PASS (file) | MIT `LICENSE` exists; public landing-page visibility cannot be verified until publishing |
| Complete source and run instructions | PASS | `README.md`, lockfile, scripts, architecture, local URL, and test command |
| Public YouTube demo under 3 minutes with audio | OPEN | `DEMO_SCRIPT.md` is ready; video is not recorded or published |
| English submission materials | PARTIAL | README, demo narration, partner roadmap, and Devpost project-description draft are English | Participant fields, final name, and evidence links remain open |
| Team accepted | OPEN / N/A | Submitter/team structure has not been chosen |
| Submitted, not draft | OPEN | Nothing has been submitted to Devpost |
| Freeze after deadline | PASS (guardrail) | `AGENTS.md` instructs all future agents to stop mutations to submitted artifacts after 2026-09-04 03:00 Asia/Bangkok |

## Runtime evidence

- Node.js: v22.23.2.
- Chrome: 152.0.7977.65.
- Production build: Vite 8.2.2, successful.
- Automated verification: 7 test files, 45 tests, all passed, including natural-language planning, Runner Commons UI, Shopify request/response boundaries, disconnected Worker API behavior, all fourteen tool contracts, D1 APIs, and the recommended 1.5K-character output budget for representative tool calls.
- Security audit: npm reported 0 known vulnerabilities at install time.
- Server: Node process bound only to `127.0.0.1:5187` with `--strictPort`; a deliberate second-instance test exited nonzero with `Port 5187 is already in use` instead of selecting another port.
- Runtime context: local preview returned HTTP 200 and Chrome reported `window.originAgentCluster === true`; the `tools` permissions policy defaults to `self`. The hosting proxy did not echo the optional Vite header configuration, so native `document.modelContext` remains the authoritative pass/fail signal.
- Public browser smoke test: natural-language Bangkok 5K planning returned one matching run; the public Worker session endpoint returned JSON.
- Computer Use enabled Chrome's **WebMCP for testing** flag. Native evidence remains pending until Chrome has relaunched without a concurrent user interaction and the Site reports the fourteen-tool WebMCP connection.
- Sites production deployment is public at `https://thai-run-club-webmcp.humble-flea-4717.chatgpt.site`, with Worker routing and the `DB` binding active.

## Immediate gates before completion

1. Participant replies exact `yes` to the official Devpost rules gate.
2. Complete the Chrome relaunch, then verify native WebMCP discovery and execution.
3. Choose the final project name.
4. Publish the source repository and verify logged-out visibility plus MIT license detection.
5. Record/publish the demo and complete Devpost submission before the deadline.
