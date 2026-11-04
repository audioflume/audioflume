"use client";

import Link from "next/link";
import { useState } from "react";
import ArrowUpRightIcon from "@/components/icons/ArrowUpRightIcon";
import ChevronLeftIcon from "@/components/icons/ChevronLeftIcon";
import ChevronRightIcon from "@/components/icons/ChevronRightIcon";
import PauseIcon from "@/components/icons/PauseIcon";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import { usePlayer } from "@/context/PlayerContext";
import type { Song } from "@/lib/types";
import styles from "./DiscoverEditorialArtists.module.css";

type Artist = {
  id: string;
  name: string;
  slug: string;
  designation?: string | null;
  custom_text?: string | null;
  profile_image_url?: string | null;
  hero_image_url?: string | null;
  hero_image_position_x?: number;
  hero_image_position_y?: number;
  songs: Song[];
};

function EditorialArtistCard({ artist, prominent = false }: { artist: Artist; prominent?: boolean }) {
  const { currentSong, isPlaying, setQueue, togglePlayPause } = usePlayer();
  const playable = artist.songs.filter(song => Boolean(song.audioUrl));
  const playing = Boolean(isPlaying && currentSong && playable.some(song => song.id === currentSong.id));
  const image = artist.hero_image_url || artist.profile_image_url;

  function playArtist() {
    if (!playable.length) return;
    if (playing && currentSong) {
      togglePlayPause(currentSong);
      return;
    }
    setQueue(playable);
    togglePlayPause(playable[0]);
  }

  return (
    <article className={prominent ? styles.lead : styles.supporting}>
      <div className={styles.media}>
        <Link className={styles.artistLink} href={`/artists/${artist.slug}`} aria-label={`Explore ${artist.name}`}>
          {image ? (
            <img
              src={image}
              alt=""
              draggable={false}
              style={{ objectPosition: `${artist.hero_image_position_x ?? 50}% ${artist.hero_image_position_y ?? 50}%` }}
            />
          ) : <span className={styles.fallback} aria-hidden="true" />}
          <span className={styles.shade} aria-hidden="true" />
          <strong className={styles.name}>{artist.name}</strong>
        </Link>
        <button
          type="button"
          className={styles.play}
          onClick={playArtist}
          disabled={!playable.length}
          aria-label={playing ? `Pause ${artist.name}` : `Play ${artist.name}`}
        >
          {playing ? <PauseIcon size={17} /> : <PlayIconSmall size={17} />}
        </button>
      </div>
      {prominent ? (
        <div className={styles.caption}>
          <p>{artist.custom_text?.trim() || artist.designation || "Discover the music behind the artist."}</p>
          <Link href={`/artists/${artist.slug}`} aria-label={`Explore ${artist.name}'s music`}>
            Explore artist <ArrowUpRightIcon size={15} strokeWidth={1.6} />
          </Link>
        </div>
      ) : null}
    </article>
  );
}

export default function DiscoverEditorialArtists({ artists }: { artists: Artist[] }) {
  const [active, setActive] = useState(0);
  if (!artists.length) return null;

  const index = active % artists.length;
  const lead = artists[index];
  const companions = Array.from({ length: Math.min(2, artists.length - 1) }, (_, offset) =>
    artists[(index + offset + 1) % artists.length]
  );

  return (
    <section className={styles.section} aria-label="Featured artists">
      <div className={styles.layout}>
        <EditorialArtistCard key={lead.id} artist={lead} prominent />
        {companions.length ? (
          <div className={styles.companions}>
            {companions.map(artist => <EditorialArtistCard key={artist.id} artist={artist} />)}
          </div>
        ) : null}
      </div>
      {artists.length > 1 ? (
        <div className={styles.navigation}>
          <div className={styles.dots} role="group" aria-label="Choose featured artist">
            {artists.map((artist, itemIndex) => (
              <button
                type="button"
                key={artist.id}
                className={itemIndex === index ? styles.activeDot : styles.dot}
                onClick={() => setActive(itemIndex)}
                aria-label={`Show ${artist.name}`}
                aria-current={itemIndex === index ? "true" : undefined}
              />
            ))}
          </div>
          <div className={styles.arrows}>
            <button type="button" onClick={() => setActive((index - 1 + artists.length) % artists.length)} aria-label="Previous featured artist">
              <ChevronLeftIcon size={19} />
            </button>
            <button type="button" onClick={() => setActive((index + 1) % artists.length)} aria-label="Next featured artist">
              <ChevronRightIcon size={19} />
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
