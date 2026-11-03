"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import Footer from "@/components/Footer";
import GlobalSearchBar from "@/components/GlobalSearchBar";
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
};

const INITIAL_GENRE_LIMIT = 14;
const PREVIEW_CARD_COUNT = 8;
const MASONRY_COLUMN_COUNT = 3;

function ArtistPreviewCard({ index }: { index: number }) {
  return (
    <div className={`${styles.previewCard} ${styles[`cardShape${index % 6}`]}`} aria-label="Artist layout preview">
      <span className={styles.previewIndex}>{String(index + 1).padStart(2, "0")} / PREVIEW</span>
      <span className={styles.previewContent}>
        <span>ARTIST DIRECTORY</span>
        <strong>Artist preview</strong>
        <span>Layout placeholder</span>
      </span>
    </div>
  );
}

function ArtistCard({ artist, index }: { artist: DirectoryArtist; index: number }) {
  const image = artist.hero_image_url || artist.profile_image_url;
  const primaryGenre = artist.genres[0] ?? artist.designation ?? "Artist";

  return (
    <article className={`${styles.card} ${styles[`cardShape${index % 6}`]}`}>
      <Link className={styles.cardLink} href={`/artists/${artist.slug}`} aria-label={`Explore ${artist.name}`}>
        {image ? (
          <img
            className={styles.cardImage}
            src={image}
            alt=""
            loading={index < 4 ? "eager" : "lazy"}
            style={{ objectPosition: `${artist.hero_image_position_x}% ${artist.hero_image_position_y}%` }}
          />
        ) : (
          <span className={styles.cardFallback} aria-hidden="true">{artist.name.slice(0, 1)}</span>
        )}
        <span className={styles.cardShade} aria-hidden="true" />
        <span className={styles.cardIndex} aria-hidden="true">{String(index + 1).padStart(2, "0")} / ARTIST</span>
        <span className={styles.cardContent}>
          <span className={styles.cardDetail}>{primaryGenre}</span>
          <strong className={styles.cardName}>{artist.name}</strong>
          <span className={styles.cardBottom}>
            <span>{artist.designation || (artist.track_count ? `${artist.track_count} ${artist.track_count === 1 ? "track" : "tracks"}` : "Explore artist")}</span>
            <span className={styles.cardArrow} aria-hidden="true">↗</span>
          </span>
        </span>
      </Link>
    </article>
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
          <div className={styles.introTop}>
            <span className={styles.eyebrow}>AUDIOFLUME / ARTIST DIRECTORY</span>
            <span className={styles.introCount}>{loading ? "—" : String(artists.length).padStart(2, "0")} ARTISTS</span>
          </div>
          <h1>Discover the people<br className={styles.titleBreak} /> behind the sound.</h1>
          <p>Independent artists and composers creating the music behind the stories we tell.</p>
        </header>

        <section className={styles.browser} aria-label="Browse artists">
          <div className={styles.browserTop}>
            <form className={styles.searchForm} role="search" onSubmit={(event) => event.preventDefault()}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.5" /><path d="m16 16 5 5" /></svg>
              <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search artists" aria-label="Search artists" />
              {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear artist search">×</button>}
            </form>
            <span className={styles.resultsCount}>{loading ? "LOADING ARTISTS" : `${visibleArtists.length} ${visibleArtists.length === 1 ? "RESULT" : "RESULTS"}`}</span>
          </div>
          {!loading && genres.length > 0 && (
            <div className={styles.filters}>
              <div className={styles.genrePills} role="group" aria-label="Filter artists by genre">
                <button type="button" className={`${styles.genrePill} ${activeGenre === null ? styles.genrePillActive : ""}`} aria-pressed={activeGenre === null} onClick={() => setActiveGenre(null)}>All genres</button>
                {displayedGenres.map(([genre]) => (
                  <button key={genre} type="button" className={`${styles.genrePill} ${activeGenre === genre ? styles.genrePillActive : ""}`} aria-pressed={activeGenre === genre} onClick={() => setActiveGenre(activeGenre === genre ? null : genre)}>{genre}</button>
                ))}
                {genres.length > INITIAL_GENRE_LIMIT && (
                  <button type="button" className={styles.moreGenres} onClick={() => setShowAllGenres(!showAllGenres)} aria-expanded={showAllGenres}>
                    {showAllGenres ? "Show less −" : `All genres +${genres.length - INITIAL_GENRE_LIMIT}`}
                  </button>
                )}
              </div>
            </div>
          )}
        </section>

        {loading ? (
          <div className={styles.grid} aria-label="Loading artists">
            {Array.from({ length: 9 }, (_, index) => <div key={index} className={`${styles.skeleton} ${styles[`cardShape${index % 6}`]}`} />)}
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
            {Array.from({ length: MASONRY_COLUMN_COUNT }, (_, column) => (
              <div className={styles.column} key={column}>
                {cards.map((card, index) => {
                  if (index % MASONRY_COLUMN_COUNT !== column) return null;
                  return card.kind === "artist" ? (
                    <ArtistCard key={card.artist.id} artist={card.artist} index={index} />
                  ) : (
                    <ArtistPreviewCard key={`preview-${card.index}`} index={index} />
                  );
                })}
              </div>
            ))}
          </section>
        )}
      </div>
      <Footer showTopBorder={false} />
    </main>
  );
}
