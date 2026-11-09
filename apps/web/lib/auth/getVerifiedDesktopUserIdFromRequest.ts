import "server-only";

import { selectDesktopAuthProvider } from "@/lib/auth/selectDesktopAuthProvider";
import { getBearerTokenFromRequest, getDesktopUserIdFromRequest, verifyDesktopToken } from "@/lib/desktopAuth";
import { supabaseServer } from "@/lib/supabaseServer";
import { verifyDesktopOwnerBinding } from "./verifyDesktopOwnerBinding";

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

  return verifyDesktopOwnerBinding(payload.userId, payload.supabaseUserId, async (subject) => {
    const { data, error } = await supabaseServer
      .from("auth_identity_links")
      .select("clerk_user_id")
      .eq("supabase_user_id", subject)
      .maybeSingle();

    if (error) throw error;
    return data?.clerk_user_id ?? null;
  });
}
