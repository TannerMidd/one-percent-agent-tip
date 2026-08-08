import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "src");
const output = join(root, "dist");

function normalizeUrl(value) {
  if (!value) return null;
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return withScheme.replace(/\/$/, "");
}

const siteUrl =
  normalizeUrl(process.env.PUBLIC_SITE_URL) ||
  normalizeUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
  normalizeUrl(process.env.URL) ||
  normalizeUrl(process.env.CF_PAGES_URL) ||
  "https://one-percent-agent-tip.middletontanne137269.chatgpt.site";

const sourceId =
  process.env.DEPLOY_SOURCE ||
  (process.env.VERCEL ? "vercel" : null) ||
  (process.env.CF_PAGES ? "cloudflare" : null) ||
  (process.env.NETLIFY ? "netlify" : null) ||
  (process.env.GITHUB_ACTIONS ? "github" : null) ||
  "mirror";

const textExtensions = new Set([".html", ".txt", ".md", ".json", ".xml"]);

function extension(path) {
  const index = path.lastIndexOf(".");
  return index === -1 ? "" : path.slice(index);
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
      const content = readFileSync(from, "utf8")
        .replaceAll("{{SITE_URL}}", siteUrl)
        .replaceAll("{{SOURCE_ID}}", sourceId);
      writeFileSync(to, content, "utf8");
    } else {
      cpSync(from, to);
    }
  }
}

if (existsSync(output)) rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
copyTree(source);
console.log(JSON.stringify({ output, siteUrl, sourceId }));
