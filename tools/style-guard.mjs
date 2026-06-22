import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ignoredDirectories = new Set([".git", ".next", ".turbo", "build", "dist", "node_modules", "out", "target"]);
const checkedExtensions = new Set([".css", ".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const headerSearchStyleOwners = new Set([
  "packages/shared/styles/app-chrome.css",
  "packages/shared/styles/collapsible-search-pill.css",
  "packages/shared/styles/header-search-toolbar.css",
]);
const headerSearchSelectors = [
  "filmwave-header-search-form",
  "filmwave-music-header-search-form",
  "filmwave-header-actions > form",
  "filmwave-search-pill",
  "filmwave-search-pill-body",
  "filmwave-search-pill-collapsed",
  "filmwave-search-pill-expanded",
  "filmwave-search-pill-icon-circle",
  "filmwave-search-pill-input",
  "fw-toolbar-search",
  "fw-toolbar-search-clear",
  "fw-toolbar-search-icon",
];
const errors = [];

function relativePath(absolutePath) {
  return path.relative(repoRoot, absolutePath).split(path.sep).join("/");
}

function walk(directory, files = []) {
  for (const entry of readdirSync(directory)) {
    if (ignoredDirectories.has(entry)) continue;
    const absolutePath = path.join(directory, entry);
    const stats = statSync(absolutePath);
    if (stats.isDirectory()) {
      walk(absolutePath, files);
      continue;
    }
    if (checkedExtensions.has(path.extname(entry))) files.push(absolutePath);
  }
  return files;
}

function containsHeaderSearchSelector(source) {
  return headerSearchSelectors.some((selector) => source.includes(selector));
}

for (const absolutePath of walk(repoRoot)) {
  const rel = relativePath(absolutePath);
  const source = readFileSync(absolutePath, "utf8");
  const ext = path.extname(rel);

  if (source.includes("style jsx global")) {
    errors.push(`${rel}: route-level global style block found.`);
  }
  if (rel.endsWith("HeaderSearchResponsiveStyles.tsx")) {
    errors.push(`${rel}: runtime header-search style component found.`);
  }
  if (ext === ".css" && containsHeaderSearchSelector(source) && !headerSearchStyleOwners.has(rel)) {
    errors.push(`${rel}: header/search selector ownership violation.`);
  }
  if (ext !== ".css" && source.includes("<style") && containsHeaderSearchSelector(source)) {
    errors.push(`${rel}: component-level header/search style injection found.`);
  }
}

if (errors.length > 0) {
  console.error("Style ownership guard failed:\n");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Style ownership guard passed.");
