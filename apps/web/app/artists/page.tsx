"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import Footer from "@/components/Footer";
import PlaylistCardShell from "@/components/playlists/PlaylistCardShell";
import playlistCardStyles from "@/components/curated/CuratedPlaylistCard.module.css";
import GlobalSearchBar from "@/components/GlobalSearchBar";
import XIcon from "@/components/icons/XIcon";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import PauseIcon from "@/components/icons/PauseIcon";
import { usePlayer } from "@/context/PlayerContext";
import type { Song } from "@/lib/types";
import "@/components/curated/curated-browse-filters.css";
import styles from "./page.module.css";

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

function ArtistPreviewCard() {
  return (
    <div className={playlistCardStyles.shell}>
      <PlaylistCardShell
        className={playlistCardStyles.card}
        squareMedia
        mediaClassName={styles.artistMedia}
        media={<span className={styles.previewImage} aria-hidden="true" />}
        overlays={
          <>
            <span className={styles.artistGenres} aria-hidden="true">
              {[0, 1, 2].map((item) => <span className={styles.genrePlaceholder} key={item} />)}
            </span>
            <button type="button" className={styles.artistPlay} disabled aria-label="Preview artist unavailable">
              <PlayIconSmall size={18} />
            </button>
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
  const { currentSong, isPlaying, setQueue, togglePlayPause } = usePlayer();
  const image = artist.hero_image_url || artist.profile_image_url;
  const playable = artist.songs.filter((song) => Boolean(song.audioUrl));
  const artistIsPlaying = Boolean(
    isPlaying && currentSong && playable.some((song) => song.id === currentSong.id),
  );
  const href = `/artists/${artist.slug}`;

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
    <div className={playlistCardStyles.shell}>
      <PlaylistCardShell
        href={href}
        ariaLabel={`Explore ${artist.name}`}
        className={playlistCardStyles.card}
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
            <button
              type="button"
              className={styles.artistPlay}
              onClick={playArtist}
              disabled={!playable.length}
              aria-label={artistIsPlaying ? `Pause ${artist.name}` : `Play ${artist.name}`}
            >
              {artistIsPlaying ? <PauseIcon size={18} /> : <PlayIconSmall size={18} />}
            </button>
          </>
        }
        details={
          <div className={playlistCardStyles.details}>
            <Link className={playlistCardStyles.copy} href={href}>
              <h3>{artist.name}</h3>
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
    <main className={styles.page}>
      <GlobalSearchBar layer="high" position="flow" />
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
