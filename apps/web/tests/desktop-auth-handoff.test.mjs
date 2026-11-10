import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
const app = ts.createSourceFile("App.tsx", readFileSync(new URL("../../desktop/src/App.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const route = ts.createSourceFile("route.ts", readFileSync(new URL("../app/api/desktop/auth/token/route.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
function find(tree, predicate) { let found; function visit(n) { if (predicate(n)) found = n; ts.forEachChild(n, visit); } visit(tree); assert.ok(found); return found.getText(tree); }
const parser = find(app, n => ts.isFunctionDeclaration(n) && n.name?.text === "getTokenFromDeepLink");
const urls = find(app, n => ts.isFunctionDeclaration(n) && n.name?.text === "getDeepLinkUrls");
const callback = find(route, n => ts.isFunctionDeclaration(n) && n.name?.text === "getDesktopCallbackUrl");
const effect = find(app, n => ts.isArrowFunction(n) && n.body.getText(app).includes('listen<unknown>("deep-link://new-url"'));
function load(source, dependencies, exported) {
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  return new Function(...Object.keys(dependencies), code + `\nreturn ${exported};`)(...Object.values(dependencies));
}
for (const scheme of ["audioflume:", "audioflume-auth-staging:"]) {
  test(`callback parser accepts only the selected scheme, auth host and callback path: ${scheme}`, () => {
    const parse = load(parser, { DESKTOP_AUTH_SCHEME: scheme }, "getTokenFromDeepLink");
    assert.equal(parse(`${scheme}//auth/callback?token=proof&userId=foreign&role=admin`), "proof");
    for (const value of [`${scheme}//foreign/callback?token=x`, `${scheme}//auth/other?token=x`, `${scheme}//auth/callback`, "https://auth/callback?token=x", "invalid"]) assert.equal(parse(value), null);
    const other = scheme === "audioflume:" ? "audioflume-auth-staging:" : "audioflume:";
    assert.equal(parse(`${other}//auth/callback?token=x`), null);
  });
}
for (const [mode, configured, expected] of [["production", "audioflume-auth-staging", "audioflume:"], ["development", undefined, "audioflume:"], ["development", "audioflume-auth-staging", "audioflume-auth-staging:"], ["development", "https://foreign.invalid", "audioflume:"]]) {
  test(`callback destination stays fixed for ${mode}/${configured ?? "default"}`, () => {
    const make = load(callback, { DESKTOP_CALLBACK_URL: "audioflume://auth/callback", process: { env: { NODE_ENV: mode, AUDIOFLUME_DESKTOP_AUTH_CALLBACK_SCHEME: configured } } }, "getDesktopCallbackUrl");
    const url = new URL(make("proof & ?"));
    assert.equal(url.protocol, expected); assert.equal(url.hostname, "auth"); assert.equal(url.pathname, "/callback"); assert.equal(url.searchParams.get("token"), "proof & ?");
  });
}
const tick = () => new Promise(resolve => setImmediate(resolve));
function listener(current) {
  const saved = []; let live, stopped = 0;
  const cleanup = load(`const effect = ${effect};`, {
    listen: async (event, handler) => { assert.equal(event, "deep-link://new-url"); live = handler; return () => stopped++; },
    getCurrent: () => current,
    getTokenFromDeepLink: load(parser, { DESKTOP_AUTH_SCHEME: "audioflume:" }, "getTokenFromDeepLink"),
    getDeepLinkUrls: load(urls, {}, "getDeepLinkUrls"),
    saveDesktopToken: async value => saved.push(value),
    console: { warn: () => {} },
  }, "effect")();
  return { saved, cleanup, live: value => live({ payload: value }), stopped: () => stopped };
}
test("cold-start and live callbacks reach the existing credential-verification path", async () => {
  const unit = listener(Promise.resolve(["audioflume://auth/callback?token=cold"]));
  await tick(); assert.deepEqual(unit.saved, ["cold"]);
  await unit.live(["audioflume://auth/callback?token=live", "audioflume://auth/other?token=bad"]);
  assert.deepEqual(unit.saved, ["cold", "live"]); unit.cleanup(); assert.equal(unit.stopped(), 1);
});
test("a late startup URL cannot connect after callback listener cleanup", async () => {
  let resolve; const pending = new Promise(yes => { resolve = yes; }); const unit = listener(pending);
  await tick(); unit.cleanup(); resolve(["audioflume://auth/callback?token=late"]); await tick(); assert.deepEqual(unit.saved, []);
});
test("startup URL lookup failure preserves a usable live listener", async () => {
  const unit = listener(Promise.reject(new Error("Unavailable"))); await tick();
  await unit.live("audioflume://auth/callback?token=live"); assert.deepEqual(unit.saved, ["live"]); unit.cleanup();
});
