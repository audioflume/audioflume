#!/usr/bin/env node
/**
 * Read-only website/desktop authentication migration preflight.
 *
 *   node apps/web/scripts/check-auth-cutover-readiness.mjs
 *   node apps/web/scripts/check-auth-cutover-readiness.mjs --smoke clerk
 *   node apps/web/scripts/check-auth-cutover-readiness.mjs --smoke supabase
 *
 * Does not switch providers, inspect secrets, change data, apply migrations,
 * deploy, or claim that passing source tests authorize a production cutover.
 */
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { auditSourceTree } from "./audit-auth-cutover.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const paths = [
  "apps/web/tests/supabase-account-session-routing.test.mjs",
  "apps/web/tests/supabase-artist-authorization.test.mjs",
  "apps/web/tests/supabase-artist-team-acceptance.test.mjs",
  "apps/web/tests/supabase-artist-claims.test.mjs",
  "apps/web/tests/supabase-artist-member-api-routing.test.mjs",
  "apps/web/tests/supabase-admin-page-cutover.test.mjs",
  "apps/web/tests/supabase-trusted-admin-gate.test.mjs",
  "apps/web/tests/supabase-browser-cutover-boundaries.test.mjs",
  "apps/web/tests/supabase-server-cookie-rendering.test.mjs",
  "apps/web/tests/supabase-desktop-auth-cutover.test.mjs",
  "apps/web/tests/supabase-website-authorization-batch.test.mjs",
  "apps/web/tests/supabase-rls-lockdown-staging.test.mjs",
  "apps/web/tests/supabase-rls-cutover-readiness.test.mjs",
  "apps/web/tests/supabase-project-sync-rls-lockdown.test.mjs",
  "apps/web/tests/supabase-preflight-runner.test.mjs",
  "apps/web/tests/supabase-unified-security-gate.test.mjs",
];

export function parseOptions(args) {
  if (args.length === 0) return { smoke: null };
  if (args.length === 2 && args[0] === "--smoke" &&
      (args[1] === "clerk" || args[1] === "supabase")) {
    return { smoke: args[1] };
  }
  throw new Error("Usage: node apps/web/scripts/check-auth-cutover-readiness.mjs [--smoke clerk|supabase]");
}

function execute(name, args) {
  console.log("\n" + name);
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  });
  if (result.error) {
    console.error(result.error.message);
    return false;
  }
  return result.status === 0;
}

async function main() {
  let options;
  try {
    options = parseOptions(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
    return;
  }

  const testsPass = execute("1. Authentication regressions", [
    "--experimental-strip-types", "--test", ...paths,
  ]);

  let auditPass = false;
  try {
    const audit = await auditSourceTree(resolve(root, "apps/web"));
    const direct = audit.directBrowserSupabase.filter((entry) => entry.tables.length);
    const dynamic = audit.dynamicQueries.filter((entry) => entry.isClient);
    auditPass = direct.length === 0 && dynamic.length === 0;
    console.log("\n2. Read-only browser database audit");
    console.log(`Scanned: ${audit.scanned} files; direct client table reads: ${direct.length}; dynamic client queries: ${dynamic.length}`);
    if (!auditPass) {
      for (const entry of [...direct, ...dynamic]) console.error(`REVIEW: ${entry.file}`);
    }
    console.log("Note: this heuristic cannot prove transitive imports, RPCs, or RLS safety.");
  } catch (error) {
    console.error("Source audit failed:", error);
  }

  const smokePass = options.smoke
    ? execute(`3. Anonymous local API smoke (${options.smoke})`, [
      "apps/web/scripts/smoke-supabase-auth-local.mjs", "--provider", options.smoke,
    ])
    : null;

  const passed = testsPass && auditPass && smokePass !== false;
  console.log(`\n${passed ? "SOURCE_PREFLIGHT_PASS" : "SOURCE_PREFLIGHT_BLOCKED"}`);
  console.log("RELEASE_NOT_APPROVED: production build, real signed-in browser/desktop tests, staging RLS verification, and approved rollout are separate mandatory gates.");
  if (!options.smoke) console.log("Local API smoke skipped. Pass --smoke clerk or --smoke supabase for an already-running matching local server.");
  if (!passed) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
