import "server-only";

import { supabaseServer } from "@/lib/supabaseServer";

export type PreviewOwnerResolution =
  | { status: 401; error: string }
  | { status: 403; error: string }
  | { status: 200; legacyUserId: string };

/**
 * Request-scoped authorization for staged Supabase API endpoints only.
 * The Supabase JWT is deliberately kept out of the Authorization header so
 * Clerk middleware can independently process its own session cookies.
 *
 * Do not use this helper for production routes until cookie-based SSR sessions,
 * permissions, and the full account migration have been verified.
 */
export async function resolvePreviewOwner(request: Request): Promise<PreviewOwnerResolution> {
  const token = request.headers.get("x-audioflume-supabase-token")?.trim();

  if (!token) {
    return { status: 401, error: "Supabase sign-in is required." };
  }

  const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token);
  if (authError || !user) {
    return { status: 401, error: "Supabase session could not be verified." };
  }

  const { data: link, error: mappingError } = await supabaseServer
    .from("auth_identity_links")
    .select("clerk_user_id")
    .eq("supabase_user_id", user.id)
    .maybeSingle();

  if (mappingError) throw mappingError;

  if (!link?.clerk_user_id) {
    return { status: 403, error: "This Supabase account is not linked to an existing Audioflume account." };
  }

  return { status: 200, legacyUserId: link.clerk_user_id };
}
