"use client";

import { Children, type KeyboardEvent, type ReactNode } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

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

type PublicArtistCardShelfProps = {
  title: string;
  countLabel: string;
  collections: PublicArtistCollection[];
  songs: Song[];
  children: ReactNode;
};

export default function PublicArtistCardShelf({
  title,
  countLabel,
  collections,
  songs,
  children,
}: PublicArtistCardShelfProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const drawerId = useId();
  const { setQueue } = usePlayer();
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const cards = Children.toArray(children);
  const selectedCollection =
    collections.find((collection) => collection.id === selectedId) ?? null;
  const songById = useMemo(
    () => new Map(songs.map((song) => [song.id, song])),
    [songs],
  );
  const selectedSongs = useMemo(() => {
    if (!selectedCollection) return [];
    return selectedCollection.song_ids.flatMap((songId) => {
      const song = songById.get(songId);
      return song ? [song] : [];
    });
  }, [selectedCollection, songById]);

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
    setQueue(songs.filter((song) => song.audioUrl));
  }

  function closeDrawer() {
    setSelectedId(null);
    restoreArtistQueue();
  }

  function toggleCollection(collectionId: string) {
    if (selectedId === collectionId) {
      closeDrawer();
      return;
    }
    setSelectedId(collectionId);
  }

  function handleCardKeyDown(
    event: KeyboardEvent<HTMLDivElement>,
    collectionId: string,
  ) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    toggleCollection(collectionId);
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
          const collection = collections[index];
          if (!collection) return card;
          const selected = collection.id === selectedId;

          return (
            <div
              key={collection.id}
              className={`${styles.cardSlot}${
                selected ? ` ${styles.cardSlotSelected}` : ""
              }`}
              role="button"
              tabIndex={0}
              aria-expanded={selected}
              aria-controls={selected ? drawerId : undefined}
              onClick={() => toggleCollection(collection.id)}
              onKeyDown={(event) => handleCardKeyDown(event, collection.id)}
            >
              {card}
            </div>
          );
        })}
      </div>

      {selectedCollection ? (
        <PublicArtistCollectionDrawer
          id={drawerId}
          collection={selectedCollection}
          songs={selectedSongs}
          onClose={closeDrawer}
        />
      ) : null}
    </section>
  );
}
