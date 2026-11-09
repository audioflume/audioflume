/**
 * Only client-rendered account-library pages whose private data is fetched
 * through independently owner-verified account APIs may use the Supabase
 * page guard. Account settings, admin, artist and desktop remain Clerk-only.
 */
export function isMigratedAccountPage(pathname: string): boolean {
  return pathname === "/favorites" ||
    pathname === "/projects" ||
    /^\/projects\/[^/]+$/.test(pathname) ||
    pathname === "/playlists";
}
