"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ArrowUpRightIcon from "@/components/icons/ArrowUpRightIcon";
import ChevronLeftIcon from "@/components/icons/ChevronLeftIcon";
import ChevronRightIcon from "@/components/icons/ChevronRightIcon";
import MoreIcon from "@/components/icons/MoreIcon";
import DropdownShell from "@/components/DropdownShell";
import Toast from "@/components/Toast";
import type { CuratedPlaylist } from "@/lib/curatedPlaylists";
import { usePlayer } from "@/context/PlayerContext";

export type CuratedPlaylistCardItem = Pick<
  CuratedPlaylist,
  "id" | "name" | "kicker" | "cover_image_url" | "song_count"
> & {
  href?: string;
};

type CuratedPlaylistShelfProps = {
  title: string;
  description?: string;
  playlists: CuratedPlaylistCardItem[];
  viewAllHref?: string;
  className?: string;
};

const FALLBACK_GRADIENTS = [
  "linear-gradient(135deg,#372f4f 0%,#111111 48%,#75649a 100%)",
  "linear-gradient(135deg,#1f3d3a 0%,#111111 52%,#4d8c7b 100%)",
  "linear-gradient(135deg,#4f3529 0%,#111111 50%,#b66c45 100%)",
  "linear-gradient(135deg,#25364f 0%,#111111 52%,#6287c4 100%)",
  "linear-gradient(135deg,#45233d 0%,#111111 52%,#b75d91 100%)",
];

function formatSongCount(count?: number) {
  const safeCount = Number(count || 0);
  return `${safeCount} track${safeCount === 1 ? "" : "s"}`;
}

async function addCuratedPlaylistToMyPlaylists(
  playlist: CuratedPlaylistCardItem,
): Promise<void> {
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
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to create playlist");
  }

  const newPlaylist = await createRes.json();
  const newPlaylistId = newPlaylist.id;

  const songsRes = await fetch(
    `/api/curated-playlists/${encodeURIComponent(String(playlist.id))}/songs`,
  );

  if (!songsRes.ok) return;

  const songs = await songsRes.json();

  if (!Array.isArray(songs) || songs.length === 0) return;

  for (let i = 0; i < songs.length; i++) {
    const song = songs[i];
    const songId = song.song_id ?? song.id;

    if (!songId) continue;

    try {
      await fetch(`/api/playlists/${newPlaylistId}/songs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ song_id: songId, position: i }),
      });
    } catch (err) {
      console.warn(`Error adding song ${songId}:`, err);
    }
  }
}

function CuratedPlaylistMenu({
  playlist,
  open,
  onOpenChange,
  onAdd,
  saving,
  playerVisible,
}: {
  playlist: CuratedPlaylistCardItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: () => void;
  saving: boolean;
  playerVisible: boolean;
}) {
  return (
    <div data-playlist-menu className="playlist-card-menu-wrap">
      <DropdownShell
        open={open}
        onOpenChange={onOpenChange}
        placement="bottom-start"
        strategy="fixed"
        usePortal
        offsetAmount={5}
        flippedOffsetAmount={5}
        crossAxisOffset={0}
        collisionPadding={{
          top: 68,
          right: 16,
          bottom: playerVisible ? 85 : 13,
          left: 16,
        }}
        trigger={({ open }) => (
          <button
            type="button"
            className={`playlist-menu-btn playlist-menu-btn-grid ${
              open ? "is-open" : ""
            }`}
            aria-label={`${playlist.name} options`}
            disabled={saving}
          >
            <MoreIcon />
          </button>
        )}
      >
        <button type="button" onClick={onAdd} disabled={saving}>
          {saving ? "Adding…" : "Add to My Playlists"}
        </button>
      </DropdownShell>
    </div>
  );
}

export function CuratedPlaylistCard({
  playlist,
  index,
  openMenuId,
  setOpenMenuId,
  onAddSuccess,
  onAddError,
  playerVisible,
}: {
  playlist: CuratedPlaylistCardItem;
  index: number;
  openMenuId: number | null;
  setOpenMenuId: (id: number | null) => void;
  onAddSuccess: (name: string) => void;
  onAddError: (msg: string) => void;
  playerVisible: boolean;
}) {
  const href = playlist.href || `/curated-playlists/${playlist.id}`;
  const isMenuOpen = openMenuId === playlist.id;
  const [saving, setSaving] = useState(false);
  const fallbackGradient =
    FALLBACK_GRADIENTS[index % FALLBACK_GRADIENTS.length];

  async function handleAddToMyPlaylists() {
    if (saving) return;

    setOpenMenuId(null);
    setSaving(true);

    try {
      await addCuratedPlaylistToMyPlaylists(playlist);
      onAddSuccess(playlist.name);
    } catch (err) {
      onAddError(err instanceof Error ? err.message : "Failed to add playlist");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="curated-playlist-card-shell">
      <div
        className={`playlist-gallery-card ${isMenuOpen ? "is-menu-open" : ""}`}
      >
        <Link href={href} className="playlist-gallery-link">
          <div className="playlist-gallery-art-wrap">
            <div
              className="playlist-gallery-art"
              style={{
                background: playlist.cover_image_url
                  ? "var(--media-overlay-solid)"
                  : fallbackGradient,
              }}
            >
              {playlist.cover_image_url && (
                <Image
                  src={playlist.cover_image_url}
                  alt={playlist.name}
                  fill
                  sizes="(min-width: 1280px) 320px, (min-width: 768px) 285px, 250px"
                  className="object-cover"
                  unoptimized
                />
              )}
            </div>

            <div className="playlist-gallery-top-row">
              <div className="playlist-gallery-arrow">
                <ArrowUpRightIcon />
              </div>
            </div>

            <div className="playlist-gallery-content">
              <div className="playlist-gallery-kicker">{playlist.kicker}</div>

              <h3>{playlist.name}</h3>

              <p>{formatSongCount(playlist.song_count)}</p>
            </div>
          </div>
        </Link>

        <CuratedPlaylistMenu
          playlist={playlist}
          open={isMenuOpen}
          onOpenChange={(nextOpen) => {
            setOpenMenuId(nextOpen ? playlist.id : null);
          }}
          onAdd={handleAddToMyPlaylists}
          saving={saving}
          playerVisible={playerVisible}
        />
      </div>
    </div>
  );
}

export default function CuratedPlaylistShelf({
  title,
  description,
  playlists,
  viewAllHref,
  className = "mt-12",
}: CuratedPlaylistShelfProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const { currentSong } = usePlayer();
  const playerVisible = !!currentSong;

  function showToast(msg: string) {
    setToastMessage(msg);
    window.setTimeout(() => setToastMessage(null), 2400);
  }

  function updateScrollState() {
    const scroller = scrollerRef.current;

    if (!scroller) return;

    const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;

    setCanScrollPrev(scroller.scrollLeft > 4);
    setCanScrollNext(scroller.scrollLeft < maxScrollLeft - 4);
  }

  function scrollPlaylists(direction: "prev" | "next") {
    const scroller = scrollerRef.current;

    if (!scroller) return;

    const amount = Math.max(scroller.clientWidth * 0.82, 320);

    scroller.scrollBy({
      left: direction === "next" ? amount : -amount,
      behavior: "smooth",
    });
  }

  useEffect(() => {
    const scroller = scrollerRef.current;

    if (!scroller) return;

    updateScrollState();

    scroller.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    return () => {
      scroller.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [playlists.length]);

  if (!playlists.length) return null;

  return (
    <>
      <style>{`
        .curated-playlist-card-shell {
          flex: 0 0 250px;
          min-width: 250px;
        }

        @media (min-width: 640px) {
          .curated-playlist-card-shell {
            flex-basis: 285px;
            min-width: 285px;
          }
        }

        @media (min-width: 1024px) {
          .curated-playlist-card-shell {
            flex-basis: 320px;
            min-width: 320px;
          }
        }

        .playlist-gallery-card {
          position: relative;
          min-width: 0;
          cursor: pointer;
        }

        .playlist-gallery-link {
          display: block;
          color: inherit;
          text-decoration: none;
        }

        .playlist-gallery-art-wrap {
          position: relative;
          min-height: 210px;
          border-radius: 18px;
          overflow: hidden;
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          transition: none;
        }

        .playlist-gallery-card:hover .playlist-gallery-art-wrap,
        .playlist-gallery-card.is-menu-open .playlist-gallery-art-wrap {
          border-color: var(--border);
        }

        .playlist-gallery-art {
          position: absolute;
          inset: 0;
        }

        .playlist-gallery-art::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0, 0, 0, 0.62), rgba(0, 0, 0, 0.18) 58%, transparent);
          pointer-events: none;
        }

        .playlist-gallery-art img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.7s ease;
        }

        .playlist-gallery-card:hover .playlist-gallery-art img,
        .playlist-gallery-card.is-menu-open .playlist-gallery-art img {
          transform: scale(1.025);
        }

        .playlist-gallery-top-row {
          position: relative;
          z-index: 4;
          display: flex;
          justify-content: flex-end;
          padding: 16px;
        }

        .playlist-gallery-arrow {
          display: flex;
          width: 32px;
          height: 32px;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.12);
          color: white;
          backdrop-filter: blur(12px);
          transition: background 0.15s ease, color 0.15s ease, transform 0.15s ease;
        }

        .playlist-gallery-card:hover .playlist-gallery-arrow,
        .playlist-gallery-card.is-menu-open .playlist-gallery-arrow {
          background: white;
          color: black;
        }

        .playlist-gallery-content {
          position: absolute;
          left: 16px;
          right: 16px;
          bottom: 16px;
          z-index: 4;
        }

        .playlist-gallery-kicker {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.52);
        }

        .playlist-gallery-content h3 {
          margin-top: 8px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-family: var(--font-instrument-sans);
          font-size: 25px;
          font-weight: 500;
          line-height: 1.15;
          letter-spacing: -0.055em;
          color: white;
        }

        .playlist-gallery-content p {
          margin-top: 12px;
          font-size: 11px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.58);
        }

        .playlist-card-menu-wrap {
          position: absolute;
          z-index: 12;
          top: 16px;
          left: 16px;
        }

        .playlist-menu-btn {
          opacity: 0;
          transition:
            opacity 0.15s ease,
            background-color 0.15s ease,
            color 0.15s ease,
            box-shadow 0.15s ease;
        }

        .playlist-menu-btn-grid {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 999px;
          background-color: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.72);
          cursor: pointer;
          backdrop-filter: blur(12px);
        }

        .playlist-gallery-card:hover .playlist-menu-btn-grid,
        .playlist-menu-btn-grid.is-open {
          opacity: 1;
        }

        .playlist-gallery-card:hover .playlist-menu-btn-grid:not(:hover):not(.is-open) {
          background-color: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.72);
          box-shadow: none;
        }

        .playlist-gallery-card [data-playlist-menu] .playlist-menu-btn-grid:hover,
        .playlist-gallery-card [data-playlist-menu] .playlist-menu-btn-grid.is-open {
          background-color: white;
          color: black;
        }
      `}</style>

      <section className={className}>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-[family-name:var(--font-instrument-sans)] text-2xl font-medium tracking-[-0.05em]">
              {title}
            </h2>

            {description && (
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {description}
              </p>
            )}
          </div>

          <div className="hidden items-center gap-2 sm:flex">
            <button
              type="button"
              onClick={() => scrollPlaylists("prev")}
              disabled={!canScrollPrev}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition hover:border-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:pointer-events-none disabled:opacity-30"
              aria-label={`Scroll ${title} left`}
            >
              <ChevronLeftIcon size={16} />
            </button>

            <button
              type="button"
              onClick={() => scrollPlaylists("next")}
              disabled={!canScrollNext}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition hover:border-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:pointer-events-none disabled:opacity-30"
              aria-label={`Scroll ${title} right`}
            >
              <ChevronRightIcon size={16} />
            </button>

            {viewAllHref && (
              <Link
                href={viewAllHref}
                className="ml-2 text-xs font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
              >
                View playlists
              </Link>
            )}
          </div>
        </div>

        <div className="relative -mx-8 overflow-hidden">
          {canScrollPrev && (
            <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 hidden w-12 bg-gradient-to-r from-[var(--bg-primary)] to-transparent opacity-60 sm:block" />
          )}

          {canScrollNext && (
            <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 hidden w-16 bg-gradient-to-l from-[var(--bg-primary)] to-transparent opacity-60 sm:block" />
          )}

          <button
            type="button"
            onClick={() => scrollPlaylists("prev")}
            disabled={!canScrollPrev}
            className="absolute left-8 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white text-black shadow-[0_12px_34px_rgba(0,0,0,0.25)] transition hover:scale-105 disabled:pointer-events-none disabled:opacity-0 sm:flex"
            aria-label={`Scroll ${title} left`}
          >
            <ChevronLeftIcon size={18} />
          </button>

          <button
            type="button"
            onClick={() => scrollPlaylists("next")}
            disabled={!canScrollNext}
            className="absolute right-8 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white text-black shadow-[0_12px_34px_rgba(0,0,0,0.25)] transition hover:scale-105 disabled:pointer-events-none disabled:opacity-0 sm:flex"
            aria-label={`Scroll ${title} right`}
          >
            <ChevronRightIcon size={18} />
          </button>

          <div
            ref={scrollerRef}
            className="flex gap-3 overflow-x-auto overflow-y-hidden scroll-smooth overscroll-x-contain pl-8 pr-20 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {playlists.map((playlist, index) => (
              <CuratedPlaylistCard
                key={playlist.id}
                playlist={playlist}
                index={index}
                openMenuId={openMenuId}
                setOpenMenuId={setOpenMenuId}
                onAddSuccess={(name) =>
                  showToast(`"${name}" added to My Playlists`)
                }
                onAddError={(msg) => showToast(msg)}
                playerVisible={playerVisible}
              />
            ))}
          </div>
        </div>

        <Toast
          message={toastMessage}
          bottomOffset={playerVisible ? "88px" : "24px"}
        />
      </section>
    </>
  );
}
