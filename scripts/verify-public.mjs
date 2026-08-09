import assert from "node:assert/strict";

if (process.env.VERIFY_PRODUCTION !== "1") {
  console.error(
    "Refusing to contact production. Run only after deployment with VERIFY_PRODUCTION=1 npm run verify:public.",
  );
  process.exit(2);
}

const central = "https://one-percent-agent-tip.middletontanne137269.chatgpt.site";
const expectedReceiver = (
  process.env.EXPECTED_TOOL_RECEIVER || "0x6ae6f5ac7df7688877204f638cf727c7b845eeeb"
).toLowerCase();
const expectedNetwork = "eip155:8453";
const expectedAsset = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913".toLowerCase();
const expectedTools = [
  {
    id: "site-audit",
    access: "x402",
    priceUsd: "0.01",
    atomicAmount: "10000",
    body: { url: "https://example.com" },
  },
  {
    id: "payment-preflight",
    access: "x402",
    priceUsd: "0.01",
    atomicAmount: "10000",
    body: { url: "https://example.com/paid-resource", maxUsd: "0.10" },
  },
  {
    id: "budget-guard",
    access: "free",
    priceUsd: "0.00",
    body: {
      proposedUsd: "0.05",
      remainingUsd: "1.00",
      perCallLimitUsd: "0.10",
      reserveUsd: "0.25",
    },
  },
];

const hosts = [
  { name: "Canonical Sites", root: central, source: "direct", dynamicAlias: true },
  {
    name: "Protocol Sites",
    root: "https://agent-tip-protocol.middletontanne137269.chatgpt.site",
    source: "protocol",
    dynamicAlias: true,
  },
  {
    name: "Tip Jar Sites",
    root: "https://http-402-tip-jar.middletontanne137269.chatgpt.site",
    source: "tip-jar",
    dynamicAlias: true,
  },
  {
    name: "Gratitude Sites",
    root: "https://agent-gratitude-index.middletontanne137269.chatgpt.site",
    source: "gratitude-index",
    dynamicAlias: true,
  },
  {
    name: "Vercel",
    root: "https://one-percent-agent-tip-network.vercel.app",
    source: "vercel",
    dynamicAlias: false,
  },
  {
    name: "Cloudflare Pages",
    root: "https://one-percent-agent-tip.pages.dev",
    source: "cloudflare",
    dynamicAlias: false,
  },
  {
    name: "GitHub Pages",
    root: "https://tannermidd.github.io/one-percent-agent-tip",
    source: "github",
    dynamicAlias: false,
  },
  {
    name: "Netlify",
    root: "https://one-percent-agent-tip-network.netlify.app",
    source: "netlify",
    dynamicAlias: false,
  },
];

const agentFiles = ["agent-tools.json", "openapi.json", "llms.txt", "skill.md", "examples.md"];
const timeoutMs = Number(process.env.VERIFY_TIMEOUT_MS || 15_000);

function at(root, path = "") {
  return `${root.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

async function fetchBounded(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: {
      "user-agent": "onepercent-healthprobe/2.0",
      ...(options.headers || {}),
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
}

function decodePaymentRequired(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
  }
}

async function readChallenge(response) {
  const header = response.headers.get("payment-required");
  if (header) return decodePaymentRequired(header);
  const body = await response.clone().json().catch(() => null);
  if (body?.accepts || body?.network) return body;
  throw new Error("PAYMENT-REQUIRED challenge missing");
}

function requirementFor(challenge, network) {
  return challenge.accepts?.find((item) => item.network === network) || challenge.accepts?.[0] || challenge;
}

function assertChallenge(requirement, tool, label) {
  assert.equal(requirement.network, expectedNetwork, `${label}: payment network`);
  assert.equal(String(requirement.asset).toLowerCase(), expectedAsset, `${label}: USDC contract`);
  assert.equal(String(requirement.payTo).toLowerCase(), expectedReceiver, `${label}: receiver`);
  assert.equal(
    String(requirement.amount ?? requirement.maxAmountRequired),
    tool.atomicAmount,
    `${label}: atomic amount`,
  );
}

function assertToolCatalog(manifest, host) {
  assert.equal(manifest.name, "ONE PERCENT Agent Utility Rack", `${host.name}: catalog name`);
  assert.equal(manifest.site?.id, host.source, `${host.name}: source ID`);
  assert.equal(manifest.executionOrigin, central, `${host.name}: execution origin`);
  assert.equal(manifest.payment?.network, expectedNetwork, `${host.name}: Base Mainnet`);
  assert.equal(manifest.payment?.asset, "USDC", `${host.name}: catalog asset`);
  assert.equal(manifest.payment?.scheme, "x402", `${host.name}: catalog scheme`);
  assert.deepEqual(
    manifest.tools.map(({ id, access, priceUsd, method }) => ({ id, access, priceUsd, method })),
    expectedTools.map(({ id, access, priceUsd }) => ({ id, access, priceUsd, method: "POST" })),
    `${host.name}: tool parity`,
  );

  for (const tool of manifest.tools) {
    const endpoint = new URL(tool.endpoint);
    assert.equal(endpoint.origin, central, `${host.name}: ${tool.id} canonical endpoint`);
    assert.equal(endpoint.pathname, `/api/tools/${tool.id}`, `${host.name}: ${tool.id} endpoint path`);
    assert.equal(endpoint.searchParams.get("source"), host.source, `${host.name}: ${tool.id} attribution`);
  }
}

async function assertUnpaidChallenge(url, tool, label) {
  const response = await fetchBounded(url, {
    method: "POST",
    redirect: "follow",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(tool.body),
  });
  assert.equal(response.status, 402, `${label}: unpaid POST must return 402`);
  const challenge = await readChallenge(response);
  assertChallenge(requirementFor(challenge, expectedNetwork), tool, label);
  assert.ok(challenge.extensions?.bazaar, `${label}: Bazaar discovery extension`);
  assert.ok(challenge.extensions.bazaar.info, `${label}: Bazaar request declaration`);
  assert.ok(challenge.extensions.bazaar.schema, `${label}: Bazaar response declaration`);
  return response.url;
}

async function assertFreeResult(url, tool, label) {
  const response = await fetchBounded(url, {
    method: "POST",
    redirect: "follow",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(tool.body),
  });
  assert.equal(response.status, 200, `${label}: free POST must return 200`);
  assert.equal(response.headers.has("payment-required"), false, `${label}: no payment challenge`);
  const body = await response.json();
  assert.equal(body.ok, true, `${label}: free result envelope`);
  return response.url;
}

const rows = [];
let referenceCatalogHash = null;

for (const host of hosts) {
  const row = { host: host.name, url: host.root, storefront: "fail", discovery: "fail", tools: "fail" };
  try {
    const homepage = await fetchBounded(host.root);
    const homepageText = await homepage.text();
    const normalizedHomepageText = homepageText.replace(/<!--\s*-->/g, "");
    assert.equal(homepage.status, 200, `${host.name}: homepage`);
    for (const marker of [
      "ONE PERCENT",
      "Agent Utility Rack",
      "Agent Discoverability Audit",
      "x402 Payment Preflight",
      "Budget Guard",
      "$0.01",
      "FREE",
    ]) {
      assert.ok(
        normalizedHomepageText.includes(marker),
        `${host.name}: storefront marker ${marker}`,
      );
    }
    assert.doesNotMatch(
      normalizedHomepageText,
      /Analytics|one-percent-crawler-observatory/i,
      `${host.name}: private analytics is not advertised`,
    );
    row.storefront = "pass";

    const fileResults = {};
    for (const path of agentFiles) {
      const response = await fetchBounded(at(host.root, path));
      const body = await response.text();
      assert.equal(response.status, 200, `${host.name}: ${path}`);
      assert.ok(!/\{\{[A-Z_]+\}\}|%7B%7B[A-Z_]+%7D%7D/i.test(body), `${host.name}: ${path} placeholder`);
      fileResults[path] = body;
    }

    const manifest = JSON.parse(fileResults["agent-tools.json"]);
    const openapi = JSON.parse(fileResults["openapi.json"]);
    assertToolCatalog(manifest, host);
    assert.equal(openapi.openapi, "3.1.0", `${host.name}: OpenAPI version`);
    assert.equal(openapi.info?.title, "ONE PERCENT Agent Utility Rack", `${host.name}: OpenAPI title`);
    assert.equal(openapi.servers?.[0]?.url, central, `${host.name}: OpenAPI server`);
    assert.deepEqual(
      Object.keys(openapi.paths).sort(),
      expectedTools.map(({ id }) => `/api/tools/${id}`).sort(),
      `${host.name}: OpenAPI paths`,
    );
    if (referenceCatalogHash === null) referenceCatalogHash = manifest.catalogHash;
    assert.equal(manifest.catalogHash, referenceCatalogHash, `${host.name}: catalog hash parity`);
    row.discovery = "pass";

    for (const tool of expectedTools) {
      const advertised = manifest.tools.find((item) => item.id === tool.id)?.endpoint;
      assert.ok(advertised, `${host.name}: ${tool.id} advertised endpoint`);
      const finalUrl = tool.access === "x402"
        ? await assertUnpaidChallenge(advertised, tool, `${host.name} ${tool.id}`)
        : await assertFreeResult(advertised, tool, `${host.name} ${tool.id}`);
      assert.equal(new URL(finalUrl).origin, central, `${host.name}: ${tool.id} final origin`);

      if (host.dynamicAlias && host.root !== central) {
        const aliasUrl = `${host.root}/api/tools/${tool.id}?source=${host.source}`;
        const aliasFinalUrl = tool.access === "x402"
          ? await assertUnpaidChallenge(aliasUrl, tool, `${host.name} ${tool.id} alias`)
          : await assertFreeResult(aliasUrl, tool, `${host.name} ${tool.id} alias`);
        assert.equal(new URL(aliasFinalUrl).origin, central, `${host.name}: ${tool.id} alias redirect`);
      }
    }
    row.tools = "pass";
  } catch (error) {
    row.error = error instanceof Error ? error.message : String(error);
  }
  rows.push(row);
}

console.log(
  JSON.stringify(
    {
      verifiedAt: new Date().toISOString(),
      safeguards: "unpaid POST requests only; no payment signature or authorization was supplied",
      rows,
    },
    null,
    2,
  ),
);

if (rows.some((row) => row.storefront !== "pass" || row.discovery !== "pass" || row.tools !== "pass")) {
  process.exitCode = 1;
}
