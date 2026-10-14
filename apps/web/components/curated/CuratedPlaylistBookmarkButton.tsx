"use client";

import { type MouseEvent, useMemo, useState } from "react";

import Toast from "@/components/Toast";
import { usePlayer } from "@/context/PlayerContext";
import { usePlaylists } from "@/hooks/usePlaylists";
import type {
  CuratedPlaylistCardItem,
} from "@/components/curated/CuratedPlaylistShelf";

type CuratedPlaylistBookmarkButtonProps = {
  playlist: CuratedPlaylistCardItem;
  className?: string;
};

function BookmarkGlyph({ filled }: { filled: boolean }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5.5 3.25h9v13.5L10 14l-4.5 2.75V3.25Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function CuratedPlaylistBookmarkButton({
  playlist,
  className = "",
}: CuratedPlaylistBookmarkButtonProps) {
  const { playlists, refetchPlaylists } = usePlaylists();
  const { currentSong } = usePlayer();
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const savedPlaylist = useMemo(
    () =>
      playlists.find(
        (item) =>
          item.source_type === "curated" &&
          Number(item.source_playlist_id) === playlist.id,
      ) ?? null,
    [playlist.id, playlists],
  );

  function showToast(message: string) {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 1800);
  }

  async function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (saving) return;
    setSaving(true);

    try {
      if (savedPlaylist) {
        const removeRes = await fetch(
          `/api/playlists/${encodeURIComponent(String(savedPlaylist.id))}`,
          { method: "DELETE" },
        );
        const removeData = await removeRes.json().catch(() => null);

        if (!removeRes.ok) {
          throw new Error(removeData?.error || "Failed to remove playlist");
        }

        await refetchPlaylists();
        showToast(`"${playlist.name}" removed from My Playlists`);
        return;
      }

      const songsRes = await fetch(
        `/api/curated-playlists/${encodeURIComponent(String(playlist.id))}/songs`,
      );
      const songs = await songsRes.json().catch(() => null);

      if (!songsRes.ok || !Array.isArray(songs)) {
        throw new Error(songs?.error || "Failed to load playlist songs");
      }

      const createRes = await fetch("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: playlist.name,
          cover_image_url: playlist.cover_image_url ?? null,
          position: 0,
          source_type: "curated",
          source_playlist_id: playlist.id,
        }),
      });
      const newPlaylist = await createRes.json().catch(() => null);

      if (createRes.status === 409) {
        await refetchPlaylists();
        showToast(`"${playlist.name}" added to My Playlists`);
        return;
      }

      if (!createRes.ok || !newPlaylist?.id) {
        throw new Error(newPlaylist?.error || "Failed to create playlist");
      }

      for (let index = 0; index < songs.length; index += 1) {
        const song = songs[index];
        const songId = song.song_id ?? song.id;
        if (!songId) continue;

        try {
          await fetch(`/api/playlists/${newPlaylist.id}/songs`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ song_id: songId, position: index }),
          });
        } catch (error) {
          console.warn(`Error adding song ${songId}:`, error);
        }
      }

      await refetchPlaylists();
      showToast(`"${playlist.name}" added to My Playlists`);
    } catch (error) {
      console.warn("Curated playlist bookmark failed", error);
      showToast(
        error instanceof Error ? error.message : "Failed to update playlist",
      );
    } finally {
      setSaving(false);
    }
  }

  const saved = Boolean(savedPlaylist);

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={handleClick}
        disabled={saving}
        aria-label={
          saved
            ? `Remove ${playlist.name} from My Playlists`
            : `Save ${playlist.name} to My Playlists`
        }
        aria-pressed={saved}
        title={saved ? "Remove from My Playlists" : "Add to My Playlists"}
      >
        <BookmarkGlyph filled={saved} />
      </button>

      <Toast
        message={toastMessage}
        bottomOffset={currentSong ? "88px" : "24px"}
      />
    </>
  );
}
