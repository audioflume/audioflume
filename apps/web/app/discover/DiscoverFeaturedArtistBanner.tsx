"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import PauseIcon from "@/components/icons/PauseIcon";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import { usePlayer } from "@/context/PlayerContext";
import type { Song } from "@/lib/types";
import styles from "./DiscoverFeaturedArtistBanner.module.css";

type BannerArtist = {
  id: string;
  name: string;
  slug: string;
  designation?: string | null;
  hero_image_url?: string | null;
  profile_image_url?: string | null;
  hero_image_position_x?: number;
  hero_image_position_y?: number;
  songs: Song[];
};

export default function DiscoverFeaturedArtistBanner({ artists }: { artists: BannerArtist[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const { currentSong, isPlaying, setQueue, togglePlayPause } = usePlayer();

  useEffect(() => {
    if (artists.length < 2 || isPaused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const interval = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % artists.length);
    }, 7000);
    return () => window.clearInterval(interval);
  }, [artists.length, isPaused]);

  if (artists.length === 0) return null;

  const artist = artists[activeIndex % artists.length];
  const image = artist.hero_image_url || artist.profile_image_url;
  const playable = artist.songs.filter((song) => Boolean(song.audioUrl));
  const genres = Array.from(
    new Set(artist.songs.flatMap((song) => Array.isArray(song.genres) ? song.genres.filter(Boolean) : [])),
  ).slice(0, 3);
  const artistIsPlaying = Boolean(
    isPlaying && currentSong && playable.some((song) => song.id === currentSong.id),
  );

  function playArtist() {
    if (!playable.length) return;
    if (artistIsPlaying && currentSong) {
      togglePlayPause(currentSong);
      return;
    }
    setQueue(playable);
    togglePlayPause(playable[0]);
  }

  return (
    <section
      className={styles.section}
      aria-label="Discover featured artists slideshow"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsPaused(false);
      }}
    >
      <div className={styles.banner}>
        {image ? (
          <img
            key={artist.id}
            className={styles.background}
            src={image}
            alt=""
            style={{ objectPosition: `${artist.hero_image_position_x ?? 50}% ${artist.hero_image_position_y ?? 50}%` }}
          />
        ) : null}
        <div className={styles.shade} aria-hidden="true" />
        <div className={styles.details}>
          {playable[0]?.coverArt ? (
            <img className={styles.cover} src={playable[0].coverArt} alt="" />
          ) : null}
          <div className={styles.copy}>
            <Link href={`/artists/${artist.slug}`} className={styles.name}>{artist.name}</Link>
            {artist.designation ? <span className={styles.designation}>{artist.designation}</span> : null}
            <div className={styles.genres} aria-label="Artist genres">
              {genres.length > 0
                ? genres.map((genre) => <span key={genre}>{genre}</span>)
                : [0, 1, 2].map((index) => <span className={styles.placeholder} key={index} aria-hidden="true" />)}
            </div>
          </div>
        </div>
        <button
          type="button"
          className={styles.play}
          onClick={playArtist}
          disabled={!playable.length}
          aria-label={artistIsPlaying ? `Pause ${artist.name}` : `Play ${artist.name}`}
        >
          {artistIsPlaying ? <PauseIcon size={21} /> : <PlayIconSmall size={21} />}
        </button>
      </div>
      {artists.length > 1 ? (
        <div className={styles.indicators} role="group" aria-label="Choose featured artist slide">
          {artists.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={`${styles.indicator} ${index === activeIndex % artists.length ? styles.active : ""}`}
              aria-label={`Show ${item.name}`}
              aria-pressed={index === activeIndex % artists.length}
              onClick={() => setActiveIndex(index)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
