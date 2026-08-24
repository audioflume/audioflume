"use client";

import DropdownShell from "@/components/DropdownShell";
import Toast from "@/components/Toast";
import MoreIcon from "@/components/icons/MoreIcon";
import { usePlayer } from "@/context/PlayerContext";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type CuratedPlaylistSummary = {
  id: number | string;
  name: string;
  cover_image_url?: string | null;
};

async function addCuratedPlaylistToMyPlaylists(
  curatedPlaylistId: string,
): Promise<string> {
  const playlistRes = await fetch(
    `/api/curated-playlists/${encodeURIComponent(curatedPlaylistId)}`,
  );
  const playlistData = await playlistRes.json().catch(() => null);

  if (!playlistRes.ok || !playlistData) {
    throw new Error(playlistData?.error || "Failed to load playlist");
  }

  const playlist = playlistData as CuratedPlaylistSummary;
  const createRes = await fetch("/api/playlists", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: playlist.name,
      cover_image_url: playlist.cover_image_url ?? null,
      position: 0,
    }),
  });

  if (!createRes.ok) {
    const errorData = await createRes.json().catch(() => null);
    throw new Error(errorData?.error || "Failed to create playlist");
  }

  const newPlaylist = await createRes.json();
  const songsRes = await fetch(
    `/api/curated-playlists/${encodeURIComponent(curatedPlaylistId)}/songs`,
  );

  if (!songsRes.ok) return playlist.name;

  const songs = await songsRes.json();
  if (!Array.isArray(songs) || songs.length === 0) return playlist.name;

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

  return playlist.name;
}

export default function CuratedPlaylistDetailMoreMenu() {
  const pathname = usePathname();
  const { currentSong } = usePlayer();
  const playlistIdMatch = pathname.match(/^\/curated-playlists\/([^/]+)$/);
  const playlistId = playlistIdMatch?.[1] ?? null;
  const isCuratedPlaylistDetail = playlistId !== null;

  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isCuratedPlaylistDetail) {
      setTarget(null);
      return;
    }

    const updateTarget = () => {
      const nextTarget = document.querySelector<HTMLElement>(
        ".playlist-detail-page .playlist-detail-card-inner",
      );
      setTarget((currentTarget) =>
        currentTarget === nextTarget ? currentTarget : nextTarget,
      );
    };

    updateTarget();
    const observer = new MutationObserver(updateTarget);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [isCuratedPlaylistDetail]);

  useEffect(() => {
    setMenuOpen(false);
    setSaving(false);
    setToastMessage(null);
  }, [playlistId]);

  async function handleAddToMyPlaylists() {
    if (!playlistId || saving) return;

    setMenuOpen(false);
    setSaving(true);

    try {
      const playlistName = await addCuratedPlaylistToMyPlaylists(playlistId);
      setToastMessage(`"${playlistName}" added to My Playlists`);
    } catch (error) {
      setToastMessage(
        error instanceof Error ? error.message : "Failed to add playlist",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!isCuratedPlaylistDetail || !target) return null;

  return createPortal(
    <>
      <div className="playlist-detail-card-corner-actions">
        <DropdownShell
          open={menuOpen}
          onOpenChange={setMenuOpen}
          placement="bottom-end"
          className="playlist-detail-more-dropdown"
          offsetAmount={8}
          collisionPadding={{ top: 72, right: 16, bottom: 88, left: 16 }}
          trigger={({ open }) => (
            <button
              type="button"
              className={`playlist-detail-corner-button${open ? " is-active" : ""}`}
              aria-label="More curated playlist actions"
              aria-expanded={open}
              title="More"
              disabled={saving}
            >
              <MoreIcon />
            </button>
          )}
        >
          <button
            type="button"
            role="menuitem"
            disabled={saving}
            onClick={() => void handleAddToMyPlaylists()}
          >
            {saving ? "Adding…" : "Add to My Playlists"}
          </button>
        </DropdownShell>
      </div>

      <Toast
        message={toastMessage}
        bottomOffset={currentSong ? "88px" : "24px"}
      />
    </>,
    target,
  );
}
