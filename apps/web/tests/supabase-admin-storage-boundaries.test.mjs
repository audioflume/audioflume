import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const next = require("next/server");

function load(path, dependencies) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const routeModule = { exports: {} };
  new Function("require", "module", "exports", code)(
    (name) => {
      assert.ok(name in dependencies, `Unexpected dependency ${name}`);
      const dependency = dependencies[name];
      return typeof dependency === "function" ? dependency() : dependency;
    }, routeModule, routeModule.exports,
  );
  return routeModule.exports;
}

test("only the approved exact admin routes bypass Clerk in Supabase mode", () => {
  let clerkCalls = 0;
  const { default: middleware } = load("../middleware.ts", {
    "@clerk/nextjs/server": {
      clerkMiddleware: () => () => { clerkCalls++; return new Response(null, { status: 418 }); },
      createRouteMatcher: () => () => false,
    },
    "next/server": next,
    "@/lib/supabaseSsrPreviewRefresh": {},
    "@/lib/auth/refreshSupabaseAccountSession": {},
    "@/lib/auth/shouldRefreshAccountSession": { shouldRefreshAccountSession: () => false },
    "@/lib/auth/selectAccountAuthProvider": { selectAccountAuthProvider: (value) => value === "supabase" ? "supabase" : "clerk" },
    "@/lib/auth/selectDesktopAuthProvider": {},
    "@/lib/auth/isMigratedAccountPage": { isMigratedAccountPage: () => false },
  });
  const original = process.env.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER;
  try {
    process.env.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER = "supabase";
    for (const path of ["/api/admin/artists", "/api/admin/upload"]) {
      assert.equal(middleware(new next.NextRequest("http://localhost" + path), {}).status, 200);
    }
    assert.equal(clerkCalls, 0);
    for (const path of ["/api/admin/artists/other", "/api/admin/upload/other", "/api/admin/artists/", "/api/admin/unknown"]) {
      assert.equal(middleware(new next.NextRequest("http://localhost" + path), {}).status, 418);
    }
    process.env.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER = "clerk";
    for (const path of ["/api/admin/artists", "/api/admin/upload"]) {
      assert.equal(middleware(new next.NextRequest("http://localhost" + path), {}).status, 418);
    }
  } finally {
    if (original === undefined) delete process.env.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER;
    else process.env.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER = original;
  }
});

for (const isAdmin of [false, true]) {
  test(`admin upload ${isAdmin ? "missing-file validation" : "denial"} precedes storage/audio initialization`, async () => {
    const { POST } = load("../app/api/admin/upload/route.ts", {
      "next/server": next,
      "@/lib/admin": { requireAdmin: async () => ({ isAdmin }) },
      "@/lib/r2": () => { throw new Error("Storage must not initialize"); },
      "@/lib/audioProcessing": () => { throw new Error("Audio must not initialize"); },
    });
    const response = await POST(new Request("http://localhost/api/admin/upload", {
      method: "POST", body: new FormData(),
    }));
    assert.equal(response.status, isAdmin ? 400 : 403);
    assert.deepEqual(await response.json(), { error: isAdmin ? "Missing file" : "Unauthorized" });
  });
}

class ArtistAccessError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

for (const allowed of [false, true]) {
  test(`artist image ${allowed ? "missing-file validation" : "denial"} precedes storage initialization`, async () => {
    const { POST } = load("../app/api/artists/[id]/images/route.ts", {
      "@aws-sdk/client-s3": {},
      "next/server": next,
      "node:crypto": require("node:crypto"),
      "@/lib/artistPermissions": {
        ArtistAccessError,
        requireArtistPermission: async () => { if (!allowed) throw new ArtistAccessError("Forbidden", 403); },
      },
      "@/lib/supabaseServer": {},
      "@/lib/r2": () => { throw new Error("Storage must not initialize"); },
    });
    const response = await POST(new Request("http://localhost/api/artists/example/images", {
      method: "POST", body: new FormData(),
    }), { params: Promise.resolve({ id: "example" }) });
    assert.equal(response.status, allowed ? 400 : 403);
    assert.deepEqual(await response.json(), { error: allowed ? "Missing file" : "Forbidden" });
  });
}
