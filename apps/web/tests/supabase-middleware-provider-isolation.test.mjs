import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const read = (path) => readFile(resolve(root, path), "utf8");
const getRouter = (source) => {
  const declaration = /export default function middleware\s*\(\s*request: NextRequest,\s*event: NextFetchEvent,?\s*\)/;
  const match = declaration.exec(source);
  const start = match ? match.index : -1;
  const end = source.indexOf("export const config =", start);
  assert.ok(start >= 0 && end > start, "Explicit Supabase entrypoint must precede unchanged route matcher");
  return source.slice(start, end);
};

test("Clerk middleware is still the default and remains available for unconverted routes", async () => {
  const src = await read("middleware.ts");
  const router = getRouter(src);
  assert.match(src, /const clerkRequestMiddleware = clerkMiddleware\(async \(auth, request\) => \{/);
  assert.match(src, /await auth\.protect\(\)/);
  assert.match(router, /selectAccountAuthProvider\(\s*process\.env\.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER,?\s*\) === "supabase"/);
  assert.match(router, /return clerkRequestMiddleware\(request, event\);/);
  assert.ok(router.lastIndexOf("return clerkRequestMiddleware(request, event);") > router.lastIndexOf("isPublicRoute(request)"));
});

test("Supabase browser login, registration and verified OAuth callback never enter Clerk middleware", async () => {
  const router = getRouter(await read("middleware.ts"));
  for (const route of ["/sign-in", "/sign-up", "/auth/supabase/callback"]) {
    assert.ok(router.includes('pathname === "' + route + '"'), route);
  }
  const login = router.indexOf('pathname === "/sign-in"');
  const api = router.indexOf("if (shouldRefreshAccountSession(pathname))");
  assert.ok(login >= 0 && api > login);
  assert.match(router.slice(login, api), /return NextResponse\.next\(\)/);
});

test("Supabase web page guard remains limited to audited migrated routes", async () => {
  const router = getRouter(await read("middleware.ts"));
  assert.match(router, /shouldRefreshAccountSession\(pathname\)/);
  assert.match(router, /pathname === "\/artists\/dashboard" \|\|\s*pathname === "\/artists\/apply"/);
  assert.match(router, /pathname === "\/artists\/claim"/);
  assert.match(router, /pathname === "\/admin" \|\|\s*pathname\.startsWith\("\/admin\/"\)/);
  assert.match(router, /isMigratedAccountPage\(pathname\)/);
  assert.match(router, /refreshSupabaseAccountSession\(request, \{\s*requireVerifiedUser: true/);
  assert.doesNotMatch(router, /pathname\.startsWith\("\/artists"\)/);
});

test("desktop always retains Clerk middleware in website-only mode", async () => {
  const source = await read("middleware.ts");
  const router = getRouter(source);

  assert.match(
    router,
    /if \(pathname\.startsWith\("\/api\/desktop"\)\)\s*\{\s*return clerkRequestMiddleware\(request, event\);/
  );
  assert.doesNotMatch(
    router,
    /selectDesktopAuthProvider|AUDIOFLUME_DESKTOP_AUTH_PROVIDER/
  );

  assert.match(
    source,
    /request\.nextUrl\.pathname\.startsWith\("\/api\/desktop"\)/
  );
  assert.match(
    source,
    /applyDesktopCorsHeaders\(NextResponse\.next\(\), request\)/
  );
});

test("public website content bypasses Clerk only when Supabase is explicitly selected", async () => {
  const router = getRouter(await read("middleware.ts"));
  assert.match(router, /isPublicArtistContentRoute\(pathname\)/);
  assert.match(router, /isPublicPlaylistDetailRoute\(pathname\)/);
  assert.match(router, /isPublicRoute\(request\) \|\|\s*isPublicArtistContentRoute\(pathname\) \|\|\s*isPublicPlaylistDetailRoute\(pathname\)/);
  assert.match(router, /return NextResponse\.next\(\);/);
});

test("unconverted APIs retain Clerk while audited handlers use explicit routing", async () => {
  const router = getRouter(await read("middleware.ts"));
  const allowlist = await read("lib/auth/shouldRefreshAccountSession.ts");

  assert.doesNotMatch(
    router,
    /if \(pathname\.startsWith\("\/api\/"\)\)\s*\{\s*return NextResponse\.next\(\)/
  );

  assert.match(
    router,
    /if \(shouldRefreshAccountSession\(pathname\)\)\s*\{\s*return refreshSupabaseAccountSession\(request\);/
  );

  assert.match(allowlist, /pathname === "\/api\/account\/auth-session"/);

  for (const route of [
    "/api/admin/access",
    "/api/admin/system-health",
    "/api/admin/audio-proxy",
  ]) {
    assert.ok(router.includes('pathname === "' + route + '"'), route);
  }

  assert.match(router, /return clerkRequestMiddleware\(request, event\);/);
});
