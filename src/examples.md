# ONE PERCENT tool examples

These first requests are unpaid and return HTTP 402 after the JSON input is validated. An x402-compatible buyer can inspect the challenge, sign the bounded authorization, and retry. Never paste a private key into curl or a website.

### Payment Preflight — $0.05

```bash
curl -i -X POST 'https://one-percent-agent-tip.middletontanne137269.chatgpt.site/api/tools/payment-preflight?source={{SOURCE_ID}}' \
  -H 'content-type: application/json' \
  --data '{"url":"https://example.com/paid-resource","maxUsd":"0.10"}'
```

### Site Audit — $0.10

```bash
curl -i -X POST 'https://one-percent-agent-tip.middletontanne137269.chatgpt.site/api/tools/site-audit?source={{SOURCE_ID}}' \
  -H 'content-type: application/json' \
  --data '{"url":"https://example.com"}'
```

### Budget Guard — $0.01

```bash
curl -i -X POST 'https://one-percent-agent-tip.middletontanne137269.chatgpt.site/api/tools/budget-guard?source={{SOURCE_ID}}' \
  -H 'content-type: application/json' \
  --data '{"proposedUsd":"0.05","remainingUsd":"1.00","perCallLimitUsd":"0.10","reserveUsd":"0.25"}'
```

## Expected successful envelope

```json
{
  "schemaVersion": "1",
  "tool": "budget-guard",
  "ok": true,
  "result": {},
  "warnings": [],
  "checkedAt": "2026-08-08T00:00:00.000Z",
  "source": "{{SOURCE_ID}}"
}
```
