"use client";

import { MusicListShell } from "@filmwave/shared";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";

import Footer from "@/components/Footer";
import GlobalSearchBar from "@/components/GlobalSearchBar";
import GlobalReferenceSearch from "@/components/GlobalReferenceSearch";
import PricingHeroImageFlash from "./pricing/PricingHeroImageFlash";
import SongCard from "@/components/SongCard";
import { CuratedPlaylistCard } from "@/components/curated/CuratedPlaylistShelf";
import type { CuratedPlaylist } from "@/lib/curatedPlaylists";
import ChevronLeftIcon from "@/components/icons/ChevronLeftIcon";
import ChevronRightIcon from "@/components/icons/ChevronRightIcon";
import PauseIcon from "@/components/icons/PauseIcon";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import XIcon from "@/components/icons/XIcon";
import {
  useHasCurrentSong,
  useIsCurrentSongPlaying,
  usePlayer,
} from "@/context/PlayerContext";
import { useSongs } from "@/hooks/useSongs";
import { useTheme } from "@/context/ThemeContext";
import type { Song } from "@/lib/types";

const NEW_SONG_COUNT = 10;
const HOME_SHELF_SONG_COUNT = 12;
const HOME_HERO_IMAGE =
  "https://images.filmwave.io/images/home/thomas-kinto-qYqbehR-wSI-unsplash.jpg";
const HOME_UI_GRAPHIC_DARK =
  "https://images.filmwave.io/images/home/UI-Dark.png";
const HOME_UI_GRAPHIC_LIGHT =
  "https://images.filmwave.io/images/home/UI-Light.png";

type HomeArtist = {
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

function Shelf({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
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
    const amount = Math.max(scroller.clientWidth * 0.8, 360);
    scroller.scrollBy({
      left: direction === "next" ? amount : -amount,
      behavior: "smooth",
    });
  }

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    updateScrollState();
    scroller.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    const observer = new ResizeObserver(updateScrollState);
    observer.observe(scroller);

    return () => {
      scroller.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
      observer.disconnect();
    };
  }, []);

  return (
    <div className={`audioflume-home-reference-shelf group/home-reference-shelf ${className}`}>
      <button
        type="button"
        className="audioflume-home-reference-shelf-arrow is-left"
        onClick={() => scroll("prev")}
        disabled={!canScrollPrev}
        aria-label={`Scroll ${label} left`}
      >
        <ChevronLeftIcon size={18} />
      </button>

      <div ref={scrollerRef} className="audioflume-home-reference-shelf-scroller">
        {children}
      </div>

      <button
        type="button"
        className="audioflume-home-reference-shelf-arrow is-right"
        onClick={() => scroll("next")}
        disabled={!canScrollNext}
        aria-label={`Scroll ${label} right`}
      >
        <ChevronRightIcon size={18} />
      </button>
    </div>
  );
}

function HomeSongCard({ song }: { song: Song }) {
  const { togglePlayPause } = usePlayer();
  const playing = useIsCurrentSongPlaying(song.id);

  return (
    <article
      className={`audioflume-home-reference-song-card${playing ? " is-playing" : ""}`}
    >
      <button
        type="button"
        className="audioflume-home-reference-song-card-play"
        onClick={() => togglePlayPause(song)}
        aria-label={playing ? `Pause ${song.title}` : `Play ${song.title}`}
      >
        {song.coverArt ? (
          <>
            <span
              className="audioflume-home-reference-song-card-background"
              style={{ backgroundImage: `url("${song.coverArt}")` }}
              aria-hidden="true"
            />
            <span className="audioflume-home-reference-song-card-art">
              <img src={song.coverArt} alt="" draggable={false} />
              <span className="audioflume-home-reference-song-card-art-icon">
                {playing ? <PauseIcon size={14} /> : <PlayIconSmall size={14} />}
              </span>
            </span>
          </>
        ) : (
          <span className="audioflume-home-reference-song-card-fallback" />
        )}
        <span className="audioflume-home-reference-song-card-copy">
          <strong>{song.title}</strong>
          <span>{song.artist}</span>
        </span>
      </button>
    </article>
  );
}

function HomeSongShelf({
  songs,
  label = "featured tracks",
}: {
  songs: Song[];
  label?: string;
}) {
  return (
    <Shelf label={label} className="audioflume-home-reference-song-shelf">
      {songs.map((song) => (
        <HomeSongCard key={song.id} song={song} />
      ))}
    </Shelf>
  );
}

function HomeOriginalSongCard({ song }: { song: Song }) {
  const { togglePlayPause } = usePlayer();
  const playing = useIsCurrentSongPlaying(song.id);

  return (
    <article
      className={`audioflume-home-reference-original-song-card${playing ? " is-playing" : ""}`}
    >
      <button
        type="button"
        className="audioflume-home-reference-original-song-card-play"
        onClick={() => togglePlayPause(song)}
        aria-label={playing ? `Pause ${song.title}` : `Play ${song.title}`}
      >
        {song.coverArt ? (
          <img src={song.coverArt} alt="" draggable={false} />
        ) : (
          <span className="audioflume-home-reference-original-song-card-fallback" />
        )}
        <span className="audioflume-home-reference-original-song-card-icon">
          {playing ? <PauseIcon size={14} /> : <PlayIconSmall size={14} />}
        </span>
      </button>
      <span className="audioflume-home-reference-original-song-card-copy">
        <strong>{song.title}</strong>
        <span>{song.artist}</span>
      </span>
    </article>
  );
}

function HomeOriginalSongGrid({ songs }: { songs: Song[] }) {
  return (
    <div className="audioflume-home-reference-original-song-grid">
      {songs.map((song) => (
        <HomeOriginalSongCard key={song.id} song={song} />
      ))}
    </div>
  );
}

function HomeTrendingSection({ songs }: { songs: Song[] }) {
  const visibleSongs = songs.slice(0, 7);

  if (visibleSongs.length === 0) return null;

  return (
    <section className="audioflume-home-reference-trending">
      <div className="audioflume-home-reference-width audioflume-home-reference-section-heading">
        <span>New &amp; Trending Music</span>
        <Link href="/music">Explore New Music</Link>
      </div>
      <div className="audioflume-home-reference-width audioflume-home-reference-trending-grid">
        <div className="audioflume-home-reference-trending-visual">
          <div className="audioflume-home-reference-trending-copy">
            <div className="audioflume-home-reference-trending-title">
              <span>New &amp; Trending</span>
              <span className="audioflume-home-reference-trending-title-row">
                <span>Music</span>
                <small>New music added daily.<br />120+ new songs this month.</small>
              </span>
            </div>
          </div>
        </div>

        <div className="audioflume-home-reference-trending-list">
          {visibleSongs.map((song) => (
            <SongCard key={song.id} song={song} showDivider={false} />
          ))}
        </div>
      </div>
    </section>
  );
}

function HomeArtistShelf({
  artists,
}: {
  artists: HomeArtist[];
}) {
  const { currentSong, isPlaying, setQueue, togglePlayPause } = usePlayer();

  function playArtist(event: MouseEvent, artist: HomeArtist) {
    event.preventDefault();
    event.stopPropagation();

    const playable = artist.songs.filter((song) => Boolean(song.audioUrl));
    if (!playable.length) return;

    const artistIsPlaying = Boolean(
      isPlaying &&
        currentSong &&
        playable.some((song) => song.id === currentSong.id),
    );

    if (artistIsPlaying && currentSong) {
      togglePlayPause(currentSong);
      return;
    }

    setQueue(playable);
    togglePlayPause(playable[0]);
  }

  return (
    <Shelf label="in demand artists" className="audioflume-home-reference-artist-shelf">
      {artists.map((artist, index) => {
        const image = artist.hero_image_url || artist.profile_image_url || "";
        const playable = artist.songs.filter((song) => Boolean(song.audioUrl));
        const genres = Array.from(
          new Set(
            artist.songs.flatMap((song) =>
              Array.isArray(song.genres) ? song.genres.filter(Boolean) : [],
            ),
          ),
        ).slice(0, 3);
        const artistIsPlaying = Boolean(
          isPlaying &&
            currentSong &&
            playable.some((song) => song.id === currentSong.id),
        );

        return (
          <article
            key={artist.id}
            className={`audioflume-home-reference-artist-card${index === 0 ? " is-featured" : ""}`}
          >
            <Link href={`/artists/${artist.slug}`} className="audioflume-home-reference-artist-link">
              <div className="audioflume-home-reference-artist-media">
                {image ? (
                  <img
                    src={image}
                    alt=""
                    draggable={false}
                    style={{
                      objectPosition: `${artist.hero_image_position_x ?? 50}% ${artist.hero_image_position_y ?? 50}%`,
                    }}
                  />
                ) : null}
              </div>
              <div className="audioflume-home-reference-artist-bar">
                <span className="audioflume-home-reference-artist-copy">
                  <strong>{artist.name}</strong>
                  <span className="audioflume-home-reference-artist-genres">
                    {genres.length > 0
                      ? genres.map((genre) => <span key={genre}>{genre}</span>)
                      : [0, 1, 2].map((placeholder) => (
                          <span
                            key={placeholder}
                            className="is-placeholder"
                            aria-hidden="true"
                          />
                        ))}
                  </span>
                </span>
              </div>
            </Link>
            <button
              type="button"
              className="audioflume-home-reference-artist-play"
              onClick={(event) => playArtist(event, artist)}
              disabled={!playable.length}
              aria-label={artistIsPlaying ? `Pause ${artist.name}` : `Play ${artist.name}`}
            >
              {artistIsPlaying ? <PauseIcon size={14} /> : <PlayIconSmall size={14} />}
            </button>
          </article>
        );
      })}
    </Shelf>
  );
}

function HomeSkeletonBlock({
  className = "",
}: {
  className?: string;
}) {
  return (
    <span
      className={`audioflume-home-skeleton-block${className ? ` ${className}` : ""}`}
      aria-hidden="true"
    />
  );
}


function HomeTrendingSkeleton() {
  return (
    <section className="audioflume-home-reference-trending">
      <div className="audioflume-home-reference-width audioflume-home-reference-section-heading">
        <span>New &amp; Trending Music</span>
        <Link href="/music">Explore New Music</Link>
      </div>
      <div className="audioflume-home-reference-width audioflume-home-reference-trending-grid">
        <div className="audioflume-home-skeleton-trending-visual">
          <HomeSkeletonBlock className="is-trending-title" />
          <HomeSkeletonBlock className="is-trending-copy" />
        </div>
        <div className="audioflume-home-reference-trending-list audioflume-home-skeleton-trending-list">
          {Array.from({ length: 7 }, (_, index) => (
            <div key={index} className="audioflume-home-skeleton-trending-row">
              <HomeSkeletonBlock className="is-trending-cover" />
              <div className="audioflume-home-skeleton-trending-row-copy">
                <HomeSkeletonBlock className="is-trending-song-title" />
                <HomeSkeletonBlock className="is-trending-artist" />
              </div>
              <HomeSkeletonBlock className="is-trending-action" />
              <HomeSkeletonBlock className="is-trending-license" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HomeSongShelfSkeleton() {
  return (
    <div className="audioflume-home-reference-shelf audioflume-home-reference-song-shelf audioflume-home-skeleton-song-shelf">
      <div className="audioflume-home-reference-shelf-scroller">
        {Array.from({ length: 4 }, (_, index) => (
          <article
            key={index}
            className="audioflume-home-reference-song-card audioflume-home-skeleton-song-card"
          >
            <HomeSkeletonBlock className="is-song-art" />
            <div className="audioflume-home-skeleton-song-copy">
              <HomeSkeletonBlock className="is-song-title" />
              <HomeSkeletonBlock className="is-song-artist" />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function HomeArtistShelfSkeleton() {
  return (
    <div className="audioflume-home-reference-shelf audioflume-home-reference-artist-shelf audioflume-home-skeleton-artist-shelf">
      <div className="audioflume-home-reference-shelf-scroller">
        {Array.from({ length: 3 }, (_, index) => (
          <article
            key={index}
            className="audioflume-home-reference-artist-card audioflume-home-skeleton-artist-card"
          >
            <HomeSkeletonBlock className="is-artist-media" />
            <div className="audioflume-home-skeleton-artist-meta">
              <HomeSkeletonBlock className="is-artist-name" />
              <div className="audioflume-home-skeleton-artist-pills">
                <HomeSkeletonBlock className="is-artist-pill" />
                <HomeSkeletonBlock className="is-artist-pill is-short" />
                <HomeSkeletonBlock className="is-artist-pill" />
              </div>
            </div>
            <HomeSkeletonBlock className="is-artist-play" />
          </article>
        ))}
      </div>
    </div>
  );
}

function HomeCuratedPlaylistSkeleton() {
  return (
    <div className="audioflume-home-reference-playlist-grid audioflume-home-skeleton-playlist-grid">
      {Array.from({ length: 6 }, (_, index) => (
        <article key={index} className="audioflume-home-skeleton-playlist-card">
          <HomeSkeletonBlock className="is-playlist-media" />
          <HomeSkeletonBlock className="is-playlist-title" />
          <HomeSkeletonBlock className="is-playlist-meta" />
        </article>
      ))}
    </div>
  );
}

function HomeOriginalsSkeleton() {
  return (
    <div className="audioflume-home-reference-original-song-grid audioflume-home-skeleton-original-grid">
      {Array.from({ length: 12 }, (_, index) => (
        <article key={index} className="audioflume-home-reference-original-song-card">
          <HomeSkeletonBlock className="is-original-media" />
          <div className="audioflume-home-skeleton-original-copy">
            <HomeSkeletonBlock className="is-original-title" />
            <HomeSkeletonBlock className="is-original-artist" />
          </div>
        </article>
      ))}
    </div>
  );
}

function HomeSongRowsSkeleton() {
  return (
    <div className="audioflume-home-skeleton-song-rows">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="audioflume-home-skeleton-song-row">
          <HomeSkeletonBlock className="is-row-cover" />
          <HomeSkeletonBlock className="is-row-vocal" />
          <div className="audioflume-home-skeleton-row-copy">
            <HomeSkeletonBlock className="is-row-title" />
            <HomeSkeletonBlock className="is-row-artist" />
          </div>
          <HomeSkeletonBlock className="is-row-waveform" />
          <HomeSkeletonBlock className="is-row-duration" />
          <HomeSkeletonBlock className="is-row-genre" />
          <HomeSkeletonBlock className="is-row-key" />
          <HomeSkeletonBlock className="is-row-bpm" />
          <HomeSkeletonBlock className="is-row-actions" />
          <HomeSkeletonBlock className="is-row-license" />
        </div>
      ))}
    </div>
  );
}

export default function HomePageContent({
  homeFlashImages,
}: {
  homeFlashImages: string[];
}) {
  const { songs, loading: songsLoading } = useSongs();
  const { theme, setTheme } = useTheme();
  const { setQueue } = usePlayer();
  const playerVisible = useHasCurrentSong();
  const [artists, setArtists] = useState<HomeArtist[]>([]);
  const [artistsLoading, setArtistsLoading] = useState(true);
  const [curatedPlaylists, setCuratedPlaylists] = useState<CuratedPlaylist[]>([]);
  const [curatedPlaylistsLoading, setCuratedPlaylistsLoading] = useState(true);

  const playableSongs = useMemo(
    () => songs.filter((song) => Boolean(song.audioUrl)),
    [songs],
  );
  const audioflumeOriginalSongs = playableSongs
    .filter(
      (song) =>
        song.artist.trim().localeCompare("Audioflume", undefined, {
          sensitivity: "base",
        }) === 0,
    )
    .slice(0, 12);
  const originalSongs = playableSongs.slice(
    HOME_SHELF_SONG_COUNT,
    HOME_SHELF_SONG_COUNT + 12,
  );
  const recentSongs = playableSongs.slice(0, NEW_SONG_COUNT);

  useEffect(() => {
    if (!songsLoading) setQueue(playableSongs);
  }, [playableSongs, setQueue, songsLoading]);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/curated-playlists")
      .then((response) => response.json())
      .then((data) => {
        if (cancelled) return;

        setCuratedPlaylists(
          Array.isArray(data)
            ? data.filter((playlist) => !playlist.discover_section).slice(0, 6)
            : [],
        );
      })
      .catch(() => {
        if (!cancelled) setCuratedPlaylists([]);
      })
      .finally(() => {
        if (!cancelled) setCuratedPlaylistsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetch("/api/discover-featured-artists").then((response) => response.json()),
      fetch("/api/discover-feature-card-artists").then((response) => response.json()),
    ])
      .then(([featured, cards]) => {
        if (cancelled) return;

        const combined = [
          ...(Array.isArray(featured?.artists) ? featured.artists : []),
          ...(Array.isArray(cards?.artists) ? cards.artists : []),
        ] as HomeArtist[];

        const unique = Array.from(
          new Map(combined.map((artist) => [artist.id, artist])).values(),
        );

        setArtists(unique);
      })
      .catch(() => {
        if (!cancelled) setArtists([]);
      })
      .finally(() => {
        if (!cancelled) setArtistsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className={`audioflume-home-reference${playerVisible ? " has-player" : ""}`}>
      <GlobalSearchBar />

      <section
        className="audioflume-home-reference-hero"
        style={{ backgroundImage: `url("${HOME_HERO_IMAGE}")` }}
      >
        <div className="audioflume-home-reference-hero-shade" />
        <h1>Human made music &amp; SFX for film.</h1>

        <div className="audioflume-home-reference-width audioflume-home-reference-hero-trust">
          <p>Filmmakers working for these brands already use Audioflume.</p>
          <div className="audioflume-home-reference-logo-row" aria-label="Brand work">
            <img
              src="https://images.filmwave.io/images/home/logos.png"
              alt="Brands using Audioflume"
              draggable={false}
            />
          </div>
        </div>
      </section>

      <section className="audioflume-home-reference-ui-showcase">
        <img
          className="audioflume-home-reference-ui-graphic is-dark"
          src={HOME_UI_GRAPHIC_DARK}
          alt="Audioflume music library interface"
          draggable={false}
        />
        <img
          className="audioflume-home-reference-ui-graphic is-light"
          src={HOME_UI_GRAPHIC_LIGHT}
          alt=""
          aria-hidden="true"
          draggable={false}
        />
        <div className="audioflume-home-reference-width audioflume-home-reference-ui-overlay">
          <h2>An extensive library of music curated for film.</h2>
          <Link href="/sign-up">Create Free Account</Link>
        </div>

        <button
          type="button"
          className="audioflume-home-reference-ui-theme-toggle"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label={theme === "dark" ? "Use light mode" : "Use dark mode"}
        >
          {theme === "dark" ? (
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <circle cx="10" cy="10" r="3.25" />
              <path d="M10 2.25v2M10 15.75v2M2.25 10h2M15.75 10h2M4.52 4.52l1.42 1.42M14.06 14.06l1.42 1.42M15.48 4.52l-1.42 1.42M5.94 14.06l-1.42 1.42" />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M15.8 12.65A6.35 6.35 0 0 1 7.35 4.2 6.35 6.35 0 1 0 15.8 12.65Z" />
            </svg>
          )}
        </button>
      </section>

      <section className="audioflume-home-reference-feature-pair">
        <div className="audioflume-home-reference-width audioflume-home-reference-feature-pair-intro">
          A growing catalogue built around cinematic storytelling
        </div>

        <div className="audioflume-home-reference-width audioflume-home-reference-feature-pair-grid">
          <div className="audioflume-home-reference-feature-pair-column">
            <div className="audioflume-home-reference-feature-pair-card is-artists">
              <PricingHeroImageFlash
                images={homeFlashImages}
                mediaClassName="audioflume-home-feature-flash-media"
              />
              <h2>
                <span>In demand</span>
                <span>artists</span>
                <span>&amp; composers.</span>
              </h2>
              <Link className="audioflume-home-reference-feature-pair-link" href="/discover">
                Explore Artists
              </Link>
            </div>
          </div>

          <div className="audioflume-home-reference-feature-pair-column">
            <div className="audioflume-home-reference-feature-pair-card is-playlists">
              <h2>Curated playlists<br />made for editors.</h2>
              <Link className="audioflume-home-reference-feature-pair-link" href="/curated-playlists">
                Explore Playlists
              </Link>
            </div>
          </div>
        </div>
      </section>

      {songsLoading ? <HomeTrendingSkeleton /> : <HomeTrendingSection songs={recentSongs} />}

      <section className="audioflume-home-reference-tools">
        <div className="audioflume-home-reference-width audioflume-home-reference-tools-grid">
          <div className="audioflume-home-reference-tools-column is-blank">
            <div className="audioflume-home-reference-section-heading">
              <span>Section Title</span>
            </div>
            <div className="audioflume-home-reference-tool-card audioflume-home-reference-blank-card" />
          </div>

          <div className="audioflume-home-reference-tools-column is-reference-search">
            <div className="audioflume-home-reference-section-heading">
              <span>Search by Song</span>
            </div>
            <div className="audioflume-home-reference-tool-card audioflume-home-reference-search-by-song-card">
              <GlobalReferenceSearch embedded />
            </div>
          </div>
        </div>

        <div className="audioflume-home-reference-tools-originals">
          <div className="audioflume-home-reference-width audioflume-home-reference-section-heading">
            <span>Audioflume Originals</span>
            <Link href="/music?artist=Audioflume">Explore Original Music</Link>
          </div>
          <div className="audioflume-home-reference-tool-card audioflume-home-reference-exclusives-card">
            <HomeOriginalSongGrid songs={audioflumeOriginalSongs} />
          </div>
        </div>
      </section>

      <section className="audioflume-home-reference-new-songs">
        <div className="audioflume-home-reference-width audioflume-home-reference-section-heading">
          <span>Newly Added Songs</span>
          <Link href="/music">Explore New Music</Link>
        </div>
        <div className="audioflume-home-reference-width">
          <MusicListShell title={null}>
            {recentSongs.map((song) => (
              <SongCard key={song.id} song={song} />
            ))}
          </MusicListShell>
        </div>
      </section>

      <section className="audioflume-home-reference-library">
        <div className="audioflume-home-reference-width audioflume-home-reference-library-grid">
          <div className="audioflume-home-reference-library-copy">
            <h2>An extensive library of music curated for film.</h2>
          </div>
          <p>
            A growing catalogue built around cinematic storytelling, featuring music and SFX
            from in-demand artists and composers. Curated to make finding distinctive, usable
            tracks faster across film, commercial and branded work.
          </p>
        </div>

        <div className="audioflume-home-reference-width audioflume-home-reference-feature-grid">
          <div>
            <h3>Human made music &amp; SFX.</h3>
            <p>
              Original work created by independent artists and sound designers,
              built around picture, pacing and story.
            </p>
          </div>
          <div>
            <h3>Playlists built around the scene.</h3>
            <p>
              Curated by people who understand how music works against picture,
              so the right track is easier to find.
            </p>
          </div>
          <div>
            <h3>Support real world artists.</h3>
            <p>
              Music comes from real artists and composers, with licensing built
              around sustainable creative work.
            </p>
          </div>
          <div>
            <h3>Subscription, premium &amp; bespoke.</h3>
            <p>
              Flexible licensing for everyday edits, larger productions, enterprise access,
              and custom commissioned work.
            </p>
          </div>
        </div>
      </section>

      <div className="audioflume-home-reference-footer-region">
        <Footer className="audioflume-home-reference-footer" />
      </div>
    </main>
  );
}
