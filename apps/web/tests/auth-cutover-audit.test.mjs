import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inspectSource, auditSourceTree } from "../scripts/audit-auth-cutover.mjs";

test("classifies a direct browser playlist query", () => {
  const result = inspectSource("components/PlaylistFilter.tsx", `"use client";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@clerk/nextjs";
await supabase.from("playlists").select("id,name");`);
  assert.equal(result.isClient, true);
  assert.equal(result.importsBrowserClient, true);
  assert.equal(result.importsClerk, true);
  assert.deepEqual(result.tables, ["playlists"]);
  assert.equal(result.dynamicTableQueries, 0);
});

test("does not classify server-only Supabase imports as browser access", () => {
  const result = inspectSource("app/api/favorites/route.ts", `import { supabaseServer } from "@/lib/supabaseServer";
await supabaseServer.from("favorites").select("*");`);
  assert.equal(result.isClient, false);
  assert.equal(result.importsBrowserClient, false);
  assert.deepEqual(result.tables, ["favorites"]);
  assert.equal(result.dynamicTableQueries, 0);
});

test("records dynamic table queries for further review", () => {
  const result = inspectSource("components/Picker.tsx", `"use client";
await client.from(tableName).select("*");`);
  assert.equal(result.dynamicTableQueries, 1);
  assert.deepEqual(result.tables, []);
});

test("ignores unrelated JS .from calls when flagging dynamic database tables", () => {
  const source = `"use client";
const data = Array.from({ length: 5 });
const animation = motion.from("bottom");
const rows = supabase.from("playlists").select("*");`;
  const result = inspectSource("components/Carousel.tsx", source);
  assert.equal(result.dynamicTableQueries, 0);
  assert.deepEqual(result.tables, ["playlists"]);
});

test("walks source tree without modifying files and separates Clerk server routes", async () => {
  const root = await mkdtemp(join(tmpdir(), "audioflume-auth-audit-"));
  try {
    await mkdir(join(root, "components"), { recursive: true });
    await mkdir(join(root, "app", "api", "favorites"), { recursive: true });
    await mkdir(join(root, "components", "node_modules"), { recursive: true });
    await writeFile(join(root, "components", "PlaylistFilter.tsx"), `"use client";
import { supabase } from "@/lib/supabase";
supabase.from("playlists").select("*");`);
    await writeFile(join(root, "app", "api", "favorites", "route.ts"), `import { auth } from "@clerk/nextjs/server";`);
    await writeFile(join(root, "components", "node_modules", "Ignored.tsx"), `"use client";`);
    const report = await auditSourceTree(root);
    assert.equal(report.scanned, 2);
    assert.deepEqual(report.directBrowserSupabase.map((row) => row.file), ["components/PlaylistFilter.tsx"]);
    assert.deepEqual(report.clerkApi.map((row) => row.file), ["app/api/favorites/route.ts"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
