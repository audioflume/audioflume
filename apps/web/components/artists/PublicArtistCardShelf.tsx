"use client";

import { Children, type KeyboardEvent, type ReactNode } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import LoadingSpinner from "@/components/LoadingSpinner";
import PublicArtistCollectionDrawer from "@/components/artists/PublicArtistCollectionDrawer";
import ShelfNavigationControls from "@/components/ShelfNavigationControls";
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
  const allArtistSongsRef = useRef<Song[]>([]);
  const hasArtistQueueRef = useRef(false);
  const drawerId = useId();
  const { setQueue } = usePlayer();
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [drawerData, setDrawerData] = useState<DrawerPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const cards = Children.toArray(children);
  const artistSlug = useMemo(() => {
    const match = pathname.match(/^\/artists\/([^/]+)/);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  }, [pathname]);
  const collectionKind = title === "Releases" ? "release" : "playlist";

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
    setSelectedIndex(null);
    setDrawerData(null);
    setIsLoading(false);
    setLoadError(null);
    restoreArtistQueue();
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
      setIsLoading(false);
      return;
    }

    setDrawerData(null);
    setIsLoading(true);
    const requestId = ++requestIdRef.current;

    try {
      const response = await fetch(
        `/api/public/artists/${encodeURIComponent(
          artistSlug,
        )}/collection?kind=${collectionKind}&index=${index}`,
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
      if (requestId !== requestIdRef.current) return;

      cacheRef.current.set(index, payload);
      allArtistSongsRef.current = payload.all_songs;
      hasArtistQueueRef.current = true;
      setDrawerData(payload);
      setQueue(payload.songs.filter((song) => song.audioUrl));
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      setLoadError(
        error instanceof Error ? error.message : "Unable to load collection",
      );
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
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
    const scroller = scrollerRef.current;
    if (!scroller) return;

    updateScrollState();
    scroller.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(scroller);

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

      <div ref={scrollerRef} className={styles.scroller}>
        {cards.map((card, index) => {
          const selected = collectionKind === "release" && index === selectedIndex;

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

      {collectionKind === "release" && drawerData && selectedIndex !== null ? (
        <PublicArtistCollectionDrawer
          id={drawerId}
          collection={drawerData.collection}
          songs={drawerData.songs}
          onClose={closeDrawer}
        />
      ) : collectionKind === "release" &&
        selectedIndex !== null &&
        (isLoading || loadError) ? (
        <div id={drawerId} className={styles.drawerStatus}>
          {isLoading ? <LoadingSpinner /> : loadError}
        </div>
      ) : null}
    </section>
  );
}
