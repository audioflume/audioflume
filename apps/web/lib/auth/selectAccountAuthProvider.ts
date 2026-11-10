/**
 * Only an explicit server-side choice switches account APIs away from Clerk.
 * This value must never be taken from a header, query string or request body.
 */
export function selectAccountAuthProvider(value: string | undefined): "clerk" | "supabase" {
  return value === "supabase" ? "supabase" : "clerk";
}
