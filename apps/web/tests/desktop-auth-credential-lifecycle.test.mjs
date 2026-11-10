import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const appSource = ts.createSourceFile("App.tsx", readFileSync(new URL("../../desktop/src/App.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const methods = ["loadDesktopAccount", "saveDesktopToken", "signOutDesktop"];
const bodies = {};
function visit(node) {
  if (ts.isFunctionDeclaration(node) && node.name && methods.includes(node.name.text)) bodies[node.name.text] = node.getText(appSource);
  ts.forEachChild(node, visit);
}
visit(appSource);
assert.equal(Object.keys(bodies).length, methods.length);
const compile = (source) => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const rejected = (status) => Object.assign(new Error("Unauthorized"), { status });
function session({ savedToken, lookup = async () => ({ id: "verified-owner" }) } = {}) {
  const data = savedToken ? { desktopToken: savedToken } : {};
  const state = { desktopToken: savedToken ?? null, desktopAccount: savedToken ? { id: "previous-owner" } : null };
  const writes = [];
  const store = {
    get: async (key) => data[key],
    set: async (key, value) => { writes.push([key, value]); data[key] = value; },
    delete: async (key) => { writes.push(["delete", key]); delete data[key]; },
    save: async () => {},
  };
  const dependencies = {
    getDesktopAccount: lookup,
    load: async (name) => { assert.equal(name, "filmwave-settings.json"); return store; },
    SETTINGS_STORE: "filmwave-settings.json",
    normalizedApiBaseUrl: "http://localhost:3001",
    accountRequestVersion: { current: 0 },
    addSyncActivityLogEntry: async () => {},
    console: { error: () => {} },
  };
  for (const setter of new Set(Object.values(bodies).join("\n").match(/\bset[A-Z]\w*(?=\()/g))) {
    dependencies[setter] = (value) => { state[setter[3].toLowerCase() + setter.slice(4)] = value; };
  }
  const actions = new Function(...Object.keys(dependencies), compile(Object.values(bodies).join("\n")) + "\nreturn {loadDesktopAccount,saveDesktopToken,signOutDesktop};")(...Object.values(dependencies));
  return { ...actions, state, data, writes };
}

test("a connection code is verified before it is persisted or presented as signed in", async () => {
  const response = deferred();
  const unit = session({ lookup: () => response.promise });
  const pending = unit.saveDesktopToken("new-code");
  assert.deepEqual(unit.writes, []);
  assert.equal(unit.state.desktopToken, null);
  response.resolve({ id: "verified-owner" });
  await pending;
  assert.equal(unit.data.desktopToken, "new-code");
  assert.equal(unit.state.desktopAccount.id, "verified-owner");
  assert.equal(unit.state.desktopToken, "new-code");
});
for (const status of [401, 403]) {
  test(`new credential rejection ${status} leaves the native app signed out`, async () => {
    const unit = session({ lookup: async () => { throw rejected(status); } });
    await unit.saveDesktopToken("bad-code");
    assert.deepEqual(unit.writes, []);
    assert.equal(unit.state.desktopToken, null);
    assert.equal(unit.state.desktopAccount, null);
    assert.equal(unit.state.syncStatus, "Could not sign in");
  });
  test(`restored credential rejection ${status} clears the current local credential and account`, async () => {
    const unit = session({ savedToken: "old-code", lookup: async () => { throw rejected(status); } });
    assert.equal(await unit.loadDesktopAccount("old-code"), null);
    assert.equal(unit.data.desktopToken, undefined);
    assert.equal(unit.state.desktopToken, null);
    assert.equal(unit.state.desktopAccount, null);
    assert.equal(unit.state.accountLoading, false);
  });
}
test("a rejected replacement keeps an existing valid native connection", async () => {
  const unit = session({ savedToken: "valid-code", lookup: async () => { throw rejected(401); } });
  await unit.saveDesktopToken("bad-replacement");
  assert.equal(unit.data.desktopToken, "valid-code");
  assert.equal(unit.state.desktopToken, "valid-code");
  assert.equal(unit.state.desktopAccount.id, "previous-owner");
});
for (const error of [new Error("Network unavailable"), rejected(500)]) {
  test(`transient account lookup failure retains the saved credential: ${error.message}/${error.status ?? "network"}`, async () => {
    const unit = session({ savedToken: "valid-code", lookup: async () => { throw error; } });
    await unit.loadDesktopAccount("valid-code");
    assert.equal(unit.data.desktopToken, "valid-code");
    assert.equal(unit.state.desktopToken, "valid-code");
    assert.deepEqual(unit.writes, []);
    assert.equal(unit.state.accountLoading, false);
  });
}
test("an old rejected lookup cannot sign out a newer verified connection", async () => {
  const old = deferred();
  const unit = session({ savedToken: "old-code", lookup: (token) => token === "old-code" ? old.promise : Promise.resolve({ id: "new-owner" }) });
  const pending = unit.loadDesktopAccount("old-code");
  await unit.saveDesktopToken("new-code");
  old.reject(rejected(401));
  await pending;
  assert.equal(unit.data.desktopToken, "new-code");
  assert.equal(unit.state.desktopAccount.id, "new-owner");
});
test("late code verification cannot restore credentials after logout", async () => {
  const response = deferred();
  const unit = session({ lookup: () => response.promise });
  const pending = unit.saveDesktopToken("pending-code");
  await unit.signOutDesktop();
  response.resolve({ id: "old-owner" });
  await pending;
  assert.equal(unit.data.desktopToken, undefined);
  assert.equal(unit.state.desktopToken, null);
  assert.equal(unit.state.desktopAccount, null);
});
test("latest credential verification wins over an older account response", async () => {
  const old = deferred();
  const unit = session({ lookup: (token) => token === "old-code" ? old.promise : Promise.resolve({ id: "new-owner" }) });
  const pending = unit.saveDesktopToken("old-code");
  await unit.saveDesktopToken("new-code");
  old.resolve({ id: "old-owner" });
  await pending;
  assert.equal(unit.data.desktopToken, "new-code");
  assert.equal(unit.state.desktopAccount.id, "new-owner");
});
test("an empty successful account response cannot create a signed-in connection", async () => {
  const unit = session({ lookup: async () => null });
  await unit.saveDesktopToken("unverified-code");
  assert.equal(unit.state.desktopToken, null);
  assert.deepEqual(unit.writes, []);
});

test("the actual desktop account client carries HTTP status without changing its error message", async () => {
  const source = readFileSync(new URL("../../desktop/src/lib/mockFilmwaveApi.ts", import.meta.url), "utf8");
  const unit = { exports: {} };
  const network = async () => new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  new Function("require", "module", "exports", "fetch", compile(source))((name) => {
    assert.ok(["@tauri-apps/plugin-fs", "@tauri-apps/plugin-store"].includes(name));
    return {};
  }, unit, unit.exports, network);
  await assert.rejects(unit.exports.getDesktopAccount("bad-code", "http://localhost:3001"), (error) => error instanceof Error && error.message === "Unauthorized" && error.status === 401);
});
