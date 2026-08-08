import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const buildScript = join(root, "scripts", "build.mjs");
const canonicalOrigin = "https://one-percent-agent-tip.middletontanne137269.chatgpt.site";
const pageTitle = "ONE PERCENT — Agent Utility Rack";
const catalogName = "ONE PERCENT Agent Utility Rack";
const description =
  "Three deterministic, fixed-price tools for autonomous agents, paid per run with USDC on Base.";
const sourceCatalog = JSON.parse(readFileSync(join(root, "network", "tool-catalog.json"), "utf8"));
const expectedTools = [
  { id: "payment-preflight", priceUsd: "0.05" },
  { id: "site-audit", priceUsd: "0.10" },
  { id: "budget-guard", priceUsd: "0.01" },
];
const hosts = [
  {
    name: "Vercel",
    url: "https://one-percent-agent-tip-network.vercel.app",
    source: "vercel",
  },
  {
    name: "Cloudflare Pages",
    url: "https://one-percent-agent-tip.pages.dev",
    source: "cloudflare",
  },
  {
    name: "Netlify",
    url: "https://one-percent-agent-tip-network.netlify.app",
    source: "netlify",
  },
  {
    name: "GitHub Pages",
    url: "https://tannermidd.github.io/one-percent-agent-tip",
    source: "github",
  },
];

const requiredFiles = [
  "index.html",
  "toolbox.css",
  "agent-tools.json",
  "openapi.json",
  "llms.txt",
  "skill.md",
  "examples.md",
  "robots.txt",
  "sitemap.xml",
  "network.json",
  ".nojekyll",
  join(".well-known", "agent-tools.json"),
  join(".well-known", "agent-tip.json"),
];

function text(path) {
  return readFileSync(path, "utf8");
}

function json(path) {
  return JSON.parse(text(path));
}

function occurrences(content, value) {
  return content.split(value).length - 1;
}

function allFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? allFiles(path) : [path];
  });
}

function validateOpenApi(openapi, host) {
  assert.equal(openapi.openapi, "3.1.0", `${host}: OpenAPI version`);
  assert.equal(openapi.info?.title, catalogName, `${host}: OpenAPI title`);
  assert.equal(openapi.info?.version, sourceCatalog.catalogVersion, `${host}: OpenAPI catalog version`);
  assert.equal(openapi.servers?.[0]?.url, canonicalOrigin, `${host}: canonical OpenAPI server`);
  assert.deepEqual(
    Object.keys(openapi.paths).sort(),
    expectedTools.map(({ id }) => `/api/tools/${id}`).sort(),
    `${host}: OpenAPI paths`,
  );

  for (const tool of expectedTools) {
    const operation = openapi.paths[`/api/tools/${tool.id}`]?.post;
    assert.ok(operation, `${host}: ${tool.id} POST operation`);
    assert.equal(
      operation.parameters?.find((parameter) => parameter.name === "source")?.schema?.default,
      host,
      `${host}: ${tool.id} source default`,
    );
    assert.ok(operation.requestBody?.content?.["application/json"]?.schema, `${host}: ${tool.id} request schema`);
    for (const status of ["200", "400", "402", "503"]) {
      assert.ok(operation.responses?.[status], `${host}: ${tool.id} ${status} response`);
    }
    assert.match(operation.responses["402"].description, new RegExp(`\\$${tool.priceUsd}`));
  }
}

const temporaryRoot = mkdtempSync(join(tmpdir(), "one-percent-mirror-"));
const normalizedStorefronts = [];

try {
  for (const host of hosts) {
    const output = join(temporaryRoot, host.source);
    const build = spawnSync(process.execPath, [buildScript], {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        BUILD_OUTPUT_DIR: output,
        PUBLIC_SITE_URL: host.url,
        DEPLOY_SOURCE: host.source,
      },
    });
    assert.equal(build.status, 0, `${host.name}: build failed\n${build.stderr || build.stdout}`);

    for (const path of requiredFiles) {
      assert.ok(existsSync(join(output, path)), `${host.name}: missing ${path}`);
    }

    for (const path of allFiles(output)) {
      if (!/\.(?:css|html|json|md|txt|xml)$/i.test(path)) continue;
      const content = text(path);
      assert.doesNotMatch(content, /\{\{[A-Z_]+\}\}/i, `${host.name}: raw placeholder in ${path}`);
      assert.doesNotMatch(content, /%7B%7B[A-Z_]+%7D%7D/i, `${host.name}: encoded placeholder in ${path}`);
    }

    const homepage = text(join(output, "index.html"));
    assert.match(homepage, new RegExp(`<title>${pageTitle}</title>`), `${host.name}: shared title`);
    assert.ok(homepage.includes(`content="${description}"`), `${host.name}: shared description`);
    for (const copy of [
      "SMALL TOOLS.",
      "EXACT PRICES.",
      "NO ACCOUNTS.",
      "Payment Preflight",
      "Site Audit",
      "Budget Guard",
      "ONE KITCHEN.",
      "EVERY STOREFRONT.",
    ]) {
      assert.ok(homepage.includes(copy), `${host.name}: missing storefront copy ${copy}`);
    }
    for (const price of ["$0.05", "$0.10", "$0.01"]) {
      assert.ok(homepage.includes(price), `${host.name}: missing price ${price}`);
    }
    assert.ok(homepage.includes(`href="${host.url}"`), `${host.name}: canonical URL`);
    assert.ok(homepage.includes(`content="${host.url}/og.png"`), `${host.name}: Open Graph image`);
    assert.ok(homepage.includes('property="og:image:width" content="1731"'), `${host.name}: Open Graph width`);
    assert.ok(homepage.includes('property="og:image:height" content="909"'), `${host.name}: Open Graph height`);
    assert.ok(homepage.includes('property="og:image:alt" content="ONE PERCENT Agent Utility Rack"'), `${host.name}: Open Graph alt text`);
    assert.ok(homepage.includes('name="twitter:card" content="summary_large_image"'), `${host.name}: Twitter card`);
    assert.ok(homepage.includes("href=\"./toolbox.css\""), `${host.name}: base-relative stylesheet`);
    assert.ok(homepage.includes("href=\"./agent-tools.json\""), `${host.name}: base-relative catalog`);
    assert.ok(homepage.includes(`NODE / ${host.source}`), `${host.name}: source label`);
    assert.ok(homepage.includes('aria-label="ONE PERCENT Agent Utility Rack home"'), `${host.name}: brand label`);
    assert.ok(homepage.includes('aria-label="Primary navigation"'), `${host.name}: navigation label`);
    assert.ok(homepage.includes('role="group" aria-label="Payment rail: USDC on Base Mainnet using x402"'), `${host.name}: payment rail semantics`);
    for (const relation of [
      ['class="rack-hero" aria-labelledby="rack-title"', 'id="rack-title"'],
      ['id="tools" aria-labelledby="tools-title"', 'id="tools-title"'],
      ['id="how" aria-labelledby="flow-title"', 'id="flow-title"'],
      ['id="agent-files" aria-labelledby="files-title"', 'id="files-title"'],
      ['class="rack-network" aria-labelledby="network-title"', 'id="network-title"'],
    ]) {
      assert.ok(homepage.includes(relation[0]) && homepage.includes(relation[1]), `${host.name}: labelled section ${relation[1]}`);
    }
    assert.doesNotMatch(homepage, /Analytics|one-percent-crawler-observatory/i, `${host.name}: private analytics is not advertised`);

    assert.ok(homepage.includes(`${canonicalOrigin}/api/observe`), `${host.name}: aggregate observation endpoint`);
    assert.ok(homepage.includes(`source: "${host.source}"`), `${host.name}: observation source`);
    const beaconPayload = homepage.match(/const payload = JSON\.stringify\(\{([\s\S]*?)\}\);/)?.[1];
    assert.ok(beaconPayload, `${host.name}: observation payload`);
    assert.deepEqual(
      [...beaconPayload.matchAll(/^\s*([a-z_]+):/gm)].map((match) => match[1]),
      ["source", "surface", "ua_category"],
      `${host.name}: aggregate-only observation fields`,
    );
    assert.ok(beaconPayload.includes("window.location.pathname"), `${host.name}: path-only observation`);
    assert.doesNotMatch(beaconPayload, /(?:user_?agent|raw_?ua)\s*:/i, `${host.name}: no raw user agent field`);
    assert.ok(homepage.includes("ua_category: classifyUserAgent(navigator.userAgent)"), `${host.name}: coarse user-agent category`);

    const styles = text(join(output, "toolbox.css"));
    assert.match(styles, /@media \(max-width: 1000px\)/, `${host.name}: mobile breakpoint`);
    assert.ok(
      styles.includes(".rack-nav { display: flex; grid-column: 1 / -1; grid-row: 2; width: 100%; justify-content: space-between; gap: 12px; overflow-x: auto;"),
      `${host.name}: mobile navigation remains visible and scrollable`,
    );
    assert.doesNotMatch(styles, /\.rack-nav\s*\{[^}]*display:\s*none/i, `${host.name}: mobile navigation not hidden`);

    const notFound = text(join(output, "404.html"));
    assert.ok(notFound.includes(`<title>${pageTitle}</title>`), `${host.name}: shared 404 title`);
    assert.ok(notFound.includes(`content="${description}"`), `${host.name}: shared 404 description`);
    assert.ok(notFound.includes(`${host.url}/toolbox.css`), `${host.name}: 404 base-path stylesheet`);
    assert.ok(notFound.includes(`${host.url}/`), `${host.name}: 404 return link`);
    assert.ok(notFound.includes('aria-labelledby="not-found-title"'), `${host.name}: labelled 404 main`);
    assert.ok(notFound.includes('aria-label="Return to the ONE PERCENT Agent Utility Rack"'), `${host.name}: labelled 404 return link`);

    normalizedStorefronts.push(
      homepage.replaceAll(host.url, "{{SITE_URL}}").replaceAll(host.source, "{{SOURCE_ID}}"),
    );

    const manifest = json(join(output, "agent-tools.json"));
    const wellKnownManifest = json(join(output, ".well-known", "agent-tools.json"));
    assert.deepEqual(wellKnownManifest, manifest, `${host.name}: root and well-known catalogs`);
    assert.equal(
      manifest.generatedBy,
      "agent-tip-experiment/scripts/sync-network.mjs",
      `${host.name}: generated catalog provenance`,
    );
    assert.equal(manifest.schemaVersion, "1", `${host.name}: schema version`);
    assert.match(manifest.catalogHash, /^sha256:[a-f0-9]{64}$/, `${host.name}: catalog hash`);
    assert.equal(manifest.name, catalogName, `${host.name}: catalog title`);
    assert.equal(manifest.site.id, host.source, `${host.name}: catalog source`);
    assert.equal(manifest.executionOrigin, canonicalOrigin, `${host.name}: execution origin`);
    assert.equal(manifest.payment.network, "eip155:8453", `${host.name}: Base Mainnet`);
    assert.equal(manifest.payment.networkName, "Base Mainnet", `${host.name}: network name`);
    assert.equal(manifest.payment.asset, "USDC", `${host.name}: asset`);
    assert.equal(manifest.payment.scheme, "x402", `${host.name}: payment scheme`);
    assert.equal(manifest.payment.facilitator, "https://facilitator.xpay.sh", `${host.name}: facilitator`);
    assert.deepEqual(
      manifest.tools.map(({ id, priceUsd, method }) => ({ id, priceUsd, method })),
      expectedTools.map((tool) => ({ ...tool, method: "POST" })),
      `${host.name}: tool IDs and prices`,
    );

    for (const [index, tool] of manifest.tools.entries()) {
      const sourceTool = sourceCatalog.tools[index];
      assert.equal(tool.id, sourceTool.id, `${host.name}: source catalog order`);
      assert.equal(tool.summary, sourceTool.summary, `${host.name}: ${tool.id} summary`);
      assert.deepEqual(tool.inputSchema, sourceTool.inputSchema, `${host.name}: ${tool.id} input schema`);
      assert.deepEqual(tool.resultSchema, sourceTool.resultSchema, `${host.name}: ${tool.id} result schema`);
      const endpoint = new URL(tool.endpoint);
      assert.equal(endpoint.origin, canonicalOrigin, `${host.name}: ${tool.id} canonical origin`);
      assert.equal(endpoint.pathname, `/api/tools/${tool.id}`, `${host.name}: ${tool.id} path`);
      assert.equal(endpoint.searchParams.get("source"), host.source, `${host.name}: ${tool.id} attribution`);

      for (const route of [
        join(output, "api", "tools", tool.id, "index.html"),
        join(output, "tools", tool.id, "index.html"),
      ]) {
        const fallback = text(route);
        assert.ok(fallback.includes(tool.endpoint), `${host.name}: ${tool.id} fallback endpoint`);
        assert.ok(fallback.includes(`${host.url}/examples.md`), `${host.name}: ${tool.id} fallback examples`);
        assert.ok(fallback.includes("cannot execute POST requests"), `${host.name}: ${tool.id} static warning`);
      }
    }

    validateOpenApi(json(join(output, "openapi.json")), host.source);

    for (const path of ["llms.txt", "skill.md", "examples.md"]) {
      const content = text(join(output, path));
      for (const tool of expectedTools) {
        assert.ok(
          content.includes(`${canonicalOrigin}/api/tools/${tool.id}?source=${host.source}`),
          `${host.name}: ${path} ${tool.id} endpoint`,
        );
      }
    }

    const robots = text(join(output, "robots.txt"));
    const sitemap = text(join(output, "sitemap.xml"));
    assert.ok(robots.includes(`Sitemap: ${host.url}/sitemap.xml`), `${host.name}: robots base path`);
    for (const path of ["agent-tools.json", "openapi.json", "llms.txt", "skill.md", "examples.md"]) {
      assert.ok(sitemap.includes(`${host.url}/${path}`), `${host.name}: sitemap ${path}`);
    }
    assert.equal(occurrences(sitemap, `<loc>${host.url}/</loc>`), 1, `${host.name}: one homepage sitemap entry`);
    assert.equal(occurrences(sitemap, `<loc>${host.url}/experiment/</loc>`), 1, `${host.name}: one Experiment 001 sitemap entry`);

    const network = json(join(output, "network.json"));
    assert.equal(network.current_mirror.url, `${host.url}/`, `${host.name}: network mirror URL`);
    assert.equal(network.current_mirror.source, host.source, `${host.name}: network source`);
    assert.deepEqual(network.crawler_teasers, [
      "https://agent-tip-protocol.middletontanne137269.chatgpt.site",
      "https://http-402-tip-jar.middletontanne137269.chatgpt.site",
      "https://agent-gratitude-index.middletontanne137269.chatgpt.site",
    ], `${host.name}: public network excludes private analytics`);

    const legacy = json(join(output, ".well-known", "agent-tip.json"));
    assert.equal(legacy.title, pageTitle, `${host.name}: preserved legacy title`);
    assert.equal(legacy.description, description, `${host.name}: preserved legacy description`);
    assert.equal(legacy.source, host.source, `${host.name}: preserved legacy source`);
    assert.equal(legacy.network, "eip155:84532", `${host.name}: preserved Sepolia experiment`);
    assert.ok(legacy.default_paid_content_url.endsWith(`?source=${host.source}`));

    const experiment = text(join(output, "experiment", "index.html"));
    assert.ok(experiment.includes(`${canonicalOrigin}/experiment`), `${host.name}: Experiment 001 fallback`);
    assert.ok(experiment.includes(`${host.url}/`), `${host.name}: fallback return URL`);
  }

  for (const storefront of normalizedStorefronts.slice(1)) {
    assert.equal(storefront, normalizedStorefronts[0], "all hosts must emit identical storefront markup");
  }
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}

console.log(`static mirror matrix passed (${hosts.length} host builds, ${expectedTools.length} paid tools)`);
