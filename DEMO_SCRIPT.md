# Demo Video Script — Target 2:25

The final project name must be chosen by the participant before recording. Keep the video public on YouTube, under three minutes, and narrated in English or include complete English translation.

## 0:00–0:12 — Show it working immediately

Visual: Landing page, then the browser agent request appears.

Narration:

> This is a Thailand run-club experience designed for people and their agents. I can ask for a relaxed Bangkok five-kilometer run with an alcohol-free option and a safe plan home.

## 0:12–0:38 — Structured discovery

Visual: Agent calls `discover_run_events`; the matching event becomes visible. Briefly expose the tool activity panel.

Narration:

> Instead of scraping cards and guessing controls, the agent calls a WebMCP tool with a bounded JSON Schema. It gets dates, pace groups, capacity, choices, and match reasons as structured data.

## 0:38–0:58 — Compare and share context

Visual: Call `compare_run_events`, then `get_run_event_details`; open the same detail drawer in the human UI.

Narration:

> The agent can compare two or three runs and then open the chosen event in the same interface I see. Human and agent share application state.

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

Visual: Fast montage of the nine tools, mobile layout, tests passing.

Narration:

> Nine WebMCP tools turn a complex event workflow into one reliable collaboration while preserving a complete human product. It is faster, safer, and more accurate than visual actuation—and it works as a progressive enhancement.

## Recording checklist

- Start already logged in and on the working page.
- Show the real tool call in the first 15 seconds.
- Use one strong end-to-end example.
- Cut loading, typing, dead air, and repeated features.
- Show the public URL and public repository briefly.
- Confirm final runtime is below 03:00 and audio is clearly audible.
