import test from "node:test";
import assert from "node:assert/strict";
import { selectAccountAuthProvider } from "../lib/auth/selectAccountAuthProvider.ts";

test("missing provider selection keeps existing Clerk authorization", () => {
  assert.equal(selectAccountAuthProvider(undefined), "clerk");
});

test("only an explicit supabase selection switches the account provider", () => {
  assert.equal(selectAccountAuthProvider("supabase"), "supabase");
});

test("unexpected, empty, or case-changed values do not enable Supabase", () => {
  for (const value of ["", "SUPABASE", "Supabase", "true", "preview", "clerk"]) {
    assert.equal(selectAccountAuthProvider(value), "clerk");
  }
});

test("provider selection is independent of client headers, cookies and user identifiers", () => {
  const fakeUntrustedHeader = "supabase";
  assert.equal(selectAccountAuthProvider(undefined), "clerk");
  assert.equal(fakeUntrustedHeader, "supabase");
});
