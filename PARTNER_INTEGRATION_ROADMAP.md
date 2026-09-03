# Partner Integration Roadmap

This document separates the shipped Shopify catalog adapter from optional Netlify and Render extensions. The public demo does not guess or select a merchant: Shopify search remains disconnected until the participant supplies an authorized permanent `*.myshopify.com` domain. No purchase, deployment, or background job is implied.

## Product principle: support the run, not consumption

The Runner Commons Loop follows this order:

1. Bring what the runner already owns.
2. Borrow occasional-use items from the club.
3. Refill reusable containers.
4. Repair or replace a small part before replacing a whole item.
5. Search a merchant catalog only for a remaining, runner-confirmed gap.
6. Stop for human review before cart creation, checkout, deployment, or publication.

This makes commerce one optional handoff inside a broader circular support system. The primary outcomes are a safer run, lower waste, lower participation cost, and stronger local-club reciprocity.

## Shopify adapter: needs-aware catalog search (implemented)

**Current use:** the Worker validates an explicit store domain, calls that store's official `/api/ucp/mcp` endpoint with `search_catalog`, normalizes a maximum of six products, and returns them to both the visible Runner Commons panel and `search_runner_need` WebMCP action.

- Send a bounded category brief such as a reflective clip or reusable hydration container, never a medical claim or a hidden purchase instruction.
- Search only after the runner asks and the bring/borrow/refill/repair steps leave a real gap.
- Prefer local pickup, repair, rental, refill, or second-life collections when merchant data supports those attributes.
- Create no cart and perform no checkout; the runner may open a safe HTTPS product link and review the merchant directly.
- Keep the merchant as merchant of record; never process payment or alcohol in the Runner Agent.
- Reject arbitrary hosts, URL paths, credentials, ports, and non-HTTPS store configuration to prevent the Worker from becoming an open proxy.

Activation requires exactly one production environment value: `SHOPIFY_STORE_DOMAIN=your-store.myshopify.com`. Storefront MCP catalog access itself does not require an access token. The Site reports `store_required` until that value is supplied and verified; it never queries a third-party store chosen by the agent.

Official foundations:

- <https://shopify.dev/docs/apps/build/storefront-mcp/servers/storefront>
- <https://ucp.dev/specification/shopping/catalog/>

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
