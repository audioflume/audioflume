"use client";

import { MusicListShell } from "@filmwave/shared";
import { useEffect, useMemo } from "react";

import "@/app/music/music-library-redesign.css";
import SongCard from "@/components/SongCard";
import { usePlayer } from "@/context/PlayerContext";
import type { Song } from "@/lib/types";
import type {
  PublicArtistPlaylist,
  PublicArtistRelease,
} from "@/lib/publicArtist";

import styles from "./PublicArtistCollectionDrawer.module.css";

type PublicArtistCollection = PublicArtistRelease | PublicArtistPlaylist;

type PublicArtistCollectionDrawerProps = {
  id: string;
  collection: PublicArtistCollection;
  songs: Song[];
  onClose: () => void;
};

function isRelease(
  collection: PublicArtistCollection,
): collection is PublicArtistRelease {
  return "release_type" in collection;
}

function formatReleaseType(type: PublicArtistRelease["release_type"]) {
  if (type === "ep") return "EP";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function formatReleaseYear(value: string | null) {
  if (!value) return null;
  return value.match(/^(\d{4})/)?.[1] ?? null;
}

function formatTrackCount(count: number) {
  return `${count} track${count === 1 ? "" : "s"}`;
}

function PlayGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <path d="M3 2.15 9.5 6 3 9.85V2.15Z" fill="currentColor" />
    </svg>
  );
}

function CloseGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="m2.25 2.25 7.5 7.5M9.75 2.25l-7.5 7.5"
        stroke="currentColor"
        strokeWidth="1.25"
      />
    </svg>
  );
}

export default function PublicArtistCollectionDrawer({
  id,
  collection,
  songs,
  onClose,
}: PublicArtistCollectionDrawerProps) {
  const { setQueue, togglePlayPause } = usePlayer();
  const release = isRelease(collection);
  const title = release ? collection.title : collection.name;
  const coverImageUrl = collection.cover_image_url;
  const playableSongs = useMemo(
    () => songs.filter((song) => song.audioUrl),
    [songs],
  );
  const releaseYear = release ? formatReleaseYear(collection.release_date) : null;
  const eyebrow = release
    ? formatReleaseType(collection.release_type)
    : "Artist Playlist";
  const metadata = release
    ? [formatTrackCount(collection.track_count), releaseYear]
        .filter(Boolean)
        .join(" · ")
    : formatTrackCount(collection.track_count);
  const description = release ? null : collection.description;

  useEffect(() => {
    setQueue(playableSongs);
  }, [playableSongs, setQueue]);

  function handlePlayAll() {
    const firstSong = playableSongs[0];
    if (!firstSong) return;
    setQueue(playableSongs);
    togglePlayPause(firstSong);
  }

  return (
    <div id={id} className={styles.drawer}>
      <div className={styles.inner}>
        <div className={styles.summary}>
          <div
            className={`${styles.artwork} ${
              release ? styles.releaseArtwork : styles.playlistArtwork
            }`}
          >
            {coverImageUrl ? (
              <img src={coverImageUrl} alt="" />
            ) : (
              <div className={styles.artworkPlaceholder} aria-hidden="true" />
            )}
          </div>

          <div className={styles.copy}>
            <span className={styles.eyebrow}>{eyebrow}</span>
            <h3>{title}</h3>
            <p className={styles.meta}>{metadata}</p>
            {description ? <p className={styles.description}>{description}</p> : null}
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.playButton}
              onClick={handlePlayAll}
              disabled={playableSongs.length === 0}
            >
              <PlayGlyph />
              <span>Play All</span>
            </button>
            <button
              type="button"
              className={styles.closeButton}
              onClick={onClose}
              aria-label={`Close ${title}`}
            >
              <CloseGlyph />
            </button>
          </div>
        </div>

        <div className={styles.tracks}>
          {songs.length > 0 ? (
            <MusicListShell title={null}>
              {songs.map((song) => (
                <SongCard key={song.id} song={song} />
              ))}
            </MusicListShell>
          ) : (
            <div className={styles.empty}>
              No published tracks in this collection yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
