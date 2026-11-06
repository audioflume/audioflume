"use client";

import GenreFilterPills from "@/components/GenreFilterPills";
import artistCardStyles from "./artists/page.module.css";

import { MusicListShell } from "@filmwave/shared";
import Link from "next/link";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

import Footer from "@/components/Footer";
import { AudioflumeMark } from "@/components/LifetimeAccessCard";
import { DiscoverLifetimeAccess } from "./DiscoverPricingSections";
import HomeSectionWithHeading from "./HomeSectionWithHeading";
import GlobalSearchBar from "@/components/GlobalSearchBar";
import GlobalReferenceSearch from "@/components/GlobalReferenceSearch";
import PricingHeroImageFlash from "./pricing/PricingHeroImageFlash";
import SongCard from "@/components/SongCard";
import { CuratedPlaylistCard } from "@/components/curated/CuratedPlaylistShelf";
import CuratedPlaylistPlayButton from "@/components/curated/CuratedPlaylistPlayButton";
import CuratedPlaylistBookmarkButton from "@/components/curated/CuratedPlaylistBookmarkButton";
import type { CuratedPlaylist } from "@/lib/curatedPlaylists";
import ArrowUpRightIcon from "@/components/icons/ArrowUpRightIcon";
import ChevronLeftIcon from "@/components/icons/ChevronLeftIcon";
import ChevronRightIcon from "@/components/icons/ChevronRightIcon";
import PauseIcon from "@/components/icons/PauseIcon";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import WaveformIcon from "@/components/icons/WaveformIcon";
import XIcon from "@/components/icons/XIcon";
import {
  useHasCurrentSong,
  useIsCurrentSongPlaying,
  usePlayer,
} from "@/context/PlayerContext";
import { useSongs } from "@/hooks/useSongs";
import type { Song } from "@/lib/types";

const HOME_HERO_IMAGE =
  "https://images.filmwave.io/images/artist-signup/soundtrap-7pAguituFGo-unsplash-web.jpg";

const NEW_SONG_COUNT = 12;
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
  customScrollbar = false,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  customScrollbar?: boolean;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [scrollbarThumb, setScrollbarThumb] = useState({ left: 0, width: 0 });
  const scrollbarTrackRef = useRef<HTMLDivElement>(null);
  const inertiaFrameRef = useRef<number | null>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startScrollLeft: number;
    lastTime: number;
    velocity: number;
  } | null>(null);

  function updateScrollState() {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;
    setCanScrollPrev(scroller.scrollLeft > 4);
    setCanScrollNext(scroller.scrollLeft < maxScrollLeft - 4);

    if (customScrollbar) {
      const track = scrollbarTrackRef.current;
      if (!track || maxScrollLeft <= 0) {
        setScrollbarThumb({ left: 0, width: track?.clientWidth ?? 0 });
        return;
      }

      const trackWidth = track.clientWidth;
      const thumbWidth = Math.min(240, trackWidth);
      const thumbTravel = Math.max(0, trackWidth - thumbWidth);
      const left = thumbTravel * (scroller.scrollLeft / maxScrollLeft);
      setScrollbarThumb({ left, width: thumbWidth });
    }
  }

  function stopScrollbarInertia() {
    if (inertiaFrameRef.current !== null) {
      window.cancelAnimationFrame(inertiaFrameRef.current);
      inertiaFrameRef.current = null;
    }
  }

  function startScrollbarInertia(initialVelocity: number) {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    stopScrollbarInertia();

    let velocity = initialVelocity;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const currentScroller = scrollerRef.current;
      if (!currentScroller) return;

      const dt = Math.min(32, now - lastTime);
      lastTime = now;
      currentScroller.scrollLeft += velocity * dt;
      velocity *= Math.pow(0.92, dt / 16);

      const maxScrollLeft =
        currentScroller.scrollWidth - currentScroller.clientWidth;
      const atEdge =
        currentScroller.scrollLeft <= 0 ||
        currentScroller.scrollLeft >= maxScrollLeft;

      if (Math.abs(velocity) < 0.02 || atEdge) {
        inertiaFrameRef.current = null;
        currentScroller.style.scrollSnapType = "";
        currentScroller.style.scrollBehavior = "";
        return;
      }

      inertiaFrameRef.current = window.requestAnimationFrame(tick);
    };

    inertiaFrameRef.current = window.requestAnimationFrame(tick);
  }

  function handleScrollbarPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const scroller = scrollerRef.current;
    const track = scrollbarTrackRef.current;
    if (!scroller || !track) return;

    stopScrollbarInertia();
    event.currentTarget.setPointerCapture(event.pointerId);
    scroller.style.scrollSnapType = "none";
    scroller.style.scrollBehavior = "auto";

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: scroller.scrollLeft,
      lastTime: performance.now(),
      velocity: 0,
    };
  }

  function handleScrollbarPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const scroller = scrollerRef.current;
    const track = scrollbarTrackRef.current;
    const drag = dragStateRef.current;
    if (!scroller || !track || !drag || drag.pointerId !== event.pointerId) return;

    const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;
    const thumbTravel = Math.max(1, track.clientWidth - scrollbarThumb.width);
    const scrollPerPixel = maxScrollLeft / thumbTravel;
    const nextScrollLeft =
      drag.startScrollLeft + (event.clientX - drag.startX) * scrollPerPixel;

    const now = performance.now();
    const dt = Math.max(1, now - drag.lastTime);
    const previousScrollLeft = scroller.scrollLeft;

    scroller.scrollLeft = Math.max(0, Math.min(nextScrollLeft, maxScrollLeft));
    drag.velocity = (scroller.scrollLeft - previousScrollLeft) / dt;
    drag.lastTime = now;
  }

  function handleScrollbarPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const scroller = scrollerRef.current;
    const drag = dragStateRef.current;
    if (!scroller || !drag || drag.pointerId !== event.pointerId) return;

    event.currentTarget.releasePointerCapture(event.pointerId);
    dragStateRef.current = null;

    if (Math.abs(drag.velocity) >= 0.02) {
      startScrollbarInertia(drag.velocity);
      return;
    }

    scroller.style.scrollSnapType = "";
    scroller.style.scrollBehavior = "";
  }

  function scroll(direction: "prev" | "next") {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const current = scroller.scrollLeft;
    const styles = getComputedStyle(scroller);
    const leftInset = parseFloat(styles.paddingLeft) || 0;
    const rightInset = parseFloat(styles.paddingRight) || 0;
    const visibleWidth = scroller.clientWidth - leftInset - rightInset;
    const bounds = scroller.getBoundingClientRect();
    const cards = Array.from(scroller.children, (child) => {
      const rect = child.getBoundingClientRect();
      return {
        start: rect.left - bounds.left + current - leftInset,
        width: rect.width,
      };
    });
    if (!cards.length) return;

    const firstFullyVisible = cards.findIndex(
      (card) => card.start >= current - 1 && card.start + card.width <= current + visibleWidth + 1,
    );
    const visibleCount = Math.max(
      1,
      cards.filter(
        (card) => card.start >= current - 1 && card.start + card.width <= current + visibleWidth + 1,
      ).length,
    );
    const anchor = firstFullyVisible >= 0
      ? firstFullyVisible
      : Math.max(0, cards.findIndex((card) => card.start > current));

    const targetIndex = Math.max(
      0,
      Math.min(cards.length - 1, anchor + (direction === "next" ? visibleCount : -visibleCount)),
    );
    scroller.scrollTo({ left: cards[targetIndex].start, behavior: "smooth" });
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
      stopScrollbarInertia();
      scroller.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
      observer.disconnect();
    };
  }, [customScrollbar]);


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

      {customScrollbar ? (
        <div
          ref={scrollbarTrackRef}
          className="audioflume-home-reference-shelf-scrollbar"
          aria-hidden="true"
        >
          <div
            className="audioflume-home-reference-shelf-scrollbar-thumb"
            style={{
              width: `${scrollbarThumb.width}px`,
              transform: `translateX(${scrollbarThumb.left}px)`,
            }}
            onPointerDown={handleScrollbarPointerDown}
            onPointerMove={handleScrollbarPointerMove}
            onPointerUp={handleScrollbarPointerUp}
            onPointerCancel={handleScrollbarPointerUp}
          />
        </div>
      ) : null}


    </div>
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
        onClick={(event) => {
          event.stopPropagation();
          togglePlayPause(song);
        }}
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
        <strong className="audioflume-home-song-title">{song.title}</strong>
        <span className="audioflume-home-song-artist">{song.artist}</span>
      </span>
    </article>
  );
}

function HomeOriginalSongGrid({ songs }: { songs: Song[] }) {
  return (
    <div className="audioflume-home-reference-original-song-grid">
      {songs.slice(0, 16).map((song) => (
        <HomeOriginalSongCard key={song.id} song={song} />
      ))}
    </div>
  );
}

function getHomeTrackFallbackGradient(index: number) {
  const gradients = [
    "linear-gradient(135deg, #372f4f 0%, #111111 48%, #75649a 100%)",
    "linear-gradient(135deg, #1f3d3a 0%, #111111 52%, #4d8c7b 100%)",
    "linear-gradient(135deg, #4f3529 0%, #111111 50%, #b66c45 100%)",
    "linear-gradient(135deg, #25364f 0%, #111111 52%, #6287c4 100%)",
    "linear-gradient(135deg, #45233d 0%, #111111 52%, #b75d91 100%)",
  ];

  return gradients[index % gradients.length];
}

function stopHomeTrackMouseEvent(event: MouseEvent<HTMLElement>) {
  event.preventDefault();
  event.stopPropagation();
  event.nativeEvent.stopImmediatePropagation();
}

function stopHomeTrackKeyEvent(event: KeyboardEvent<HTMLElement>) {
  event.preventDefault();
  event.stopPropagation();
  event.nativeEvent.stopImmediatePropagation();
}

function HomeReadyToCutCoverImage({
  song,
  index,
}: {
  song: Song;
  index: number;
}) {
  return (
    <div
      className="relative h-9 w-9 shrink-0 overflow-hidden bg-[var(--bg-tertiary)]"
      style={{
        background: song.coverArt
          ? undefined
          : getHomeTrackFallbackGradient(index),
      }}
    >
      {song.coverArt ? (
        <img
          src={song.coverArt}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-[var(--text-muted)]">
          <WaveformIcon size={20} />
        </div>
      )}

    </div>
  );
}

function HomeReadyToCutSongCard({
  song,
  index,
  queue,
}: {
  song: Song;
  index: number;
  queue: Song[];
}) {
  const { currentSong, isPlaying, setQueue, togglePlayPause } = usePlayer();
  const active = currentSong?.id === song.id;
  const playing = active && isPlaying;

  function playSong() {
    if (!song.audioUrl) return;
    setQueue(queue);
    togglePlayPause(song);
  }

  return (
    <article
      role="button"
      tabIndex={song.audioUrl ? 0 : -1}
      onClick={(event) => {
        stopHomeTrackMouseEvent(event);
        playSong();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        stopHomeTrackKeyEvent(event);
        if (!event.repeat) playSong();
      }}
      onKeyUp={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        stopHomeTrackKeyEvent(event);
      }}
      className="audioflume-home-ready-track-card group flex h-[54px] cursor-pointer items-center gap-2 bg-[color-mix(in_srgb,var(--bg-primary)_96%,var(--text-primary)_4%)] px-2 transition hover:bg-[color-mix(in_srgb,var(--bg-primary)_94%,var(--text-primary)_6%)] focus:outline-none focus-visible:bg-[color-mix(in_srgb,var(--bg-primary)_94%,var(--text-primary)_6%)]"
      aria-label={`Play ${song.title} by ${song.artist}`}
    >
      <HomeReadyToCutCoverImage song={song} index={index} />

      <div className="min-w-0 flex-1">
        <h3 className="audioflume-home-song-title truncate text-[var(--text-primary)]">
          {song.title}
        </h3>

        <div className="mt-1.5 flex min-w-0 items-center text-[var(--text-muted)]">
          <span className="audioflume-home-song-artist truncate">{song.artist}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={(event) => {
          stopHomeTrackMouseEvent(event);
          playSong();
        }}
        className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white text-black transition hover:scale-105 disabled:cursor-default disabled:opacity-50"
        disabled={!song.audioUrl}
        aria-label={playing ? `Pause ${song.title}` : `Play ${song.title}`}
      >
        {playing ? <PauseIcon size={15} /> : <PlayIconSmall size={15} />}
      </button>
    </article>
  );
}

function HomeArtistShelf({
  artists,
  homeFlashImages,
  compact = false,
  discoverLayout = false,
}: {
  artists: HomeArtist[];
  homeFlashImages: string[];
  compact?: boolean;
  discoverLayout?: boolean;
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
    <Shelf
      label="in demand artists"
      className={`audioflume-home-reference-artist-shelf${compact ? " is-compact" : ""}${discoverLayout ? " is-discover-layout" : ""}`}
      customScrollbar={!compact}
    >
      {artists.map((artist, index) => {
        const image = artist.hero_image_url || artist.profile_image_url || "";
        const playable = artist.songs.filter((song) => Boolean(song.audioUrl));
        const featuredSong = playable[0] ?? artist.songs[0];
        const genres = Array.from(
          new Set(
            artist.songs.flatMap((song) =>
              Array.isArray(song.genres) ? song.genres.filter(Boolean) : [],
            ),
          ),
        );
        const visibleGenres = discoverLayout
          ? [...genres].sort((a, b) => a.localeCompare(b)).slice(0, 3)
          : genres.slice(0, 3);
        const artistIsPlaying = Boolean(
          isPlaying &&
            currentSong &&
            playable.some((song) => song.id === currentSong.id),
        );

        return (
          <article
            key={artist.id}
            className={`audioflume-home-reference-artist-card${index === 0 ? " is-featured" : ""}${discoverLayout ? " is-discover-card" : ""}`}
          >
            <div className="audioflume-home-reference-artist-link">
              <Link href={`/artists/${artist.slug}`} className="audioflume-home-reference-artist-card-overlay-link" aria-label={`View ${artist.name}`} />
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
              {discoverLayout ? (
                <div className="audioflume-discover-featured-identity">
                  <strong className="audioflume-discover-featured-name">{artist.name}</strong>
                  {artist.designation ? (
                    <span className="audioflume-discover-featured-designation">{artist.designation}</span>
                  ) : null}
                </div>
              ) : (
              <div className="audioflume-home-reference-artist-bar">
                <span className="audioflume-home-reference-artist-copy">
                  <strong>{artist.name}</strong>
                  {artist.designation ? (
                    <span className="audioflume-home-reference-artist-designation">
                      {artist.designation}
                    </span>
                  ) : null}
                  {!compact ? <GenreFilterPills genres={visibleGenres} showPlaceholders className="audioflume-home-reference-artist-genres" /> : null}
                </span>
              </div>
              )}
            </div>
            {!compact ? (
              <Link
                href={`/artists/${artist.slug}`}
                className={`${artistCardStyles.cardExplore} audioflume-home-reference-artist-explore`}
                aria-label={`Explore artist ${artist.name}`}
              >
                Explore Artist
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M7 17L17 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                  <path d="M9 7H17V15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            ) : null}
            {discoverLayout && featuredSong ? (
              <>
              <button
                type="button"
                className="audioflume-discover-featured-track"
                onClick={(event) => playArtist(event, artist)}
                disabled={!playable.length}
                aria-label={artistIsPlaying ? `Pause ${artist.name}` : `Play ${artist.name}`}
              >
                <span className="audioflume-discover-featured-track-cover">
                  {featuredSong.coverArt ? <img src={featuredSong.coverArt} alt="" draggable={false} /> : null}
                  {playable.length > 0 ? (
                    <span className="audioflume-discover-featured-track-play" aria-hidden="true">
                      {artistIsPlaying ? <PauseIcon size={15} /> : <PlayIconSmall size={15} />}
                    </span>
                  ) : null}
                </span>
                <span className="audioflume-discover-featured-track-copy">
                  <strong>{featuredSong.title}</strong>
                  <span>{featuredSong.artist || artist.name}</span>
                </span>
              </button>
              <span className="audioflume-genre-filter-pills audioflume-discover-featured-track-genres" aria-label="Artist genres">
                {[0, 1, 2].map((index) => (
                  visibleGenres[index] ? (
                    <Link href={`/music?genre=${encodeURIComponent(visibleGenres[index])}`} className="audioflume-genre-filter-pill" key={visibleGenres[index]}>{visibleGenres[index]}</Link>
                  ) : (
                    <span className="audioflume-genre-filter-pill is-placeholder" key={`placeholder-${index}`} aria-hidden="true" />
                  )
                ))}
              </span>
              </>
            ) : null}
            {!discoverLayout ? <button
              type="button"
              className="audioflume-home-reference-artist-play"
              onClick={(event) => playArtist(event, artist)}
              disabled={!playable.length}
              aria-label={artistIsPlaying ? `Pause ${artist.name}` : `Play ${artist.name}`}
            >
              {artistIsPlaying ? <PauseIcon size={compact ? 15 : 18} /> : <PlayIconSmall size={compact ? 15 : 18} />}
              <span>{artistIsPlaying ? "Pause Music" : "Play Music"}</span>
            </button> : null}
          </article>
        );
      })}
    </Shelf>
  );
}

function HomeCuratedPlaylistShelf({
  playlists,
}: {
  playlists: CuratedPlaylist[];
}) {
  if (playlists.length === 0) return null;

  return (
    <section className="audioflume-home-mockup-curated">
      <div className="audioflume-home-reference-width audioflume-home-mockup-section-label">
        <span>Curated collections made for editors</span>
        <Link
          href="/curated-playlists"
          className="audioflume-arrow-text-link inline-flex items-center gap-[5px]"
        >
          Explore playlists
          <ArrowUpRightIcon
            size={16}
            strokeWidth={1.5}
            className="translate-y-[2px]"
          />
        </Link>
      </div>

      <Shelf
        label="curated playlists"
        className="audioflume-home-mockup-curated-shelf"
      >
        {playlists.map((playlist, index) => (
          <div key={playlist.id} className="audioflume-home-mockup-curated-card-shell">
            <CuratedPlaylistCard playlist={playlist} index={index} variant="home" />
          </div>
        ))}
      </Shelf>
    </section>
  );
}

function HomeFeaturedSongCard({
  song,
  queue,
}: {
  song: Song;
  queue: Song[];
}) {
  const { currentSong, isPlaying, setQueue, togglePlayPause } = usePlayer();
  const active = currentSong?.id === song.id;
  const playing = active && isPlaying;

  function playSong() {
    if (!song.audioUrl) return;
    setQueue(queue);
    togglePlayPause(song);
  }

  return (
    <article
      className={`audioflume-home-featured-song-card${active ? " is-active" : ""}`}
    >
      <button
        type="button"
        className="audioflume-home-featured-song-art"
        onClick={playSong}
        disabled={!song.audioUrl}
        aria-label={playing ? `Pause ${song.title}` : `Play ${song.title}`}
      >
        {song.coverArt ? (
          <img src={song.coverArt} alt="" draggable={false} />
        ) : (
          <span className="audioflume-home-featured-song-fallback">
            <WaveformIcon size={24} />
          </span>
        )}
        <span className="audioflume-home-featured-song-play" aria-hidden="true">
          {playing ? <PauseIcon size={14} /> : <PlayIconSmall size={14} />}
        </span>
      </button>

      <span className="audioflume-home-featured-song-copy">
        <strong className="audioflume-home-song-title">{song.title}</strong>
        <span className="audioflume-home-song-artist">{song.artist}</span>
      </span>
    </article>
  );
}

function HomeCompactSongCard({
  song,
  queue,
}: {
  song: Song;
  queue: Song[];
}) {
  const { currentSong, isPlaying, setQueue, togglePlayPause } = usePlayer();
  const active = currentSong?.id === song.id;
  const playing = active && isPlaying;

  function playSong() {
    if (!song.audioUrl) return;
    setQueue(queue);
    togglePlayPause(song);
  }

  return (
    <button
      type="button"
      className={`audioflume-discover-compact-song${active ? " is-active" : ""}`}
      onClick={playSong}
      disabled={!song.audioUrl}
      aria-label={playing ? `Pause ${song.title}` : `Play ${song.title}`}
    >
      <span className="audioflume-discover-compact-song-art">
        {song.coverArt ? (
          <img src={song.coverArt} alt="" draggable={false} />
        ) : (
          <span className="audioflume-discover-compact-song-fallback">
            <WaveformIcon size={22} />
          </span>
        )}
        <span className="audioflume-discover-compact-song-play" aria-hidden="true">
          <span className="audioflume-discover-compact-song-play-circle">
            {playing ? <PauseIcon size={12} /> : <PlayIconSmall size={12} />}
          </span>
        </span>
      </span>
      <span className="audioflume-discover-compact-song-copy">
        <strong className="audioflume-home-song-title">{song.title}</strong>
        <span className="audioflume-home-song-artist">{song.artist}</span>
      </span>
    </button>
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


function DiscoverCompactSongsSkeleton() {
  return (
    <div className="audioflume-discover-compact-songs audioflume-discover-skeleton-compact-grid" aria-hidden="true">
      {Array.from({ length: 12 }, (_, index) => (
        <div key={index} className="audioflume-discover-compact-song audioflume-discover-skeleton-compact-song">
          <HomeSkeletonBlock className="is-compact-cover" />
          <span className="audioflume-discover-compact-song-copy">
            <HomeSkeletonBlock className="is-compact-title" />
            <HomeSkeletonBlock className="is-compact-artist" />
          </span>
        </div>
      ))}
    </div>
  );
}

function DiscoverFeaturedSongsSkeleton() {
  return (
    <Shelf label="Discover featured songs" className="audioflume-discover-featured-song-shelf audioflume-discover-skeleton-featured-shelf">
      {Array.from({ length: 8 }, (_, index) => (
        <article key={index} className="audioflume-home-featured-song-card audioflume-discover-skeleton-featured-card" aria-hidden="true">
          <HomeSkeletonBlock className="audioflume-home-featured-song-art is-featured-cover" />
          <span className="audioflume-home-featured-song-copy">
            <HomeSkeletonBlock className="is-featured-title" />
            <HomeSkeletonBlock className="is-featured-artist" />
          </span>
        </article>
      ))}
    </Shelf>
  );
}

function HomeTrendingSkeleton({ discoverLayout = false }: { discoverLayout?: boolean }) {
  return (
    <div className="audioflume-home-reference-width grid gap-2 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 12 }, (_, index) => (
        <article
          key={index}
          className={`audioflume-home-ready-track-card audioflume-home-skeleton-ready-track flex h-[54px] items-center gap-4 bg-[color-mix(in_srgb,var(--bg-primary)_96%,var(--text-primary)_4%)] px-2${discoverLayout ? " is-discover-skeleton" : ""}`}
          aria-hidden="true"
        >
          <HomeSkeletonBlock className="is-ready-track-cover" />
          <div className="audioflume-home-skeleton-ready-track-copy">
            <HomeSkeletonBlock className="is-ready-track-title" />
            <HomeSkeletonBlock className="is-ready-track-artist" />
          </div>
          <HomeSkeletonBlock className="is-ready-track-play" />
        </article>
      ))}
    </div>
  );
}

function HomeArtistShelfSkeleton({ compact = false, discoverLayout = false }: { compact?: boolean; discoverLayout?: boolean }) {
  return (
    <Shelf
      label="in demand artists"
      className={`audioflume-home-reference-artist-shelf audioflume-home-skeleton-artist-shelf${compact ? " is-compact" : ""}${discoverLayout ? " is-discover-layout" : ""}`}
      customScrollbar={!compact}
    >
      {Array.from({ length: compact ? 4 : 3 }, (_, index) => (
        <article
          key={index}
          className="audioflume-home-reference-artist-card audioflume-home-skeleton-artist-card"
          aria-hidden="true"
        >
          <div className="audioflume-home-reference-artist-media">
            <HomeSkeletonBlock className="is-artist-media" />
          </div>
          {discoverLayout ? (
            <>
              <div className="audioflume-discover-featured-identity">
                <HomeSkeletonBlock className="is-discover-artist-name" />
              </div>
              <div className="audioflume-discover-featured-track audioflume-discover-skeleton-artist-track">
                <HomeSkeletonBlock className="is-discover-track-cover" />
                <span className="audioflume-discover-featured-track-copy">
                  <HomeSkeletonBlock className="is-discover-track-title" />
                  <HomeSkeletonBlock className="is-discover-track-artist" />
                </span>
              </div>
              <span className="audioflume-genre-filter-pills audioflume-discover-featured-track-genres audioflume-discover-skeleton-artist-genres">
                <HomeSkeletonBlock className="is-discover-genre-pill" />
                <HomeSkeletonBlock className="is-discover-genre-pill" />
                <HomeSkeletonBlock className="is-discover-genre-pill" />
              </span>
            </>
          ) : (
            <>
              <div className="audioflume-home-reference-artist-bar">
                <span className="audioflume-home-reference-artist-copy">
                  <HomeSkeletonBlock className="is-artist-name" />
                  <span className="audioflume-home-reference-artist-genres audioflume-home-skeleton-artist-pills">
                    <HomeSkeletonBlock className="is-artist-pill" />
                    <HomeSkeletonBlock className="is-artist-pill is-short" />
                    <HomeSkeletonBlock className="is-artist-pill" />
                  </span>
                </span>
              </div>
              <HomeSkeletonBlock className="audioflume-home-reference-artist-play is-artist-play" />
            </>
          )}
        </article>
      ))}
    </Shelf>
  );
}

function HomeCuratedPlaylistSkeleton({ discoverLayout = false }: { discoverLayout?: boolean }) {
  return (
    <Shelf
      label="curated playlists"
      className={`audioflume-home-mockup-curated-shelf audioflume-home-skeleton-curated-shelf${discoverLayout ? " is-discover-skeleton" : ""}`}
    >
      {Array.from({ length: 4 }, (_, index) => (
        discoverLayout ? (
          <div key={index} className="audioflume-home-mockup-curated-card-shell">
            <article
              className="audioflume-home-mockup-curated-card audioflume-home-skeleton-playlist-card"
              aria-hidden="true"
            >
              <HomeSkeletonBlock className="is-playlist-media" />
              <HomeSkeletonBlock className="is-playlist-title" />
              <HomeSkeletonBlock className="is-playlist-play" />
            </article>
          </div>
        ) : (
          <article
            key={index}
            className="audioflume-home-mockup-curated-card audioflume-home-skeleton-playlist-card"
            aria-hidden="true"
          >
            <HomeSkeletonBlock className="is-playlist-media" />
            <HomeSkeletonBlock className="is-playlist-title" />
            <HomeSkeletonBlock className="is-playlist-play" />
          </article>
        )
      ))}
    </Shelf>
  );
}

function HomeOriginalsSkeleton() {
  return (
    <div className="audioflume-home-reference-original-song-grid audioflume-home-skeleton-original-grid">
      {Array.from({ length: 16 }, (_, index) => (
        <article
          key={index}
          className="audioflume-home-reference-original-song-card audioflume-home-skeleton-original-card"
          aria-hidden="true"
        >
          <div className="audioflume-home-reference-original-song-card-play">
            <HomeSkeletonBlock className="is-original-media" />
          </div>
          <span className="audioflume-home-reference-original-song-card-copy audioflume-home-skeleton-original-copy">
            <HomeSkeletonBlock className="is-original-title" />
            <HomeSkeletonBlock className="is-original-artist" />
          </span>
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
  showHero = true,
}: {
  homeFlashImages: string[];
  showHero?: boolean;
}) {
  const { songs, loading: songsLoading } = useSongs();
  const { setQueue } = usePlayer();
  const playerVisible = useHasCurrentSong();
  const [artists, setArtists] = useState<HomeArtist[]>([]);
  const [artistsLoading, setArtistsLoading] = useState(true);
  const [configuredDiscoverSongs, setConfiguredDiscoverSongs] = useState<Song[] | null>(null);
  const [discoverFeaturedSongsLoading, setDiscoverFeaturedSongsLoading] = useState(!showHero);
  const [curatedPlaylists, setCuratedPlaylists] = useState<CuratedPlaylist[]>([]);
  const [curatedPlaylistsLoading, setCuratedPlaylistsLoading] = useState(true);
  const discoverHeadingRef = useRef<HTMLHeadingElement>(null);
  const discoverFirstLineMeasureRef = useRef<HTMLSpanElement>(null);
  const [discoverHeadingNeedsNaturalWrap, setDiscoverHeadingNeedsNaturalWrap] = useState(false);
  const catalogueHeadingRef = useRef<HTMLHeadingElement>(null);
  const catalogueFirstLineMeasureRef = useRef<HTMLSpanElement>(null);
  const [catalogueHeadingNaturalWrap, setCatalogueHeadingNaturalWrap] = useState(false);

  const playableSongs = useMemo(
    () => songs.filter((song) => Boolean(song.audioUrl)),
    [songs],
  );
  const originalSongs = playableSongs
    .filter(
      (song) =>
        song.artist.trim().localeCompare("Audioflume", undefined, {
          sensitivity: "base",
        }) === 0,
    )
    .slice(0, 16);
  const recentSongs = playableSongs.slice(0, NEW_SONG_COUNT);
  const discoverCompactSongs = playableSongs.slice(0, 12);
  const discoverArtistSongs = useMemo(() => {
    if (configuredDiscoverSongs?.length) return configuredDiscoverSongs.filter((song) => Boolean(song.audioUrl));
    const selected = new Map<string, Song>();
    for (const artist of artists) {
      for (const song of artist.songs) {
        if (song.audioUrl && !selected.has(song.id)) selected.set(song.id, song);
      }
    }
    for (const song of playableSongs) {
      if (selected.size >= 6) break;
      if (!selected.has(song.id)) selected.set(song.id, song);
    }
    return Array.from(selected.values()).slice(0, 6);
  }, [artists, playableSongs, configuredDiscoverSongs]);

  useEffect(() => {
    if (!songsLoading) setQueue(playableSongs);
  }, [playableSongs, setQueue, songsLoading]);

  useLayoutEffect(() => {
    if (showHero) return;
    const heading = discoverHeadingRef.current;
    const measure = discoverFirstLineMeasureRef.current;
    if (!heading || !measure) return;

    const updateDiscoverHeadingWrap = () => {
      setDiscoverHeadingNeedsNaturalWrap(measure.getBoundingClientRect().width > heading.clientWidth);
    };

    updateDiscoverHeadingWrap();
    const observer = new ResizeObserver(updateDiscoverHeadingWrap);
    observer.observe(heading);
    void document.fonts.ready.then(updateDiscoverHeadingWrap);
    return () => observer.disconnect();
  }, [showHero]);

  useLayoutEffect(() => {
    const heading = catalogueHeadingRef.current;
    const firstLineMeasure = catalogueFirstLineMeasureRef.current;
    if (!heading || !firstLineMeasure) return;

    const updateCatalogueHeadingWrap = () => {
      setCatalogueHeadingNaturalWrap(
        firstLineMeasure.scrollWidth > heading.clientWidth,
      );
    };

    updateCatalogueHeadingWrap();

    const resizeObserver = new ResizeObserver(updateCatalogueHeadingWrap);
    resizeObserver.observe(heading);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);


  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetch("/api/curated-playlists").then((response) => {
        if (!response.ok) throw new Error("Failed to load playlists");
        return response.json();
      }),
      fetch("/api/discover-sections").then((response) => {
        if (!response.ok) throw new Error("Failed to load featured playlists");
        return response.json();
      }),
    ])
      .then(([data, sections]) => {
        if (cancelled) return;

        const playlistById = new Map<number, CuratedPlaylist>(
          (Array.isArray(data) ? data : []).map((playlist: CuratedPlaylist) => [
            playlist.id,
            playlist,
          ]),
        );
        const featured = Array.isArray(sections?.discover_curated)
          ? sections.discover_curated
          : [];
        setCuratedPlaylists(
          featured.flatMap((item: { playlist_id: number }) => {
            const playlist = playlistById.get(item.playlist_id);
            return playlist ? [playlist] : [];
          }),
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
    if (showHero) return;
    let cancelled = false;
    fetch("/api/discover-featured-songs")
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load featured songs");
        return response.json();
      })
      .then((body) => {
        if (!cancelled) setConfiguredDiscoverSongs(Array.isArray(body?.songs) ? body.songs : []);
      })
      .catch(() => {
        if (!cancelled) setConfiguredDiscoverSongs(null);
      })
      .finally(() => {
        if (!cancelled) setDiscoverFeaturedSongsLoading(false);
      });
    return () => { cancelled = true; };
  }, [showHero]);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/discover-featured-artists")
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load featured artists");
        return response.json();
      })
      .then((featured) => {
        if (cancelled) return;
        setArtists(Array.isArray(featured?.artists) ? featured.artists : []);
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
    <main className={`audioflume-home-reference audioflume-home-mockup${playerVisible ? " has-player" : ""}`}>
      <GlobalSearchBar />

      {showHero ? (
        <section
          className="audioflume-home-reference-hero"
          style={{ backgroundImage: `url("${HOME_HERO_IMAGE}")` }}
        >
          <div className="audioflume-home-reference-hero-shade" />
          <div className="audioflume-home-reference-hero-headline" aria-label="Human made music and SFX for film.">
            <span className="is-human">Human</span>
            <span className="is-made">Made</span>
            <span className="is-music-sfx">
              <span>Music</span>
              <span>&amp;</span>
              <span>SFX</span>
            </span>
            <span className="is-for-film">For film.</span>
            <AudioflumeMark
              className="audioflume-home-reference-hero-mark"
              ariaHidden
            />
          </div>
  
        </section>
      ) : null}

      {showHero ? <section className="audioflume-home-mockup-intro">
          <div className="audioflume-home-reference-width audioflume-home-mockup-intro-meta">
            <span>ROYALTY FREE MUSIC LICENSED FOR FILM</span>
            <span>HUMAN MADE MUSIC &amp; ETHICAL ARTIST COMPENSATION</span>
          </div>

          <div className="audioflume-home-reference-width audioflume-home-reference-section-heading filmwave-section-heading-row audioflume-home-mockup-catalogue-heading">
            <h2>This month&apos;s featured artists</h2>
            <span className="audioflume-home-mockup-featured-artists-count">1500+ ARTISTS TRENDING ONLINE</span>
          </div>
        </section> : null}

      <section className={`audioflume-home-mockup-artists${!showHero ? " is-discover-featured-artists" : ""}`}>
        {!showHero ? (
          <div className="audioflume-discover-featured-intro audioflume-home-reference-width">
            <span className="audioflume-discover-featured-eyebrow">ROYALTY FREE MUSIC LICENSED FOR FILM</span>
            <div className="audioflume-discover-featured-intro-row">
              <h2 ref={discoverHeadingRef}>
                <span ref={discoverFirstLineMeasureRef} className="absolute invisible whitespace-nowrap" aria-hidden="true">DISCOVER NEW MUSIC</span>
                DISCOVER NEW MUSIC{discoverHeadingNeedsNaturalWrap ? " " : <br />}&amp; TRENDING ARTISTS.
              </h2>
              <Link href="/artists" className="audioflume-arrow-text-link">
                Explore this month&apos;s featured artists
              </Link>
            </div>
          </div>
        ) : (
          <div className="audioflume-home-reference-width audioflume-home-reference-section-heading filmwave-section-heading-row audioflume-home-mockup-catalogue-heading audioflume-home-mockup-featured-artists-heading">
            <h2>This month&apos;s featured artists</h2>
            <span className="audioflume-home-mockup-featured-artists-count">1500+ ARTISTS TRENDING ONLINE</span>
          </div>
        )}
        {artistsLoading ? (
          <HomeArtistShelfSkeleton discoverLayout={!showHero} />
        ) : artists.length > 0 ? (
          <HomeArtistShelf artists={artists} homeFlashImages={homeFlashImages} discoverLayout={!showHero} />
        ) : null}
        {!showHero && (songsLoading || discoverCompactSongs.length > 0) ? (
          <HomeSectionWithHeading
            title="Tracks made for storytelling"
            linkHref="/music"
            linkLabel="Explore music"
            className="audioflume-discover-compact-songs-section audioflume-home-reference-width"
            contentClassName={songsLoading ? "" : "audioflume-discover-compact-songs"}
          >
            {songsLoading ? (
              <DiscoverCompactSongsSkeleton />
            ) : discoverCompactSongs.map((song) => (
              <HomeCompactSongCard key={song.id} song={song} queue={discoverCompactSongs} />
            ))}
          </HomeSectionWithHeading>
        ) : null}
        {!showHero && (songsLoading || artistsLoading || discoverFeaturedSongsLoading || discoverArtistSongs.length > 0) ? (
          <HomeSectionWithHeading
            title="Featured songs"
            className="audioflume-discover-featured-songs-section"
            contentClassName="audioflume-discover-featured-songs"
          >
            {songsLoading || artistsLoading || discoverFeaturedSongsLoading ? (
              <DiscoverFeaturedSongsSkeleton />
            ) : (
              <Shelf label="Discover featured songs" className="audioflume-discover-featured-song-shelf">
                {discoverArtistSongs.map((song) => (
                  <HomeFeaturedSongCard key={song.id} song={song} queue={discoverArtistSongs} />
                ))}
              </Shelf>
            )}
          </HomeSectionWithHeading>
        ) : null}
      </section>

      {curatedPlaylistsLoading ? (
        <section className="audioflume-home-mockup-curated">
          <div className="audioflume-home-reference-width audioflume-home-mockup-section-label">
            <span>Curated collections made for editors</span>
            <Link
              href="/curated-playlists"
              className="audioflume-arrow-text-link inline-flex items-center gap-[5px]"
            >
              Explore playlists
              <ArrowUpRightIcon
                size={16}
                strokeWidth={1.5}
                className="translate-y-[2px]"
              />
            </Link>
          </div>
          <HomeCuratedPlaylistSkeleton discoverLayout={!showHero} />
        </section>
      ) : (
        <HomeCuratedPlaylistShelf playlists={curatedPlaylists} />
      )}

      <section className="audioflume-home-mockup-catalogue">
        <div className="audioflume-home-reference-width audioflume-home-reference-section-heading filmwave-section-heading-row is-multiline audioflume-home-mockup-catalogue-heading">
          <h2 ref={catalogueHeadingRef}>
            <span
              ref={catalogueFirstLineMeasureRef}
              className="audioflume-home-mockup-catalogue-heading-measure"
              aria-hidden="true"
            >
              A growing catalogue built around
            </span>
            {catalogueHeadingNaturalWrap ? (
              <>A growing catalogue built around cinematic storytelling</>
            ) : (
              <>A growing catalogue built around<br />cinematic storytelling</>
            )}
          </h2>
          <Link
            href="/music"
            className="audioflume-arrow-text-link inline-flex items-center gap-[5px]"
          >
            Find new music
            <ArrowUpRightIcon
              size={16}
              strokeWidth={1.5}
              className="translate-y-[2px]"
            />
          </Link>
        </div>

        {songsLoading ? (
          <HomeTrendingSkeleton discoverLayout={!showHero} />
        ) : (
          <div className="audioflume-home-reference-width grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {recentSongs.map((song, index) => (
              <HomeReadyToCutSongCard
                key={song.id}
                song={song}
                index={index + 30}
                queue={recentSongs}
              />
            ))}
          </div>
        )}
      </section>

      <section className="audioflume-home-mockup-more-artists">
        <div className="audioflume-home-reference-width audioflume-home-mockup-section-label">
          <span>Discover more artists</span>
          <Link href="/artists" className="audioflume-arrow-text-link inline-flex items-center gap-[5px]">
            Explore artists <ArrowUpRightIcon size={16} strokeWidth={1.5} className="translate-y-[2px]" />
          </Link>
        </div>
        {artistsLoading ? (
          <HomeArtistShelfSkeleton compact />
        ) : artists.length > 0 ? (
          <HomeArtistShelf artists={artists} homeFlashImages={homeFlashImages} compact />
        ) : null}
      </section>

      <section className="audioflume-home-reference-tools audioflume-home-mockup-originals-tools">
        <DiscoverLifetimeAccess originalSongs={originalSongs} songsLoading={songsLoading} />

        <section className="audioflume-home-reference-playlists">
          <div className="audioflume-home-reference-width audioflume-home-reference-section-heading filmwave-section-heading-row audioflume-home-mockup-section-label">
            <span>Tracks made for storytelling</span>
            <Link
              href="/music"
              className="audioflume-arrow-text-link inline-flex items-center gap-[5px]"
            >
              More like this
              <ArrowUpRightIcon
                size={16}
                strokeWidth={1.5}
                className="translate-y-[2px]"
              />
            </Link>
          </div>
          {songsLoading ? (
            <HomeOriginalsSkeleton />
          ) : playableSongs.length > 0 ? (
            <HomeOriginalSongGrid songs={playableSongs} />
          ) : null}
        </section>
      </section>

      <section className="audioflume-home-reference-new-songs">
        <div className="audioflume-home-reference-width audioflume-home-reference-section-heading filmwave-section-heading-row audioflume-home-mockup-section-label">
          <span>Newly added songs</span>
          <Link href="/music" className="audioflume-arrow-text-link inline-flex items-center gap-[5px]">
            Explore new music
            <ArrowUpRightIcon size={16} strokeWidth={1.5} className="translate-y-[2px]" />
          </Link>
        </div>
        <div className="audioflume-home-reference-width">
          {songsLoading ? (
            <HomeSongRowsSkeleton />
          ) : (
            <MusicListShell title={null}>
              {recentSongs.map((song) => (
                <SongCard key={song.id} song={song} showDivider={false} />
              ))}
            </MusicListShell>
          )}
        </div>
      </section>

      <section className="audioflume-discover-reference-search">
        <div className="audioflume-home-reference-width">
          <div className="audioflume-discover-reference-search-heading filmwave-section-heading-row">
            <span>Find similar songs</span>
          </div>
          <div className="audioflume-discover-reference-search-card">
            <GlobalReferenceSearch embedded />
          </div>
        </div>
      </section>

      <div className="audioflume-home-reference-footer-region">
        <Footer className="audioflume-home-reference-footer" showTopBorder={false} />
      </div>
    </main>
  );
}
