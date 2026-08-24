"use client";

import DropdownShell from "@/components/DropdownShell";
import HeartIcon from "@/components/icons/HeartIcon";
import MoreIcon from "@/components/icons/MoreIcon";
import Toast from "@/components/Toast";
import { usePlayer } from "@/context/PlayerContext";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

function parseFavoriteIds(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((playlistId) => Number(playlistId))
    .filter((playlistId) => Number.isInteger(playlistId) && playlistId > 0);
}

export default function CommunityPlaylistDetailChrome() {
  const pathname = usePathname();
  const { currentSong } = usePlayer();
  const playlistIdMatch = pathname.match(/^\/community-playlists\/([^/]+)$/);
  const playlistId = Number(playlistIdMatch?.[1]);
  const isCommunityPlaylistDetail =
    playlistIdMatch !== null && Number.isInteger(playlistId) && playlistId > 0;

  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [favoritePending, setFavoritePending] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isCommunityPlaylistDetail) {
      setTarget(null);
      return;
    }

    const updateTarget = () => {
      const nextTarget = document.querySelector<HTMLElement>(
        ".community-detail-page .playlist-detail-card-inner",
      );
      setTarget((currentTarget) =>
        currentTarget === nextTarget ? currentTarget : nextTarget,
      );
    };

    updateTarget();
    const observer = new MutationObserver(updateTarget);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [isCommunityPlaylistDetail]);

  useEffect(() => {
    if (!isCommunityPlaylistDetail) return;
    let cancelled = false;

    async function loadFavoriteState() {
      try {
        const response = await fetch("/api/community-playlist-favorites", {
          cache: "no-store",
        });
        if (!response.ok) return;

        const data = await response.json();
        if (!cancelled) {
          setFavorite(
            parseFavoriteIds(data?.favorite_playlist_ids).includes(playlistId),
          );
        }
      } catch {
        // The playlist remains usable when favorite state is unavailable.
      }
    }

    void loadFavoriteState();
    return () => {
      cancelled = true;
    };
  }, [isCommunityPlaylistDetail, playlistId]);

  useEffect(() => {
    setMenuOpen(false);
    setToastMessage(null);
  }, [playlistId]);

  async function toggleFavorite() {
    if (!isCommunityPlaylistDetail || favoritePending) return;

    const wasFavorite = favorite;
    setFavoritePending(true);
    setFavorite(!wasFavorite);

    try {
      const response = await fetch("/api/community-playlist-favorites", {
        method: wasFavorite ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlist_id: playlistId }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Could not update favorite playlist");
      }
    } catch (error) {
      setFavorite(wasFavorite);
      setToastMessage(
        error instanceof Error
          ? error.message
          : "Could not update favorite playlist",
      );
    } finally {
      setFavoritePending(false);
    }
  }

  async function copyPlaylistLink() {
    setMenuOpen(false);

    try {
      await navigator.clipboard.writeText(window.location.href);
      setToastMessage("Playlist link copied");
    } catch {
      setToastMessage("Could not copy playlist link");
    }
  }

  if (!isCommunityPlaylistDetail || !target) return null;

  return createPortal(
    <>
      <div className="playlist-detail-card-corner-actions">
        <button
          type="button"
          className={`playlist-detail-corner-button${favorite ? " is-active" : ""}`}
          onClick={() => void toggleFavorite()}
          disabled={favoritePending}
          aria-label={favorite ? "Remove playlist from favorites" : "Add playlist to favorites"}
          aria-pressed={favorite}
        >
          <HeartIcon size={15} filled={favorite} />
        </button>

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
              aria-label="More community playlist actions"
              aria-expanded={open}
              title="More"
            >
              <MoreIcon />
            </button>
          )}
        >
          <button type="button" role="menuitem" onClick={() => void copyPlaylistLink()}>
            Copy Playlist Link
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
