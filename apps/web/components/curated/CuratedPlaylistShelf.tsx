"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import SectionTitle from "@/components/SectionTitle";
import ArrowUpRightIcon from "@/components/icons/ArrowUpRightIcon";
import ChevronLeftIcon from "@/components/icons/ChevronLeftIcon";
import ChevronRightIcon from "@/components/icons/ChevronRightIcon";
import type { CuratedPlaylist } from "@/lib/curatedPlaylists";
import CuratedPlaylistBookmarkButton from "./CuratedPlaylistBookmarkButton";
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
  variant = "default",
}: {
  playlist: CuratedPlaylistCardItem;
  index: number;
  variant?: "default" | "home" | "curatedPage";
}) {
  const href = playlist.href || `/curated-playlists/${playlist.id}`;
  const fallbackGradient =
    FALLBACK_GRADIENTS[index % FALLBACK_GRADIENTS.length];

  const isHomeVariant = variant === "home";
  const isCuratedPageVariant = variant === "curatedPage";
  const usesHomeLayout = isHomeVariant || isCuratedPageVariant;

  return (
    <div className={cardStyles.shell}>
      <article className={`${cardStyles.card}${usesHomeLayout ? ` ${cardStyles.homeCard}` : ""}`}>
        <Link href={href} className={cardStyles.imageLink}>
          <div
            className={`${cardStyles.image}${usesHomeLayout ? ` ${cardStyles.homeImage}` : ""}`}
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

            {isHomeVariant ? (
              <>
                <span className={cardStyles.homeShade} />
                <strong className={cardStyles.homeTitle}>{playlist.name}</strong>
              </>
            ) : null}
          </div>
        </Link>

        <CuratedPlaylistBookmarkButton
          playlist={playlist}
          className={`${cardStyles.bookmarkButton}${usesHomeLayout ? ` ${cardStyles.homeBookmarkButton}` : ""}`}
        />

        {!isHomeVariant ? (
          <div className={cardStyles.details}>
            <Link href={href} className={cardStyles.copy}>
              <h3>{playlist.name}</h3>
              <p>{formatSongCount(playlist.song_count)}</p>
            </Link>
          </div>
        ) : null}

        <CuratedPlaylistPlayButton
          playlistId={playlist.id}
          playlistName={playlist.name}
          className={`${cardStyles.playButton}${usesHomeLayout ? ` ${cardStyles.homePlayButton}` : ""}${isCuratedPageVariant ? ` ${cardStyles.curatedPagePlayButton}` : ""}`}
        />
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

  function getCardStep(scroller: HTMLDivElement) {
    const cards = Array.from(
      scroller.children,
    ).filter((child): child is HTMLElement => child instanceof HTMLElement);

    if (cards.length < 2) return 0;

    return cards[1].offsetLeft - cards[0].offsetLeft;
  }

  function getVisibleCardCount(scroller: HTMLDivElement) {
    const cards = Array.from(
      scroller.children,
    ).filter((child): child is HTMLElement => child instanceof HTMLElement);

    if (cards.length < 2) return 1;

    const step = cards[1].offsetLeft - cards[0].offsetLeft;
    const cardWidth = cards[0].getBoundingClientRect().width;
    const gap = Math.max(0, step - cardWidth);
    const styles = window.getComputedStyle(scroller);
    const paddingLeft = Number.parseFloat(styles.paddingLeft) || 0;
    const paddingRight = Number.parseFloat(styles.paddingRight) || 0;
    const contentWidth =
      scroller.clientWidth - paddingLeft - paddingRight;

    return Math.max(
      1,
      Math.round((contentWidth + gap) / step),
    );
  }

  function scrollPlaylists(direction: "prev" | "next") {
    const scroller = scrollerRef.current;

    if (!scroller) return;

    const step = getCardStep(scroller);
    if (!step) return;

    const currentIndex = Math.round(scroller.scrollLeft / step);
    const visibleCardCount = getVisibleCardCount(scroller);
    const nextIndex =
      currentIndex +
      (direction === "next" ? visibleCardCount : -visibleCardCount);
    const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;
    const target = Math.max(
      0,
      Math.min(nextIndex * step, maxScrollLeft),
    );

    scroller.scrollTo({
      left: target,
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
            <SectionTitle variant="small">{title}</SectionTitle>
          </div>

          <span className={shelfStyles.playlistCount}>
            {playlists.length} {playlists.length === 1 ? "playlist" : "playlists"}
          </span>
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
                className="absolute left-8 z-20 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white text-black opacity-0 shadow-[0_12px_34px_rgba(0,0,0,0.25)] transition hover:scale-105 group-hover/playlist-shelf:opacity-100 disabled:pointer-events-none disabled:opacity-0"
                style={{ top: imageCenterY }}
                aria-label={`Scroll ${title} left`}
              >
                <ChevronLeftIcon size={18} />
              </button>

              <button
                type="button"
                onClick={() => scrollPlaylists("next")}
                disabled={!canScrollNext}
                className="absolute right-8 z-20 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white text-black opacity-0 shadow-[0_12px_34px_rgba(0,0,0,0.25)] transition hover:scale-105 group-hover/playlist-shelf:opacity-100 disabled:pointer-events-none disabled:opacity-0"
                style={{ top: imageCenterY }}
                aria-label={`Scroll ${title} right`}
              >
                <ChevronRightIcon size={18} />
              </button>
            </>
          )}

          <div
            ref={scrollerRef}
            className={`flex overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${shelfStyles.scroller}`}
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
                <Link href={viewAllHref} className={shelfStyles.portalCard}>
                  <span className={shelfStyles.portalLabel}>{viewAllLabel}</span>
                  <span className={shelfStyles.portalArrow} aria-hidden="true">
                    <ArrowUpRightIcon />
                  </span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
