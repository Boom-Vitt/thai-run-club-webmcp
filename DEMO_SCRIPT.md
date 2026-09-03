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

## 0:38–0:58 — Save Agent memory

Visual: Press **SAVE TO PASSPORT**, show the D1-backed saved-week ticket, then call `get_runner_passport`.

Narration:

> When I save, the same structured plan becomes persistent Agent memory. My Runner Passport remembers my home city, pace, weekly goal, saved weeks, and confirmed passes across visits.

## 0:58–1:14 — Compare and share context

Visual: Call `compare_run_events`, then `get_run_event_details`; open the same detail drawer in the human UI.

Narration:

> It compares two or three runs by date, pace, price, places, social options, and the journey home, then opens the selected event in the same interface I see.

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

Visual: Fast montage of the thirteen Runner Agent actions, including the Runner Commons Loop, mobile layout, and tests passing.

Narration:

> Thirteen WebMCP actions let this Runner Agent scout, sort, remember, check, build a bring-borrow-refill-repair support loop, and hand off a complete run plan. WebMCP is how the agent executes these product actions; the value is the work it completes for the runner.

## Recording checklist

- Start on the working Week Board; no product login is required.
- Show the real tool call in the first 15 seconds.
- Use one strong end-to-end example.
- Cut loading, typing, dead air, and repeated features.
- Show the public URL and public repository briefly.
- Confirm final runtime is below 03:00 and audio is clearly audible.
