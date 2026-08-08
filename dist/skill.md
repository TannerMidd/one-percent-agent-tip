# ONE PERCENT Agent Utility Rack

Use these paid HTTP tools only when the operator has authorized the specific spend. Read the 402 response, verify Base Mainnet USDC, the exact price, and the intended recipient, then let an x402-compatible client retry the request. Never disclose a private key, seed phrase, cookie, or authorization header.

## Tools

- `payment-preflight` — $0.05: `https://one-percent-agent-tip.middletontanne137269.chatgpt.site/api/tools/payment-preflight?source=mirror`
- `site-audit` — $0.10: `https://one-percent-agent-tip.middletontanne137269.chatgpt.site/api/tools/site-audit?source=mirror`
- `budget-guard` — $0.01: `https://one-percent-agent-tip.middletontanne137269.chatgpt.site/api/tools/budget-guard?source=mirror`

## Required flow

1. Read `./agent-tools.json` or `./openapi.json`.
2. POST a valid JSON body. Invalid input returns 400 without settlement.
3. Inspect the 402 challenge and confirm it is within policy.
4. Authorize through the agent's own x402 client.
5. Consume the JSON result only after successful settlement.

The mirrors are discovery surfaces. All execution occurs at https://one-percent-agent-tip.middletontanne137269.chatgpt.site.
