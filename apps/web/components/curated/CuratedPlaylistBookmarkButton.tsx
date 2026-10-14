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
  const { playlists, setPlaylists } = usePlaylists();
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

        setPlaylists((current) =>
          current.filter((item) => item.id !== savedPlaylist.id),
        );
        showToast(`"${playlist.name}" removed from My Playlists`);
        return;
      }

      const saveRes = await fetch(
        `/api/curated-playlists/${encodeURIComponent(String(playlist.id))}/save`,
        { method: "POST" },
      );
      const savedPlaylistData = await saveRes.json().catch(() => null);

      if (!saveRes.ok || !savedPlaylistData?.id) {
        throw new Error(
          savedPlaylistData?.error || "Failed to save playlist",
        );
      }

      setPlaylists((current) => {
        const alreadySaved = current.some(
          (item) =>
            item.source_type === "curated" &&
            Number(item.source_playlist_id) === playlist.id,
        );

        return alreadySaved ? current : [...current, savedPlaylistData];
      });

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
