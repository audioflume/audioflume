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

function formatTrackCount(count?: number) {
  const safeCount = Number(count || 0);
  return `${safeCount} track${safeCount === 1 ? "" : "s"}`;
}

function DiscoverHero({
  backgroundImage,
}: {
  backgroundImage: string | null;
}) {
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
      {backgroundImage ? (
        <Image
          src={backgroundImage}
          alt=""
          fill
          priority
          unoptimized
          sizes="100vw"
          className="discover-hero-image"
        />
      ) : (
        <div className="discover-hero-fallback" aria-hidden="true" />
      )}

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
      <div className="discover-section-heading">
        <h2>Explore these moods</h2>
        <div className="discover-shelf-controls" aria-label="Mood shelf controls">
          <button
            type="button"
            aria-label="Previous moods"
            disabled={!canScrollPrev}
            onClick={() => scroll("prev")}
          >
            <ChevronLeftIcon size={14} />
          </button>
          <button
            type="button"
            aria-label="Next moods"
            disabled={!canScrollNext}
            onClick={() => scroll("next")}
          >
            <ChevronRightIcon size={14} />
          </button>
        </div>
      </div>

      <div ref={scrollerRef} className="discover-mood-scroller">
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
                className="discover-mood-card"
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
                  <span className="discover-card-arrow" aria-hidden="true">
                    <ArrowUpRightIcon />
                  </span>
                </div>
                <h3>{playlist.name}</h3>
                {playlist.description && <p>{playlist.description}</p>}
              </Link>
            ))}
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

  const heroImage = useMemo(
    () =>
      discoverBlocks.find((playlist) => playlist.cover_image_url)
        ?.cover_image_url ??
      playlists.find((playlist) => playlist.cover_image_url)?.cover_image_url ??
      null,
    [discoverBlocks, playlists],
  );

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
    <main className="discover-page-root">
      <DiscoverHero backgroundImage={heroImage} />

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
