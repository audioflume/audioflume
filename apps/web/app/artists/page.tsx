"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import Footer from "@/components/Footer";
import PlaylistCardShell from "@/components/playlists/PlaylistCardShell";
import playlistCardStyles from "@/components/curated/CuratedPlaylistCard.module.css";
import HomeExperimentSearch from "@/components/HomeExperimentSearch";
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

const INITIAL_GENRE_LIMIT = 14;
const PREVIEW_CARD_COUNT = 8;

const ARTIST_HOVER_SONG_COUNT = 6;

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
          {previews.length > 0 ? ` · Preview ${index + 1} of ${previews.length}` : ""}
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
        overlays={
          <>
            <span className={styles.artistGenres} aria-hidden="true">
              {[0, 1, 2].map((item) => <span className={styles.genrePlaceholder} key={item} />)}
            </span>
            <ArtistMiniPlayer artistName="Artist preview" trackCount={0} songs={[]} />
          </>
        }
        details={
          <div className={playlistCardStyles.details}>
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
        className={`${playlistCardStyles.card} ${styles.artistCard}`}
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
            <span className={styles.artistGenres} aria-label="Artist genres">
              {artist.genres.length
                ? artist.genres.slice(0, 3).map((genre) => (
                    <Link className={styles.artistGenre} href={`/music?genre=${encodeURIComponent(genre)}`} key={genre}>{genre}</Link>
                  ))
                : [0, 1, 2].map((item) => <span className={styles.genrePlaceholder} aria-hidden="true" key={item} />)}
            </span>
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
          <div className={playlistCardStyles.details}>
            <Link className={playlistCardStyles.copy} href={href}>
              <h3 className={styles.artistName}>{artist.name} <ArrowUpRightIcon size={17} strokeWidth={1.5} className={styles.artistNameArrow} /></h3>
              {artist.designation ? <p>{artist.designation}</p> : null}
            </Link>
          </div>
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
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [showAllGenres, setShowAllGenres] = useState(false);
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

  const genres = useMemo(() => {
    const counts = new Map<string, number>();
    for (const artist of artists) {
      for (const genre of artist.genres) counts.set(genre, (counts.get(genre) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [artists]);

  const visibleArtists = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return artists.filter((artist) => {
      if (activeGenre && !artist.genres.includes(activeGenre)) return false;
      if (!search) return true;
      return [artist.name, artist.designation ?? "", artist.intro_text ?? "", ...artist.genres]
        .some((text) => text.toLocaleLowerCase().includes(search));
    });
  }, [artists, query, activeGenre]);

  const displayedGenres = showAllGenres ? genres : genres.slice(0, INITIAL_GENRE_LIMIT);
  const showPreviews = !query.trim() && !activeGenre;
  const cards = [
    ...visibleArtists.map((artist) => ({ kind: "artist" as const, artist })),
    ...(showPreviews
      ? Array.from({ length: PREVIEW_CARD_COUNT }, (_, index) => ({ kind: "preview" as const, index }))
      : []),
  ];

  return (
    <main className={`${styles.page} artists-page-root`}>
      <HomeExperimentSearch />
      <div className={styles.content}>
        <header className={styles.intro}>
          <h1>Discover the artists &amp;<br className={styles.titleBreak} /> composers behind the sound</h1>
        </header>

        <section className={styles.browser} aria-label="Browse artists">
          <div className={styles.genrePills} role="group" aria-label="Search and filter artists">
            <form className={`curated-pill-search ${styles.searchForm}`} role="search" onSubmit={(event) => event.preventDefault()}>
              <span className="curated-pill-search-toggle is-active" aria-hidden="true">
                <svg viewBox="0 0 20 20">
                  <circle cx="8" cy="8" r="5.25" />
                  <path d="m11.9 11.9 4.1 4.1" />
                </svg>
              </span>
              <div className="curated-pill-search-field-wrap">
                <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search artists" aria-label="Search artists" />
                {query && (
                  <button type="button" className="curated-pill-search-clear" onClick={() => setQuery("")} aria-label="Clear artist search">
                    <XIcon size={12} strokeWidth={2.4} />
                  </button>
                )}
              </div>
            </form>
            {!loading && genres.length > 0 && (
              <>
                <button type="button" className={`curated-main-filter-pill ${styles.genreFilterPill}${activeGenre === null ? " is-active" : ""}`} aria-pressed={activeGenre === null} onClick={() => setActiveGenre(null)}>All genres</button>
                {displayedGenres.map(([genre]) => (
                  <button key={genre} type="button" className={`curated-main-filter-pill ${styles.genreFilterPill}${activeGenre === genre ? " is-active" : ""}`} aria-pressed={activeGenre === genre} onClick={() => setActiveGenre(activeGenre === genre ? null : genre)}>{genre}</button>
                ))}
                {genres.length > INITIAL_GENRE_LIMIT && (
                  <button type="button" className={`curated-main-filter-pill ${styles.genreFilterPill}`} onClick={() => setShowAllGenres(!showAllGenres)} aria-expanded={showAllGenres}>
                    {showAllGenres ? "Show less −" : `All genres +${genres.length - INITIAL_GENRE_LIMIT}`}
                  </button>
                )}
              </>
            )}
          </div>
        </section>

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
          <div className={styles.empty}>
            <p>{artists.length === 0 ? "No artists are available yet." : "No artists match your search."}</p>
            {(query || activeGenre) && <button type="button" onClick={() => { setQuery(""); setActiveGenre(null); }}>Clear filters</button>}
          </div>
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
