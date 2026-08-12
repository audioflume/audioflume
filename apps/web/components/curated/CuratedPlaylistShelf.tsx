"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import SectionTitle from "@/components/SectionTitle";
import ChevronLeftIcon from "@/components/icons/ChevronLeftIcon";
import ChevronRightIcon from "@/components/icons/ChevronRightIcon";
import type { CuratedPlaylist } from "@/lib/curatedPlaylists";
import CuratedPlaylistPlayButton from "./CuratedPlaylistPlayButton";
import cardStyles from "./CuratedPlaylistCard.module.css";
import shelfStyles from "./CuratedPlaylistShelf.module.css";

export type CuratedPlaylistCardItem = Pick<
  CuratedPlaylist,
  | "id"
  | "name"
  | "kicker"
  | "cover_image_url"
  | "song_count"
> & {
  href?: string;
};

type CuratedPlaylistShelfProps = {
  title: string;
  description?: string;
  playlists: CuratedPlaylistCardItem[];
  viewAllHref?: string;
  viewAllLabel?: string;
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

export function CuratedPlaylistCard({
  playlist,
  index,
}: {
  playlist: CuratedPlaylistCardItem;
  index: number;
}) {
  const href = playlist.href || `/curated-playlists/${playlist.id}`;
  const fallbackGradient =
    FALLBACK_GRADIENTS[index % FALLBACK_GRADIENTS.length];

  return (
    <div className={cardStyles.shell}>
      <article className={cardStyles.card}>
        <Link href={href} className={cardStyles.imageLink}>
          <div
            className={cardStyles.image}
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
                sizes="(min-width: 1280px) 420px, (min-width: 900px) 32vw, (min-width: 560px) 48vw, 100vw"
                className={cardStyles.media}
                unoptimized
              />
            )}
          </div>
        </Link>

        <div className={cardStyles.details}>
          <Link href={href} className={cardStyles.copy}>
            <h3>{playlist.name}</h3>
            <p>{formatSongCount(playlist.song_count)}</p>
          </Link>

          <CuratedPlaylistPlayButton
            playlistId={playlist.id}
            playlistName={playlist.name}
            className={cardStyles.playButton}
          />
        </div>
      </article>
    </div>
  );
}

export default function CuratedPlaylistShelf({
  title,
  playlists,
  viewAllHref,
  viewAllLabel = "View playlists",
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
      <section className={shelfStyles.shelf}>
        <div
          className={`${shelfStyles.heading}${viewAllHref ? " discover-section-header" : ""}`}
        >
          <div className="min-w-0">
            <SectionTitle>{title}</SectionTitle>
          </div>

          <div className="hidden items-center gap-2 sm:flex">
            {viewAllHref && (
              <Link href={viewAllHref}>{viewAllLabel}</Link>
            )}

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
          </div>
        </div>

        <div
          className={`group/playlist-shelf relative ${shelfStyles.viewport}`}
        >
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
            className={`flex overflow-x-auto overflow-y-hidden scroll-smooth overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${shelfStyles.scroller}`}
          >
            {playlists.map((playlist, index) => (
              <CuratedPlaylistCard
                key={playlist.id}
                playlist={playlist}
                index={index}
              />
            ))}

            {viewAllHref && (
              <div className={shelfStyles.portalShell}>
                <article className={cardStyles.card}>
                  <Link
                    href={viewAllHref}
                    className={`${cardStyles.imageLink} ${shelfStyles.portalCard}`}
                  >
                    <span className={shelfStyles.portalLabel}>{viewAllLabel}</span>
                  </Link>
                </article>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
