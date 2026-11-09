#!/usr/bin/env node
/**
 * Read-only source audit for Clerk -> Supabase Auth cutover.
 *
 * Run from repository root or apps/web:
 *   node apps/web/scripts/audit-auth-cutover.mjs
 *   node apps/web/scripts/audit-auth-cutover.mjs --json
 *
 * This is intentionally conservative: imports and obvious .from("table")
 * calls are found, but transitive client imports, dynamic tables and RPCs
 * still require manual inspection. No source files are modified.
 */
import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sources = ["app", "components", "contexts", "context", "hooks", "lib", "providers"];
const extensions = /\.(tsx?|jsx?)$/;
const ignoredDirectories = new Set(["node_modules", ".next", ".git", "dist", "build", "coverage"]);
const clientSupabaseImport =
  /(?:from\s*|import\s*)["'](?:@\/lib\/supabase|\.\.?\/[^"']*supabase)["']/i;
const clerkImport = /from\s*["']@clerk\//;
const directFromQuery = /\.from\(\s*["'`]([^"'`]+)["'`]\s*\)/g;
const clientDirective = /^\s*["']use client["'];?/;
const directSdk = /(?:createClient|createBrowserClient)\s*\(/;
const dynamicFrom = /\.from\(\s*(?!["'`])/g;

async function walk(directory, files) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        await walk(join(directory, entry.name), files);
      }
    } else if (entry.isFile() && extensions.test(entry.name)) {
      files.push(join(directory, entry.name));
    }
  }
}

export function inspectSource(relativePath, content) {
  const isClient = clientDirective.test(content);
  const isApiRoute = /^app\/api\//.test(relativePath);
  const importsBrowserClient = clientSupabaseImport.test(content);
  const importsClerk = clerkImport.test(content);
  const tables = [...new Set(
    [...content.matchAll(directFromQuery)].map((match) => match[1]),
  )].sort();
  const dynamicTableQueries = [...content.matchAll(dynamicFrom)].length;

  return {
    file: relativePath,
    isClient,
    isApiRoute,
    importsBrowserClient,
    importsClerk,
    definesSdkClient: directSdk.test(content) && /supabase/i.test(content),
    tables,
    dynamicTableQueries,
  };
}

export async function auditSourceTree(root = appRoot) {
  const files = [];
  for (const source of sources) await walk(join(root, source), files);
  const findings = await Promise.all(files.map(async (file) => {
    const content = await readFile(file, "utf8");
    return inspectSource(relative(root, file).split(sep).join("/"), content);
  }));

  return {
    scanned: findings.length,
    directBrowserSupabase: findings.filter((f) => f.isClient && f.importsBrowserClient),
    otherSupabaseImports: findings.filter((f) => !f.isClient && f.importsBrowserClient),
    clerkClient: findings.filter((f) => f.isClient && f.importsClerk),
    clerkApi: findings.filter((f) => f.isApiRoute && f.importsClerk),
    sdkDefinitions: findings.filter((f) => f.definesSdkClient),
    dynamicQueries: findings.filter((f) => f.dynamicTableQueries > 0),
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = await auditSourceTree();
  if (process.argv.includes("--json")) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  } else {
    console.log(`Audioflume auth cutover — scanned ${report.scanned} source files`);
    for (const [name, rows] of Object.entries(report)) {
      if (!Array.isArray(rows)) continue;
      console.log(`\n${name}: ${rows.length}`);
      for (const row of rows) {
        const queried = row.tables.length ? ` [${row.tables.join(", ")}]` : "";
        console.log(`  ${row.file}${queried}`);
      }
    }
    console.log("\nREVIEW REQUIRED: client-side transitive imports, RPCs, dynamic tables, exposed schemas, and desktop source are not proved safe by this heuristic scan.");
  }
}
