import { createPreviewSsrRequest } from "@/lib/auth-preview/createPreviewSsrRequest";
import type { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Preview-only read access: cookie session -> verified Supabase user ->
// one-to-one legacy owner mapping -> scoped aggregate counts.
// Never trust a browser-supplied owner ID or Supabase user_metadata.
export async function GET(request: NextRequest) {
  const { resolveOwner, respond: result } = createPreviewSsrRequest(request);

  try {
    const ownership = await resolveOwner();
    if (ownership.status !== 200) {
      return result({ error: ownership.error }, ownership.status);
    }

    const legacyUserId = ownership.legacyUserId;

    const [playlists, projects] = await Promise.all([
      supabaseServer.from("playlists").select("id", { count: "exact", head: true })
        .eq("clerk_user_id", legacyUserId),
      supabaseServer.from("projects").select("id", { count: "exact", head: true })
        .eq("clerk_user_id", legacyUserId),
    ]);

    if (playlists.error || projects.error) {
      throw new Error("Could not verify scoped account counts.");
    }

    return result({
      counts: {
        playlists: playlists.count ?? 0,
        projects: projects.count ?? 0,
      },
    }, 200);
  } catch (error) {
    console.error("SSR preview ownership check failed:", error);
    return result({ error: "Account verification is temporarily unavailable." }, 500);
  }
}
