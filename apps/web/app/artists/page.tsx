"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { MusicLibraryEmptyState } from "@filmwave/shared";
import Footer from "@/components/Footer";
import PlaylistCardShell from "@/components/playlists/PlaylistCardShell";
import playlistCardStyles from "@/components/curated/CuratedPlaylistCard.module.css";
import GlobalReferenceSearch from "@/components/GlobalReferenceSearch";
import XIcon from "@/components/icons/XIcon";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import ArrowUpRightIcon from "@/components/icons/ArrowUpRightIcon";
import PauseIcon from "@/components/icons/PauseIcon";
import { usePlayer, usePlayerProgress } from "@/context/PlayerContext";
import type { Song } from "@/lib/types";
import "@/components/curated/curated-browse-filters.css";
import styles from "./page.module.css";
import "../home-page.css";

type DirectoryArtist = {
  id: string;
  name: string;
  slug: string;
  designation: string | null;
  intro_text: string | null;
  profile_image_url: string | null;
  hero_image_url: string | null;
  hero_image_position_x: number;
  hero_image_position_y: number;
  genres: string[];
  track_count: number;
  songs: Song[];
};

const PREVIEW_CARD_COUNT = 8;

function formatPreviewDuration(seconds: number | undefined) {
  if (!Number.isFinite(seconds) || !seconds || seconds <= 0) return "—";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function ArtistMiniPlayer({
  artistName,
  trackCount,
  songs,
  currentSongId,
  isPlaying,
  onPlay,
  onSeek,
}: {
  artistName: string;
  trackCount: number;
  songs: Song[];
  currentSongId?: string;
  isPlaying?: boolean;
  onPlay?: (song: Song) => void;
  onSeek?: (song: Song, progress: number) => void;
}) {
  const { currentTime, duration } = usePlayerProgress();
  const [previewIndex, setPreviewIndex] = useState(0);
  const previews = songs;
  const index = Math.min(previewIndex, Math.max(0, previews.length - 1));
  const song = previews[index];
  const playing = Boolean(song && currentSongId === song.id && isPlaying);
  const progress = song && currentSongId === song.id && duration > 0
    ? Math.min(100, Math.max(0, (currentTime / duration) * 100))
    : 0;

  return (
    <div className={styles.miniPlayer} aria-label={`Preview music by ${artistName}`}>
      <div className={styles.miniPlayerUpper}>
      <div className={styles.miniPlayerArtControls}>
        <button
          type="button"
          className={styles.miniPlayerSkip}
          aria-label={`Previous preview from ${artistName}`}
          disabled={previews.length < 2}
          onClick={(event) => {
            event.stopPropagation();
            setPreviewIndex((index - 1 + previews.length) % previews.length);
          }}
        >
          <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true">
            <path d="M5 5h2v14H5zM19 5v14L8 12z" />
          </svg>
        </button>
        <div className={styles.miniPlayerArt}>
          {song?.coverArt ? <img src={song.coverArt} alt="" draggable={false} /> : null}
          <button
            type="button"
            className={styles.miniPlayerPlay}
            aria-label={song ? `${playing ? "Pause" : "Play"} ${song.title}` : "No preview available"}
            disabled={!song}
            onClick={(event) => {
              event.stopPropagation();
              if (song) onPlay?.(song);
            }}
          >
            {playing ? <PauseIcon size={20} /> : <PlayIconSmall size={20} />}
          </button>
        </div>
        <button
          type="button"
          className={styles.miniPlayerSkip}
          aria-label={`Next preview from ${artistName}`}
          disabled={previews.length < 2}
          onClick={(event) => {
            event.stopPropagation();
            setPreviewIndex((index + 1) % previews.length);
          }}
        >
          <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true">
            <path d="M17 5h2v14h-2zM5 5l11 7-11 7z" />
          </svg>
        </button>
      </div>
      <div className={styles.miniPlayerInfo}>
        <strong>{song?.title ?? "No preview available"}</strong>
        <span className={styles.miniPlayerCount}>
          {trackCount} {trackCount === 1 ? "song" : "songs"}
          {song ? ` · ${formatPreviewDuration(song.duration)}` : ""}
        </span>
      </div>
      <input
        type="range"
        className={styles.miniPlayerProgress}
        min={0}
        max={100}
        step={0.1}
        value={progress}
        disabled={!song}
        aria-label={song ? `Seek within ${song.title}` : "No song to seek"}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => {
          event.stopPropagation();
          if (song) onSeek?.(song, Number(event.target.value) / 100);
        }}
      />
      </div>
      <div className={styles.miniPlayerCompactSongs} aria-label={`Songs by ${artistName}`} tabIndex={0}>
        {Array.from({ length: Math.max(3, Math.ceil(songs.length / 3)) }, (_, groupIndex) => (
          <div className={styles.miniPlayerCompactPage} key={groupIndex}>
            {Array.from({ length: 3 }, (_, rowIndex) => {
              const songIndex = groupIndex * 3 + rowIndex;
              const previewSong = songs[songIndex];
              if (!previewSong) {
                return (
                  <div className={`${styles.miniPlayerCompactRow} ${styles.miniPlayerCompactPlaceholder}`} key={`preview-${songIndex}`}>
                    <span className={styles.miniPlayerCompactCover} />
                    <span className={styles.miniPlayerCompactTitle}>Preview track {songIndex + 1}</span>
                    <PlayIconSmall size={12} />
                  </div>
                );
              }
              const active = currentSongId === previewSong.id;
              return (
                <button
                  type="button"
                  className={styles.miniPlayerCompactRow}
                  key={previewSong.id}
                  aria-label={`${active && isPlaying ? "Pause" : "Play"} ${previewSong.title}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setPreviewIndex(songIndex);
                    onPlay?.(previewSong);
                  }}
                >
                  <span className={styles.miniPlayerCompactCover}>
                    {previewSong.coverArt ? <img src={previewSong.coverArt} alt="" draggable={false} /> : null}
                  </span>
                  <span className={styles.miniPlayerCompactTitle}>{previewSong.title}</span>
                  <span className={styles.miniPlayerCompactDuration}>{formatPreviewDuration(previewSong.duration)}</span>
                  {active && isPlaying ? <PauseIcon size={12} /> : <PlayIconSmall size={12} />}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function ArtistPreviewCard() {
  return (
    <div className={playlistCardStyles.shell}>
      <PlaylistCardShell
        className={`${playlistCardStyles.card} ${styles.artistCard}`}
        squareMedia
        mediaClassName={styles.artistMedia}
        media={<span className={styles.previewImage} aria-hidden="true" />}
        overlays={<ArtistMiniPlayer artistName="Artist preview" trackCount={0} songs={[]} />}
        details={
          <div className={styles.artistDetails}>
            <div className={playlistCardStyles.copy}>
              <h3>Artist preview</h3>
              <p>Layout placeholder</p>
            </div>

          </div>
        }
      />
    </div>
  );
}

function ArtistCard({ artist, index }: { artist: DirectoryArtist; index: number }) {
  const { currentSong, isPlaying, setQueue, togglePlayPause, seekTo } = usePlayer();
  const image = artist.hero_image_url || artist.profile_image_url;
  const playable = artist.songs.filter((song) => Boolean(song.audioUrl));
  const hasActiveSong = playable.some((song) => song.id === currentSong?.id);
  const href = `/artists/${artist.slug}`;

  function playSong(song: Song) {
    setQueue(playable);
    togglePlayPause(song);
  }

  return (
    <div className={playlistCardStyles.shell}>
      <PlaylistCardShell
        href={href}
        ariaLabel={`Explore ${artist.name}`}
        className={`${playlistCardStyles.card} ${styles.artistCard}${hasActiveSong ? ` ${styles.artistCardActive}` : ""}`}
        squareMedia
        mediaClassName={styles.artistMedia}
        media={
          image ? (
            <img
              className={playlistCardStyles.media}
              src={image}
              alt=""
              loading={index < 4 ? "eager" : "lazy"}
              style={{ objectPosition: `${artist.hero_image_position_x}% ${artist.hero_image_position_y}%` }}
            />
          ) : (
            <span className={styles.artistFallback} aria-hidden="true">{artist.name.slice(0, 1)}</span>
          )
        }
        overlays={
          <>
            <ArtistMiniPlayer
              artistName={artist.name}
              trackCount={artist.track_count}
              songs={playable}
              currentSongId={currentSong?.id}
              isPlaying={isPlaying}
              onPlay={playSong}
              onSeek={(song, progress) => seekTo(song, progress, Boolean(isPlaying && currentSong?.id === song.id))}
            />
          </>
        }
        details={
          <Link className={styles.artistDetails} href={href} aria-label={`Explore artist ${artist.name}`}>
            <div className={playlistCardStyles.copy}>
              <h3 className={styles.artistName}>{artist.name}</h3>
              {artist.designation ? <p>{artist.designation}</p> : null}
            </div>
            <span className={styles.artistExplore}>
              <span className={styles.artistExploreText}>Explore artist</span>
              <ArrowUpRightIcon size={17} strokeWidth={1.5} />
            </span>
          </Link>
        }
      />
    </div>
  );
}

export default function ArtistsPage() {
  const [artists, setArtists] = useState<DirectoryArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const controller = new AbortController();

    async function loadArtists() {
      try {
        const response = await fetch("/api/artists/directory", { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Unable to load artists");
        setArtists(Array.isArray(data?.artists) ? data.artists : []);
      } catch (cause) {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : "Unable to load artists");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadArtists();
    return () => controller.abort();
  }, []);

  const visibleArtists = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return artists.filter((artist) => {
      if (!search) return true;
      return [artist.name, artist.designation ?? "", artist.intro_text ?? "", ...artist.genres]
        .some((text) => text.toLocaleLowerCase().includes(search));
    });
  }, [artists, query]);

  const showPreviews = !query.trim();
  const cards = [
    ...visibleArtists.map((artist) => ({ kind: "artist" as const, artist })),
    ...(showPreviews
      ? Array.from({ length: PREVIEW_CARD_COUNT }, (_, index) => ({ kind: "preview" as const, index }))
      : []),
  ];

  return (
    <main className={`${styles.page} artists-page-root`}>
      <div className="audioflume-experiment-search">
        <div
          className="audioflume-experiment-search-row"
          onClick={(event) => {
            if (
              event.target instanceof Element &&
              event.target.closest(".audioflume-experiment-search-field") &&
              !event.target.closest("button")
            ) {
              event.currentTarget.querySelector<HTMLInputElement>(".audioflume-experiment-search-field input")?.focus();
            }
          }}
        >
          <Link className="audioflume-experiment-search-filter" href="/music?filters=open">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4v16M12 4v16M19 4v16M2 8h6M9 15h6M16 10h6" /></svg>
            <span>Filters</span>
          </Link>
          <label className="audioflume-experiment-search-field">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16 16 4.5 4.5" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search artists by name, genre or keyword"
              aria-label="Search artists by name, genre or keyword"
            />
            {query.length > 0 ? (
              <button type="button" className="audioflume-experiment-search-clear" onClick={() => setQuery("")} aria-label="Clear search">
                <XIcon size={8} strokeWidth={1.4} />
              </button>
            ) : null}
          </label>
          <GlobalReferenceSearch className="audioflume-experiment-search-similar" />
        </div>
      </div>
      <div className={styles.content}>
        {loading ? (
          <div className={styles.grid} aria-label="Loading artists">
            {Array.from({ length: 9 }, (_, index) => (
              <div className={styles.skeletonCard} key={index}>
                <div className={styles.skeleton} />
                <div className={styles.skeletonTitle} />
                <div className={styles.skeletonSubtitle} />
              </div>
            ))}
          </div>
        ) : error ? (
          <p className={styles.message} role="alert">{error}</p>
        ) : visibleArtists.length === 0 ? (
          <MusicLibraryEmptyState
            title="No artists found"
            description="Clear a filter or search for something different."
          />
        ) : (
          <section className={styles.grid} aria-label="Artists">
            {cards.map((card, index) => (
              card.kind === "artist" ? (
                <ArtistCard key={card.artist.id} artist={card.artist} index={index} />
              ) : (
                <ArtistPreviewCard key={`preview-${card.index}`} />
              )
            ))}
          </section>
        )}
      </div>
      <Footer showTopBorder={false} />
    </main>
  );
}
