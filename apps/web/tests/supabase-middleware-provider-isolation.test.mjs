import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const read = (path) => readFile(resolve(root, path), "utf8");
const getRouter = (source) => {
  const marker = "export default function middleware(request: NextRequest, event: NextFetchEvent)";
  const start = source.indexOf(marker);
  const end = source.indexOf("export const config =", start);
  assert.ok(start >= 0 && end > start, "Explicit Supabase entrypoint must precede unchanged route matcher");
  return source.slice(start, end);
};

test("Clerk middleware is still the default and remains available for unconverted routes", async () => {
  const src = await read("middleware.ts");
  const router = getRouter(src);
  assert.match(src, /const clerkRequestMiddleware = clerkMiddleware\(async \(auth, request\) => \{/);
  assert.match(src, /await auth\.protect\(\)/);
  assert.match(router, /selectAccountAuthProvider\(process\.env\.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER\) === "supabase"/);
  assert.match(router, /return clerkRequestMiddleware\(request, event\);/);
  assert.ok(router.lastIndexOf("return clerkRequestMiddleware(request, event);") > router.lastIndexOf("if (isPublicRoute(request)"));
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
  assert.match(router, /pathname === "\/artists\/dashboard" \|\| pathname === "\/artists\/apply"/);
  assert.match(router, /pathname === "\/artists\/claim"/);
  assert.match(router, /pathname === "\/admin" \|\| pathname\.startsWith\("\/admin\/"\)/);
  assert.match(router, /isMigratedAccountPage\(pathname\)/);
  assert.match(router, /refreshSupabaseAccountSession\(request, \{ requireVerifiedUser: true \}\)/);
  assert.doesNotMatch(router, /pathname\.startsWith\("\/artists"\)/);
});

test("desktop keeps Clerk middleware until BOTH provider switches select Supabase", async () => {
  const router = getRouter(await read("middleware.ts"));
  assert.match(router, /selectDesktopAuthProvider\(/);
  assert.match(router, /process\.env\.AUDIOFLUME_DESKTOP_AUTH_PROVIDER/);
  assert.match(router, /process\.env\.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER/);
  assert.match(router, /applyDesktopCorsHeaders\(NextResponse\.next\(\), request\)/);
  const fallback = router.indexOf("When desktop stays Clerk");
  const otherApi = router.indexOf('if (pathname.startsWith("/api/"))');
  assert.ok(fallback >= 0 && otherApi > fallback);
  assert.match(router.slice(fallback, otherApi), /return clerkRequestMiddleware\(request, event\);/);
});

test("public website content bypasses Clerk only when Supabase is explicitly selected", async () => {
  const router = getRouter(await read("middleware.ts"));
  assert.match(router, /isPublicArtistContentRoute\(pathname\)/);
  assert.match(router, /isPublicPlaylistDetailRoute\(pathname\)/);
  assert.match(router, /isPublicRoute\(request\) \|\| isPublicContentRoute/);
  assert.match(router, /return NextResponse\.next\(\);/);
});
