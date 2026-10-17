"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import ChevronLeftIcon from "@/components/icons/ChevronLeftIcon";
import ChevronRightIcon from "@/components/icons/ChevronRightIcon";
import PauseIcon from "@/components/icons/PauseIcon";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import { usePlayer } from "@/context/PlayerContext";
import type { Song } from "@/lib/types";

export type DiscoverFeatureCardArtist = {
  id: string;
  name: string;
  slug: string;
  custom_text: string | null;
  hero_image_url: string | null;
  hero_image_position_x: number;
  hero_image_position_y: number;
  songs: Song[];
};

export default function FeaturedArtistShelf({
  artists,
  showHeading,
}: {
  artists: DiscoverFeatureCardArtist[];
  showHeading?: boolean;
}) {
  const { currentSong, isPlaying, setQueue, togglePlayPause } = usePlayer();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const headingVisible = showHeading ?? artists.length > 0;

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

    const amount = Math.max(scroller.clientWidth * 0.8, 360);
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

    const observer = new ResizeObserver(updateScrollState);
    observer.observe(scroller);

    return () => {
      scroller.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
      observer.disconnect();
    };
  }, [artists.length]);

  function playArtist(artist: DiscoverFeatureCardArtist) {
    const playableSongs = artist.songs.filter((song) => Boolean(song.audioUrl));
    const firstSong = playableSongs[0];
    const artistIsPlaying = Boolean(
      isPlaying &&
        currentSong &&
        playableSongs.some((song) => song.id === currentSong.id),
    );

    if (artistIsPlaying && currentSong) {
      togglePlayPause(currentSong);
      return;
    }

    if (!firstSong) return;
    setQueue(playableSongs);
    togglePlayPause(firstSong);
  }

  return (
    <section className="discover-artist-featured">
      {headingVisible ? (
        <div className="discover-artist-featured-heading">
          <span>This month&apos;s featured artists</span>
          <Link href="/discover">Explore Artists &amp; Composers</Link>
        </div>
      ) : null}

      <div className="discover-artist-featured-shelf">
        <button
          type="button"
          className="discover-artist-featured-shelf-arrow is-left"
          onClick={() => scroll("prev")}
          disabled={!canScrollPrev}
          aria-label="Scroll featured artists left"
        >
          <ChevronLeftIcon size={18} />
        </button>

        <div ref={scrollerRef} className="discover-artist-featured-scroller">
          {artists.map((artist) => {
            const playableSongs = artist.songs.filter((song) =>
              Boolean(song.audioUrl),
            );
            const artistIsPlaying = Boolean(
              isPlaying &&
                currentSong &&
                playableSongs.some((song) => song.id === currentSong.id),
            );
            const genres = Array.from(
              new Set(
                artist.songs.flatMap((song) =>
                  Array.isArray(song.genres) ? song.genres.filter(Boolean) : [],
                ),
              ),
            ).slice(0, 3);

            return (
              <article key={artist.id} className="discover-artist-feature-card">
                <Link
                  href={`/artists/${artist.slug}`}
                  className="discover-artist-feature-link"
                >
                  <div className="discover-artist-feature-media-home">
                    {artist.hero_image_url ? (
                      <img
                        src={artist.hero_image_url}
                        alt=""
                        draggable={false}
                        style={{
                          objectPosition: `${artist.hero_image_position_x}% ${artist.hero_image_position_y}%`,
                        }}
                      />
                    ) : null}
                  </div>

                  <div className="discover-artist-feature-bar">
                    <span className="discover-artist-feature-copy">
                      <strong>{artist.name}</strong>
                      <span className="discover-artist-feature-genres">
                        {genres.length > 0
                          ? genres.map((genre) => (
                              <span key={genre}>{genre}</span>
                            ))
                          : [0, 1, 2].map((placeholder) => (
                              <span
                                key={placeholder}
                                className="is-placeholder"
                                aria-hidden="true"
                              />
                            ))}
                      </span>
                    </span>
                  </div>
                </Link>

                <button
                  type="button"
                  className="discover-artist-feature-play"
                  onClick={() => playArtist(artist)}
                  disabled={playableSongs.length === 0}
                  aria-label={`${artistIsPlaying ? "Pause" : "Play"} music by ${artist.name}`}
                  aria-pressed={artistIsPlaying}
                >
                  {artistIsPlaying ? (
                    <PauseIcon size={14} />
                  ) : (
                    <PlayIconSmall size={14} />
                  )}
                </button>
              </article>
            );
          })}
        </div>

        <button
          type="button"
          className="discover-artist-featured-shelf-arrow is-right"
          onClick={() => scroll("next")}
          disabled={!canScrollNext}
          aria-label="Scroll featured artists right"
        >
          <ChevronRightIcon size={18} />
        </button>
      </div>
    </section>
  );
}
