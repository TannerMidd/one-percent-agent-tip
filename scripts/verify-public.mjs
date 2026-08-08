import assert from "node:assert/strict";

const central = "https://one-percent-agent-tip.middletontanne137269.chatgpt.site";
const receiver = "0x6ae6f5ac7df7688877204f638cf727c7b845eeeb";
const network = "eip155:84532";
const asset = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

const hosts = [
  { name: "ChatGPT Sites", root: central, source: "direct" },
  { name: "Vercel", root: "https://one-percent-agent-tip-network.vercel.app", source: "vercel" },
  { name: "Cloudflare Pages", root: "https://one-percent-agent-tip.pages.dev", source: "cloudflare" },
  { name: "GitHub Pages", root: "https://tannermidd.github.io/one-percent-agent-tip", source: "github" },
  { name: "Netlify", root: "https://one-percent-agent-tip-network.netlify.app", source: "netlify" },
];

const agentFiles = [
  "robots.txt",
  "llms.txt",
  "skill.md",
  "openapi.json",
  ".well-known/agent-tip.json",
  "network.json",
  "sitemap.xml",
];

function at(root, path = "") {
  return `${root.replace(/\/$/, "")}/${path}`;
}

function normalize(value) {
  return value.replace(/\/$/, "");
}

function decodePaymentRequired(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
}

const rows = [];

for (const host of hosts) {
  try {
  const homepage = await fetch(at(host.root));
  const homepageText = await homepage.text();
  assert.equal(homepage.status, 200, `${host.name}: homepage`);

  const canonical = homepageText.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i)?.[1];
  assert.ok(canonical, `${host.name}: canonical missing`);
  assert.equal(normalize(canonical), normalize(host.root), `${host.name}: canonical mismatch`);

  const fileResults = await Promise.all(
    agentFiles.map(async (path) => {
      const response = await fetch(at(host.root, path));
      const text = await response.text();
      assert.equal(response.status, 200, `${host.name}: ${path}`);
      assert.ok(!text.includes("{{"), `${host.name}: placeholder in ${path}`);
      return { path, text };
    }),
  );

  const byPath = Object.fromEntries(fileResults.map((item) => [item.path, item.text]));
  JSON.parse(byPath["openapi.json"]);
  const manifest = JSON.parse(byPath[".well-known/agent-tip.json"]);
  JSON.parse(byPath["network.json"]);
  assert.ok(byPath["sitemap.xml"].includes(normalize(host.root)), `${host.name}: sitemap host`);

  const paidUrl = `${central}/api/access/0.01?source=${host.source}`;
  const combined = `${homepageText}\n${byPath["llms.txt"]}\n${byPath[".well-known/agent-tip.json"]}`;
  assert.ok(combined.includes(paidUrl), `${host.name}: source-attributed payment URL`);

  const challengeResponse = await fetch(paidUrl);
  assert.equal(challengeResponse.status, 402, `${host.name}: default challenge`);
  const header = challengeResponse.headers.get("payment-required");
  assert.ok(header, `${host.name}: PAYMENT-REQUIRED missing`);
  const challenge = decodePaymentRequired(header);
  const requirement = challenge.accepts?.[0] ?? challenge;
  assert.equal(requirement.network, network, `${host.name}: payment network`);
  assert.equal(requirement.asset.toLowerCase(), asset.toLowerCase(), `${host.name}: payment asset`);
  assert.equal(requirement.payTo.toLowerCase(), receiver.toLowerCase(), `${host.name}: receiver`);
  assert.equal(String(requirement.amount ?? requirement.maxAmountRequired), "10000", `${host.name}: amount`);

  rows.push({
    host: host.name,
    url: host.root,
    homepage: "pass",
    agentFiles: "pass",
    canonical: "pass",
    payment: "pass",
  });
  } catch (error) {
    rows.push({
      host: host.name,
      url: host.root,
      homepage: "fail",
      agentFiles: "fail",
      canonical: "fail",
      payment: "fail",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

let invalidTierStatus = "pass";
try {
  const invalidTier = await fetch(`${central}/api/access/3.00?source=direct`);
  assert.equal(invalidTier.status, 404, "invalid tier must return 404");
} catch (error) {
  invalidTierStatus = error instanceof Error ? error.message : String(error);
}

console.log(JSON.stringify({ verifiedAt: new Date().toISOString(), invalidTier: invalidTierStatus, rows }, null, 2));

if (invalidTierStatus !== "pass" || rows.some((row) => row.homepage !== "pass")) {
  process.exitCode = 1;
}
