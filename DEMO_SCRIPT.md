# Demo Video Script — Target 2:25

The final project name must be chosen by the participant before recording. Keep the video public on YouTube, under three minutes, and narrated in English or include complete English translation.

## 0:00–0:12 — Show it working immediately

Visual: Open on the Runner Agent Week Board. Set Bangkok, 5 KM, social pace, and alcohol-free, then submit the request.

Narration:

> This is my Runner Agent. I can build a useful run week immediately as a guest, then sign in only when I want the agent to remember it.

## 0:12–0:38 — Build the run week

Visual: Agent calls `plan_run_schedule`; the shared week board and event catalog both update to the matching Bangkok 5K.

Narration:

> The agent turns my city, distance, pace, and social choice into a chronological schedule I can use immediately. The same result appears on my screen, ready to open or compare.

## 0:38–0:58 — Runner Commons: shop last

Visual: Agent calls `build_runner_support_loop`, then—only if the authorized store domain has been configured and verified—calls `search_runner_need` for one unresolved hydration need. Show bounded external results and the “no cart or checkout” boundary.

Narration:

> Before commerce, the agent helps me bring, borrow, refill, repair, and give back. Only when I confirm a remaining need can it search an authorized Shopify catalog. It shows choices in the same interface and never creates a cart or checkout.

## 0:58–1:14 — Save Agent memory

Visual: Press **SAVE TO PASSPORT**, show the D1-backed saved-week ticket, then call `get_runner_passport`.

Narration:

> When I save, the same structured plan becomes persistent Agent memory. My Runner Passport remembers my home city, pace, weekly goal, saved weeks, and confirmed passes across visits.

## 1:14–1:36 — Rules and safety

Visual: Call `get_event_rules` and `check_participation_readiness`; show an under-20 beer choice being blocked, then switch to alcohol-free.

Narration:

> The run comes first. Alcohol is optional, never included or sold by the platform, and restricted to age twenty-plus at a licensed venue. A deterministic readiness tool blocks unsafe combinations and never presents itself as medical advice.

## 1:36–2:00 — Consequential action with human control

Visual: Agent calls `prepare_run_registration`; show the visible confirmation dialog and press the button as the human.

Narration:

> The agent can validate and prepare my registration, but it cannot finalize it. I review the runner, event, pace, social choice, and return warning, then I make the consequential decision.

## 2:00–2:14 — Complete product experience

Visual: Run pass appears; call `get_safe_return_options` and show transport options.

Narration:

> The confirmed pass is stored in my signed-in Passport, while guest mode still works locally. Emergency-contact data is redacted from agent results, and the plan never recommends driving after drinking.

## 2:14–2:25 — Why WebMCP

Visual: Fast montage of the fourteen Runner Agent actions, including the Runner Commons Loop, guarded Shopify catalog results, mobile layout, and tests passing.

Narration:

> Fourteen WebMCP actions let this Runner Agent scout, sort, remember, check, reuse, and search one real remaining need without taking away human control. WebMCP is how the agent executes these product actions; the value is the work it completes for the runner.

## Recording checklist

- Start on the working Week Board; no product login is required.
- Show the real tool call in the first 15 seconds.
- Show Shopify results only after an authorized store domain is connected and the live call has been verified; otherwise show the honest `store_required` state.
- Use one strong end-to-end example.
- Cut loading, typing, dead air, and repeated features.
- Show the public URL and public repository briefly.
- Confirm final runtime is below 03:00 and audio is clearly audible.
