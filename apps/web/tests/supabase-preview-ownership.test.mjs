import test from "node:test";
import assert from "node:assert/strict";
import { resolveVerifiedLegacyOwner } from "../lib/auth-preview/resolveVerifiedLegacyOwner.ts";

test("no verified cookie identity returns 401 without querying the mapping table", async () => {
  let lookedUp = false;
  const result = await resolveVerifiedLegacyOwner(
    async () => null,
    async () => {
      lookedUp = true;
      return "legacy-owner";
    },
  );
  assert.equal(result.status, 401);
  assert.equal(lookedUp, false);
  assert.equal("legacyUserId" in result, false);
});

test("verified but unlinked identity returns 403 without a legacy owner ID", async () => {
  const result = await resolveVerifiedLegacyOwner(
    async () => "supabase-unlinked",
    async (id) => {
      assert.equal(id, "supabase-unlinked");
      return null;
    },
  );
  assert.equal(result.status, 403);
  assert.equal("legacyUserId" in result, false);
});

test("verified linked user resolves only the mapping returned by the server", async () => {
  const result = await resolveVerifiedLegacyOwner(
    async () => "supabase-verified",
    async (id) => {
      assert.equal(id, "supabase-verified");
      return "clerk-verified";
    },
  );
  assert.deepEqual(result, { status: 200, legacyUserId: "clerk-verified" });
});

test("mapping errors fail closed instead of authorizing a guessed identity", async () => {
  await assert.rejects(
    resolveVerifiedLegacyOwner(
      async () => "supabase-verified",
      async () => { throw new Error("database unavailable"); },
    ),
    /database unavailable/,
  );
});

test("verification errors never trigger a legacy owner lookup", async () => {
  let lookedUp = false;
  await assert.rejects(
    resolveVerifiedLegacyOwner(
      async () => { throw new Error("auth unavailable"); },
      async () => {
        lookedUp = true;
        return "clerk-verified";
      },
    ),
    /auth unavailable/,
  );
  assert.equal(lookedUp, false);
});
