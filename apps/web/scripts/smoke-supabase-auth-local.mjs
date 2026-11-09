#!/usr/bin/env node
/**
 * Read-only, anonymous HTTP smoke checks for a locally running Audioflume web
 * server. Never accepts credentials, follows redirects, or targets production.
 *
 * Usage:
 * node apps/web/scripts/smoke-supabase-auth-local.mjs --provider supabase
 * node apps/web/scripts/smoke-supabase-auth-local.mjs --provider clerk --base-url http://127.0.0.1:3000
 */
const args = process.argv.slice(2);
const getArg = (name) => {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
};

const provider = getArg("--provider");
if (provider !== "supabase" && provider !== "clerk") {
  console.error("Specify --provider supabase or --provider clerk to match the running server.");
  process.exit(2);
}

let origin;
try {
  const url = new URL(getArg("--base-url") ?? "http://127.0.0.1:3000");
  if (
    url.protocol !== "http:" ||
    !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
    url.username || url.password || url.search || url.hash ||
    (url.pathname !== "/" && url.pathname !== "")
  ) {
    throw new Error("Target must be an HTTP loopback origin without credentials or a path.");
  }
  origin = url.origin;
} catch (error) {
  console.error(error instanceof Error ? error.message : "Invalid --base-url.");
  process.exit(2);
}

const checks = [
  { path: "/api/account/auth-session", expected: provider === "supabase" ? 401 : 404 },
  { path: "/api/auth-preview/cutover-session", expected: 401 },
  { path: "/api/artists/access", expected: 401 },
  { path: "/api/artists/claim", expected: 401 },
  { path: "/api/admin/system-health", expected: 401 },
  { path: "/api/admin/audio-proxy", expected: 401 },
  { path: "/api/admin/access", expected: 403 },
];

let failures = 0;
for (const { path, expected } of checks) {
  try {
    // Do not forward cookies, authorization headers, or redirects.
    const response = await fetch(new URL(path, origin), {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    const ok = response.status === expected;
    const location = response.headers.get("location");
    let redirectDetail = "";
    if (location && response.status >= 300 && response.status < 400) {
      try {
        const destination = new URL(location, origin);
        // Limit output to routing information. Never print OAuth codes,
        // authentication tokens or arbitrary query-string values.
        redirectDetail = destination.origin === origin
          ? ` -> ${destination.pathname}`
          : ` -> ${destination.origin}${destination.pathname}`;
      } catch {
        redirectDetail = " -> (invalid Location header)";
      }
    }
    console.log(`${ok ? "PASS" : "FAIL"} ${path}: HTTP ${response.status} (expected ${expected})${redirectDetail}`);
    if (!ok) failures++;
    await response.body?.cancel();
  } catch (error) {
    failures++;
    console.error(`FAIL ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

console.log(`\n${checks.length - failures}/${checks.length} anonymous API smoke checks passed for ${provider} mode.`);
if (failures) {
  console.log("If an API redirects, inspect its destination and confirm the selected provider and listening server.");
  console.log("Browser sign-in pages require separate interactive verification of Clerk/Supabase session handshakes.");
}
if (failures > 0) process.exitCode = 1;
