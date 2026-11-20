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
import ShelfIndicatorNavigation from "@/components/ShelfIndicatorNavigation";
import { AudioflumeMark } from "@/components/LifetimeAccessCard";
import { DiscoverLifetimeAccess } from "./DiscoverPricingSections";
import HomeSectionWithHeading from "./HomeSectionWithHeading";
import GlobalMusicSearch from "@/components/GlobalMusicSearch";
import GlobalSearchBar from "@/components/GlobalSearchBar";
import GlobalReferenceSearch from "@/components/GlobalReferenceSearch";
import PricingHeroImageFlash from "./pricing/PricingHeroImageFlash";
import SongCard from "@/components/SongCard";
import { CuratedPlaylistCard } from "@/components/curated/CuratedPlaylistShelf";
import { DiscoverArchivedSections } from "./discover/ShelvedDiscoverPage";
import PlaylistCardShell from "@/components/playlists/PlaylistCardShell";
import curatedCardStyles from "@/components/curated/CuratedPlaylistCard.module.css";
import CuratedPlaylistPlayButton from "@/components/curated/CuratedPlaylistPlayButton";
import CuratedPlaylistBookmarkButton from "@/components/curated/CuratedPlaylistBookmarkButton";
import type { CuratedPlaylist } from "@/lib/curatedPlaylists";
import ArrowUpRightIcon from "@/components/icons/ArrowUpRightIcon";
import ChevronLeftIcon from "@/components/icons/ChevronLeftIcon";
import ChevronRightIcon from "@/components/icons/ChevronRightIcon";
import PauseIcon from "@/components/icons/PauseIcon";
import PlaybackStateIcon from "@/components/icons/PlaybackStateIcon";
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
export type HomeArtist = {
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
  progressScrollbar = false,
  fadeAdjacentCards = false,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  customScrollbar?: boolean;
  progressScrollbar?: boolean;
  fadeAdjacentCards?: boolean;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [scrollbarThumb, setScrollbarThumb] = useState({ left: 0, width: 0 });
  const scrollbarTrackRef = useRef<HTMLDivElement>(null);
  const shelfItemCount = Array.isArray(children) ? children.length : 1;
  const inertiaFrameRef = useRef<number | null>(null);
  const scrollIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressScrollbarDraggingRef = useRef(false);
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

    if (fadeAdjacentCards) {
      const cards = Array.from(scroller.children) as HTMLElement[];
      const viewport = scroller.getBoundingClientRect();
      const viewportCenter = (viewport.left + viewport.right) / 2;
      let primaryIndex = -1;
      let closestDistance = Infinity;

      cards.forEach((card, index) => {
        const rect = card.getBoundingClientRect();
        const distance = Math.abs((rect.left + rect.right) / 2 - viewportCenter);
        if (distance < closestDistance) {
          closestDistance = distance;
          primaryIndex = index;
        }
      });

      cards.forEach((card, index) => {
        card.classList.toggle("is-shelf-primary", index === primaryIndex);
      });
      scroller.classList.toggle("has-shelf-primary", primaryIndex !== -1);
    }

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

  function handleProgressScrollbarGrab() {
    if (!fadeAdjacentCards) return;
    progressScrollbarDraggingRef.current = true;
    if (scrollIdleTimerRef.current !== null) {
      clearTimeout(scrollIdleTimerRef.current);
      scrollIdleTimerRef.current = null;
    }
    scrollerRef.current?.classList.add("is-scrolling");
  }

  function handleProgressScrollbarRelease() {
    if (!fadeAdjacentCards) return;
    progressScrollbarDraggingRef.current = false;
    if (scrollIdleTimerRef.current !== null) clearTimeout(scrollIdleTimerRef.current);
    scrollIdleTimerRef.current = setTimeout(() => {
      if (!progressScrollbarDraggingRef.current) scrollerRef.current?.classList.remove("is-scrolling");
      scrollIdleTimerRef.current = null;
    }, 180);
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

    function endScrollReveal() {
      if (!fadeAdjacentCards || progressScrollbarDraggingRef.current) return;
      if (scrollIdleTimerRef.current !== null) {
        clearTimeout(scrollIdleTimerRef.current);
        scrollIdleTimerRef.current = null;
      }
      scroller.classList.remove("is-scrolling");
    }

    function handleScroll() {
      updateScrollState();
      if (!fadeAdjacentCards) return;
      scroller.classList.add("is-scrolling");
      if (scrollIdleTimerRef.current !== null) clearTimeout(scrollIdleTimerRef.current);
      if (!progressScrollbarDraggingRef.current) scrollIdleTimerRef.current = setTimeout(endScrollReveal, 180);
    }

    updateScrollState();
    scroller.addEventListener("scroll", handleScroll, { passive: true });
    if (fadeAdjacentCards) scroller.addEventListener("scrollend", endScrollReveal);
    window.addEventListener("resize", updateScrollState);

    const observer = new ResizeObserver(updateScrollState);
    observer.observe(scroller);

    return () => {
      stopScrollbarInertia();
      progressScrollbarDraggingRef.current = false;
      if (scrollIdleTimerRef.current !== null) {
        clearTimeout(scrollIdleTimerRef.current);
        scrollIdleTimerRef.current = null;
      }
      scroller.removeEventListener("scroll", handleScroll);
      if (fadeAdjacentCards) scroller.removeEventListener("scrollend", endScrollReveal);
      window.removeEventListener("resize", updateScrollState);
      observer.disconnect();
    };
  }, [customScrollbar, fadeAdjacentCards, shelfItemCount]);


  return (
    <div className={`audioflume-home-reference-shelf group/home-reference-shelf ${className}`}>
      <div ref={scrollerRef} className="audioflume-home-reference-shelf-scroller">
        {children}
      </div>

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

      <ShelfIndicatorNavigation
        label={label}
        scrollerRef={scrollerRef}
        itemCount={shelfItemCount}
        onPrev={() => scroll("prev")}
        onNext={() => scroll("next")}
        className="audioflume-home-reference-width"
        progressScrollbar
        onProgressPointerDown={fadeAdjacentCards ? handleProgressScrollbarGrab : undefined}
        onProgressPointerUp={fadeAdjacentCards ? handleProgressScrollbarRelease : undefined}
      />
    </div>
  );
}

function HomeOriginalSongCard({ song, discoverPlaybackIcon = false }: { song: Song; discoverPlaybackIcon?: boolean }) {
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
          {discoverPlaybackIcon ? <PlaybackStateIcon playing={playing} size={14} /> : playing ? <PauseIcon size={14} /> : <PlayIconSmall size={14} />}
        </span>
      </button>
      <span className="audioflume-home-reference-original-song-card-copy">
        <strong className="audioflume-home-song-title">{song.title}</strong>
        <span className="audioflume-home-song-artist">{song.artist}</span>
      </span>
    </article>
  );
}

function HomeOriginalSongGrid({ songs, discoverPlaybackIcon = false }: { songs: Song[]; discoverPlaybackIcon?: boolean }) {
  return (
    <div className="audioflume-home-reference-original-song-grid">
      {songs.slice(0, 16).map((song) => (
        <HomeOriginalSongCard key={song.id} song={song} discoverPlaybackIcon={discoverPlaybackIcon} />
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
  discoverPlaybackIcon = false,
}: {
  song: Song;
  index: number;
  queue: Song[];
  discoverPlaybackIcon?: boolean;
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
      className="audioflume-home-ready-track-card group flex h-[54px] cursor-pointer items-center gap-2 rounded-[4px] bg-[color-mix(in_srgb,var(--bg-primary)_96%,var(--text-primary)_4%)] px-2 transition hover:bg-[color-mix(in_srgb,var(--bg-primary)_94%,var(--text-primary)_6%)] focus:outline-none focus-visible:bg-[color-mix(in_srgb,var(--bg-primary)_94%,var(--text-primary)_6%)]"
      aria-label={`Play ${song.title} by ${song.artist}`}
    >
      <HomeReadyToCutCoverImage song={song} index={index} />

      <div className="min-w-0 flex-1">
        <h3 className="audioflume-home-song-title truncate text-[var(--text-primary)]">
          {song.title}
        </h3>

        <div className="mt-0.5 flex min-w-0 items-center text-[var(--text-muted)]">
          <span className="audioflume-home-song-artist truncate">{song.artist}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={(event) => {
          stopHomeTrackMouseEvent(event);
          playSong();
        }}
        className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white text-black transition hover:scale-105 disabled:cursor-default disabled:opacity-50"
        disabled={!song.audioUrl}
        aria-label={playing ? `Pause ${song.title}` : `Play ${song.title}`}
      >
        {discoverPlaybackIcon ? <PlaybackStateIcon playing={playing} size={13} /> : playing ? <PauseIcon size={13} /> : <PlayIconSmall size={13} />}
      </button>
    </article>
  );
}

const DISCOVER_ARTIST_PREVIEW_ROW_COUNT = 6;

function formatDiscoverArtistSongDuration(seconds: number | undefined) {
  if (!Number.isFinite(seconds) || !seconds || seconds <= 0) return "—";
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

function DiscoverFeaturedArtistSongList({
  artist,
  songs,
  currentSongId,
  playing,
  onPlay,
}: {
  artist: HomeArtist;
  songs: Song[];
  currentSongId?: string;
  playing: boolean;
  onPlay: (event: MouseEvent<HTMLButtonElement>, song: Song) => void;
}) {
  return (
    <div className="audioflume-discover-featured-song-panel" aria-label={`Songs by ${artist.name}`}>
      <div className="audioflume-home-lifetime-v2-song-list">
        {Array.from({ length: DISCOVER_ARTIST_PREVIEW_ROW_COUNT }, (_, index) => {
          const song = songs[index];
          if (!song) {
            return (
              <div className="audioflume-home-lifetime-v2-song is-preview-placeholder" key={`placeholder-${index}`} aria-label="Sample track placeholder">
                <span className="audioflume-home-lifetime-v2-song-cover" />
                <span className="audioflume-home-lifetime-v2-song-copy">
                  <strong>Preview track {index + 1}</strong>
                  <span>—</span>
                </span>
                <span className="audioflume-home-lifetime-v2-song-play" aria-hidden="true"><PlayIconSmall size={13} /></span>
              </div>
            );
          }
          const active = song.id === currentSongId;
          return (
            <button
              type="button"
              className={`audioflume-home-lifetime-v2-song${active ? " is-active" : ""}`}
              key={song.id}
              onClick={(event) => onPlay(event, song)}
              aria-label={`${active && playing ? "Pause" : "Play"} ${song.title}`}
            >
              <span className="audioflume-home-lifetime-v2-song-cover">
                {song.coverArt ? <img src={song.coverArt} alt="" draggable={false} /> : null}
              </span>
              <span className="audioflume-home-lifetime-v2-song-copy">
                <strong>{song.title}</strong>
                <span>{formatDiscoverArtistSongDuration(song.duration)}</span>
              </span>
              <span className="audioflume-home-lifetime-v2-song-play" aria-hidden="true">
                <PlaybackStateIcon playing={active && playing} size={13} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function HomeArtistShelf({
  artists,
  homeFlashImages,
  compact = false,
  discoverLayout = false,
  hideExploreButton = false,
  progressScrollbar = false,
  discoverPlaybackIcon = false,
}: {
  artists: HomeArtist[];
  homeFlashImages: string[];
  compact?: boolean;
  discoverLayout?: boolean;
  hideExploreButton?: boolean;
  progressScrollbar?: boolean;
  discoverPlaybackIcon?: boolean;
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
      customScrollbar={false}
      progressScrollbar={discoverLayout || progressScrollbar}
      fadeAdjacentCards={discoverLayout}
    >
      {artists.map((artist, index) => {
        const image = artist.hero_image_url || artist.profile_image_url || "";
        const playable = artist.songs.filter((song) => Boolean(song.audioUrl));
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
            {discoverLayout ? (
              <Link href={`/artists/${artist.slug}`} className="audioflume-home-reference-artist-card-overlay-link" aria-label={`View ${artist.name}`} />
            ) : null}
            {discoverLayout ? (
              <div className="audioflume-discover-featured-identity">
                <strong className="audioflume-discover-featured-name">{artist.name}</strong>
                {artist.designation ? (
                  <span className="audioflume-discover-featured-designation">{artist.designation}</span>
                ) : null}
                <span className="audioflume-genre-filter-pills audioflume-discover-featured-track-genres" aria-label="Artist genres">
                  {[0, 1, 2].map((index) => (
                    visibleGenres[index] ? (
                      <Link href={`/music?genre=${encodeURIComponent(visibleGenres[index])}`} className="audioflume-genre-filter-pill" key={visibleGenres[index]}>{visibleGenres[index]}</Link>
                    ) : (
                      <span className="audioflume-genre-filter-pill is-placeholder" key={`placeholder-${index}`}>{index === 0 && visibleGenres.length === 0 ? "Genre TBA" : ""}</span>
                    )
                  ))}
                </span>
              </div>
            ) : null}
            {discoverLayout ? (
              <DiscoverFeaturedArtistSongList
                artist={artist}
                songs={playable}
                currentSongId={currentSong?.id}
                playing={isPlaying}
                onPlay={(event, song) => {
                  event.stopPropagation();
                  if (!song.audioUrl) return;
                  setQueue(playable);
                  togglePlayPause(song);
                }}
              />
            ) : null}
            <div className="audioflume-home-reference-artist-link">
              {!discoverLayout ? (
                <Link href={`/artists/${artist.slug}`} className="audioflume-home-reference-artist-card-overlay-link" aria-label={`View ${artist.name}`} />
              ) : null}
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
              {!discoverLayout ? (
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
              ) : null}
            </div>
            {!discoverLayout && !compact && !hideExploreButton ? (
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
            {discoverLayout ? (
              <>
              <Link className="audioflume-discover-featured-artist-link" href={`/artists/${artist.slug}`}>
                Explore more from {artist.name} <ArrowUpRightIcon size={24} strokeWidth={1.5} />
              </Link>

              </>
            ) : null}
            {!discoverLayout ? <button
              type="button"
              className="audioflume-home-reference-artist-play"
              onClick={(event) => playArtist(event, artist)}
              disabled={!playable.length}
              aria-label={artistIsPlaying ? `Pause ${artist.name}` : `Play ${artist.name}`}
            >
              {discoverPlaybackIcon ? <PlaybackStateIcon playing={artistIsPlaying} size={compact ? 15 : 18} /> : artistIsPlaying ? <PauseIcon size={compact ? 15 : 18} /> : <PlayIconSmall size={compact ? 15 : 18} />}
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
  progressScrollbar = false,
  discoverLayout = false,
}: {
  playlists: CuratedPlaylist[];
  progressScrollbar?: boolean;
  discoverLayout?: boolean;
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
        progressScrollbar={progressScrollbar}
      >
        {playlists.map((playlist, index) => (
          <div key={playlist.id} className="audioflume-home-mockup-curated-card-shell">
            <CuratedPlaylistCard playlist={playlist} index={index} variant={discoverLayout ? "curatedPage" : "home"} />
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
          <PlaybackStateIcon playing={playing} size={14} />
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
    <div className={`audioflume-discover-compact-song${active ? " is-active" : ""}`}>
      <button
        type="button"
        className="audioflume-discover-compact-song-main"
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
              <PlaybackStateIcon playing={playing} size={12} />
            </span>
          </span>
        </span>
        <span className="audioflume-discover-compact-song-copy">
          <strong className="audioflume-home-song-title">{song.title}</strong>
          <span className="audioflume-home-song-artist">{song.artist}</span>
        </span>
      </button>
    </div>
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

function DiscoverImageBlock({ src }: { src: string }) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [edgeColor, setEdgeColor] = useState<string | null>(null);

  useEffect(() => {
    const image = imageRef.current;
    if (!image) return;

    function detectEdgeColor() {
      if (!image || !image.naturalWidth || !image.naturalHeight) return;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 32;
        canvas.height = 64;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) return;
        const sourceWidth = image.naturalWidth;
        const sourceHeight = image.naturalHeight;
        const blockRatio = (image.clientWidth || image.parentElement?.clientWidth || sourceWidth)
          / (image.clientHeight || image.parentElement?.clientHeight || sourceHeight);
        const visibleWidth = Math.min(sourceWidth, sourceHeight * blockRatio);
        const visibleHeight = Math.min(sourceHeight, sourceWidth / blockRatio);
        const sourceLeft = (sourceWidth - visibleWidth) / 2;
        const sourceTop = (sourceHeight - visibleHeight) / 2;
        context.drawImage(image, sourceLeft, sourceTop, visibleWidth * 0.15, visibleHeight, 0, 0, 32, 64);
        const pixels = context.getImageData(0, 0, 32, 64).data;
        const groups = new Map<string, { count: number; red: number; green: number; blue: number }>();
        for (let i = 0; i < pixels.length; i += 4) {
          const red = pixels[i];
          const green = pixels[i + 1];
          const blue = pixels[i + 2];
          const key = `${Math.floor(red / 24)}-${Math.floor(green / 24)}-${Math.floor(blue / 24)}`;
          const group = groups.get(key) ?? { count: 0, red: 0, green: 0, blue: 0 };
          group.count++;
          group.red += red;
          group.green += green;
          group.blue += blue;
          groups.set(key, group);
        }
        const dominant = [...groups.values()].sort((a, b) => b.count - a.count)[0];
        if (dominant) {
          setEdgeColor(`rgb(${Math.round(dominant.red / dominant.count)} ${Math.round(dominant.green / dominant.count)} ${Math.round(dominant.blue / dominant.count)})`);
        }
      } catch {
        // Keep the image visible if pixel access is unavailable.
      }
    }

    image.addEventListener("load", detectEdgeColor);
    if (image.complete && image.naturalWidth > 0) detectEdgeColor();
    return () => image.removeEventListener("load", detectEdgeColor);
  }, [src]);

  return (
    <div
      className="audioflume-discover-image-block"
      style={edgeColor ? { ["--audioflume-discover-image-edge-color" as string]: edgeColor } : undefined}
    >
      <div className="audioflume-discover-image-color" aria-hidden="true" />
      <div className="audioflume-discover-image-photo">
        <img
          ref={imageRef}
          src={`/_next/image?url=${encodeURIComponent(src)}&w=640&q=75`}
          alt=""
          loading="lazy"
        />
      </div>
    </div>
  );
}

function DiscoverFeaturedSongsSkeleton() {
  return (
    <div className="audioflume-discover-featured-song-grid audioflume-discover-skeleton-featured-shelf">
      {Array.from({ length: 6 }, (_, index) => (
        <article key={index} className="audioflume-home-featured-song-card audioflume-discover-skeleton-featured-card" aria-hidden="true">
          <HomeSkeletonBlock className="audioflume-home-featured-song-art is-featured-cover" />
          <span className="audioflume-home-featured-song-copy">
            <HomeSkeletonBlock className="is-featured-title" />
            <HomeSkeletonBlock className="is-featured-artist" />
          </span>
        </article>
      ))}
    </div>
  );
}

function HomeTrendingSkeleton({ discoverLayout = false }: { discoverLayout?: boolean }) {
  return (
    <div className="audioflume-home-reference-width grid gap-2 min-[520px]:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 12 }, (_, index) => (
        <article
          key={index}
          className={`audioflume-home-ready-track-card audioflume-home-skeleton-ready-track flex h-[54px] items-center gap-4 rounded-[4px] bg-[color-mix(in_srgb,var(--bg-primary)_96%,var(--text-primary)_4%)] px-2${discoverLayout ? " is-discover-skeleton" : ""}`}
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

export function HomeArtistShelfSkeleton({ compact = false, discoverLayout = false, progressScrollbar = false }: { compact?: boolean; discoverLayout?: boolean; progressScrollbar?: boolean }) {
  return (
    <Shelf
      label="in demand artists"
      className={`audioflume-home-reference-artist-shelf audioflume-home-skeleton-artist-shelf${compact ? " is-compact" : ""}${discoverLayout ? " is-discover-layout" : ""}`}
      customScrollbar={false}
      progressScrollbar={discoverLayout || progressScrollbar}
    >
      {Array.from({ length: compact ? 4 : 3 }, (_, index) => (
        <article
          key={index}
          className="audioflume-home-reference-artist-card audioflume-home-skeleton-artist-card"
          aria-hidden="true"
        >
          {discoverLayout ? (
            <div className="audioflume-discover-featured-identity">
              <HomeSkeletonBlock className="is-discover-artist-name" />
              <HomeSkeletonBlock className="is-discover-artist-designation" />
              <span className="audioflume-genre-filter-pills audioflume-discover-featured-track-genres audioflume-discover-skeleton-artist-genres">
                <HomeSkeletonBlock className="is-discover-genre-pill" />
                <HomeSkeletonBlock className="is-discover-genre-pill" />
                <HomeSkeletonBlock className="is-discover-genre-pill" />
              </span>
            </div>
          ) : null}
          <div className="audioflume-home-reference-artist-media">
            <HomeSkeletonBlock className="is-artist-media" />
          </div>
          {discoverLayout ? (
            <>
              <div className="audioflume-discover-featured-artist-link audioflume-discover-skeleton-artist-link">
                <HomeSkeletonBlock className="is-discover-artist-link-text" />
              </div>

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
      progressScrollbar={discoverLayout}
    >
      {Array.from({ length: 4 }, (_, index) => (
        discoverLayout ? (
          <div key={index} className="audioflume-home-mockup-curated-card-shell" aria-hidden="true">
            <PlaylistCardShell
              squareMedia
              className={`${curatedCardStyles.card} audioflume-home-skeleton-playlist-card`}
              mediaDataAttribute="data-curated-playlist-image"
              media={<HomeSkeletonBlock className="is-playlist-media" />}
              details={
                <div className={curatedCardStyles.details}>
                  <div className={curatedCardStyles.copy}>
                    <HomeSkeletonBlock className="is-discover-playlist-name" />
                    <HomeSkeletonBlock className="is-discover-playlist-count" />
                  </div>
                </div>
              }
            />
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
  const [directoryArtists, setDirectoryArtists] = useState<{ id: string; name: string; slug: string; designation: string | null; hero_image_url: string | null; profile_image_url: string | null; hero_image_position_x: number; hero_image_position_y: number; genres: string[]; songs: Song[] }[]>([]);
  const [editorialPlaylists, setEditorialPlaylists] = useState<CuratedPlaylist[]>([]);
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
  const discoverArtistShelfItems = (offset: number) => {
    const realArtists = directoryArtists.slice(offset, offset + 7);
    const items = realArtists.map((artist) => ({
      title: artist.name,
      subtitle: artist.designation ?? "",
      image: artist.hero_image_url || artist.profile_image_url || "",
      genres: artist.genres ?? [],
      song: artist.songs?.find((song) => Boolean(song.audioUrl))
        ?? playableSongs.find((song) => song.artist.toLowerCase() === artist.name.toLowerCase())
        ?? playableSongs[0],
    }));

    for (let index = items.length; index < 20; index += 1) {
      const sampleSong = playableSongs[(offset + index) % playableSongs.length];
      const sampleArtist = directoryArtists[(offset + index) % directoryArtists.length];
      items.push({
        title: `Artist preview ${index + 1}`,
        subtitle: "Preview artist",
        image: sampleArtist?.hero_image_url || sampleArtist?.profile_image_url || sampleSong?.coverArt || "",
        genres: sampleArtist?.genres ?? [],
        song: sampleSong,
      });
    }
    return items;
  };
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
        const selectedPlaylists = featured.flatMap((item: { playlist_id: number }) => {
          const playlist = playlistById.get(item.playlist_id);
          return playlist ? [playlist] : [];
        });
        setCuratedPlaylists(selectedPlaylists);
        if (!showHero) {
          const allPlaylists: CuratedPlaylist[] = Array.isArray(data) ? data : [];
          const remaining = allPlaylists.filter((playlist) => !selectedPlaylists.some((selected) => selected.id === playlist.id));
          setEditorialPlaylists([...selectedPlaylists, ...remaining].slice(0, 3));
        }
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
    const controller = new AbortController();
    fetch("/api/artists/directory", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load artist directory");
        return response.json();
      })
      .then((data) => {
        if (!controller.signal.aborted) setDirectoryArtists(Array.isArray(data?.artists) ? data.artists : []);
      })
      .catch(() => {
        if (!controller.signal.aborted) setDirectoryArtists([]);
      });
    return () => controller.abort();
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
    <main className={`audioflume-home-reference audioflume-home-mockup${!showHero ? " is-discover-page" : ""}${playerVisible ? " has-player" : ""}`}>
      {!showHero ? <div className="audioflume-experiment-search">
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
          <GlobalMusicSearch fieldClassName="audioflume-experiment-search-field" clearButtonClassName="audioflume-experiment-search-clear" />
          <GlobalReferenceSearch className="audioflume-experiment-search-similar" />
        </div>
      </div> : <GlobalSearchBar />}

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
        {showHero ? (
          <div className="audioflume-home-reference-width audioflume-home-reference-section-heading filmwave-section-heading-row audioflume-home-mockup-catalogue-heading audioflume-home-mockup-featured-artists-heading">
            <h2>This month&apos;s featured artists</h2>
            <span className="audioflume-home-mockup-featured-artists-count">1500+ ARTISTS TRENDING ONLINE</span>
          </div>
        ) : null}
        {artistsLoading ? (
          <HomeArtistShelfSkeleton discoverLayout={!showHero} />
        ) : artists.length > 0 ? (
          <HomeArtistShelf artists={artists} homeFlashImages={homeFlashImages} discoverLayout={!showHero} discoverPlaybackIcon />
        ) : null}
      </section>
        {!showHero ? (
          <div className="discover-artist-content">
            <DiscoverArchivedSections
              albumsTitle="Featured songs"
              watchingArtists={discoverArtistShelfItems(0).map((item, index) => ({
                ...item,
                slug: index < 7 ? directoryArtists[index]?.slug : undefined,
                imagePositionX: index < 7 ? directoryArtists[index]?.hero_image_position_x : undefined,
                imagePositionY: index < 7 ? directoryArtists[index]?.hero_image_position_y : undefined,
              }))}
              supportArtists={discoverArtistShelfItems(7)}
              enableArtistPlayback
              featuredSongs={playableSongs.slice(0, 12).map((song) => ({
                title: song.title,
                subtitle: song.artist,
                image: song.coverArt || "",
                song,
              }))}
              featuredPlaylists={editorialPlaylists.map((playlist) => ({
                name: playlist.name,
                image: playlist.feature_cover_image_url || playlist.cover_image_url || "",
              }))}
            />
          </div>
        ) : null}

      {showHero ? (
        curatedPlaylistsLoading ? (
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
          <HomeCuratedPlaylistShelf playlists={curatedPlaylists} progressScrollbar={!showHero} discoverLayout={!showHero} />
        )
      ) : null}

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
          <div className="audioflume-home-reference-width grid gap-2 min-[520px]:grid-cols-2 xl:grid-cols-3">
            {recentSongs.map((song, index) => (
              <HomeReadyToCutSongCard
                key={song.id}
                song={song}
                index={index + 30}
                queue={recentSongs}
                discoverPlaybackIcon={!showHero}
              />
            ))}
          </div>
        )}
      </section>

      {showHero ? (
      <section className="audioflume-home-mockup-more-artists">
        <div className="audioflume-home-reference-width audioflume-home-mockup-section-label">
          <span>Discover more artists</span>
          <Link href="/artists" className="audioflume-arrow-text-link inline-flex items-center gap-[5px]">
            Explore artists <ArrowUpRightIcon size={16} strokeWidth={1.5} className="translate-y-[2px]" />
          </Link>
        </div>
        {artistsLoading ? (
          <HomeArtistShelfSkeleton compact progressScrollbar={!showHero} />
        ) : artists.length > 0 ? (
          <HomeArtistShelf artists={artists} homeFlashImages={homeFlashImages} compact progressScrollbar={!showHero} discoverPlaybackIcon />
        ) : null}
      </section>

      ) : null}

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
            <HomeOriginalSongGrid songs={playableSongs} discoverPlaybackIcon={!showHero} />
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
                <SongCard key={song.id} song={song} showDivider={false} showDuration={false} showPlaybackStateIcon />
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
