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

function syncCuratedPlaylistBanner(target: HTMLElement | null) {
  const hero = target?.querySelector<HTMLElement>(".playlist-detail-hero");
  const cover = hero?.querySelector<HTMLElement>(".playlist-detail-cover");
  const image = cover?.querySelector<HTMLImageElement>("img");

  if (!hero) return;

  const imageUrl = image?.currentSrc || image?.src;
  if (imageUrl) {
    const escapedUrl = imageUrl.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    hero.style.setProperty(
      "--playlist-detail-banner-image",
      `url("${escapedUrl}")`,
    );
    return;
  }

  const coverBackground = cover
    ? window.getComputedStyle(cover).backgroundImage
    : "none";
  hero.style.setProperty(
    "--playlist-detail-banner-image",
    coverBackground && coverBackground !== "none"
      ? coverBackground
      : "linear-gradient(135deg, #372f4f 0%, #111111 48%, #75649a 100%)",
  );
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
        ".playlist-detail-page .playlist-detail-shell",
      );
      syncCuratedPlaylistBanner(nextTarget);
      setTarget((currentTarget) =>
        currentTarget === nextTarget ? currentTarget : nextTarget,
      );
    };

    updateTarget();
    const observer = new MutationObserver(updateTarget);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src"],
    });

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
      <style>{`
        body .playlist-detail-page .playlist-detail-shell {
          grid-template-columns: 82px minmax(0, 1fr) 42px !important;
          column-gap: 18px !important;
          padding-top: 0 !important;
        }

        .playlist-detail-page .playlist-detail-more-menu {
          grid-column: 3 !important;
          grid-row: 1 !important;
          justify-self: end;
        }

        .playlist-detail-page .playlist-detail-more-button {
          box-sizing: border-box;
          display: inline-flex;
          width: 42px;
          min-width: 42px;
          height: 42px;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border);
          border-radius: 0;
          background: var(--bg-secondary);
          padding: 0;
          color: var(--text-secondary);
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
        }

        .playlist-detail-page .playlist-detail-more-button:hover,
        .playlist-detail-page .playlist-detail-more-button.is-active {
          border-color: var(--border-hover);
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .playlist-detail-page .playlist-detail-more-button:disabled {
          cursor: default;
          opacity: 0.42;
        }

        .playlist-detail-page .playlist-detail-more-button svg {
          display: block;
          width: 16px;
          height: 16px;
        }

        .playlist-detail-more-dropdown {
          min-width: 154px;
        }

        body .playlist-detail-page .playlist-detail-hero {
          isolation: isolate;
          box-sizing: border-box !important;
          grid-row: 1 / span 2 !important;
          z-index: 0;
          width: calc(
            100% + var(--playlist-detail-control-inset-left) +
              var(--playlist-detail-control-inset-right)
          ) !important;
          min-height: var(--playlist-detail-featured-hero-height) !important;
          margin-top: 0 !important;
          margin-right: calc(0px - var(--playlist-detail-control-inset-right)) !important;
          margin-left: calc(0px - var(--playlist-detail-control-inset-left)) !important;
          overflow: hidden !important;
          background-color: #0b0d0d !important;
          color: #fff !important;
          padding: clamp(96px, 12vh, 132px) var(--playlist-detail-page-gutter) clamp(58px, 7vh, 86px) !important;
        }

        body .playlist-detail-page .playlist-detail-hero::before,
        body .playlist-detail-page .playlist-detail-hero::after {
          content: "";
          position: absolute;
          pointer-events: none;
        }

        body .playlist-detail-page .playlist-detail-hero::before {
          inset: -14px;
          z-index: 0;
          background-image: var(--playlist-detail-banner-image);
          background-position: center;
          background-repeat: no-repeat;
          background-size: cover;
          filter: blur(10px);
          transform: scale(1.04);
        }

        body .playlist-detail-page .playlist-detail-hero::after {
          inset: 0;
          z-index: 1;
          background:
            linear-gradient(
              180deg,
              rgba(0, 0, 0, 0.4) 0%,
              rgba(0, 0, 0, 0.08) 30%,
              rgba(0, 0, 0, 0.56) 100%
            ),
            linear-gradient(
              90deg,
              rgba(0, 0, 0, 0.54) 0%,
              rgba(0, 0, 0, 0.12) 72%
            );
        }

        body .playlist-detail-page .playlist-detail-cover,
        body .playlist-detail-page .playlist-detail-hero > .min-w-0 {
          z-index: 2 !important;
        }

        body .playlist-detail-page .playlist-detail-cover {
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.28);
        }

        body .playlist-detail-page .playlist-detail-title {
          color: #fff !important;
        }

        body .playlist-detail-page .playlist-detail-meta {
          color: rgba(255, 255, 255, 0.76) !important;
        }

        body .playlist-detail-page .playlist-detail-dot {
          color: rgba(255, 255, 255, 0.46) !important;
        }

        body .playlist-detail-page .playlist-detail-actions > button:first-child {
          border-color: #fff !important;
          background: #fff !important;
          color: #111 !important;
        }

        body .playlist-detail-page .playlist-detail-actions > button:first-child:hover {
          border-color: rgba(255, 255, 255, 0.88) !important;
          background: rgba(255, 255, 255, 0.88) !important;
        }

        body .playlist-detail-page .playlist-detail-actions > button:nth-child(2) {
          border: 1px solid rgba(255, 255, 255, 0.34) !important;
          background: rgba(255, 255, 255, 0.08) !important;
          color: #fff !important;
        }

        body .playlist-detail-page .playlist-detail-actions > button:nth-child(2):hover {
          border-color: rgba(255, 255, 255, 0.48) !important;
          background: rgba(255, 255, 255, 0.16) !important;
        }

        .playlist-detail-page .playlist-detail-browser-back,
        .playlist-detail-page .playlist-detail-search-sticky,
        .playlist-detail-page .playlist-detail-more-menu {
          position: relative !important;
          z-index: 4 !important;
          margin-top: 22px !important;
        }

        .playlist-detail-page .playlist-detail-browser-back,
        .playlist-detail-page .playlist-detail-more-button {
          border-color: rgba(255, 255, 255, 0.34) !important;
          background: rgba(0, 0, 0, 0.18) !important;
          color: #fff !important;
          backdrop-filter: blur(12px);
        }

        .playlist-detail-page .playlist-detail-browser-back:hover,
        .playlist-detail-page .playlist-detail-more-button:hover,
        .playlist-detail-page .playlist-detail-more-button.is-active {
          border-color: rgba(255, 255, 255, 0.52) !important;
          background: rgba(255, 255, 255, 0.14) !important;
          color: #fff !important;
        }

        .playlist-detail-page .playlist-detail-search-row {
          border-color: rgba(255, 255, 255, 0.34) !important;
          background: rgba(0, 0, 0, 0.18) !important;
          color: rgba(255, 255, 255, 0.72) !important;
          backdrop-filter: blur(12px);
        }

        .playlist-detail-page .playlist-detail-search-input {
          color: #fff !important;
        }

        .playlist-detail-page .playlist-detail-search-input::placeholder {
          color: rgba(255, 255, 255, 0.62) !important;
        }

        @media (max-width: 720px) {
          body .playlist-detail-page .playlist-detail-hero {
            padding-right: var(--playlist-detail-page-gutter) !important;
            padding-left: var(--playlist-detail-page-gutter) !important;
          }
        }

        @media (max-width: 560px) {
          body .playlist-detail-page .playlist-detail-hero {
            min-height: auto !important;
            padding-top: 112px !important;
            padding-bottom: 56px !important;
          }
        }
      `}</style>

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
