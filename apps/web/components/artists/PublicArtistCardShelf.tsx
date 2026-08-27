"use client";

import Link from "next/link";
import {
  Children,
  isValidElement,
  type AnimationEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import PublicArtistCollectionDrawer from "@/components/artists/PublicArtistCollectionDrawer";
import ShelfNavigationControls from "@/components/ShelfNavigationControls";
import ChevronLeftIcon from "@/components/icons/ChevronLeftIcon";
import ChevronRightIcon from "@/components/icons/ChevronRightIcon";
import { usePlayer } from "@/context/PlayerContext";
import type { Song } from "@/lib/types";
import type {
  PublicArtistPlaylist,
  PublicArtistRelease,
} from "@/lib/publicArtist";

import styles from "./PublicArtistCardShelf.module.css";

type PublicArtistCollection = PublicArtistRelease | PublicArtistPlaylist;

type DrawerPayload = {
  collection: PublicArtistCollection;
  songs: Song[];
  all_songs: Song[];
};

type PublicArtistCardShelfProps = {
  title: string;
  countLabel: string;
  children: ReactNode;
};

function getCardCollectionId(card: ReactNode) {
  if (!isValidElement(card) || card.key == null) return null;
  const key = String(card.key);
  return key.startsWith(".$") ? key.slice(2) : key;
}

export default function PublicArtistCardShelf({
  title,
  countLabel,
  children,
}: PublicArtistCardShelfProps) {
  const pathname = usePathname();
  const router = useRouter();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);
  const cacheRef = useRef(new Map<number, DrawerPayload>());
  const prefetchRef = useRef(new Map<number, Promise<DrawerPayload>>());
  const allArtistSongsRef = useRef<Song[]>([]);
  const hasArtistQueueRef = useRef(false);
  const drawerId = useId();
  const { setQueue } = usePlayer();
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [imageCenterY, setImageCenterY] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [drawerData, setDrawerData] = useState<DrawerPayload | null>(null);
  const [isDrawerClosing, setIsDrawerClosing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const cards = Children.toArray(children);
  const cardCount = cards.length;
  const artistSlug = useMemo(() => {
    const match = pathname.match(/^\/artists\/([^/]+)/);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  }, [pathname]);
  const collectionKind = title === "Releases" ? "release" : "playlist";

  const loadReleasePayload = useCallback(
    async (index: number) => {
      if (!artistSlug) throw new Error("Unable to load collection");

      const cached = cacheRef.current.get(index);
      if (cached) return cached;

      const pending = prefetchRef.current.get(index);
      if (pending) return pending;

      const request = (async () => {
        const response = await fetch(
          `/api/public/artists/${encodeURIComponent(
            artistSlug,
          )}/collection?kind=release&index=${index}`,
        );
        const payload = (await response.json().catch(() => null)) as
          | DrawerPayload
          | { error?: string }
          | null;

        if (!response.ok || !payload || !("collection" in payload)) {
          throw new Error(
            payload && "error" in payload && payload.error
              ? payload.error
              : "Unable to load collection",
          );
        }

        cacheRef.current.set(index, payload);
        return payload;
      })();

      prefetchRef.current.set(index, request);
      void request.then(
        () => {
          if (prefetchRef.current.get(index) === request) {
            prefetchRef.current.delete(index);
          }
        },
        () => {
          if (prefetchRef.current.get(index) === request) {
            prefetchRef.current.delete(index);
          }
        },
      );

      return request;
    },
    [artistSlug],
  );

  function updateScrollState() {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;
    setCanScrollPrev(scroller.scrollLeft > 4);
    setCanScrollNext(scroller.scrollLeft < maxScrollLeft - 4);
  }

  function scroll(direction: "prev" | "next") {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const amount = Math.max(scroller.clientWidth * 0.82, 320);
    scroller.scrollBy({
      left: direction === "next" ? amount : -amount,
      behavior: "smooth",
    });
  }

  function restoreArtistQueue() {
    if (!hasArtistQueueRef.current) return;
    setQueue(allArtistSongsRef.current.filter((song) => song.audioUrl));
  }

  function closeDrawer() {
    requestIdRef.current += 1;
    setLoadError(null);
    restoreArtistQueue();

    if (!drawerData) {
      setSelectedIndex(null);
      setDrawerData(null);
      setIsDrawerClosing(false);
      return;
    }

    setIsDrawerClosing(true);
  }

  function handleDrawerAnimationEnd(event: AnimationEvent<HTMLDivElement>) {
    if (event.currentTarget !== event.target || !isDrawerClosing) return;
    setSelectedIndex(null);
    setDrawerData(null);
    setIsDrawerClosing(false);
  }

  async function openCollection(index: number) {
    if (!artistSlug) return;

    if (collectionKind === "playlist") {
      const cached = cacheRef.current.get(index);
      if (cached) {
        router.push(
          `/playlists/${encodeURIComponent(cached.collection.id)}?artist=${encodeURIComponent(
            artistSlug,
          )}`,
        );
        return;
      }

      try {
        const response = await fetch(
          `/api/public/artists/${encodeURIComponent(
            artistSlug,
          )}/collection?kind=playlist&index=${index}`,
        );
        const payload = (await response.json().catch(() => null)) as
          | DrawerPayload
          | { error?: string }
          | null;

        if (!response.ok || !payload || !("collection" in payload)) return;

        cacheRef.current.set(index, payload);
        router.push(
          `/playlists/${encodeURIComponent(payload.collection.id)}?artist=${encodeURIComponent(
            artistSlug,
          )}`,
        );
      } catch {
        // Keep the artist page in place if the playlist route cannot be resolved.
      }
      return;
    }

    if (isDrawerClosing) return;

    if (selectedIndex === index) {
      closeDrawer();
      return;
    }

    setSelectedIndex(index);
    setLoadError(null);

    const cached = cacheRef.current.get(index);
    if (cached) {
      setDrawerData(cached);
      allArtistSongsRef.current = cached.all_songs;
      hasArtistQueueRef.current = true;
      setQueue(cached.songs.filter((song) => song.audioUrl));
      return;
    }

    setDrawerData(null);
    const requestId = ++requestIdRef.current;

    try {
      const payload = await loadReleasePayload(index);
      if (requestId !== requestIdRef.current) return;

      allArtistSongsRef.current = payload.all_songs;
      hasArtistQueueRef.current = true;
      setDrawerData(payload);
      setQueue(payload.songs.filter((song) => song.audioUrl));
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      setLoadError(
        error instanceof Error ? error.message : "Unable to load collection",
      );
    }
  }

  function handleCardKeyDown(
    event: KeyboardEvent<HTMLDivElement>,
    index: number,
  ) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    void openCollection(index);
  }

  useEffect(() => {
    if (collectionKind !== "release" || !artistSlug || cardCount === 0) return;

    for (let index = 0; index < cardCount; index += 1) {
      void loadReleasePayload(index).catch(() => {
        // Opening the drawer can retry a failed prefetch.
      });
    }
  }, [artistSlug, cardCount, collectionKind, loadReleasePayload]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const image = scroller.querySelector<HTMLElement>(".artist-public-card-art");
    const updateImageCenter = () => {
      setImageCenterY(image ? image.getBoundingClientRect().height / 2 : null);
    };

    updateScrollState();
    updateImageCenter();
    scroller.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    const resizeObserver = new ResizeObserver(() => {
      updateScrollState();
      updateImageCenter();
    });
    resizeObserver.observe(scroller);
    if (image) resizeObserver.observe(image);

    return () => {
      scroller.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
      resizeObserver.disconnect();
    };
  }, [children]);

  return (
    <section className="artist-public-section">
      <div className="artist-public-section-header">
        <h2 className="artist-public-section-title">{title}</h2>
        <div className={styles.headerActions}>
          <span className="artist-public-section-count">{countLabel}</span>
          <ShelfNavigationControls
            label={title}
            onPrev={() => scroll("prev")}
            onNext={() => scroll("next")}
            canScrollPrev={canScrollPrev}
            canScrollNext={canScrollNext}
          />
        </div>
      </div>

      <div className="group/artist-public-shelf relative left-1/2 w-screen -translate-x-1/2 overflow-hidden">
        {imageCenterY !== null && (
          <>
            <button
              type="button"
              onClick={() => scroll("prev")}
              disabled={!canScrollPrev}
              className="absolute left-8 z-20 hidden h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white text-black opacity-0 shadow-[0_12px_34px_rgba(0,0,0,0.25)] transition hover:scale-105 group-hover/artist-public-shelf:opacity-100 disabled:pointer-events-none disabled:opacity-0 sm:flex"
              style={{ top: imageCenterY }}
              aria-label={`Scroll ${title} left`}
            >
              <ChevronLeftIcon size={18} />
            </button>

            <button
              type="button"
              onClick={() => scroll("next")}
              disabled={!canScrollNext}
              className="absolute right-8 z-20 hidden h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white text-black opacity-0 shadow-[0_12px_34px_rgba(0,0,0,0.25)] transition hover:scale-105 group-hover/artist-public-shelf:opacity-100 disabled:pointer-events-none disabled:opacity-0 sm:flex"
              style={{ top: imageCenterY }}
              aria-label={`Scroll ${title} right`}
            >
              <ChevronRightIcon size={18} />
            </button>
          </>
        )}

        <div ref={scrollerRef} className={styles.scroller}>
          {cards.map((card, index) => {
            const selected = collectionKind === "release" && index === selectedIndex;
            const playlistId =
              collectionKind === "playlist" ? getCardCollectionId(card) : null;
            const playlistHref =
              playlistId && artistSlug
                ? `/playlists/${encodeURIComponent(playlistId)}?artist=${encodeURIComponent(
                    artistSlug,
                  )}`
                : null;

            if (playlistHref) {
              return (
                <Link key={playlistId} href={playlistHref} className={styles.cardSlot}>
                  {card}
                </Link>
              );
            }

            return (
              <div
                key={index}
                className={`${styles.cardSlot}${
                  selected ? ` ${styles.cardSlotSelected}` : ""
                }`}
                role="button"
                tabIndex={0}
                aria-expanded={collectionKind === "release" ? selected : undefined}
                aria-controls={selected ? drawerId : undefined}
                onClick={() => void openCollection(index)}
                onKeyDown={(event) => handleCardKeyDown(event, index)}
              >
                {card}
              </div>
            );
          })}
        </div>
      </div>

      {collectionKind === "release" && drawerData && selectedIndex !== null ? (
        <div
          className={`${styles.drawerTransition} ${
            isDrawerClosing ? styles.drawerClosing : styles.drawerOpening
          }`}
          onAnimationEnd={handleDrawerAnimationEnd}
        >
          <div className={styles.drawerTransitionInner}>
            <PublicArtistCollectionDrawer
              id={drawerId}
              artistSlug={artistSlug}
              collection={drawerData.collection}
              songs={drawerData.songs}
              onClose={closeDrawer}
            />
          </div>
        </div>
      ) : collectionKind === "release" && selectedIndex !== null && loadError ? (
        <div id={drawerId} className={styles.drawerStatus}>
          {loadError}
        </div>
      ) : null}
    </section>
  );
}
