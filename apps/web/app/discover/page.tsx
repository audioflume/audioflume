"use client";

import { MusicListShell } from "@filmwave/shared";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import ArrowUpRightIcon from "@/components/icons/ArrowUpRightIcon";
import ChevronLeftIcon from "@/components/icons/ChevronLeftIcon";
import ChevronRightIcon from "@/components/icons/ChevronRightIcon";
import SearchIcon from "@/components/icons/SearchIcon";
import Footer from "@/components/Footer";
import SongCard from "@/components/SongCard";
import { usePlayer } from "@/context/PlayerContext";
import { useSongs } from "@/hooks/useSongs";
import type { CuratedPlaylist } from "@/lib/curatedPlaylists";

import "../music/music-library-redesign.css";

const NEW_SONG_COUNT = 10;
const HERO_BACKGROUND_IMAGE =
  "https://images.filmwave.io/images/discover/donny-jiang-KFTPuUsIFME-unsplash.jpg";

function formatTrackCount(count?: number) {
  const safeCount = Number(count || 0);
  return `${safeCount} track${safeCount === 1 ? "" : "s"}`;
}

function DiscoverHero() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanSearch = search.trim();
    router.push(
      cleanSearch
        ? `/music?search=${encodeURIComponent(cleanSearch)}`
        : "/music",
    );
  }

  return (
    <section className="discover-hero" aria-label="Discover music">
      <Image
        src={HERO_BACKGROUND_IMAGE}
        alt=""
        fill
        priority
        unoptimized
        sizes="100vw"
        className="discover-hero-image"
      />

      <div className="discover-hero-overlay" aria-hidden="true" />

      <div className="discover-hero-inner">
        <div className="discover-hero-content">
          <h1>Find the cue that fits the scene</h1>

          <form className="discover-hero-search" onSubmit={handleSubmit}>
            <span className="discover-hero-search-icon" aria-hidden="true">
              <SearchIcon size={14} />
            </span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search music library"
              aria-label="Search music library"
            />
            <button type="submit">Search</button>
          </form>

          <div className="discover-hero-values">
            <div>
              <strong>Human curated music library</strong>
              <span>
                Human-picked tracks, thoughtful moods, and music chosen for real
                edits.
              </span>
            </div>
            <div>
              <strong>Thousands of sound effects</strong>
              <span>
                Thousands of sound effects, textures, and details for richer
                edits.
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DiscoverMoodShelf({
  playlists,
  loading,
}: {
  playlists: CuratedPlaylist[];
  loading: boolean;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

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

    scroller.scrollBy({
      left:
        direction === "next"
          ? Math.max(scroller.clientWidth * 0.82, 360)
          : -Math.max(scroller.clientWidth * 0.82, 360),
      behavior: "smooth",
    });
  }

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    updateScrollState();
    scroller.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    return () => {
      scroller.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [playlists.length, loading]);

  if (!loading && playlists.length === 0) return null;

  return (
    <section className="discover-section discover-mood-section">
      <style>{`
        .discover-mood-section .curated-playlist-shelf-viewport {
          margin-left: calc(var(--discover-page-gutter) * -1);
          margin-right: calc(var(--discover-page-gutter) * -1);
          overflow: hidden;
        }

        .discover-mood-section .curated-playlist-shelf-scroller {
          padding-left: var(--discover-page-gutter);
          padding-right: 5rem;
        }

        .discover-mood-section .curated-playlist-shelf-prev-floating {
          left: 2rem;
        }

        .discover-mood-section .discover-mood-shelf-floating {
          top: calc((min(43vw, 560px) / 1.72) / 2);
        }

        .discover-mood-section .playlist-gallery-card {
          position: relative;
          min-width: 0;
          cursor: pointer;
        }

        .discover-mood-section .playlist-gallery-top-row {
          position: relative;
          z-index: 4;
          display: flex;
          justify-content: flex-end;
          padding: 16px;
        }

        .discover-mood-section .playlist-gallery-arrow {
          display: flex;
          width: 32px;
          height: 32px;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.12);
          color: white;
          backdrop-filter: blur(12px);
          transition: background 0.15s ease, color 0.15s ease, transform 0.15s ease;
        }

        .discover-mood-section .playlist-gallery-card:hover .playlist-gallery-arrow,
        .discover-mood-section .playlist-gallery-card.is-menu-open .playlist-gallery-arrow {
          background: white;
          color: black;
        }

        @media (max-width: 980px) {
          .discover-mood-section .discover-mood-shelf-floating {
            top: calc((min(68vw, 500px) / 1.72) / 2);
          }
        }

        @media (max-width: 720px) {
          .discover-mood-section .discover-mood-shelf-floating {
            top: calc((82vw / 1.72) / 2);
          }
        }
      `}</style>

      <div className="discover-section-heading">
        <h2>Explore these moods</h2>

        <div className="hidden items-center gap-2 sm:flex">
          <button
            type="button"
            onClick={() => scroll("prev")}
            disabled={!canScrollPrev}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition hover:border-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:pointer-events-none disabled:opacity-30"
            aria-label="Scroll Explore these moods left"
          >
            <ChevronLeftIcon size={16} />
          </button>

          <button
            type="button"
            onClick={() => scroll("next")}
            disabled={!canScrollNext}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition hover:border-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:pointer-events-none disabled:opacity-30"
            aria-label="Scroll Explore these moods right"
          >
            <ChevronRightIcon size={16} />
          </button>
        </div>
      </div>

      <div className="group/playlist-shelf curated-playlist-shelf-viewport relative">
        <button
          type="button"
          onClick={() => scroll("prev")}
          disabled={!canScrollPrev}
          className="discover-mood-shelf-floating curated-playlist-shelf-prev-floating absolute top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white text-black opacity-0 shadow-[0_12px_34px_rgba(0,0,0,0.25)] transition hover:scale-105 group-hover/playlist-shelf:opacity-100 disabled:pointer-events-none disabled:opacity-0 sm:flex"
          aria-label="Scroll Explore these moods left"
        >
          <ChevronLeftIcon size={18} />
        </button>

        <button
          type="button"
          onClick={() => scroll("next")}
          disabled={!canScrollNext}
          className="discover-mood-shelf-floating absolute right-8 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white text-black opacity-0 shadow-[0_12px_34px_rgba(0,0,0,0.25)] transition hover:scale-105 group-hover/playlist-shelf:opacity-100 disabled:pointer-events-none disabled:opacity-0 sm:flex"
          aria-label="Scroll Explore these moods right"
        >
          <ChevronRightIcon size={18} />
        </button>

        <div
          ref={scrollerRef}
          className="curated-playlist-shelf-scroller flex gap-3 overflow-x-auto overflow-y-hidden scroll-smooth overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {loading
            ? Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="discover-mood-card discover-card-skeleton"
                  aria-hidden="true"
                />
              ))
            : playlists.map((playlist) => (
                <Link
                  key={playlist.id}
                  href={`/curated-playlists/${playlist.id}`}
                  className="discover-mood-card playlist-gallery-card"
                >
                  <div className="discover-mood-image">
                    {playlist.cover_image_url ? (
                      <Image
                        src={playlist.cover_image_url}
                        alt={playlist.name}
                        fill
                        unoptimized
                        sizes="(min-width: 1280px) 34vw, (min-width: 768px) 55vw, 84vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="discover-media-fallback" />
                    )}

                    <div className="playlist-gallery-top-row">
                      <div className="playlist-gallery-arrow">
                        <ArrowUpRightIcon />
                      </div>
                    </div>
                  </div>
                  <h3>{playlist.name}</h3>
                  {playlist.description && <p>{playlist.description}</p>}
                </Link>
              ))}
        </div>
      </div>
    </section>
  );
}

function DiscoverPlaylistGrid({
  playlists,
  loading,
}: {
  playlists: CuratedPlaylist[];
  loading: boolean;
}) {
  if (!loading && playlists.length === 0) return null;

  return (
    <section className="discover-section">
      <div className="discover-section-heading">
        <h2>Curated playlists</h2>
      </div>

      <div className="discover-playlist-grid">
        {loading
          ? Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="discover-playlist-card discover-card-skeleton"
                aria-hidden="true"
              />
            ))
          : playlists.map((playlist) => (
              <Link
                key={playlist.id}
                href={`/curated-playlists/${playlist.id}`}
                className="discover-playlist-card"
              >
                <div className="discover-playlist-image">
                  {playlist.cover_image_url ? (
                    <Image
                      src={playlist.cover_image_url}
                      alt={playlist.name}
                      fill
                      unoptimized
                      sizes="(min-width: 1400px) 18vw, (min-width: 900px) 24vw, 46vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="discover-media-fallback" />
                  )}
                </div>
                <h3>{playlist.name}</h3>
                <p>{formatTrackCount(playlist.song_count)}</p>
              </Link>
            ))}
      </div>
    </section>
  );
}

function DiscoverSongs({
  songs,
  loading,
}: {
  songs: ReturnType<typeof useSongs>["songs"];
  loading: boolean;
}) {
  if (!loading && songs.length === 0) return null;

  return (
    <section className="discover-section discover-song-section">
      <MusicListShell
        title="Newly added tracks"
        meta={loading ? undefined : `${songs.length} tracks`}
      >
        {loading
          ? Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="discover-song-skeleton discover-card-skeleton"
                aria-hidden="true"
              />
            ))
          : songs.map((song) => <SongCard key={song.id} song={song} />)}
      </MusicListShell>
    </section>
  );
}

export default function DiscoverPage() {
  const { songs, loading: songsLoading } = useSongs();
  const { currentSong, setQueue } = usePlayer();
  const [playlists, setPlaylists] = useState<CuratedPlaylist[]>([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/curated-playlists")
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data)) {
          setPlaylists(data as CuratedPlaylist[]);
        }
      })
      .catch(() => {
        if (!cancelled) setPlaylists([]);
      })
      .finally(() => {
        if (!cancelled) setPlaylistsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const discoverBlocks = useMemo(
    () =>
      playlists
        .filter((playlist) =>
          playlist.discover_section?.startsWith("discover_block_"),
        )
        .sort((a, b) =>
          (a.discover_section ?? "").localeCompare(b.discover_section ?? ""),
        ),
    [playlists],
  );

  const curatedPlaylists = useMemo(() => {
    const selected = playlists
      .filter(
        (playlist) => playlist.show_on_discover && !playlist.discover_section,
      )
      .sort((a, b) => a.discover_position - b.discover_position);

    if (selected.length > 0) return selected;

    return playlists
      .filter((playlist) => Boolean(playlist.cover_image_url))
      .sort((a, b) => a.position - b.position)
      .slice(0, 10);
  }, [playlists]);

  const playableSongs = useMemo(
    () => songs.filter((song) => Boolean(song.audioUrl)),
    [songs],
  );
  const recentSongs = playableSongs.slice(0, NEW_SONG_COUNT);
  const playerVisible = Boolean(currentSong);

  useEffect(() => {
    if (!songsLoading) setQueue(playableSongs);
  }, [playableSongs, setQueue, songsLoading]);

  return (
    <main className="discover-page-root" style={{ marginLeft: 0 }}>
      <DiscoverHero />

      <div className="discover-content">
        <DiscoverMoodShelf
          playlists={discoverBlocks}
          loading={playlistsLoading}
        />
        <DiscoverPlaylistGrid
          playlists={curatedPlaylists}
          loading={playlistsLoading}
        />
        <DiscoverSongs songs={recentSongs} loading={songsLoading} />

        <div
          className="discover-footer-wrap"
          style={{ paddingBottom: playerVisible ? "72px" : "8px" }}
        >
          <Footer />
        </div>
      </div>
    </main>
  );
}
