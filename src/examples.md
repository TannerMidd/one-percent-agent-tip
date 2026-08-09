# ONE PERCENT tool examples

Requests are ordinary JSON over HTTPS. Paid examples return an x402 challenge before any payment; Budget Guard returns a free result. Never paste a private key into curl, a website, or these examples.

### Agent Discoverability Audit - $0.01

Use this before publishing an agent service or when crawlers and marketplaces are failing to discover it.

This first request is unpaid and returns HTTP 402 after input validation. A wallet-enabled client may inspect and retry it.

```bash
curl -i -X POST 'https://one-percent-agent-tip.middletontanne137269.chatgpt.site/api/tools/site-audit?source={{SOURCE_ID}}' \
  -H 'content-type: application/json' \
  --data '{"url":"https://example.com"}'
```

Representative successful response:

```json
{
  "schemaVersion": "1",
  "tool": "site-audit",
  "ok": true,
  "result": {
    "reachable": true,
    "finalUrl": "https://example.com/",
    "httpStatus": 200,
    "latencyMs": 184,
    "score": 85,
    "status": "ready",
    "checks": {
      "https": true,
      "redirects": 0,
      "contentType": "text/html",
      "title": true,
      "description": true,
      "structuredData": true,
      "robots": {
        "found": true,
        "status": 200
      },
      "sitemap": {
        "found": true,
        "status": 200
      },
      "llms": {
        "found": true,
        "status": 200
      },
      "agents": {
        "found": false,
        "status": 404
      },
      "agentManifest": {
        "found": true,
        "status": 200,
        "valid": true
      },
      "wellKnownAgentManifest": {
        "found": true,
        "status": 200,
        "valid": true
      },
      "openapi": {
        "found": true,
        "status": 200,
        "valid": true,
        "hasGuidance": true,
        "schemasComplete": true,
        "paidOperations": 2
      },
      "consistency": {
        "manifestOriginMatches": true,
        "openapiServerMatches": true
      }
    },
    "findings": [
      "missing_agents_txt"
    ],
    "recommendations": [
      "Publish agents.txt at the audited base path."
    ]
  },
  "warnings": [],
  "checkedAt": "2026-08-08T00:00:00.000Z",
  "source": "{{SOURCE_ID}}"
}
```

### x402 Payment Preflight - $0.01

Use this before an agent authorizes an unfamiliar x402 payment challenge; it never pays the target service.

This first request is unpaid and returns HTTP 402 after input validation. A wallet-enabled client may inspect and retry it.

```bash
curl -i -X POST 'https://one-percent-agent-tip.middletontanne137269.chatgpt.site/api/tools/payment-preflight?source={{SOURCE_ID}}' \
  -H 'content-type: application/json' \
  --data '{"url":"https://example.com/paid-resource","maxUsd":"0.10"}'
```

Representative successful response:

```json
{
  "schemaVersion": "1",
  "tool": "payment-preflight",
  "ok": true,
  "result": {
    "reachable": true,
    "httpStatus": 402,
    "paymentRequired": true,
    "scheme": "exact",
    "network": "eip155:8453",
    "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "amountUsd": "0.01",
    "payTo": "0x1111111111111111111111111111111111111111",
    "withinBudget": true,
    "safeToAttempt": true,
    "warnings": []
  },
  "warnings": [],
  "checkedAt": "2026-08-08T00:00:00.000Z",
  "source": "{{SOURCE_ID}}"
}
```

### Budget Guard - FREE

Use this free local-policy check before any paid agent request, including the two paid tools in this catalog.

This request returns a live HTTP 200 result without payment.

```bash
curl -i -X POST 'https://one-percent-agent-tip.middletontanne137269.chatgpt.site/api/tools/budget-guard?source={{SOURCE_ID}}' \
  -H 'content-type: application/json' \
  --data '{"proposedUsd":"0.05","remainingUsd":"1.00","perCallLimitUsd":"0.10","reserveUsd":"0.25"}'
```

Representative successful response:

```json
{
  "schemaVersion": "1",
  "tool": "budget-guard",
  "ok": true,
  "result": {
    "allowed": true,
    "proposedUsd": "0.05",
    "remainingAfterUsd": "0.95",
    "reasons": []
  },
  "warnings": [],
  "checkedAt": "2026-08-08T00:00:00.000Z",
  "source": "{{SOURCE_ID}}"
}
```

## Safe JavaScript buyer pattern

Supply `evmSigner` from the agent's existing secure wallet adapter. This example never constructs or prints a private key.

```js
import { wrapFetchWithPaymentFromConfig } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm";

const fetchWithPayment = wrapFetchWithPaymentFromConfig(fetch, {
  schemes: [{ network: "eip155:8453", client: new ExactEvmScheme(evmSigner) }],
});

const response = await fetchWithPayment("https://one-percent-agent-tip.middletontanne137269.chatgpt.site/api/tools/site-audit?source={{SOURCE_ID}}", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({"url":"https://example.com"}),
});
if (!response.ok) throw new Error(`Tool failed: ${response.status}`);
const result = await response.json();
```
