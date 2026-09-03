# Demo Video Script — Target 2:25

The final project name must be chosen by the participant before recording. Keep the video public on YouTube, under three minutes, and narrated in English or include complete English translation.

## 0:00–0:12 — Show it working immediately

Visual: Open on the Runner Agent Week Board. Set Bangkok, 5 KM, social pace, and alcohol-free, then submit the request.

Narration:

> This is my Runner Agent. Without creating an account, I can ask it to build my run week, compare the best fit, check what I need, and prepare the next action.

## 0:12–0:38 — Build the run week

Visual: Agent calls `plan_run_schedule`; the shared week board and event catalog both update to the matching Bangkok 5K.

Narration:

> The agent turns my city, distance, pace, and social choice into a chronological schedule I can use immediately. The same result appears on my screen, ready to open or compare.

## 0:38–0:58 — Compare and share context

Visual: Call `compare_run_events`, then `get_run_event_details`; open the same detail drawer in the human UI.

Narration:

> It compares two or three runs by date, pace, price, places, social options, and the journey home, then opens the selected event in the same interface I see.

## 0:58–1:24 — Rules and safety

Visual: Call `get_event_rules` and `check_participation_readiness`; show an under-20 beer choice being blocked, then switch to alcohol-free.

Narration:

> The run comes first. Alcohol is optional, never included or sold by the platform, and restricted to age twenty-plus at a licensed venue. A deterministic readiness tool blocks unsafe combinations and never presents itself as medical advice.

## 1:24–1:52 — Consequential action with human control

Visual: Agent calls `prepare_run_registration`; show the visible confirmation dialog and press the button as the human.

Narration:

> The agent can validate and prepare my registration, but it cannot finalize it. I review the runner, event, pace, social choice, and return warning, then I make the consequential decision.

## 1:52–2:10 — Complete product experience

Visual: Run pass appears; call `get_safe_return_options` and show transport options.

Narration:

> The confirmed pass is stored in this browser. Emergency-contact data is redacted from agent results, and the final plan never recommends driving after drinking.

## 2:10–2:25 — Why WebMCP

Visual: Fast montage of the ten Runner Agent actions, mobile layout, and tests passing.

Narration:

> Ten WebMCP actions let this Runner Agent scout, sort, check, and hand off a complete run plan. It is useful on the page today, and a WebMCP browser lets an external agent execute the same workflow.

## Recording checklist

- Start on the working Week Board; no product login is required.
- Show the real tool call in the first 15 seconds.
- Use one strong end-to-end example.
- Cut loading, typing, dead air, and repeated features.
- Show the public URL and public repository briefly.
- Confirm final runtime is below 03:00 and audio is clearly audible.
