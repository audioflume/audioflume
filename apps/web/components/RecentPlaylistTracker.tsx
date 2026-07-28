"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export type RecentPlaylistType = "curated" | "community";

export type RecentPlaylistEntry = {
  type: RecentPlaylistType;
  id: number;
};

export const RECENT_PLAYLISTS_CHANGED_EVENT =
  "filmwave-recent-playlists-changed";

const STORAGE_KEY = "filmwave-recent-playlists";
const LEGACY_CURATED_STORAGE_KEY = "filmwave-recent-curated-playlists";
const LEGACY_COMMUNITY_STORAGE_KEY = "filmwave-recent-community-playlists";
const RECENT_PLAYLIST_LIMIT = 5;

function parsePlaylistId(value: unknown) {
  const playlistId = Number(value);
  return Number.isInteger(playlistId) && playlistId > 0 ? playlistId : null;
}

function parseRecentPlaylistKey(value: unknown): RecentPlaylistEntry | null {
  if (typeof value !== "string") return null;

  const match = value.match(/^(curated|community):(\d+)$/);
  if (!match) return null;

  const playlistId = parsePlaylistId(match[2]);
  if (!playlistId) return null;

  return {
    type: match[1] as RecentPlaylistType,
    id: playlistId,
  };
}

function parseLegacyEntries(
  value: string | null,
  type: RecentPlaylistType,
): RecentPlaylistEntry[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map(parsePlaylistId)
      .filter((playlistId): playlistId is number => playlistId !== null)
      .map((id) => ({ type, id }));
  } catch {
    return [];
  }
}

export function getRecentPlaylistKey(entry: RecentPlaylistEntry) {
  return `${entry.type}:${entry.id}`;
}

function dedupeRecentPlaylists(entries: RecentPlaylistEntry[]) {
  const seen = new Set<string>();

  return entries.filter((entry) => {
    const key = getRecentPlaylistKey(entry);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function readRecentPlaylists(): RecentPlaylistEntry[] {
  if (typeof window === "undefined") return [];

  try {
    const currentValue = window.localStorage.getItem(STORAGE_KEY);

    if (currentValue !== null) {
      const parsed = JSON.parse(currentValue);
      if (!Array.isArray(parsed)) return [];

      return dedupeRecentPlaylists(
        parsed
          .map(parseRecentPlaylistKey)
          .filter(
            (entry): entry is RecentPlaylistEntry => entry !== null,
          ),
      ).slice(0, RECENT_PLAYLIST_LIMIT);
    }

    return dedupeRecentPlaylists([
      ...parseLegacyEntries(
        window.localStorage.getItem(LEGACY_CURATED_STORAGE_KEY),
        "curated",
      ),
      ...parseLegacyEntries(
        window.localStorage.getItem(LEGACY_COMMUNITY_STORAGE_KEY),
        "community",
      ),
    ]).slice(0, RECENT_PLAYLIST_LIMIT);
  } catch {
    return [];
  }
}

function writeRecentPlaylists(entries: RecentPlaylistEntry[]) {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(entries.map(getRecentPlaylistKey)),
  );
  window.dispatchEvent(new Event(RECENT_PLAYLISTS_CHANGED_EVENT));
}

export function storeRecentPlaylist(
  type: RecentPlaylistType,
  playlistId: number,
) {
  if (typeof window === "undefined" || !parsePlaylistId(playlistId)) return;

  try {
    const nextEntry = { type, id: playlistId };
    const nextKey = getRecentPlaylistKey(nextEntry);
    const nextEntries = [
      nextEntry,
      ...readRecentPlaylists().filter(
        (entry) => getRecentPlaylistKey(entry) !== nextKey,
      ),
    ].slice(0, RECENT_PLAYLIST_LIMIT);

    writeRecentPlaylists(nextEntries);
  } catch {
    // Playlist navigation should still work if local storage is unavailable.
  }
}

export default function RecentPlaylistTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const curatedMatch = pathname.match(/^\/curated-playlists\/(\d+)$/);
    if (curatedMatch) {
      storeRecentPlaylist("curated", Number(curatedMatch[1]));
      return;
    }

    const communityMatch = pathname.match(/^\/community-playlists\/(\d+)$/);
    if (communityMatch) {
      storeRecentPlaylist("community", Number(communityMatch[1]));
    }
  }, [pathname]);

  return null;
}
