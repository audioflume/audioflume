"use client";

import DropdownShell from "@/components/DropdownShell";
import HeartIcon from "@/components/icons/HeartIcon";
import MoreIcon from "@/components/icons/MoreIcon";
import Toast from "@/components/Toast";
import { usePlayer } from "@/context/PlayerContext";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import artistDrawerStyles from "@/components/artists/PublicArtistCollectionDrawer.module.css";

type CommunityPlaylistSavePayload = {
  playlist?: {
    name?: string;
    cover_image_url?: string | null;
  };
  songs?: Array<{
    id?: string;
    song_id?: string;
  }>;
  error?: string;
};

function ShareGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="14.5" cy="4.5" r="2.25" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="5.5" cy="10" r="2.25" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="14.5" cy="15.5" r="2.25" stroke="currentColor" strokeWidth="1.4" />
      <path d="m7.5 8.9 5-3.1M7.5 11.1l5 3.1" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function parseFavoriteIds(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((playlistId) => Number(playlistId))
    .filter((playlistId) => Number.isInteger(playlistId) && playlistId > 0);
}

async function saveCommunityPlaylistToMyPlaylists(playlistId: number) {
  const sourceResponse = await fetch(`/api/community-playlists/${playlistId}`, {
    cache: "no-store",
  });
  const sourceData = (await sourceResponse.json().catch(() => null)) as
    | CommunityPlaylistSavePayload
    | null;

  if (!sourceResponse.ok || !sourceData?.playlist) {
    throw new Error(sourceData?.error || "Could not load community playlist");
  }

  const playlistName = sourceData.playlist.name?.trim() || "Community Playlist";
  const createResponse = await fetch("/api/playlists", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: playlistName,
      cover_image_url: sourceData.playlist.cover_image_url ?? null,
      position: 0,
    }),
  });
  const createdPlaylist = await createResponse.json().catch(() => null);

  if (!createResponse.ok || !createdPlaylist?.id) {
    throw new Error(createdPlaylist?.error || "Could not save playlist");
  }

  const songs = Array.isArray(sourceData.songs) ? sourceData.songs : [];
  for (let index = 0; index < songs.length; index += 1) {
    const songId = songs[index]?.song_id ?? songs[index]?.id;
    if (!songId) continue;

    try {
      await fetch(`/api/playlists/${createdPlaylist.id}/songs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ song_id: songId, position: index }),
      });
    } catch {
      // Keep the saved playlist even if one song cannot be copied.
    }
  }

  return playlistName;
}

export default function CommunityPlaylistDetailChrome() {
  const pathname = usePathname();
  const { currentSong } = usePlayer();
  const playlistIdMatch = pathname.match(/^\/community-playlists\/([^/]+)$/);
  const playlistId = Number(playlistIdMatch?.[1]);
  const isCommunityPlaylistDetail =
    playlistIdMatch !== null && Number.isInteger(playlistId) && playlistId > 0;

  const [actionsTarget, setActionsTarget] = useState<HTMLElement | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [favoritePending, setFavoritePending] = useState(false);
  const [savingToPlaylists, setSavingToPlaylists] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isCommunityPlaylistDetail) {
      setActionsTarget(null);
      return;
    }

    const updateTargets = () => {
      const nextActionsTarget = document.querySelector<HTMLElement>(
        ".community-detail-page .playlist-detail-actions",
      );

      setActionsTarget((currentTarget) =>
        currentTarget === nextActionsTarget ? currentTarget : nextActionsTarget,
      );
    };

    updateTargets();
    const observer = new MutationObserver(updateTargets);
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
    setSavingToPlaylists(false);
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

  async function sharePlaylist() {
    const url = window.location.href;
    const title =
      document
        .querySelector<HTMLElement>(".community-detail-page .playlist-detail-title")
        ?.textContent?.trim() || "Playlist";

    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard?.writeText(url);
    } catch {
      // Sharing was cancelled or unavailable.
    }
  }

  async function saveToPlaylists() {
    if (!isCommunityPlaylistDetail || savingToPlaylists) return;

    setMenuOpen(false);
    setSavingToPlaylists(true);
    try {
      const playlistName = await saveCommunityPlaylistToMyPlaylists(playlistId);
      setToastMessage(`"${playlistName}" added to My Playlists`);
    } catch (error) {
      setToastMessage(
        error instanceof Error ? error.message : "Could not save playlist",
      );
    } finally {
      setSavingToPlaylists(false);
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

  if (!isCommunityPlaylistDetail) return null;

  const inlineActions = actionsTarget
    ? createPortal(
        <>
          <button
            type="button"
            className={artistDrawerStyles.roundAction}
            onClick={() => void toggleFavorite()}
            disabled={favoritePending}
            aria-label={
              favorite ? "Remove playlist from favorites" : "Add playlist to favorites"
            }
            aria-pressed={favorite}
          >
            <HeartIcon size={15} filled={favorite} />
          </button>

          <button
            type="button"
            className={artistDrawerStyles.roundAction}
            onClick={() => void sharePlaylist()}
            aria-label="Share community playlist"
          >
            <ShareGlyph />
          </button>

          <div className="playlist-detail-more-menu">
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
                  className={`playlist-detail-more-button${open ? " is-active" : ""}`}
                  aria-label="More community playlist actions"
                  aria-expanded={open}
                  title="More"
                >
                  <MoreIcon />
                </button>
              )}
            >
              <button
                type="button"
                role="menuitem"
                disabled={savingToPlaylists}
                onClick={() => void saveToPlaylists()}
              >
                {savingToPlaylists ? "Saving…" : "Save to Playlists"}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => void copyPlaylistLink()}
              >
                Copy Link
              </button>
            </DropdownShell>
          </div>
        </>,
        actionsTarget,
      )
    : null;

  return (
    <>
      {inlineActions}
      <Toast
        message={toastMessage}
        bottomOffset={currentSong ? "88px" : "24px"}
      />
    </>
  );
}
