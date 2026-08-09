# ONE PERCENT Agent Utility Rack

Use Agent Discoverability Audit to diagnose whether a public service can be found and understood by agents. Use x402 Payment Preflight before authorizing an unfamiliar payment challenge. Use the free Budget Guard to enforce a local spending policy before any purchase.

Use paid HTTP tools only when the operator has authorized the specific spend. Read the 402 response, verify Base Mainnet USDC, the exact price, and the intended recipient, then let an x402-compatible client retry the request. Budget Guard is free and should be called before spending. Never disclose a private key, seed phrase, cookie, or unrelated authorization header.

## Tools

- `site-audit` - $0.01 USDC: `https://one-percent-agent-tip.middletontanne137269.chatgpt.site/api/tools/site-audit?source=vercel`
  Use this before publishing an agent service or when crawlers and marketplaces are failing to discover it.
- `payment-preflight` - $0.01 USDC: `https://one-percent-agent-tip.middletontanne137269.chatgpt.site/api/tools/payment-preflight?source=vercel`
  Use this before an agent authorizes an unfamiliar x402 payment challenge; it never pays the target service.
- `budget-guard` - FREE: `https://one-percent-agent-tip.middletontanne137269.chatgpt.site/api/tools/budget-guard?source=vercel`
  Use this free local-policy check before any paid agent request, including the two paid tools in this catalog.

## Required flow

1. Read `./agent-tools.json` or `./openapi.json`.
2. POST a valid JSON body. Invalid input returns 400 without settlement.
3. For an x402 tool, inspect the 402 challenge and confirm it is within policy.
4. Authorize through the agent's own x402 client.
5. Consume the JSON result only after successful settlement.

The mirrors are discovery surfaces. All execution occurs at https://one-percent-agent-tip.middletontanne137269.chatgpt.site.
