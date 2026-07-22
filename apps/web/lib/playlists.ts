import type { Playlist } from "@/lib/types";
import {
  isCommunityPlaylistCategory,
  normalizeCommunityPlaylistCategories,
} from "@/lib/communityPlaylistCategories";

export function normalizePlaylist(value: unknown): Playlist {
  const playlist = value as Partial<Playlist>;

  return {
    id: Number(playlist.id),
    clerk_user_id: String(playlist.clerk_user_id || ""),
    name: String(playlist.name || "").trim(),
    cover_image_url:
      typeof playlist.cover_image_url === "string" &&
      playlist.cover_image_url.trim()
        ? playlist.cover_image_url
        : null,
    position:
      typeof playlist.position === "number" &&
      Number.isFinite(playlist.position)
        ? playlist.position
        : 0,
    is_public: playlist.is_public === true,
    published_at:
      typeof playlist.published_at === "string" && playlist.published_at
        ? playlist.published_at
        : null,
    primary_category: isCommunityPlaylistCategory(playlist.primary_category)
      ? playlist.primary_category
      : null,
    secondary_categories: normalizeCommunityPlaylistCategories(
      playlist.secondary_categories,
    ),
  };
}

export function getPlaylistErrorResponse(error: {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
}) {
  return {
    error: error.message || "Request failed",
    details: error.details,
    hint: error.hint,
    code: error.code,
  };
}
