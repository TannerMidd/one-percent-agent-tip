# ONE PERCENT — Agent Utility Rack Mirror

A dependency-free static storefront for the ONE PERCENT Agent Utility Rack. The same build deploys to Vercel, Cloudflare Pages, Netlify, and GitHub Pages. Each host publishes the same three-tool catalog and sends paid POST requests to the canonical Base Mainnet x402 backend with host-specific source attribution.

```bash
npm run build
npm test
```

Optional build variables:

- `PUBLIC_SITE_URL`: canonical URL for the current host
- `DEPLOY_SOURCE`: `vercel`, `cloudflare`, `github`, `netlify`, or another declared attribution source

The build also emits `.nojekyll`, agent discovery files, human-readable static fallbacks for each tool route, and a preserved link to Experiment 001. Static hosts never claim to execute the paid API locally.

The production verifier is intentionally gated and sends only unsigned requests. Run it after every host has been deployed:

```bash
VERIFY_PRODUCTION=1 npm run verify:public
```

It never supplies a payment signature or private key, so each valid tool request must stop at HTTP 402.
