"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";

import ChevronLeftIcon from "@/components/icons/ChevronLeftIcon";
import ChevronRightIcon from "@/components/icons/ChevronRightIcon";
import CuratedPlaylistBookmarkButton from "@/components/curated/CuratedPlaylistBookmarkButton";
import CuratedPlaylistPlayButton from "@/components/curated/CuratedPlaylistPlayButton";
import type { CuratedPlaylist } from "@/lib/curatedPlaylists";

import styles from "./CuratedFeatureCarousel.module.css";

type CuratedFeatureCarouselProps = {
  playlists: CuratedPlaylist[];
};

export default function CuratedFeatureCarousel({
  playlists,
}: CuratedFeatureCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const visiblePlaylists = useMemo(
    () =>
      playlists
        .filter((playlist) =>
          Boolean(
            playlist.feature_cover_image_url || playlist.cover_image_url,
          ),
        ),
    [playlists],
  );

  const loopedPlaylists = useMemo(
    () =>
      visiblePlaylists.length > 0
        ? [...visiblePlaylists, ...visiblePlaylists, ...visiblePlaylists]
        : [],
    [visiblePlaylists],
  );

  function getLoopMetrics() {
    const scroller = scrollerRef.current;
    if (!scroller || visiblePlaylists.length === 0) return null;

    const firstCopy = scroller.querySelector<HTMLElement>(
      '[data-carousel-copy="0"][data-carousel-index="0"]',
    );
    const middleCopy = scroller.querySelector<HTMLElement>(
      '[data-carousel-copy="1"][data-carousel-index="0"]',
    );
    const finalCopy = scroller.querySelector<HTMLElement>(
      '[data-carousel-copy="2"][data-carousel-index="0"]',
    );

    if (!firstCopy || !middleCopy || !finalCopy) return null;

    return {
      firstCopy,
      middleCopy,
      finalCopy,
      setWidth: middleCopy.offsetLeft - firstCopy.offsetLeft,
    };
  }

  function centerOn(element: HTMLElement, behavior: ScrollBehavior = "auto") {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    scroller.scrollTo({
      left:
        element.offsetLeft -
        (scroller.clientWidth - element.getBoundingClientRect().width) / 2,
      behavior,
    });
  }

  function scrollCarousel(direction: "prev" | "next") {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const cards = Array.from(
      scroller.querySelectorAll<HTMLElement>("[data-curated-feature-card]"),
    );
    if (cards.length === 0) return;

    const viewportCenter = scroller.scrollLeft + scroller.clientWidth / 2;
    let currentIndex = 0;
    let smallestDistance = Number.POSITIVE_INFINITY;

    cards.forEach((card, index) => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const distance = Math.abs(cardCenter - viewportCenter);

      if (distance < smallestDistance) {
        smallestDistance = distance;
        currentIndex = index;
      }
    });

    const targetIndex =
      direction === "next"
        ? Math.min(currentIndex + 1, cards.length - 1)
        : Math.max(currentIndex - 1, 0);

    centerOn(cards[targetIndex], "smooth");
  }

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || visiblePlaylists.length === 0) return;

    const metrics = getLoopMetrics();
    if (!metrics) return;

    const previousScrollBehavior = scroller.style.scrollBehavior;
    scroller.style.scrollBehavior = "auto";
    centerOn(metrics.middleCopy);
    scroller.style.scrollBehavior = previousScrollBehavior;
  }, [visiblePlaylists]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || visiblePlaylists.length === 0) return;

    let scrollEndTimer: number | null = null;

    const normalizeLoopPosition = () => {
      const metrics = getLoopMetrics();
      if (!metrics || metrics.setWidth <= 0) return;

      const middleStart =
        metrics.middleCopy.offsetLeft -
        (scroller.clientWidth - metrics.middleCopy.offsetWidth) / 2;
      const finalStart =
        metrics.finalCopy.offsetLeft -
        (scroller.clientWidth - metrics.finalCopy.offsetWidth) / 2;

      const previousScrollBehavior = scroller.style.scrollBehavior;
      scroller.style.scrollBehavior = "auto";

      if (scroller.scrollLeft < middleStart) {
        scroller.scrollLeft += metrics.setWidth;
      } else if (scroller.scrollLeft >= finalStart) {
        scroller.scrollLeft -= metrics.setWidth;
      }

      scroller.style.scrollBehavior = previousScrollBehavior;
    };

    const handleScroll = () => {
      if (scrollEndTimer !== null) {
        window.clearTimeout(scrollEndTimer);
      }

      scrollEndTimer = window.setTimeout(() => {
        normalizeLoopPosition();
        scrollEndTimer = null;
      }, 140);
    };

    scroller.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      if (scrollEndTimer !== null) {
        window.clearTimeout(scrollEndTimer);
      }
      scroller.removeEventListener("scroll", handleScroll);
    };
  }, [visiblePlaylists]);

  if (visiblePlaylists.length === 0) return null;

  return (
    <section className={styles.carousel} aria-label="Featured playlists">
      <div className={styles.viewport}>
        <button
          type="button"
          onClick={() => scrollCarousel("prev")}
          className={styles.arrow + " " + styles.arrowLeft}
          aria-label="Previous featured playlist"
        >
          <ChevronLeftIcon size={18} />
        </button>

        <div ref={scrollerRef} className={styles.scroller}>
          {loopedPlaylists.map((playlist, loopIndex) => {
            const copyIndex = Math.floor(loopIndex / visiblePlaylists.length);
            const playlistIndex = loopIndex % visiblePlaylists.length;

            return (
              <div
                key={String(copyIndex) + "-" + String(playlist.id)}
                className={styles.card}
                data-curated-feature-card
                data-carousel-copy={copyIndex}
                data-carousel-index={playlistIndex}
              >
                <Link
                  href={"/curated-playlists/" + playlist.id}
                  className={styles.cardLink}
                >
                  <div className={styles.media}>
                    {playlist.feature_cover_image_url ||
                    playlist.cover_image_url ? (
                      <Image
                        src={
                          playlist.feature_cover_image_url ||
                          playlist.cover_image_url ||
                          ""
                        }
                        alt={playlist.name}
                        fill
                        sizes="(min-width: 900px) 56vw, 82vw"
                        className={styles.image}
                        unoptimized
                      />
                    ) : null}
                    <div className={styles.title}>{playlist.name}</div>
                  </div>
                </Link>

                <CuratedPlaylistBookmarkButton
                  playlist={playlist}
                  className={styles.bookmarkButton}
                />

                <CuratedPlaylistPlayButton
                  playlistId={playlist.id}
                  playlistName={playlist.name}
                  className={styles.playButton}
                />
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => scrollCarousel("next")}
          className={styles.arrow + " " + styles.arrowRight}
          aria-label="Next featured playlist"
        >
          <ChevronRightIcon size={18} />
        </button>
      </div>
    </section>
  );
}
