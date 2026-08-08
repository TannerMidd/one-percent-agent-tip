import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, parse, relative, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "src");
const defaultOutput = resolve(root, "dist");
const output = resolve(process.env.BUILD_OUTPUT_DIR || defaultOutput);
const catalog = JSON.parse(readFileSync(join(root, "network", "tool-catalog.json"), "utf8"));

const siteTitle = "ONE PERCENT — Agent Utility Rack";
const siteDescription =
  "Three deterministic, fixed-price tools for autonomous agents, paid per run with USDC on Base.";

function normalizeUrl(value) {
  if (!value) return null;
  const parsed = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  if (!new Set(["http:", "https:"]).has(parsed.protocol)) {
    throw new Error("PUBLIC_SITE_URL must use HTTP or HTTPS");
  }
  parsed.search = "";
  parsed.hash = "";
  parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  return parsed.toString().replace(/\/$/, "");
}

const siteUrl =
  normalizeUrl(process.env.PUBLIC_SITE_URL) ||
  normalizeUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
  normalizeUrl(process.env.URL) ||
  normalizeUrl(process.env.CF_PAGES_URL) ||
  "https://one-percent-agent-tip-network.vercel.app";

const sourceId = (
  process.env.DEPLOY_SOURCE ||
  (process.env.VERCEL ? "vercel" : null) ||
  (process.env.CF_PAGES ? "cloudflare" : null) ||
  (process.env.NETLIFY ? "netlify" : null) ||
  (process.env.GITHUB_ACTIONS ? "github" : null) ||
  "mirror"
).toLowerCase();

if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(sourceId)) {
  throw new Error("DEPLOY_SOURCE must be a lowercase URL-safe identifier");
}

const temporaryRoot = resolve(tmpdir());
const relativeToTemp = relative(temporaryRoot, output);
const isInsideTemp =
  relativeToTemp && !relativeToTemp.startsWith("..") && !isAbsolute(relativeToTemp);
if (
  [root, source, parse(output).root].includes(output) ||
  (output !== defaultOutput && !isInsideTemp)
) {
  throw new Error(`Refusing unsafe BUILD_OUTPUT_DIR: ${output}`);
}

const defaultAccessUrl = `${catalog.canonicalOrigin}/api/access/0.01?source=${encodeURIComponent(sourceId)}`;
const replacements = new Map([
  ["SITE_URL", siteUrl],
  ["SOURCE_ID", sourceId],
  ["SITE_TITLE", siteTitle],
  ["SITE_DESCRIPTION", siteDescription],
  ["DEFAULT_ACCESS_URL", defaultAccessUrl],
]);
const textExtensions = new Set([".css", ".html", ".txt", ".md", ".json", ".xml"]);

function extension(path) {
  const index = path.lastIndexOf(".");
  return index === -1 ? "" : path.slice(index);
}

function render(content, path) {
  let rendered = content;
  for (const [key, value] of replacements) {
    const placeholder = `{{${key}}}`;
    rendered = rendered
      .replaceAll(placeholder, value)
      .replaceAll(encodeURIComponent(placeholder), encodeURIComponent(value));
  }

  if (/\{\{[A-Z_]+\}\}|%7B%7B[A-Z_]+%7D%7D/i.test(rendered)) {
    throw new Error(`Unresolved build placeholder in ${path}`);
  }
  return rendered;
}

function copyTree(directory) {
  for (const entry of readdirSync(directory)) {
    const from = join(directory, entry);
    const rel = relative(source, from);
    const to = join(output, rel);
    if (statSync(from).isDirectory()) {
      mkdirSync(to, { recursive: true });
      copyTree(from);
      continue;
    }

    mkdirSync(dirname(to), { recursive: true });
    if (textExtensions.has(extension(from))) {
      writeFileSync(to, render(readFileSync(from, "utf8"), rel), "utf8");
    } else {
      cpSync(from, to);
    }
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fallbackPage({ heading, message, canonicalUrl, linkLabel, linkUrl }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="robots" content="noindex">
    <title>${escapeHtml(siteTitle)}</title>
    <meta name="description" content="${escapeHtml(siteDescription)}">
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
    <link rel="stylesheet" href="${escapeHtml(siteUrl)}/toolbox.css">
  </head>
  <body>
    <main class="rack" style="min-height:100vh;padding:clamp(2rem,8vw,7rem)">
      <p class="rack-kicker">ONE PERCENT / ${escapeHtml(sourceId)}</p>
      <h1>${escapeHtml(heading)}</h1>
      <p>${escapeHtml(message)}</p>
      <p><a href="${escapeHtml(linkUrl)}">${escapeHtml(linkLabel)} →</a></p>
      <p><a href="${escapeHtml(siteUrl)}/">Return to the Agent Utility Rack</a></p>
    </main>
  </body>
</html>
`;
}

function writeFallbacks() {
  for (const tool of catalog.tools) {
    const canonicalUrl = `${tool.endpoint}?source=${encodeURIComponent(sourceId)}`;
    const fallback = fallbackPage({
      heading: tool.name,
      message: `This static mirror cannot execute POST requests. Use the canonical ${tool.method} endpoint shown in the free examples: ${canonicalUrl}`,
      canonicalUrl,
      linkLabel: "View the request example",
      linkUrl: `${siteUrl}/examples.md`,
    });
    const targets = [
      join(output, "api", "tools", tool.id, "index.html"),
      join(output, "tools", tool.id, "index.html"),
    ];
    for (const target of targets) {
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, fallback, "utf8");
    }
  }

  const experimentUrl = `${catalog.canonicalOrigin}/experiment`;
  const experimentTarget = join(output, "experiment", "index.html");
  mkdirSync(dirname(experimentTarget), { recursive: true });
  writeFileSync(
    experimentTarget,
    fallbackPage({
      heading: "Experiment 001",
      message: "The original Base Sepolia tipping experiment remains available on the canonical research site.",
      canonicalUrl: experimentUrl,
      linkLabel: "Open Experiment 001",
      linkUrl: experimentUrl,
    }),
    "utf8",
  );
}

if (existsSync(output)) rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
copyTree(source);
writeFallbacks();

if (!existsSync(join(output, ".nojekyll"))) {
  writeFileSync(join(output, ".nojekyll"), "", "utf8");
}

console.log(JSON.stringify({ output, siteUrl, sourceId, title: siteTitle }));
