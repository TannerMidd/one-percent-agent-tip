# ONE PERCENT — Public Host Mirror

A dependency-free, search-friendly public directory for the ONE PERCENT x402 crawler experiment. The same build deploys to Vercel, Cloudflare, Netlify, and GitHub Pages while preserving host-specific canonical URLs and source attribution.

```bash
npm run build
npm test
```

Optional build variables:

- `PUBLIC_SITE_URL`: canonical URL for the current host
- `DEPLOY_SOURCE`: `vercel`, `cloudflare`, `github`, `netlify`, or another declared attribution source

The x402 payment and full dossier remain on the canonical receiver. This mirror contains only public discovery metadata and links to the gated resource.
