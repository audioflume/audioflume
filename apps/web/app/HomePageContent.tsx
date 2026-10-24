"use client";

import { MusicListShell } from "@filmwave/shared";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

import Footer from "@/components/Footer";
import { AudioflumeMark, AudioflumeOriginalsLogo } from "@/components/LifetimeAccessCard";
import GlobalSearchBar from "@/components/GlobalSearchBar";
import SongCard from "@/components/SongCard";
import CuratedPlaylistPlayButton from "@/components/curated/CuratedPlaylistPlayButton";
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

const NEW_SONG_COUNT = 12;
const HOME_SHELF_SONG_COUNT = 12;
const HOME_LIFETIME_COVER_TILE_COUNT = 182;
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
  snapAfterScroll = false,
  customScrollbar = false,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  snapAfterScroll?: boolean;
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

  function getCardStep(scroller: HTMLDivElement) {
    const cards = Array.from(
      scroller.children,
    ).filter((child): child is HTMLElement => child instanceof HTMLElement);

    if (cards.length < 2) return 0;

    return cards[1].offsetLeft - cards[0].offsetLeft;
  }

  function getVisibleCardCount(scroller: HTMLDivElement) {
    const cards = Array.from(
      scroller.children,
    ).filter((child): child is HTMLElement => child instanceof HTMLElement);

    if (cards.length < 2) return 1;

    const step = cards[1].offsetLeft - cards[0].offsetLeft;
    const cardWidth = cards[0].getBoundingClientRect().width;
    const gap = Math.max(0, step - cardWidth);
    const styles = window.getComputedStyle(scroller);
    const paddingLeft = Number.parseFloat(styles.paddingLeft) || 0;
    const paddingRight = Number.parseFloat(styles.paddingRight) || 0;
    const contentWidth =
      scroller.clientWidth - paddingLeft - paddingRight;

    return Math.max(
      1,
      Math.round((contentWidth + gap) / step),
    );
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

    if (snapAfterScroll) {
      const step = getCardStep(scroller);
      if (!step) return;

      const currentIndex = Math.round(scroller.scrollLeft / step);
      const visibleCardCount = getVisibleCardCount(scroller);
      const nextIndex =
        currentIndex +
        (direction === "next" ? visibleCardCount : -visibleCardCount);
      const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;
      const target = Math.max(
        0,
        Math.min(nextIndex * step, maxScrollLeft),
      );

      scroller.scrollTo({
        left: target,
        behavior: "smooth",
      });
      return;
    }

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
      {songs.slice(0, 12).map((song) => (
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

      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
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
        <h3 className="truncate text-[13px] font-medium leading-none text-[var(--text-primary)]">
          {song.title}
        </h3>

        <div className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[10px] leading-none text-[var(--text-muted)]">
          <span className="truncate">{song.artist}</span>
          <span>•</span>
          <span>{song.key || "—"}</span>
          <span>•</span>
          <span>{song.bpm ? `${song.bpm} BPM` : "—"}</span>
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

function HomeTrendingSection({ songs }: { songs: Song[] }) {
  const visibleSongs = songs.slice(0, 12);

  if (visibleSongs.length === 0) return null;

  return (
    <section className="audioflume-home-reference-trending">
      <div className="audioflume-home-reference-width audioflume-home-reference-section-heading filmwave-section-heading-row is-multiline">
        <span>New music added daily.<br />120+ new songs this month.</span>
        <Link href="/music" className="audioflume-arrow-text-link inline-flex items-center gap-[5px]">
          Explore trending music
          <ArrowUpRightIcon size={16} strokeWidth={1.5} className="translate-y-[1px]" />
        </Link>
      </div>
      <div className="audioflume-home-reference-width grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {visibleSongs.map((song, index) => (
          <HomeReadyToCutSongCard
            key={song.id}
            song={song}
            index={index + 30}
            queue={visibleSongs}
          />
        ))}
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
    <Shelf
      label="in demand artists"
      className="audioflume-home-reference-artist-shelf"
      customScrollbar
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
              <span>{artistIsPlaying ? "Pause Music" : "Play Music"}</span>
              {artistIsPlaying ? <PauseIcon size={12} /> : <PlayIconSmall size={12} />}
            </button>
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
        Curated collections made for editors.
      </div>

      <Shelf
        label="curated playlists"
        className="audioflume-home-mockup-curated-shelf"
        snapAfterScroll
      >
        {playlists.map((playlist, index) => (
          <article
            key={playlist.id}
            className="audioflume-home-mockup-curated-card"
          >
            <Link
              href={`/curated-playlists/${playlist.id}`}
              className="audioflume-home-mockup-curated-card-link"
            >
              <span
                className="audioflume-home-mockup-curated-card-media"
                style={{
                  backgroundImage: playlist.cover_image_url
                    ? `url("${playlist.cover_image_url}")`
                    : undefined,
                }}
              />
              <span className="audioflume-home-mockup-curated-card-shade" />
              <span className="audioflume-home-mockup-curated-card-kicker">
                {playlist.kicker || `Playlist 0${index + 1}`}
              </span>
              <strong>{playlist.name}</strong>
            </Link>

            <CuratedPlaylistPlayButton
              playlistId={playlist.id}
              playlistName={playlist.name}
              className="audioflume-home-mockup-curated-card-play"
            />
          </article>
        ))}
      </Shelf>
    </section>
  );
}

function HomeEditorialStrip() {
  return (
    <section className="audioflume-home-mockup-editorial-strip audioflume-home-reference-width">
      <Link
        href="/pricing"
        className="audioflume-home-mockup-editorial-card is-subscription"
      >
        <span>Plans for subscriptions</span>
        <strong>Music licensing built around active creative work.</strong>
        <ArrowUpRightIcon size={14} strokeWidth={1.4} />
      </Link>

      <Link
        href="/artists"
        className="audioflume-home-mockup-editorial-card is-artists"
      >
        <span>Plans for artists</span>
        <strong>Real artists, composers and original music for picture.</strong>
        <ArrowUpRightIcon size={14} strokeWidth={1.4} />
      </Link>

      <Link
        href="/pricing"
        className="audioflume-home-mockup-editorial-card is-enterprise"
      >
        <span>Plans for enterprise</span>
        <strong>Flexible licensing for larger teams and productions.</strong>
        <ArrowUpRightIcon size={14} strokeWidth={1.4} />
      </Link>
    </section>
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
      <div className="audioflume-home-reference-width audioflume-home-reference-section-heading filmwave-section-heading-row is-multiline">
        <span>New music added daily.<br />120+ new songs this month.</span>
        <Link href="/music" className="audioflume-arrow-text-link inline-flex items-center gap-[5px]">
          Explore trending music
          <ArrowUpRightIcon size={16} strokeWidth={1.5} className="translate-y-[1px]" />
        </Link>
      </div>
      <div className="audioflume-home-reference-width grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 12 }, (_, index) => (
          <div
            key={index}
            className="flex h-[54px] items-center gap-2 bg-[color-mix(in_srgb,var(--bg-primary)_96%,var(--text-primary)_4%)] px-2"
          >
            <HomeSkeletonBlock className="h-9 w-9 shrink-0" />
            <div className="min-w-0 flex-1">
              <HomeSkeletonBlock className="h-[13px] w-2/3" />
              <HomeSkeletonBlock className="mt-1.5 h-[10px] w-1/2" />
            </div>
            <HomeSkeletonBlock className="h-9 w-9 shrink-0 rounded-full" />
          </div>
        ))}
      </div>
    </section>
  );
}

function HomeFeaturedArtistSkeleton() {
  return (
    <Shelf
      label="featured artists"
      className="audioflume-home-reference-featured-artist-shelf"
      snapAfterScroll
    >
      {Array.from({ length: 4 }, (_, index) => (
        <article
          key={index}
          className="audioflume-home-reference-featured-artist-card audioflume-home-skeleton-featured-artist-card"
          aria-hidden="true"
        >
          <HomeSkeletonBlock className="is-featured-artist-media" />
          <div className="audioflume-home-skeleton-featured-artist-copy">
            <HomeSkeletonBlock className="is-featured-artist-name" />
            <HomeSkeletonBlock className="is-featured-artist-designation" />
          </div>
          <HomeSkeletonBlock className="is-featured-artist-play" />
        </article>
      ))}
    </Shelf>
  );
}

function HomeFeaturedArtistGrid({
  artists,
}: {
  artists: HomeArtist[];
}) {
  const { currentSong, isPlaying, setQueue, togglePlayPause } = usePlayer();
  const visibleArtists = artists.slice(0, 4);
  const testPlaceholders = Array.from({ length: 4 }, (_, index) => index);

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
      label="featured artists"
      className="audioflume-home-reference-featured-artist-shelf"
      snapAfterScroll
    >
      {visibleArtists.map((artist) => {
        const image = artist.hero_image_url || artist.profile_image_url || "";
        const playable = artist.songs.filter((song) => Boolean(song.audioUrl));
        const artistIsPlaying = Boolean(
          isPlaying &&
            currentSong &&
            playable.some((song) => song.id === currentSong.id),
        );
        const designation =
          artist.designation || artist.custom_text || "Composer";

        return (
          <article
            key={artist.id}
            className="audioflume-home-reference-featured-artist-card"
          >
            <Link
              href={`/artists/${artist.slug}`}
              className="audioflume-home-reference-featured-artist-link"
            >
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

              <span className="audioflume-home-reference-featured-artist-copy">
                <strong>{artist.name}</strong>
                <span>{designation}</span>
              </span>
            </Link>

            <button
              type="button"
              className="audioflume-home-reference-featured-artist-play"
              onClick={(event) => playArtist(event, artist)}
              disabled={!playable.length}
              aria-label={
                artistIsPlaying
                  ? `Pause ${artist.name}`
                  : `Play ${artist.name}`
              }
            >
              {artistIsPlaying ? (
                <PauseIcon size={18} />
              ) : (
                <PlayIconSmall size={18} />
              )}
            </button>
          </article>
        );
      })}

      {testPlaceholders.map((index) => (
        <article
          key={`featured-artist-placeholder-${index}`}
          className="audioflume-home-reference-featured-artist-card is-placeholder"
          aria-hidden="true"
        />
      ))}
    </Shelf>
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

export default function HomePageContent(_props: {
  homeFlashImages: string[];
  membershipHref: string;
  membershipLabel: string;
}) {
  const { songs, loading: songsLoading } = useSongs();
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
  const lifetimeOriginalCovers = useMemo(
    () =>
      songs
        .filter(
          (song) =>
            song.artist.trim().localeCompare("Audioflume", undefined, {
              sensitivity: "base",
            }) === 0 && Boolean(song.coverArt),
        )
        .map((song) => song.coverArt as string),
    [songs],
  );
  const lifetimeCoverTiles = useMemo(
    () =>
      lifetimeOriginalCovers.length > 0
        ? Array.from(
            { length: HOME_LIFETIME_COVER_TILE_COUNT },
            (_, index) =>
              lifetimeOriginalCovers[index % lifetimeOriginalCovers.length],
          )
        : [],
    [lifetimeOriginalCovers],
  );
  const originalSongs = playableSongs
    .filter(
      (song) =>
        song.artist.trim().localeCompare("Audioflume", undefined, {
          sensitivity: "base",
        }) === 0,
    )
    .slice(0, 12);
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
    <main className={`audioflume-home-reference audioflume-home-mockup${playerVisible ? " has-player" : ""}`}>
      <GlobalSearchBar />

      <section className="audioflume-home-mockup-intro">
        <div className="audioflume-home-reference-width audioflume-home-mockup-intro-meta">
          <span>ROYALTY FREE MUSIC LICENSED FOR FILM</span>
          <span>HUMAN MADE MUSIC &amp; FAIR ARTIST COMPENSATION</span>
        </div>

        <div className="audioflume-home-reference-width audioflume-home-mockup-intro-heading">
          <h1><AudioflumeMark className="audioflume-home-mockup-at" />Human made music &amp; SFX for film.</h1>
          <span className="audioflume-editorial-meta">1500+ ARTISTS TRENDING ONLINE</span>
        </div>
      </section>

      <section className="audioflume-home-mockup-artists">
        {artistsLoading ? (
          <HomeArtistShelfSkeleton />
        ) : artists.length > 0 ? (
          <HomeArtistShelf artists={artists} />
        ) : null}
      </section>

      {curatedPlaylistsLoading ? (
        <section className="audioflume-home-mockup-curated">
          <div className="audioflume-home-reference-width audioflume-home-mockup-section-label">
            Curated collections made for editors.
          </div>
          <HomeCuratedPlaylistSkeleton />
        </section>
      ) : (
        <HomeCuratedPlaylistShelf playlists={curatedPlaylists} />
      )}

      <section className="audioflume-home-mockup-catalogue">
        <div className="audioflume-home-reference-width audioflume-home-mockup-catalogue-heading">
          <h2>A growing catalogue built around<br />cinematic storytelling.</h2>
          <Link
            href="/music"
            className="audioflume-arrow-text-link inline-flex items-center gap-[5px]"
          >
            Find new music
            <ArrowUpRightIcon size={15} strokeWidth={1.4} />
          </Link>
        </div>

        {songsLoading ? (
          <HomeTrendingSkeleton />
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

      <HomeEditorialStrip />

      <section className="audioflume-home-reference-tools audioflume-home-mockup-originals-tools">
        <div className="audioflume-home-reference-tools-originals">
          <div className="audioflume-home-reference-width audioflume-home-reference-lifetime-access">
            <div className="audioflume-home-lifetime-feature-copy">
              <div className="audioflume-home-lifetime-feature-top">
                <div className="audioflume-home-lifetime-feature-logo">
                  <AudioflumeOriginalsLogo />
                </div>
                <Link
                  href="/music?artist=Audioflume"
                  className="audioflume-home-lifetime-feature-link audioflume-arrow-text-link inline-flex items-center gap-[5px]"
                >
                  Explore original music
                  <ArrowUpRightIcon
                    size={16}
                    strokeWidth={1.5}
                    className="translate-y-[2px]"
                  />
                </Link>
              </div>

              <div className="audioflume-home-lifetime-feature-main">
                <h2 className="audioflume-home-lifetime-feature-heading">
                  Lifetime access<br />to original music.
                </h2>

                <div className="audioflume-home-lifetime-feature-pricing">
                  <div className="audioflume-home-lifetime-feature-price-group is-regular">
                    <span className="audioflume-pricing-lifetime-badge">Regular price</span>
                    <div className="audioflume-pricing-plan-price">
                      <strong>$299</strong>
                    </div>
                  </div>
                  <div className="audioflume-home-lifetime-feature-price-group">
                    <span className="audioflume-pricing-lifetime-badge is-light">
                      Limited time offer
                    </span>
                    <div className="audioflume-pricing-plan-price">
                      <strong>$99</strong>
                      <span>One time payment</span>
                    </div>
                  </div>
                </div>

                <div className="audioflume-home-lifetime-feature-description-slot">
                  <p className="audioflume-home-lifetime-feature-description">
                    Lifetime access to in-house made original music, licensed for commercial work and clients up to 100 employees.
                  </p>
                  <Link
                    href="/pricing"
                    className="audioflume-home-lifetime-feature-hover-action"
                  >
                    Get Lifetime Access
                    <ArrowUpRightIcon size={16} strokeWidth={1.5} className="ml-[5px] translate-y-[1px]" />
                  </Link>
                </div>
              </div>
            </div>

            <div
              className="audioflume-home-lifetime-feature-art"
              aria-hidden="true"
            >
              {lifetimeCoverTiles.length > 0 ? (
                <div className="audioflume-home-lifetime-cover-grid">
                  {lifetimeCoverTiles.map((coverArt, index) => (
                    <img
                      key={`${coverArt}-${index}`}
                      src={coverArt}
                      alt=""
                      draggable={false}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <section className="audioflume-home-reference-playlists">
          <div className="audioflume-home-reference-width audioflume-home-reference-section-heading filmwave-section-heading-row">
            <span>Audioflume originals</span>
            <Link
              href="/music?artist=Audioflume"
              className="audioflume-arrow-text-link inline-flex items-center gap-[5px]"
            >
              Explore originals
              <ArrowUpRightIcon
                size={16}
                strokeWidth={1.5}
                className="translate-y-[2px]"
              />
            </Link>
          </div>
          {songsLoading ? (
            <HomeOriginalsSkeleton />
          ) : originalSongs.length > 0 ? (
            <HomeOriginalSongGrid songs={originalSongs} />
          ) : null}
        </section>
      </section>

      <section className="audioflume-home-reference-new-songs">
        <div className="audioflume-home-reference-width audioflume-home-reference-section-heading filmwave-section-heading-row">
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
