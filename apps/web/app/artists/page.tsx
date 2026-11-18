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
import WaveformIcon from "@/components/icons/WaveformIcon";
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
  onClose,
}: {
  artistName: string;
  trackCount: number;
  songs: Song[];
  currentSongId?: string;
  isPlaying?: boolean;
  onPlay?: (song: Song) => void;
  onSeek?: (song: Song, progress: number) => void;
  onClose?: () => void;
}) {
  const { currentTime, duration } = usePlayerProgress();
  const [previewIndex, setPreviewIndex] = useState(0);
  const previews = songs;
  const index = Math.min(previewIndex, Math.max(0, previews.length - 1));
  const activeSongIndex = previews.findIndex((preview) => preview.id === currentSongId);
  const listIndex = activeSongIndex >= 0 ? activeSongIndex : index;
  const listSong = previews[listIndex];
  const listPlaying = Boolean(listSong && currentSongId === listSong.id && isPlaying);
  const listProgress = listSong && currentSongId === listSong.id && duration > 0
    ? Math.min(100, Math.max(0, (currentTime / duration) * 100))
    : 0;

  return (
    <div className={styles.miniPlayer} aria-label={`Preview music by ${artistName}`}>
      {onClose ? (
        <button
          type="button"
          className={styles.miniPlayerClose}
          aria-label={`Close ${artistName} song preview`}
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
        >
          <XIcon size={18} strokeWidth={1.4} />
        </button>
      ) : null}
      <div className={styles.miniPlayerUpper}>
        <div className={styles.miniPlayerArt}>
          {listSong?.coverArt ? <img src={listSong.coverArt} alt="" draggable={false} /> : null}
        </div>
        <div className={styles.miniPlayerSongInfo}>
          <span className={styles.miniPlayerSongTitle}>{listSong?.title ?? "No preview available"}</span>
          {listSong ? <span className={styles.miniPlayerSongDuration}>{formatPreviewDuration(listSong.duration)}</span> : null}
        </div>
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
      <div className={styles.miniPlayerListFooter}>
        <div className={styles.miniPlayerListControls}>
          <button
            type="button"
            className={styles.miniPlayerSkip}
            aria-label={`Previous song from ${artistName}`}
            disabled={previews.length < 2}
            onClick={(event) => {
              event.stopPropagation();
              const nextIndex = (listIndex - 1 + previews.length) % previews.length;
              setPreviewIndex(nextIndex);
              onPlay?.(previews[nextIndex]);
            }}
          >
            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true">
              <path d="M5 5h2v14H5zM19 5v14L8 12z" />
            </svg>
          </button>
          <button
            type="button"
            className={styles.miniPlayerListPlay}
            aria-label={listSong ? `${listPlaying ? "Pause" : "Play"} ${listSong.title}` : "No preview available"}
            disabled={!listSong}
            onClick={(event) => {
              event.stopPropagation();
              if (listSong) onPlay?.(listSong);
            }}
          >
            {listPlaying ? <PauseIcon size={18} /> : <PlayIconSmall size={18} />}
          </button>
          <button
            type="button"
            className={styles.miniPlayerSkip}
            aria-label={`Next song from ${artistName}`}
            disabled={previews.length < 2}
            onClick={(event) => {
              event.stopPropagation();
              const nextIndex = (listIndex + 1) % previews.length;
              setPreviewIndex(nextIndex);
              onPlay?.(previews[nextIndex]);
            }}
          >
            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true">
              <path d="M17 5h2v14h-2zM5 5l11 7-11 7z" />
            </svg>
          </button>
        </div>
        <input
          type="range"
          className={styles.miniPlayerListProgress}
          min={0}
          max={100}
          step={0.1}
          value={listProgress}
          disabled={!listSong}
          aria-label={listSong ? `Seek within ${listSong.title}` : "No song to seek"}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => {
            event.stopPropagation();
            if (listSong) onSeek?.(listSong, Number(event.target.value) / 100);
          }}
        />
        <span className={styles.miniPlayerListCount}>{trackCount} {trackCount === 1 ? "song" : "songs"}</span>
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

function ArtistCard({
  artist,
  index,
  openArtistId,
  onOpen,
  onClose,
}: {
  artist: DirectoryArtist;
  index: number;
  openArtistId: string | null;
  onOpen: (artistId: string) => void;
  onClose: () => void;
}) {
  const { currentSong, isPlaying, setQueue, togglePlayPause, seekTo } = usePlayer();
  const image = artist.hero_image_url || artist.profile_image_url;
  const playable = artist.songs.filter((song) => Boolean(song.audioUrl));
  const hasActiveSong = playable.some((song) => song.id === currentSong?.id);
  const previewOpen = openArtistId === artist.id;
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
        className={`${playlistCardStyles.card} ${styles.artistCard}${hasActiveSong ? ` ${styles.artistCardActive}` : ""}${previewOpen ? ` ${styles.artistCardPreviewOpen}` : ""}`}
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
            <button
              type="button"
              className={styles.cardPlay}
              disabled={previewOpen}
              aria-label={`Open song preview for ${artist.name}`}
              onClick={(event) => {
                event.stopPropagation();
                onOpen(artist.id);
                if (playable.length) {
                  if (!hasActiveSong) {
                    playSong(playable[0]);
                  }
                } else if (isPlaying && currentSong) {
                  togglePlayPause(currentSong);
                }
              }}
            >
              {hasActiveSong && isPlaying ? (
                <span className={styles.cardPlayingWaveform}>
                  <WaveformIcon size={18} />
                </span>
              ) : (
                <PlayIconSmall size={15} />
              )}
            </button>
            {hasActiveSong && isPlaying && !previewOpen ? (
              <span className={`${styles.cardPlayingWaveform} ${styles.cardCornerWaveform}`} aria-label={`${artist.name} is playing`} role="status">
                <WaveformIcon size={18} />
              </span>
            ) : null}
            {previewOpen ? (
              <ArtistMiniPlayer
                artistName={artist.name}
                trackCount={artist.track_count}
                songs={playable}
                currentSongId={currentSong?.id}
                isPlaying={isPlaying}
                onPlay={playSong}
                onSeek={(song, progress) => seekTo(song, progress, Boolean(isPlaying && currentSong?.id === song.id))}
                onClose={onClose}
              />
            ) : null}
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
  const [openArtistId, setOpenArtistId] = useState<string | null>(null);
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
                <ArtistCard
                  key={card.artist.id}
                  artist={card.artist}
                  index={index}
                  openArtistId={openArtistId}
                  onOpen={setOpenArtistId}
                  onClose={() => setOpenArtistId(null)}
                />
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
