/**
 * Only client-rendered account-library pages whose private data is fetched
 * through independently owner-verified account APIs may use the Supabase
 * page guard. Account settings, admin, artist and desktop remain Clerk-only.
 */
const MIGRATED_ACCOUNT_SECTIONS = new Set([
  "profile",
  "payment",
  "membership",
  "notifications",
  "settings",
  "support",
]);

export function isMigratedAccountPage(pathname: string): boolean {
  if (pathname === "/account") return true;
  const accountSection = /^\/account\/([^/]+)$/.exec(pathname);
  if (accountSection) return MIGRATED_ACCOUNT_SECTIONS.has(accountSection[1]);

  return pathname === "/favorites" ||
    pathname === "/projects" ||
    /^\/projects\/[^/]+$/.test(pathname) ||
    pathname === "/playlists";
}
