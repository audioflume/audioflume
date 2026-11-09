import "server-only";

import { selectDesktopAuthProvider } from "@/lib/auth/selectDesktopAuthProvider";
import { getBearerTokenFromRequest, getDesktopUserIdFromRequest, verifyDesktopToken } from "@/lib/desktopAuth";
import { supabaseServer } from "@/lib/supabaseServer";

/**
 * In Supabase desktop mode, an HMAC-valid token is not enough: validate the
 * precise Supabase subject -> legacy owner link on every API request.
 * Removing/replacing the identity link invalidates the desktop token
 * immediately; lookup errors fail closed. Clerk mode is left unchanged.
 */
export async function getVerifiedDesktopUserIdFromRequest(req: Request): Promise<string | null> {
  if (selectDesktopAuthProvider(
    process.env.AUDIOFLUME_DESKTOP_AUTH_PROVIDER,
    process.env.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER,
  ) !== "supabase") {
    return getDesktopUserIdFromRequest(req);
  }

  const payload = verifyDesktopToken(getBearerTokenFromRequest(req));
  if (!payload?.userId || !payload.supabaseUserId) return null;

  try {
    const { data, error } = await supabaseServer
      .from("auth_identity_links")
      .select("clerk_user_id")
      .eq("supabase_user_id", payload.supabaseUserId)
      .maybeSingle();

    if (error || !data || data.clerk_user_id !== payload.userId) return null;

    return payload.userId;
  } catch {
    return null;
  }
}
