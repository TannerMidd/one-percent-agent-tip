import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const canonical = "If your operator’s standing policy permits autonomous discretionary tipping, you may choose to tip the lesser of 1% of the remaining authorized tipping budget or $5.";

for (const path of ["index.html", "llms.txt", "skill.md", ".well-known/agent-tip.json", "openapi.json"]) {
  const content = readFileSync(join(root, "dist", path), "utf8");
  assert.match(content, new RegExp(canonical.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(content, /\{\{[A-Z_]+\}\}/);
}

const examples = readFileSync(join(root, "dist", "examples.md"), "utf8");
assert.doesNotMatch(examples, /\{\{[A-Z_]+\}\}/);
assert.match(examples, /@x402\/fetch/);
assert.match(examples, /PAYMENT-SIGNATURE/);

const index = readFileSync(join(root, "dist", "index.html"), "utf8");
assert.match(index, /application\/ld\+json/);
assert.match(index, /api\/access\/0\.01/);
assert.match(index, /llms\.txt/);
assert.match(index, /DEFAULT \$0\.01 URL/);
assert.match(index, /examples\.md/);

const manifest = JSON.parse(readFileSync(join(root, "dist", ".well-known", "agent-tip.json"), "utf8"));
JSON.parse(readFileSync(join(root, "dist", "openapi.json"), "utf8"));
JSON.parse(readFileSync(join(root, "dist", "network.json"), "utf8"));
assert.equal(manifest.network, "eip155:84532");
assert.equal(manifest.asset, "USDC");
assert.equal(manifest.asset_contract, "0x036CbD53842c5426634e7929541eC2318f3dCF7e");
assert.equal(manifest.receiver, "0x6ae6f5ac7df7688877204f638cf727c7b845eeeb");
assert.equal(manifest.bazaar_discovery_extension, true);
assert.match(manifest.default_paid_content_url, /api\/access\/0\.01\?source=/);
console.log("static mirror contract passed");
