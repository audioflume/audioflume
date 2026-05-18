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

export function CuratedPlaylistCard({
  playlist,
  openMenuId,
  setOpenMenuId,
  onAddSuccess,
  onAddError,
  playerVisible,
}: {
  playlist: CuratedPlaylistCardItem;
  openMenuId: number | null;
  setOpenMenuId: (id: number | null) => void;
  onAddSuccess: (name: string) => void;
  onAddError: (msg: string) => void;
  playerVisible: boolean;
}) {
  const href = playlist.href || `/curated-playlists/${playlist.id}`;
  const isMenuOpen = openMenuId === playlist.id;
  const [saving, setSaving] = useState(false);

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
    <div
      className={`group relative min-h-[210px] min-w-[250px] sm:min-w-[285px] lg:min-w-[320px] ${
        isMenuOpen ? "is-menu-open" : ""
      }`}
    >
      <Link href={href} className="block">
        <div className="relative min-h-[210px] overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] transition group-hover:border-[var(--border)]">
          {playlist.cover_image_url ? (
            <Image
              src={playlist.cover_image_url}
              alt={playlist.name}
              fill
              sizes="(min-width: 1280px) 320px, (min-width: 768px) 285px, 250px"
              className="object-cover transition duration-700 group-hover:scale-[1.025]"
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 bg-[linear-gradient(135deg,#372f4f_0%,#111111_48%,#75649a_100%)]" />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/62 via-black/18 to-transparent" />

          {/* Arrow — top right */}
          <div className="relative z-[4] flex justify-end p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/12 text-white backdrop-blur transition group-hover:bg-white group-hover:text-black">
              <ArrowUpRightIcon />
            </div>
          </div>

          <div className="absolute bottom-4 left-4 right-4 z-[4]">
            <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/52">
              {playlist.kicker}
            </div>
            <h3 className="mt-2 font-[family-name:var(--font-instrument-sans)] text-[25px] font-medium leading-[0.95] tracking-[-0.055em] text-white">
              {playlist.name}
            </h3>
            <p className="mt-3 text-[11px] font-medium text-white/58">
              {formatSongCount(playlist.song_count)}
            </p>
          </div>
        </div>
      </Link>

      {/* More button — top left, frosted glass pill, hidden until hover */}
      <div className="absolute left-4 top-4 z-[12]">
        <DropdownShell
          open={isMenuOpen}
          onOpenChange={(o) => setOpenMenuId(o ? playlist.id : null)}
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
              aria-label={`${playlist.name} options`}
              disabled={saving}
              className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/15 text-white/72 backdrop-blur transition disabled:opacity-50 ${
                open
                  ? "bg-white text-black opacity-100"
                  : "bg-white/10 opacity-0 group-hover:opacity-100 hover:bg-white hover:text-black"
              }`}
            >
              <MoreIcon />
            </button>
          )}
        >
          <div className="w-[160px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] py-1 shadow-[var(--shadow-ui)]">
            <button
              type="button"
              className="w-full px-3 py-2.5 text-left text-[12px] font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover-strong)] hover:text-[var(--text-primary)] disabled:opacity-50"
              onClick={handleAddToMyPlaylists}
              disabled={saving}
            >
              {saving ? "Adding…" : "Add to My Playlists"}
            </button>
          </div>
        </DropdownShell>
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
          {playlists.map((playlist) => (
            <CuratedPlaylistCard
              key={playlist.id}
              playlist={playlist}
              openMenuId={openMenuId}
              setOpenMenuId={setOpenMenuId}
              onAddSuccess={(name) => showToast(`"${name}" added to My Playlists`)}
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
  );
}
