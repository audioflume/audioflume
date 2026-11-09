import test from "node:test";
import assert from "node:assert/strict";
import { profileFromVerifiedSupabaseUser } from "../lib/auth/verifiedSupabaseProfile.ts";

test("verified email is used instead of user-editable metadata email", () => {
  const profile = profileFromVerifiedSupabaseUser({
    email: "verified@example.com",
    user_metadata: {
      email: "attacker@example.com",
      clerk_user_id: "victim_legacy_owner",
      role: "admin",
      app_metadata: { role: "admin" },
      full_name: "Display name only",
    },
  });
  assert.equal(profile.primaryEmailAddress.emailAddress, "verified@example.com");
  assert.equal(profile.fullName, "Display name only");
  assert.equal(Object.hasOwn(profile, "clerk_user_id"), false);
  assert.equal(Object.hasOwn(profile, "role"), false);
  assert.equal(Object.hasOwn(profile, "userId"), false);
});

test("Google display fields remain available without becoming authorization fields", () => {
  assert.deepEqual(profileFromVerifiedSupabaseUser({
    email: "person@example.com",
    user_metadata: {
      given_name: "First",
      family_name: "Last",
      picture: "https://images.example.com/pic.png",
    },
  }), {
    firstName: "First",
    lastName: "Last",
    fullName: "First Last",
    username: null,
    imageUrl: "https://images.example.com/pic.png",
    primaryEmailAddress: { emailAddress: "person@example.com" },
  });
});

test("missing display fields and non-string metadata are ignored", () => {
  const profile = profileFromVerifiedSupabaseUser({
    email: null,
    user_metadata: { full_name: 123, given_name: {}, avatar_url: false },
  });
  assert.equal(profile.firstName, null);
  assert.equal(profile.fullName, null);
  assert.equal(profile.imageUrl, null);
  assert.equal(profile.primaryEmailAddress.emailAddress, null);
});

test("profile display values are trimmed without changing verified email", () => {
  const profile = profileFromVerifiedSupabaseUser({
    email: "verified@example.com",
    user_metadata: { name: "  Example Artist  " },
  });
  assert.equal(profile.fullName, "Example Artist");
  assert.equal(profile.primaryEmailAddress.emailAddress, "verified@example.com");
});
