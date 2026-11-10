import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import React from "react";
import { renderToString } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
function load(path, dependencies, source = readFileSync(new URL(path, import.meta.url), "utf8")) {
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const unit = { exports: {} };
  new Function("require", "module", "exports", code)(
    (name) => { assert.ok(name in dependencies, `Unexpected dependency ${name}`); return dependencies[name]; },
    unit, unit.exports,
  );
  return unit.exports;
}

const profile = load("../lib/auth/verifiedSupabaseProfile.ts", {});
const realReact = { react: React, "react/jsx-runtime": require("react/jsx-runtime") };
const noClerk = { useUser() { throw new Error("Clerk hook invoked in Supabase mode"); }, useClerk() { throw new Error("Clerk hook invoked in Supabase mode"); } };

test("Supabase session renders without any Clerk context or hooks", () => {
  const session = load("../context/AccountSessionContext.tsx", {
    ...realReact, "@clerk/nextjs": noClerk,
    "@/lib/auth/verifiedSupabaseProfile": profile,
    "@/lib/auth/supabaseAccountBrowser": { supabaseAccountBrowser: { auth: {} } },
  });
  let observed;
  function Probe() { observed = session.useAccountSession(); return React.createElement("span", null, "existing child"); }
  assert.equal(renderToString(React.createElement(session.AccountSessionProvider, { provider: "supabase" }, React.createElement(Probe))), "<span>existing child</span>");
  assert.equal(observed.provider, "supabase");
  assert.equal(observed.isLoaded, false);
  assert.equal(observed.userId, null);
});

test("Clerk session keeps its original identity and sign-out without initializing Supabase auth", async () => {
  let signedOut = 0;
  const session = load("../context/AccountSessionContext.tsx", {
    ...realReact,
    "@clerk/nextjs": {
      useUser: () => ({ user: { id: "clerk-existing", firstName: "Existing", primaryEmailAddress: { emailAddress: "synthetic@example.test" } }, isLoaded: true }),
      useClerk: () => ({ signOut: async () => { signedOut++; } }),
    },
    "@/lib/auth/verifiedSupabaseProfile": profile,
    "@/lib/auth/supabaseAccountBrowser": { supabaseAccountBrowser: { get auth() { throw new Error("Supabase auth used in Clerk branch"); } } },
  });
  let observed;
  function Probe() { observed = session.useAccountSession(); return null; }
  renderToString(React.createElement(session.AccountSessionProvider, { provider: "clerk" }, React.createElement(Probe)));
  assert.equal(observed.userId, "clerk-existing");
  assert.equal(observed.user.primaryEmailAddress.emailAddress, "synthetic@example.test");
  assert.equal(observed.isSignedIn, true);
  await observed.signOut();
  assert.equal(signedOut, 1);
});

// Deterministic hook/SDK boundaries exercise the original effect's race and
// cleanup behavior. Real React/browser integration is a separate local gate.
function effectHarness() {
  let pendingResolve;
  const lookup = new Promise((resolve) => { pendingResolve = resolve; });
  let callback;
  let cleanup;
  let unsubscribeCount = 0;
  let effect;
  let index = 0;
  const state = [];
  let observed;
  const hooks = {
    createContext: () => ({ Provider: "provider" }),
    useState(initial) { const key = index++; if (!(key in state)) state[key] = initial; return [state[key], (value) => { state[key] = typeof value === "function" ? value(state[key]) : value; }]; },
    useEffect(fn) { effect ??= fn; },
    useMemo: (fn) => fn(), useCallback: (fn) => fn,
    useContext: () => observed,
  };
  const jsx = (type, props) => { if (type === "provider") observed = props.value; else if (typeof type === "function") return type(props); return null; };
  const session = load("../context/AccountSessionContext.tsx", {
    react: hooks, "react/jsx-runtime": { jsx, jsxs: jsx }, "@clerk/nextjs": noClerk,
    "@/lib/auth/verifiedSupabaseProfile": profile,
    "@/lib/auth/supabaseAccountBrowser": { supabaseAccountBrowser: { auth: {
      getUser: () => lookup,
      onAuthStateChange: (fn) => { callback = fn; return { data: { subscription: { unsubscribe() { unsubscribeCount++; } } } }; },
      signOut: async () => { callback("SIGNED_OUT", null); return { error: null }; },
    } } },
  });
  function render() { index = 0; session.AccountSessionProvider({ provider: "supabase", children: null }); }
  render(); cleanup = effect();
  return {
    render, event: (event, user) => callback(event, user ? { user } : null),
    resolve: (user) => pendingResolve({ data: { user }, error: null }),
    value: () => observed, cleanup: () => cleanup(), unsubscribed: () => unsubscribeCount,
  };
}

for (const nextUser of [null, { id: "supabase-b", email: "b@example.test" }]) {
  test(`late initial lookup cannot restore account A after ${nextUser ? "account replacement" : "sign-out"}`, async () => {
    const h = effectHarness();
    h.event(nextUser ? "SIGNED_IN" : "SIGNED_OUT", nextUser);
    h.resolve({ id: "supabase-a", email: "a@example.test" });
    await Promise.resolve(); await Promise.resolve(); h.render();
    assert.equal(h.value().userId, nextUser?.id ?? null);
    assert.equal(h.value().isLoaded, true);
    h.cleanup(); assert.equal(h.unsubscribed(), 1);
  });
}

test("initial session display waits for verified lookup; post-unmount events are ignored", async () => {
  const h = effectHarness();
  h.event("INITIAL_SESSION", { id: "unverified-cache" }); h.render();
  assert.equal(h.value().userId, null);
  assert.equal(h.value().isLoaded, false);
  h.resolve({ id: "verified-a", email: "a@example.test" });
  await Promise.resolve(); await Promise.resolve(); h.render();
  assert.equal(h.value().userId, "verified-a");
  h.cleanup(); h.event("SIGNED_IN", { id: "late-b" }); h.render();
  assert.equal(h.value().userId, "verified-a");
});

test("only legacy dual-identity preview routes mount their scoped Clerk provider", () => {
  let pathname = "/auth-preview";
  let clerkMounts = 0;
  const { default: PreviewLayout } = load("../app/auth-preview/layout.tsx", {
    ...realReact,
    "next/navigation": { usePathname: () => pathname },
    "@clerk/nextjs": { ClerkProvider: ({ children }) => { clerkMounts++; return children; } },
  });
  for (const path of ["/auth-preview", "/auth-preview/ssr", "/auth-preview/cutover", "/auth-preview/unknown"]) {
    pathname = path; const before = clerkMounts;
    assert.equal(renderToString(React.createElement(PreviewLayout, null, "existing child")), "existing child");
    assert.equal(clerkMounts - before, path === "/auth-preview" || path === "/auth-preview/ssr" ? 1 : 0);
  }
});
