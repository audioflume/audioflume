import { selectAccountAuthProvider } from "./selectAccountAuthProvider";

/**
 * Desktop cutover is independent from the website. Both server-side switches
 * must explicitly select Supabase. Never infer desktop mode from a browser
 * cookie or client request.
 */
export function selectDesktopAuthProvider(
  desktopProvider: string | undefined,
  accountProvider: string | undefined,
): "clerk" | "supabase" {
  return desktopProvider === "supabase" &&
    selectAccountAuthProvider(accountProvider) === "supabase"
    ? "supabase"
    : "clerk";
}
