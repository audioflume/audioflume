"use client";

import { MusicListShell } from "@filmwave/shared";
import Link from "next/link";
import { useMemo } from "react";

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
  artistSlug: string | null;
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

function ShareGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="14.5" cy="4.5" r="2.25" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="5.5" cy="10" r="2.25" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="14.5" cy="15.5" r="2.25" stroke="currentColor" strokeWidth="1.4" />
      <path d="m7.5 8.9 5-3.1M7.5 11.1l5 3.1" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function NortheastArrowGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 17L17 7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M9 7H17V15"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseGlyph() {
  return (
    <svg width="19" height="19" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="m2.25 2.25 7.5 7.5M9.75 2.25l-7.5 7.5"
        stroke="currentColor"
        strokeWidth="0.9"
      />
    </svg>
  );
}

export default function PublicArtistCollectionDrawer({
  id,
  artistSlug,
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
  const albumHref =
    release && collection.release_type === "album" && artistSlug
      ? `/artists/${encodeURIComponent(artistSlug)}/albums/${encodeURIComponent(
          collection.id,
        )}`
      : null;

  function handlePlayAll() {
    const firstSong = playableSongs[0];
    if (!firstSong) return;
    setQueue(playableSongs);
    togglePlayPause(firstSong);
  }

  async function handleShare() {
    const url = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard?.writeText(url);
    } catch {
      // Sharing was cancelled or unavailable.
    }
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

            <div className={styles.collectionActions}>
              <button
                type="button"
                className={styles.roundAction}
                onClick={handlePlayAll}
                disabled={playableSongs.length === 0}
                aria-label={`Play all tracks in ${title}`}
              >
                <PlayGlyph />
              </button>
              <button
                type="button"
                className={styles.roundAction}
                onClick={handleShare}
                aria-label={`Share ${title}`}
              >
                <ShareGlyph />
              </button>
            </div>
          </div>

          <button
            type="button"
            className={styles.closeDetails}
            onClick={onClose}
            aria-label="Close details"
          >
            <CloseGlyph />
          </button>

          {albumHref ? (
            <Link href={albumHref} className={styles.viewAlbumLink}>
              View Album Page
              <NortheastArrowGlyph />
            </Link>
          ) : null}
        </div>

        <div className={styles.tracks}>
          {songs.length > 0 ? (
            <MusicListShell title={null}>
              {songs.map((song) => (
                <SongCard key={song.id} song={song} showDivider={false} />
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
