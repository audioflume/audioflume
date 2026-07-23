"use client";

import DropdownShell from "@/components/DropdownShell";
import HeartIcon from "@/components/icons/HeartIcon";
import MoreIcon from "@/components/icons/MoreIcon";
import Toast from "@/components/Toast";
import { usePlayer } from "@/context/PlayerContext";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

function BackIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M15 5L8 12L15 19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function parseFavoriteIds(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((playlistId) => Number(playlistId))
    .filter((playlistId) => Number.isInteger(playlistId) && playlistId > 0);
}

export default function CommunityPlaylistDetailChrome() {
  const pathname = usePathname();
  const router = useRouter();
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
        ".community-detail-page .community-detail-shell",
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
      <style>{`
        body:has(.community-detail-page) {
          --playlist-detail-page-gutter: clamp(28px, 5.2vw, 82px);
          --playlist-detail-control-inset-left: var(--fw-music-content-inset-left, 28px);
          --playlist-detail-control-inset-right: var(--fw-music-content-inset-right, 20px);
          --playlist-detail-featured-card-gap: clamp(10px, 1.25vw, 18px);
          --playlist-detail-featured-hero-height: clamp(500px, 69vh, 760px);
          --playlist-detail-featured-padding-top: calc(
            var(--filmwave-header-height, 75px) + 86px
          );
          --playlist-detail-featured-padding-bottom: 76px;
          --playlist-detail-featured-cover-size: calc(
            (
                100vw - var(--playlist-detail-page-gutter) -
                  var(--playlist-detail-page-gutter) -
                  var(--playlist-detail-featured-card-gap) -
                  var(--playlist-detail-featured-card-gap) -
                  var(--playlist-detail-featured-card-gap) -
                  var(--playlist-detail-featured-card-gap)
              ) /
              5
          );
          --playlist-detail-featured-content-top: calc(
            var(--playlist-detail-featured-padding-top) +
              (
                  var(--playlist-detail-featured-hero-height) -
                    var(--playlist-detail-featured-padding-top) -
                    var(--playlist-detail-featured-padding-bottom) -
                    var(--playlist-detail-featured-cover-size)
                ) /
                2
          );
          --playlist-detail-featured-flow-top: 162px;
          --playlist-detail-featured-offset: max(
            0px,
            calc(
              var(--playlist-detail-featured-content-top) -
                var(--playlist-detail-featured-flow-top)
            )
          );
        }

        .community-detail-page {
          overflow-y: visible !important;
        }

        .community-detail-page .community-detail-shell {
          display: grid !important;
          grid-template-columns: 82px minmax(0, 1fr) 42px 42px !important;
          column-gap: 18px !important;
          align-items: center !important;
          padding-top: 22px !important;
          padding-right: var(--playlist-detail-control-inset-right) !important;
          padding-left: var(--playlist-detail-control-inset-left) !important;
        }

        .community-detail-page .community-detail-top-actions {
          display: contents !important;
        }

        .community-detail-page .community-detail-top-actions > button {
          display: none !important;
        }

        .community-detail-page .community-detail-browser-back {
          display: inline-flex;
          box-sizing: border-box;
          grid-column: 1;
          grid-row: 1;
          width: 82px;
          min-width: 82px;
          height: 42px;
          cursor: pointer;
          align-items: center;
          justify-content: center;
          justify-self: start;
          gap: 8px;
          border: 1px solid var(--border);
          border-radius: 0;
          background: var(--bg-secondary);
          margin: 0;
          padding: 0 14px;
          color: var(--text-secondary);
          font-family: inherit;
          font-size: 12px;
          font-weight: 400;
          line-height: 1;
          transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
        }

        .community-detail-page .community-detail-browser-back:hover,
        .community-detail-page .community-detail-browser-back:focus-visible {
          border-color: var(--border-hover);
          background: var(--bg-hover);
          color: var(--text-primary);
          outline: none;
        }

        .community-detail-page .community-detail-browser-back svg {
          width: 14px;
          height: 14px;
        }

        .community-detail-page .community-detail-search-sticky {
          position: static !important;
          top: auto !important;
          z-index: auto !important;
          grid-column: 2;
          grid-row: 1;
          box-sizing: border-box;
          width: min(640px, 100%);
          justify-self: end;
          margin: 0 !important;
          background: transparent !important;
        }

        .community-detail-page .community-detail-search-row {
          display: flex;
          width: 100%;
          height: 42px;
          min-height: 42px;
          align-items: center;
          gap: 12px;
          border: 1px solid color-mix(in srgb, var(--filmwave-header-border-color) 50%, transparent);
          border-radius: 0;
          background: var(--bg-primary);
          padding: 0 14px;
          color: var(--text-muted);
          box-shadow: none;
        }

        .community-detail-page .community-detail-search-inner {
          display: flex;
          width: auto;
          min-width: 0;
          flex: 1 1 auto;
          align-items: center;
          gap: 12px;
          padding: 0;
        }

        .community-detail-page .community-detail-search-input {
          min-width: 0;
          flex: 1 1 auto;
          border: 0;
          outline: 0;
          background: transparent;
          color: var(--text-primary);
          font-family: inherit;
          font-size: 12px;
          font-style: italic;
          font-weight: 400;
        }

        .community-detail-page .community-detail-search-input::placeholder {
          color: var(--text-muted);
        }

        .community-detail-page .community-detail-favorite-button,
        .community-detail-page .community-detail-more-button {
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

        .community-detail-page .community-detail-favorite-button {
          grid-column: 3;
          grid-row: 1;
        }

        .community-detail-page .community-detail-more-menu {
          grid-column: 4;
          grid-row: 1;
          justify-self: end;
        }

        .community-detail-page .community-detail-favorite-button:hover,
        .community-detail-page .community-detail-favorite-button:focus-visible,
        .community-detail-page .community-detail-favorite-button.is-active,
        .community-detail-page .community-detail-more-button:hover,
        .community-detail-page .community-detail-more-button:focus-visible,
        .community-detail-page .community-detail-more-button.is-active {
          border-color: var(--border-hover);
          background: var(--bg-hover);
          color: var(--text-primary);
          outline: none;
        }

        .community-detail-page .community-detail-favorite-button:disabled {
          cursor: default;
          opacity: 0.58;
        }

        .community-detail-page .community-detail-favorite-button svg,
        .community-detail-page .community-detail-more-button svg {
          display: block;
          width: 16px;
          height: 16px;
        }

        .community-detail-more-dropdown {
          min-width: 154px;
        }

        .community-detail-page .community-detail-hero,
        .community-detail-page .community-detail-quick-row,
        .community-detail-page .community-detail-section,
        .community-detail-page .community-detail-shell > .community-detail-empty,
        .community-detail-page .community-detail-shell > div:has(> footer) {
          grid-column: 1 / -1;
        }

        .community-detail-page .community-detail-hero,
        .community-detail-page .community-detail-shell > .community-detail-empty {
          grid-row: 2;
        }

        .community-detail-page .community-detail-hero,
        .community-detail-page .community-detail-quick-row,
        .community-detail-page .community-detail-section,
        .community-detail-page .community-detail-shell > .community-detail-empty {
          margin-left: calc(
            var(--playlist-detail-page-gutter) -
              var(--playlist-detail-control-inset-left)
          ) !important;
          margin-right: calc(
            var(--playlist-detail-page-gutter) -
              var(--playlist-detail-control-inset-right)
          ) !important;
        }

        .community-detail-page .community-detail-hero {
          position: relative;
          display: flex !important;
          min-height: 0;
          align-items: center !important;
          gap: clamp(24px, 2.8vw, 46px) !important;
          margin-top: 0;
          overflow: visible;
          background: transparent;
          color: var(--text-primary);
          padding:
            var(--playlist-detail-featured-offset)
            0
            30px !important;
        }

        .community-detail-page .community-detail-cover {
          position: relative;
          z-index: 1;
          display: block !important;
          width: var(--playlist-detail-featured-cover-size) !important;
          height: var(--playlist-detail-featured-cover-size) !important;
          min-height: 0 !important;
          flex: 0 0 var(--playlist-detail-featured-cover-size);
          overflow: hidden;
          border-radius: 0 !important;
          background: var(--bg-secondary);
        }

        .community-detail-page .community-detail-hero > .min-w-0 {
          position: relative;
          z-index: 1;
          display: flex;
          min-width: 0;
          max-width: 520px;
          flex: 1 1 auto;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
          transform: translateY(-4px);
        }

        .community-detail-page .community-detail-kicker {
          display: none !important;
        }

        .community-detail-page .community-detail-title {
          max-width: 480px !important;
          margin: 0 !important;
          color: var(--text-primary) !important;
          font-family: var(--font-aktiv-grotesk), sans-serif !important;
          font-size: clamp(22px, 2vw, 32px) !important;
          font-weight: 400 !important;
          letter-spacing: -0.055em !important;
          line-height: 0.98 !important;
        }

        .community-detail-page .community-detail-meta {
          margin-top: 16px !important;
          gap: 8px !important;
          color: var(--text-secondary) !important;
          font-size: 11.5px !important;
          font-weight: 400;
          line-height: 1.4;
        }

        .community-detail-page .community-detail-creator {
          gap: 7px;
        }

        .community-detail-page .community-detail-creator img,
        .community-detail-page .community-detail-creator-placeholder {
          width: 22px;
          height: 22px;
          flex: 0 0 22px;
        }

        .community-detail-page .community-detail-dot {
          color: var(--text-muted) !important;
        }

        .community-detail-page .community-detail-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 24px !important;
        }

        .community-detail-page .community-detail-actions > button {
          display: inline-flex !important;
          height: 36px !important;
          min-width: 170px;
          align-items: center !important;
          justify-content: center !important;
          gap: 8px !important;
          border-radius: 0 !important;
          padding: 0 20px !important;
          font-family: inherit;
          font-size: 11px !important;
          font-weight: 500 !important;
          line-height: 1 !important;
        }

        .community-detail-page .community-detail-skeleton-button {
          border-radius: 0 !important;
        }

        .community-detail-page .community-detail-quick-row,
        .community-detail-page .community-detail-section {
          padding-right: 0 !important;
          padding-left: 0 !important;
        }

        .community-detail-page .community-detail-section > div {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .community-detail-page .community-detail-section .filmwave-song-card {
          --filmwave-song-card-padding-y: 12px !important;
          --filmwave-song-card-padding-left: 12px !important;
          --filmwave-song-card-padding-right: 16px !important;
          --filmwave-song-card-hover-bg: var(--bg-hover);
          border-bottom: 0 !important;
          border-radius: 0 !important;
          padding: 12px 16px 12px 12px !important;
        }

        .community-detail-page .community-detail-shell > div:has(> footer) {
          margin-left: calc(
            32px - var(--playlist-detail-control-inset-left)
          ) !important;
          margin-right: calc(
            32px - var(--playlist-detail-control-inset-right)
          ) !important;
          padding-top: 64px !important;
        }

        @media (max-width: 1280px) {
          body:has(.community-detail-page) {
            --playlist-detail-featured-cover-size: calc(
              (
                  100vw - var(--playlist-detail-page-gutter) -
                    var(--playlist-detail-page-gutter) -
                    var(--playlist-detail-featured-card-gap) -
                    var(--playlist-detail-featured-card-gap) -
                    var(--playlist-detail-featured-card-gap)
                ) /
                4
            );
          }
        }

        @media (max-width: 1080px) {
          .community-detail-page .community-detail-hero {
            gap: 24px !important;
          }
        }

        @media (max-width: 980px) {
          body:has(.community-detail-page) {
            --playlist-detail-featured-cover-size: calc(
              (
                  100vw - var(--playlist-detail-page-gutter) -
                    var(--playlist-detail-page-gutter) -
                    var(--playlist-detail-featured-card-gap) -
                    var(--playlist-detail-featured-card-gap)
                ) /
                3
            );
            --playlist-detail-featured-hero-height: 590px;
          }
        }

        @media (max-width: 760px) {
          body:has(.community-detail-page) {
            --playlist-detail-featured-flow-top: 174px;
          }

          .community-detail-page .community-detail-actions {
            flex-wrap: wrap;
          }
        }

        @media (max-width: 720px) {
          body:has(.community-detail-page) {
            --playlist-detail-page-gutter: 20px;
            --playlist-detail-control-inset-left: 20px;
            --playlist-detail-control-inset-right: 20px;
            --playlist-detail-featured-cover-size: calc(
              (
                  100vw - var(--playlist-detail-page-gutter) -
                    var(--playlist-detail-page-gutter) -
                    var(--playlist-detail-featured-card-gap)
                ) /
                2
            );
            --playlist-detail-featured-padding-top: calc(
              var(--filmwave-header-height, 75px) + 78px
            );
            --playlist-detail-featured-padding-bottom: 64px;
          }

          .community-detail-page .community-detail-shell {
            grid-template-columns: 82px minmax(0, 1fr) 42px 42px !important;
          }

          .community-detail-page .community-detail-title {
            font-size: 26px !important;
          }

          .community-detail-page .community-detail-actions > button {
            min-width: 160px;
          }

          .community-detail-page .community-detail-shell > div:has(> footer) {
            margin-left: 12px !important;
            margin-right: 12px !important;
          }
        }

        @media (max-width: 640px) {
          .community-detail-page .community-detail-shell {
            grid-template-columns: 82px minmax(0, 1fr) 42px !important;
          }

          .community-detail-page .community-detail-favorite-button {
            grid-column: 3;
          }

          .community-detail-page .community-detail-more-menu {
            display: none;
          }

          .community-detail-page .community-detail-actions {
            width: 100%;
          }

          .community-detail-page .community-detail-actions > button {
            min-width: 0;
            flex: 1 1 0;
          }
        }

        @media (max-width: 560px) {
          body:has(.community-detail-page) {
            --playlist-detail-featured-padding-top: calc(
              var(--filmwave-header-height, 75px) + 86px
            );
            --playlist-detail-featured-content-top:
              var(--playlist-detail-featured-padding-top);
          }

          .community-detail-page .community-detail-shell {
            grid-template-columns: 82px minmax(0, 1fr) 42px !important;
            column-gap: 10px !important;
          }

          .community-detail-page .community-detail-search-sticky {
            min-width: 0;
          }

          .community-detail-page .community-detail-hero {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 22px !important;
          }

          .community-detail-page .community-detail-hero > .min-w-0 {
            width: 100%;
            max-width: none;
            transform: none;
          }
        }
      `}</style>

      <button
        type="button"
        className="community-detail-browser-back"
        onClick={() => router.back()}
        aria-label="Go back to the previous page"
      >
        <BackIcon />
        <span>Back</span>
      </button>

      <button
        type="button"
        className={`community-detail-favorite-button${favorite ? " is-active" : ""}`}
        aria-label={favorite ? "Remove playlist from favorites" : "Add playlist to favorites"}
        aria-pressed={favorite}
        disabled={favoritePending}
        onClick={() => void toggleFavorite()}
      >
        <HeartIcon filled={favorite} size={16} />
      </button>

      <div className="community-detail-more-menu">
        <DropdownShell
          open={menuOpen}
          onOpenChange={setMenuOpen}
          placement="bottom-end"
          className="community-detail-more-dropdown"
          offsetAmount={8}
          collisionPadding={{ top: 72, right: 16, bottom: 88, left: 16 }}
          trigger={({ open }) => (
            <button
              type="button"
              className={`community-detail-more-button${open ? " is-active" : ""}`}
              aria-label="More playlist actions"
              aria-expanded={open}
              title="More"
            >
              <MoreIcon />
            </button>
          )}
        >
          <button type="button" role="menuitem" onClick={() => void copyPlaylistLink()}>
            Copy Link
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
