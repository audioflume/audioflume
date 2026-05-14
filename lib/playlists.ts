import type { Playlist } from "@/lib/types";

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
