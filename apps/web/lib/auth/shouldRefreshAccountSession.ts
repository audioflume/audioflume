/**
 * Selects only routes whose account authorization has been migrated.
 * This is intentionally narrower than /api or /api/desktop, and only
 * activates for these APIs with the explicit server-side provider switch.
 */
export function shouldRefreshAccountSession(pathname: string) {
  if (
    pathname === "/api/account/profile" ||
    pathname === "/api/account/billing-profile" ||
    pathname === "/api/account/membership" ||
    pathname === "/api/account/notifications" ||
    pathname === "/api/account/usage" ||
    pathname === "/api/account/security-events" ||
    pathname === "/api/community-playlist-favorites" ||
    pathname === "/api/playlist-recommendations" ||
    /^\/api\/curated-playlists\/[^/]+\/save$/.test(pathname) ||
    pathname === "/api/user-preferences" ||
    pathname === "/api/favorites" ||
    pathname.startsWith("/api/favorites/") ||
    pathname === "/api/projects" ||
    pathname.startsWith("/api/projects/") ||
    pathname === "/api/playlists" ||
    pathname === "/api/playlists/filter-options" ||
    pathname === "/api/playlists/migrate-covers" ||
    pathname === "/api/playlists/reorder" ||
    pathname === "/api/playlists/stats" ||
    /^\/api\/playlists\/[^/]+(?:\/songs(?:\/.*)?)?$/.test(pathname)
  ) {
    return true;
  }
  return /^\/api\/songs\/[^/]+\/(?:playlists|projects)$/.test(pathname);
}
