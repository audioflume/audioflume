/**
 * Only relative same-origin paths are eligible as post-auth destinations.
 * Never use a user-supplied URL, //host, backslash, or control character
 * as the destination for an OAuth callback.
 */
export function safeAuthRedirect(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/discover";
  if (/[\\\x00-\x1f\x7f]/.test(value)) return "/discover";
  try {
    const parsed = new URL(value, "https://audioflume.invalid");
    if (parsed.origin !== "https://audioflume.invalid") return "/discover";
    if (parsed.pathname.startsWith("/auth/supabase/callback")) return "/discover";
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return "/discover";
  }
}
