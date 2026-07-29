"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ChevronLeftIcon from "@/components/icons/ChevronLeftIcon";
import ChevronRightIcon from "@/components/icons/ChevronRightIcon";
import type { CuratedPlaylist } from "@/lib/curatedPlaylists";
import styles from "./CuratedPlaylistCard.module.css";

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

type CuratedPlaylistCardProps = {
  playlist: CuratedPlaylistCardItem;
  index: number;
  openMenuId?: number | null;
  setOpenMenuId?: (id: number | null) => void;
  onAddSuccess?: (name: string) => void;
  onAddError?: (message: string) => void;
  playerVisible?: boolean;
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

export function CuratedPlaylistCard({
  playlist,
  index,
}: CuratedPlaylistCardProps) {
  const href = playlist.href || `/curated-playlists/${playlist.id}`;
  const fallbackGradient =
    FALLBACK_GRADIENTS[index % FALLBACK_GRADIENTS.length];

  return (
    <div
      className={`curated-playlist-card-shell discover-playlist-card-shell ${styles.shell}`}
    >
      <article className={styles.card}>
        <Link href={href} className={styles.imageLink}>
          <div
            className={styles.image}
            data-curated-playlist-image
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

        <div className={styles.details}>
          <Link href={href} className={styles.copy}>
            <h3>{playlist.name}</h3>
            <p>{formatSongCount(playlist.song_count)}</p>
          </Link>
        </div>
      </article>
    </div>
  );
}

export default function CuratedPlaylistShelf({
  title,
  playlists,
  viewAllHref,
  className = "mt-12",
}: CuratedPlaylistShelfProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [imageCenterY, setImageCenterY] = useState<number | null>(null);

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

  useEffect(() => {
    const scroller = scrollerRef.current;
    const image = scroller?.querySelector<HTMLElement>(
      "[data-curated-playlist-image]",
    );

    if (!image) return;

    const updateImageCenter = () => {
      setImageCenterY(image.getBoundingClientRect().height / 2);
    };

    updateImageCenter();

    const resizeObserver = new ResizeObserver(updateImageCenter);
    resizeObserver.observe(image);

    return () => resizeObserver.disconnect();
  }, [playlists.length]);

  if (!playlists.length) return null;

  return (
    <div className={className}>
      <section className="curated-playlist-shelf">
        <div className="discover-section-heading curated-playlist-shelf-heading">
          <div className="min-w-0">
            <h2>{title}</h2>
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
          {imageCenterY !== null && (
            <>
              <button
                type="button"
                onClick={() => scrollPlaylists("prev")}
                disabled={!canScrollPrev}
                className="absolute left-8 z-20 hidden h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white text-black opacity-0 shadow-[0_12px_34px_rgba(0,0,0,0.25)] transition hover:scale-105 group-hover/playlist-shelf:opacity-100 disabled:pointer-events-none disabled:opacity-0 sm:flex"
                style={{ top: imageCenterY }}
                aria-label={`Scroll ${title} left`}
              >
                <ChevronLeftIcon size={18} />
              </button>

              <button
                type="button"
                onClick={() => scrollPlaylists("next")}
                disabled={!canScrollNext}
                className="absolute right-8 z-20 hidden h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white text-black opacity-0 shadow-[0_12px_34px_rgba(0,0,0,0.25)] transition hover:scale-105 group-hover/playlist-shelf:opacity-100 disabled:pointer-events-none disabled:opacity-0 sm:flex"
                style={{ top: imageCenterY }}
                aria-label={`Scroll ${title} right`}
              >
                <ChevronRightIcon size={18} />
              </button>
            </>
          )}

          <div
            ref={scrollerRef}
            className="curated-playlist-shelf-scroller flex gap-3 overflow-x-auto overflow-y-hidden scroll-smooth overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {playlists.map((playlist, index) => (
              <CuratedPlaylistCard
                key={playlist.id}
                playlist={playlist}
                index={index}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
