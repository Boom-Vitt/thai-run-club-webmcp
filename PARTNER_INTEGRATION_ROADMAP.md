# Partner Integration Roadmap

This document describes optional next-generation adapters. None of these external platforms is connected in the current public demo, and no account, credential, purchase, deployment, or background job is implied.

## Product principle: support the run, not consumption

The Runner Commons Loop follows this order:

1. Bring what the runner already owns.
2. Borrow occasional-use items from the club.
3. Refill reusable containers.
4. Repair or replace a small part before replacing a whole item.
5. Search a merchant catalog only for a remaining, runner-confirmed gap.
6. Stop for human review before cart creation, checkout, deployment, or publication.

This makes commerce one optional handoff inside a broader circular support system. The primary outcomes are a safer run, lower waste, lower participation cost, and stronger local-club reciprocity.

## Shopify adapter: needs-aware commerce handoff

**Future use:** connect a remaining support gap to Shopify's Storefront MCP or UCP-compatible catalog and cart capabilities.

- Send a bounded category brief such as a reflective clip or reusable hydration container, never a medical claim or a hidden purchase instruction.
- Search only after the runner asks and the bring/borrow/refill/repair steps leave a real gap.
- Prefer local pickup, repair, rental, refill, or second-life collections when merchant data supports those attributes.
- Keep cart creation separate from discovery and require visible human review before checkout handoff.
- Keep the merchant as merchant of record; never process payment or alcohol in the Runner Agent.

Official foundations:

- <https://shopify.dev/docs/apps/build/storefront-mcp/index>
- <https://shopify.dev/docs/agents>
- <https://shopify.dev/docs/agents/carts-and-checkout>

## Netlify adapter: community route-change previews

**Future use:** let club organizers describe a route, accessibility, refill-point, or transit-note correction and receive a staging preview rather than editing production directly.

- Turn an approved organizer request into a small source change.
- Use a staging environment for review, accessibility checks, and WebMCP contract checks.
- Promote or roll back only after a human organizer accepts the preview.
- Use a background function for bounded enrichment work that should not delay the visitor response.

This maps to Netlify Agent Runners' project-context, staging, and rollback workflow plus Background Functions for asynchronous tasks.

Official foundations:

- <https://docs.netlify.com/build/build-with-ai/agent-runners/overview/>
- <https://docs.netlify.com/build/functions/background-functions/>

## Render adapter: route-intelligence operations

**Future use:** run longer-lived organizer operations outside the request path.

- Queue route audits, accessibility enrichment, and stale-event checks as background work.
- Run scheduled checks for changed meeting points, transport notes, or event status.
- Store source provenance and return only reviewable proposals to the Runner Agent.
- Use Render's MCP server for deployment, logs, metrics, and read-only database diagnostics with least-privilege access.

Render Workflows, background workers, cron jobs, managed datastores, and the official MCP server are a good fit for this operations plane.

Official foundations:

- <https://render.com/docs/mcp-server>
- <https://render.com/docs/service-types>
- <https://render.com/docs/cronjobs>

## Adapter contract

Every external connector must preserve these boundaries:

- Server-side credentials only; no secrets in browser code or WebMCP output.
- Structured inputs and concise, provenance-bearing outputs.
- Read and stage operations separated from purchase, deploy, publish, or cancel operations.
- Explicit human confirmation at the last consequential step.
- Provider-neutral core domain logic so the current ChatGPT Sites deployment continues to work without any partner account.
