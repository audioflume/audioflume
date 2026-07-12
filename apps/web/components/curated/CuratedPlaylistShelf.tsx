"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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

  for (let index = 0; index < songs.length; index += 1) {
    const song = songs[index];
    const songId = song.song_id ?? song.id;

    if (!songId) continue;

    try {
      await fetch(`/api/playlists/${newPlaylistId}/songs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ song_id: songId, position: index }),
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
    <div data-playlist-menu className="curated-playlist-menu-wrap">
      <DropdownShell
        open={open}
        onOpenChange={onOpenChange}
        placement="bottom-end"
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
        trigger={({ open: triggerOpen }) => (
          <button
            type="button"
            className={`curated-playlist-menu-button ${
              triggerOpen ? "is-open" : ""
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
      <article
        className={`curated-playlist-card ${isMenuOpen ? "is-menu-open" : ""}`}
      >
        <Link href={href} className="curated-playlist-image-link">
          <div
            className="curated-playlist-image"
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
        </Link>

        <div className="curated-playlist-card-details">
          <Link href={href} className="curated-playlist-card-copy">
            <h3>{playlist.name}</h3>
            <p>{formatSongCount(playlist.song_count)}</p>
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
      </article>
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
  const playerVisible = Boolean(currentSong);

  function showToast(message: string) {
    setToastMessage(message);
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
    <section className={`curated-playlist-shelf ${className}`}>
      <div className="curated-playlist-shelf-heading">
        <div className="min-w-0">
          <h2>{title}</h2>

          {description && <p>{description}</p>}
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

      <div className="group/playlist-shelf curated-playlist-shelf-viewport relative">
        <button
          type="button"
          onClick={() => scrollPlaylists("prev")}
          disabled={!canScrollPrev}
          className="curated-playlist-shelf-prev-floating absolute z-20 hidden h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white text-black opacity-0 shadow-[0_12px_34px_rgba(0,0,0,0.25)] transition hover:scale-105 group-hover/playlist-shelf:opacity-100 disabled:pointer-events-none disabled:opacity-0 sm:flex"
          aria-label={`Scroll ${title} left`}
        >
          <ChevronLeftIcon size={18} />
        </button>

        <button
          type="button"
          onClick={() => scrollPlaylists("next")}
          disabled={!canScrollNext}
          className="curated-playlist-shelf-next-floating absolute right-8 z-20 hidden h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white text-black opacity-0 shadow-[0_12px_34px_rgba(0,0,0,0.25)] transition hover:scale-105 group-hover/playlist-shelf:opacity-100 disabled:pointer-events-none disabled:opacity-0 sm:flex"
          aria-label={`Scroll ${title} right`}
        >
          <ChevronRightIcon size={18} />
        </button>

        <div
          ref={scrollerRef}
          className="curated-playlist-shelf-scroller flex gap-3 overflow-x-auto overflow-y-hidden scroll-smooth overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
              onAddError={showToast}
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
  );
}
