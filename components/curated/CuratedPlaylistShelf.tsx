"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ArrowUpRightIcon from "@/components/icons/ArrowUpRightIcon";
import type { CuratedPlaylist } from "@/lib/curatedPlaylists";

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

export function CuratedPlaylistCard({
  playlist,
}: {
  playlist: CuratedPlaylistCardItem;
}) {
  const href = playlist.href || `/curated-playlists/${playlist.id}`;

  return (
    <Link
      href={href}
      className="group relative min-h-[210px] min-w-[250px] overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--bg-secondary)] transition hover:border-[var(--text-muted)] sm:min-w-[285px] lg:min-w-[320px]"
    >
      {playlist.cover_image_url ? (
        <Image
          src={playlist.cover_image_url}
          alt={playlist.name}
          fill
          sizes="(min-width: 1280px) 320px, (min-width: 768px) 285px, 250px"
          className="object-cover transition duration-700 group-hover:scale-[1.05]"
          unoptimized
        />
      ) : (
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#372f4f_0%,#111111_48%,#75649a_100%)]" />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/62 via-black/18 to-transparent" />

      <div className="relative z-10 flex min-h-[210px] flex-col justify-between p-4">
        <div className="flex justify-end">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/12 text-white backdrop-blur transition group-hover:bg-white group-hover:text-black">
            <ArrowUpRightIcon />
          </div>
        </div>

        <div>
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
            <span className="rotate-180">
              <ArrowUpRightIcon />
            </span>
          </button>

          <button
            type="button"
            onClick={() => scrollPlaylists("next")}
            disabled={!canScrollNext}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition hover:border-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:pointer-events-none disabled:opacity-30"
            aria-label={`Scroll ${title} right`}
          >
            <ArrowUpRightIcon />
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

      <div className="relative -mx-5 overflow-hidden md:-mx-8 lg:-mx-10">
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
          className="absolute left-5 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white text-black shadow-[0_12px_34px_rgba(0,0,0,0.25)] transition hover:scale-105 disabled:pointer-events-none disabled:opacity-0 sm:flex md:left-8 lg:left-10"
          aria-label={`Scroll ${title} left`}
        >
          <span className="rotate-180">
            <ArrowUpRightIcon />
          </span>
        </button>

        <button
          type="button"
          onClick={() => scrollPlaylists("next")}
          disabled={!canScrollNext}
          className="absolute right-5 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white text-black shadow-[0_12px_34px_rgba(0,0,0,0.25)] transition hover:scale-105 disabled:pointer-events-none disabled:opacity-0 sm:flex md:right-8 lg:right-10"
          aria-label={`Scroll ${title} right`}
        >
          <ArrowUpRightIcon />
        </button>

        <div
          ref={scrollerRef}
          className="flex gap-3 overflow-x-auto scroll-smooth pl-5 pr-20 [scrollbar-width:none] md:pl-8 lg:pl-10 [&::-webkit-scrollbar]:hidden"
        >
          {playlists.map((playlist) => (
            <CuratedPlaylistCard key={playlist.id} playlist={playlist} />
          ))}
        </div>
      </div>
    </section>
  );
}
