"use client";

import Link from "next/link";
import {
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import Footer from "@/components/Footer";
import FeaturedArtistShelf from "@/components/discover/FeaturedArtistShelf";
import GlobalSearchBar from "@/components/GlobalSearchBar";
import SectionTitle from "@/components/SectionTitle";
import ShelfNavigationControls from "@/components/ShelfNavigationControls";
import ChevronLeftIcon from "@/components/icons/ChevronLeftIcon";
import ChevronRightIcon from "@/components/icons/ChevronRightIcon";
import PauseIcon from "@/components/icons/PauseIcon";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import XIcon from "@/components/icons/XIcon";
import { usePlayer } from "@/context/PlayerContext";
import { useSongs } from "@/hooks/useSongs";
import WaveformIcon from "@/components/icons/WaveformIcon";
import type { Song } from "@/lib/types";

type ShelfItem = {
  title: string;
  subtitle: string;
  image: string;
};

type DiscoverFeaturedArtist = {
  id: string;
  name: string;
  slug: string;
  designation: string | null;
  intro_text: string | null;
  profile_image_url: string | null;
  hero_image_url: string | null;
  hero_image_position_x: number;
  hero_image_position_y: number;
  songs: Song[];
};

type DiscoverFeatureCardArtist = {
  id: string;
  name: string;
  slug: string;
  custom_text: string | null;
  hero_image_url: string | null;
  hero_image_position_x: number;
  hero_image_position_y: number;
  songs: Song[];
};

const ARTISTS_WATCHING: ShelfItem[] = [
  {
    title: "Loremipsum Dolorit",
    subtitle: "Eiusmod Tempor",
    image: "",
  },
  {
    title: "Loremipsum Dolorit",
    subtitle: "Eiusmod Tempor",
    image: "",
  },
  {
    title: "Loremipsum Dolorit",
    subtitle: "Eiusmod Tempor",
    image: "",
  },
  {
    title: "Loremipsum Dolorit",
    subtitle: "Eiusmod Tempor",
    image: "",
  },
  {
    title: "Loremipsum Dolorit",
    subtitle: "Eiusmod Tempor",
    image: "",
  },
  {
    title: "Loremipsum Dolorit",
    subtitle: "Eiusmod Tempor",
    image: "",
  },
  {
    title: "Loremipsum Dolorit",
    subtitle: "Eiusmod Tempor",
    image: "",
  },
];

const TOP_ALBUMS: ShelfItem[] = [
  {
    title: "Loremipsum Dolorit",
    subtitle: "Eiusmod Tempor",
    image: "",
  },
  {
    title: "Loremipsum Dolorit",
    subtitle: "Eiusmod Tempor",
    image: "",
  },
  {
    title: "Loremipsum Dolorit",
    subtitle: "Eiusmod Tempor",
    image: "",
  },
  {
    title: "Loremipsum Dolorit",
    subtitle: "Eiusmod Tempor",
    image: "",
  },
  {
    title: "Loremipsum Dolorit",
    subtitle: "Eiusmod Tempor",
    image: "",
  },
  {
    title: "Loremipsum Dolorit",
    subtitle: "Eiusmod Tempor",
    image: "",
  },
  {
    title: "Loremipsum Dolorit",
    subtitle: "Eiusmod Tempor",
    image: "",
  },
];

const SUPPORT_NEW_ARTISTS: ShelfItem[] = [
  {
    title: "Loremipsum Dolorit",
    subtitle: "Eiusmod Tempor",
    image: "",
  },
  {
    title: "Loremipsum Dolorit",
    subtitle: "Eiusmod Tempor",
    image: "",
  },
  {
    title: "Loremipsum Dolorit",
    subtitle: "Eiusmod Tempor",
    image: "",
  },
  {
    title: "Loremipsum Dolorit",
    subtitle: "Eiusmod Tempor",
    image: "",
  },
  {
    title: "Loremipsum Dolorit",
    subtitle: "Eiusmod Tempor",
    image: "",
  },
  {
    title: "Loremipsum Dolorit",
    subtitle: "Eiusmod Tempor",
    image: "",
  },
  {
    title: "Loremipsum Dolorit",
    subtitle: "Eiusmod Tempor",
    image: "",
  },
];

const EDITORIAL_FEATURES = [
  {
    eyebrow: "Trending music for brands",
    title: "In demand artists and composers.",
    image: "",
  },
  {
    eyebrow: "Music for real stories",
    title: "In demand artists and composers.",
    image: "",
  },
  {
    eyebrow: "Cinematic masterpieces",
    title: "In demand artists and composers.",
    image: "",
  },
];

const MOCKUP_LOREM =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore.";

const READY_TO_CUT_SONG_COUNT = 12;
function getTrackFallbackGradient(index: number) {
  const gradients = [
    "linear-gradient(135deg, #372f4f 0%, #111111 48%, #75649a 100%)",
    "linear-gradient(135deg, #1f3d3a 0%, #111111 52%, #4d8c7b 100%)",
    "linear-gradient(135deg, #4f3529 0%, #111111 50%, #b66c45 100%)",
    "linear-gradient(135deg, #25364f 0%, #111111 52%, #6287c4 100%)",
    "linear-gradient(135deg, #45233d 0%, #111111 52%, #b75d91 100%)",
  ];

  return gradients[index % gradients.length];
}

function stopTrackMouseEvent(event: MouseEvent<HTMLElement>) {
  event.preventDefault();
  event.stopPropagation();
  event.nativeEvent.stopImmediatePropagation();
}

function stopTrackKeyEvent(event: KeyboardEvent<HTMLElement>) {
  event.preventDefault();
  event.stopPropagation();
  event.nativeEvent.stopImmediatePropagation();
}

function PlayBadge({ isPlaying = false }: { isPlaying?: boolean }) {
  return (
    <span className="discover-artist-play-badge" aria-hidden="true">
      {isPlaying ? <PauseIcon size={18} /> : <PlayIconSmall size={18} />}
    </span>
  );
}

function PlaceholderMedia({
  index,
  className = "",
  imageSrc,
  imagePosition,
  children,
}: {
  index: number;
  className?: string;
  imageSrc?: string;
  imagePosition?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={`discover-artist-placeholder ${
        imageSrc ? `is-tone-${index % 6}` : "before:hidden"
      } ${className}`.trim()}
      style={
        !imageSrc
          ? {
              background:
                "color-mix(in srgb, var(--filmwave-neutral-surface) 95%, var(--filmwave-black))",
            }
          : undefined
      }
    >
      {imageSrc ? (
        <img
          src={imageSrc}
          alt=""
          aria-hidden="true"
          draggable={false}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: imagePosition || "center",
          }}
        />
      ) : null}
      {children}
    </div>
  );
}

function ReadyToCutCoverImage({
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
          : getTrackFallbackGradient(index),
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

function ReadyToCutSongCard({
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
        stopTrackMouseEvent(event);
        playSong();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        stopTrackKeyEvent(event);
        if (!event.repeat) playSong();
      }}
      onKeyUp={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        stopTrackKeyEvent(event);
      }}
      className="group flex h-[54px] cursor-pointer items-center gap-2 bg-[color-mix(in_srgb,var(--bg-primary)_96%,var(--text-primary)_4%)] px-2 transition hover:bg-[color-mix(in_srgb,var(--bg-primary)_94%,var(--text-primary)_6%)] focus:outline-none focus-visible:bg-[color-mix(in_srgb,var(--bg-primary)_94%,var(--text-primary)_6%)]"
      aria-label={`Play ${song.title} by ${song.artist}`}
    >
      <ReadyToCutCoverImage song={song} index={index} />

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
          stopTrackMouseEvent(event);
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

function ReadyToCutTracks({ songs }: { songs: Song[] }) {
  if (songs.length === 0) return null;

  return (
    <section className="discover-track-section">
      <div className="discover-track-section-heading">
        <SectionTitle variant="small">Ready-to-cut tracks</SectionTitle>
        <Link href="/music">Explore more tracks</Link>
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {songs.map((song, index) => (
          <ReadyToCutSongCard
            key={song.id}
            song={song}
            index={index + 30}
            queue={songs}
          />
        ))}
      </div>
    </section>
  );
}

function ArtistShelf({
  title,
  items,
  square = false,
  footerCopy,
}: {
  title: string;
  items: ShelfItem[];
  square?: boolean;
  footerCopy?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [imageCenterY, setImageCenterY] = useState<number | null>(null);

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
          ? Math.max(scroller.clientWidth * 0.78, 360)
          : -Math.max(scroller.clientWidth * 0.78, 360),
      behavior: "smooth",
    });
  }

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const image = scroller.querySelector<HTMLElement>(
      ".discover-artist-shelf-media",
    );
    const updateImageCenter = () => {
      setImageCenterY(image ? image.getBoundingClientRect().height / 2 : null);
    };

    updateScrollState();
    updateImageCenter();

    scroller.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    const resizeObserver = new ResizeObserver(updateImageCenter);
    if (image) resizeObserver.observe(image);

    return () => {
      scroller.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
      resizeObserver.disconnect();
    };
  }, [items.length]);

  return (
    <section className="discover-artist-shelf-section">
      <div className="discover-artist-shelf-heading">
        <div className="min-w-0">
          <SectionTitle>{title}</SectionTitle>
        </div>

        <ShelfNavigationControls
          label={title}
          onPrev={() => scroll("prev")}
          onNext={() => scroll("next")}
          canScrollPrev={canScrollPrev}
          canScrollNext={canScrollNext}
        />
      </div>

      <div className="group/discover-shelf relative left-1/2 w-screen -translate-x-1/2 overflow-hidden">
        {imageCenterY !== null && (
          <>
            <button
              type="button"
              onClick={() => scroll("prev")}
              disabled={!canScrollPrev}
              className="absolute left-8 z-20 hidden h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white text-black opacity-0 shadow-[0_12px_34px_rgba(0,0,0,0.25)] transition hover:scale-105 group-hover/discover-shelf:opacity-100 disabled:pointer-events-none disabled:opacity-0 sm:flex"
              style={{ top: imageCenterY }}
              aria-label={`Scroll ${title} left`}
            >
              <ChevronLeftIcon size={18} />
            </button>

            <button
              type="button"
              onClick={() => scroll("next")}
              disabled={!canScrollNext}
              className="absolute right-8 z-20 hidden h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white text-black opacity-0 shadow-[0_12px_34px_rgba(0,0,0,0.25)] transition hover:scale-105 group-hover/discover-shelf:opacity-100 disabled:pointer-events-none disabled:opacity-0 sm:flex"
              style={{ top: imageCenterY }}
              aria-label={`Scroll ${title} right`}
            >
              <ChevronRightIcon size={18} />
            </button>
          </>
        )}

        <div ref={scrollerRef} className="discover-artist-shelf-scroller">
          {items.map((item, index) => (
            <article
              key={`${title}-${index}`}
              className={`discover-artist-shelf-card${square ? " is-square" : ""}`}
            >
              <PlaceholderMedia
                index={index + (square ? 2 : 0)}
                imageSrc={item.image}
                className="discover-artist-shelf-media"
              >
                <div
                  className="discover-artist-card-overlay"
                  style={!item.image ? { background: "transparent" } : undefined}
                >
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.subtitle}</span>
                  </div>
                  <PlayBadge />
                </div>
              </PlaceholderMedia>

              <div className="discover-artist-card-meta">
                <strong>{item.title}</strong>
                <span>{item.subtitle}</span>
              </div>
            </article>
          ))}
        </div>
      </div>

      {footerCopy && (
        <div className="discover-artist-shelf-footer">
          <p>{MOCKUP_LOREM}</p>
          <span>{footerCopy}</span>
        </div>
      )}
    </section>
  );
}

export default function DiscoverPage() {
  const { songs } = useSongs();
  const { currentSong, isPlaying, setQueue, togglePlayPause } = usePlayer();
  const [featuredArtists, setFeaturedArtists] = useState<DiscoverFeaturedArtist[]>([]);
  const [featuredArtistsLoading, setFeaturedArtistsLoading] = useState(true);
  const [featureCardArtists, setFeatureCardArtists] = useState<
    DiscoverFeatureCardArtist[]
  >([]);
  const [activeFeaturedIndex, setActiveFeaturedIndex] = useState(0);
  const [canScrollFeatureCardsPrev, setCanScrollFeatureCardsPrev] = useState(false);
  const [canScrollFeatureCardsNext, setCanScrollFeatureCardsNext] = useState(false);
  const featureCardShelfRef = useRef<HTMLDivElement>(null);
  const playerVisible = Boolean(currentSong);
  const playableSongs = useMemo(
    () => songs.filter((song) => Boolean(song.audioUrl)),
    [songs],
  );
  const readyToCutSongs = playableSongs.slice(0, READY_TO_CUT_SONG_COUNT);
  const activeFeaturedArtist = featuredArtists[activeFeaturedIndex] ?? null;
  const featuredArtistCount = featuredArtists.length;
  const featuredArtistGenres = activeFeaturedArtist
    ? Array.from(
        new Set(
          activeFeaturedArtist.songs.flatMap((song) =>
            Array.isArray(song.genres) ? song.genres.filter(Boolean) : [],
          ),
        ),
      ).slice(0, 3)
    : [];
  const playableFeaturedSongs = (activeFeaturedArtist?.songs ?? []).filter(
    (song) => Boolean(song.audioUrl),
  );
  const firstFeaturedSong = playableFeaturedSongs[0];
  const featuredArtistIsPlaying = Boolean(
    isPlaying &&
      currentSong &&
      playableFeaturedSongs.some((song) => song.id === currentSong.id),
  );
  const heroStyle = ({
    "--discover-artist-hero-image": activeFeaturedArtist?.hero_image_url
      ? `url("${activeFeaturedArtist.hero_image_url.replaceAll('"', '\\"')}")`
      : "linear-gradient(var(--bg-tertiary), var(--bg-tertiary))",
    "--discover-artist-hero-position": activeFeaturedArtist
      ? `${activeFeaturedArtist.hero_image_position_x}% ${activeFeaturedArtist.hero_image_position_y}%`
      : "center 42%",
  } as CSSProperties);

  useEffect(() => {
    let cancelled = false;

    async function loadFeaturedArtists() {
      try {
        const response = await fetch("/api/discover-featured-artists");
        const data = await response.json();
        if (!response.ok) return;

        if (!cancelled) {
          setFeaturedArtists(Array.isArray(data?.artists) ? data.artists : []);
          setActiveFeaturedIndex(0);
        }
      } catch {
        // Leave the managed feature empty if featured artist data is unavailable.
      } finally {
        if (!cancelled) setFeaturedArtistsLoading(false);
      }
    }

    void loadFeaturedArtists();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadFeatureCardArtists() {
      try {
        const response = await fetch("/api/discover-feature-card-artists");
        const data = await response.json();
        if (!response.ok) return;

        if (!cancelled) {
          setFeatureCardArtists(
            Array.isArray(data?.artists) ? data.artists : [],
          );
        }
      } catch {
        // Leave the managed card slots empty if feature card data is unavailable.
      }
    }

    void loadFeatureCardArtists();

    return () => {
      cancelled = true;
    };
  }, []);

  function updateFeatureCardShelfState() {
    const scroller = featureCardShelfRef.current;
    if (!scroller) return;

    const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;
    setCanScrollFeatureCardsPrev(scroller.scrollLeft > 4);
    setCanScrollFeatureCardsNext(scroller.scrollLeft < maxScrollLeft - 4);
  }

  function scrollFeatureCardShelf(direction: "prev" | "next") {
    const scroller = featureCardShelfRef.current;
    if (!scroller) return;

    const amount = Math.max(scroller.clientWidth * 0.8, 360);
    scroller.scrollBy({
      left: direction === "next" ? amount : -amount,
      behavior: "smooth",
    });
  }

  useEffect(() => {
    const scroller = featureCardShelfRef.current;
    if (!scroller) return;

    updateFeatureCardShelfState();
    scroller.addEventListener("scroll", updateFeatureCardShelfState, {
      passive: true,
    });
    window.addEventListener("resize", updateFeatureCardShelfState);

    const observer = new ResizeObserver(updateFeatureCardShelfState);
    observer.observe(scroller);

    return () => {
      scroller.removeEventListener("scroll", updateFeatureCardShelfState);
      window.removeEventListener("resize", updateFeatureCardShelfState);
      observer.disconnect();
    };
  }, [featureCardArtists.length]);

  function moveFeaturedArtist(direction: "prev" | "next") {
    if (featuredArtists.length <= 1) return;

    setActiveFeaturedIndex((current) => {
      if (direction === "next") {
        return (current + 1) % featuredArtists.length;
      }
      return (current - 1 + featuredArtists.length) % featuredArtists.length;
    });
  }

  function playFeaturedArtist() {
    if (featuredArtistIsPlaying && currentSong) {
      togglePlayPause(currentSong);
      return;
    }

    if (!firstFeaturedSong) return;
    setQueue(playableFeaturedSongs);
    togglePlayPause(firstFeaturedSong);
  }

  function playFeatureCardArtist(artist: DiscoverFeatureCardArtist) {
    const playableSongs = artist.songs.filter((song) => Boolean(song.audioUrl));
    const firstSong = playableSongs[0];
    const artistIsPlaying = Boolean(
      isPlaying &&
        currentSong &&
        playableSongs.some((song) => song.id === currentSong.id),
    );

    if (artistIsPlaying && currentSong) {
      togglePlayPause(currentSong);
      return;
    }

    if (!firstSong) return;
    setQueue(playableSongs);
    togglePlayPause(firstSong);
  }

  return (
    <main className={`discover-page-root${playerVisible ? " has-player" : ""}`}>
      <GlobalSearchBar />

      <section
        className={`discover-artist-hero${featuredArtistsLoading ? " is-loading" : ""}`}
        aria-label="Featured artist"
        style={heroStyle}
      >
        <div className="discover-artist-hero-inner">
          {featuredArtistsLoading ? (
            <div
              className="discover-artist-hero-feature discover-artist-hero-skeleton"
              aria-hidden="true"
            >
              <span className="discover-artist-hero-skeleton-block is-eyebrow" />
              <span className="discover-artist-hero-skeleton-block is-title" />
              <div className="discover-artist-hero-skeleton-genres">
                <span className="discover-artist-hero-skeleton-block" />
                <span className="discover-artist-hero-skeleton-block" />
                <span className="discover-artist-hero-skeleton-block" />
              </div>
              <div className="discover-artist-hero-skeleton-copy">
                <span className="discover-artist-hero-skeleton-block" />
                <span className="discover-artist-hero-skeleton-block" />
                <span className="discover-artist-hero-skeleton-block" />
              </div>
              <div className="discover-artist-hero-skeleton-actions">
                <span className="discover-artist-hero-skeleton-block is-play" />
                <span className="discover-artist-hero-skeleton-block is-link" />
              </div>
            </div>
          ) : activeFeaturedArtist ? (
            <div className="discover-artist-hero-feature">
              <div className="discover-artist-hero-identity">
                <span className="discover-artist-hero-eyebrow">Featured Artist</span>
                <h1>{activeFeaturedArtist.name}</h1>
                <div className="discover-artist-hero-genres">
                  {featuredArtistGenres.length > 0 ? (
                    featuredArtistGenres.map((genre) => (
                      <span key={genre}>{genre}</span>
                    ))
                  ) : (
                    <span
                      className="is-placeholder"
                      aria-hidden="true"
                    >
                      Genre
                    </span>
                  )}
                </div>
              </div>

              <div className="discover-artist-hero-detail">
                <p>{activeFeaturedArtist.intro_text || ""}</p>
                <div className="discover-artist-hero-actions">
                  <button
                    type="button"
                    className="discover-artist-hero-listen"
                    onClick={playFeaturedArtist}
                    disabled={!firstFeaturedSong}
                    aria-label={
                      featuredArtistIsPlaying
                        ? `Pause music by ${activeFeaturedArtist.name}`
                        : firstFeaturedSong
                          ? `Play music by ${activeFeaturedArtist.name}`
                          : `No playable music for ${activeFeaturedArtist.name}`
                    }
                  >
                    <PlayBadge isPlaying={featuredArtistIsPlaying} />
                    <span>Listen now</span>
                  </button>
                  <Link href={`/artists/${activeFeaturedArtist.slug}`}>
                    View license catalogue
                  </Link>
                </div>
              </div>
            </div>
          ) : null}

          {featuredArtistCount > 0 ? (
            <div className="discover-artist-hero-featured-intro">
              <div className="flex w-[178px] flex-col items-end max-[720px]:hidden">
                <div className="mb-[10px] inline-flex h-[22px] items-center gap-0 text-white">
                  <button
                    type="button"
                    onClick={() => moveFeaturedArtist("prev")}
                    disabled={featuredArtists.length <= 1}
                    className="inline-flex h-[22px] w-[18px] cursor-pointer items-center justify-center bg-transparent disabled:cursor-default"
                    aria-label="Previous featured artist"
                  >
                    <ChevronLeftIcon size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveFeaturedArtist("next")}
                    disabled={featuredArtists.length <= 1}
                    className="inline-flex h-[22px] w-[18px] cursor-pointer items-center justify-center bg-transparent disabled:cursor-default"
                    aria-label="Next featured artist"
                  >
                    <ChevronRightIcon size={14} />
                  </button>
                  <span className="ml-[8px] text-[10px] font-medium leading-none [font-variant-numeric:tabular-nums]">
                    {activeFeaturedIndex + 1}/{featuredArtistCount}
                  </span>
                </div>
                <div className="discover-artist-hero-slider-marks" aria-hidden="true">
                  {Array.from({ length: featuredArtistCount }).map((_, index) => (
                    <span
                      key={index}
                      className={index === activeFeaturedIndex ? "is-active" : ""}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <div className="discover-artist-content">
        <FeaturedArtistShelf
          artists={featureCardArtists}
          showHeading={featuredArtistCount > 0}
        />

        <ArtistShelf
          title="Artists We're Watching"
          items={ARTISTS_WATCHING}
          footerCopy="1500+ artists trending online"
        />

        <section className="discover-artist-editorial-grid">
          {EDITORIAL_FEATURES.map((feature, index) => (
            <article key={feature.eyebrow} className="discover-artist-editorial-card">
              <PlaceholderMedia
                index={index + 3}
                imageSrc={feature.image}
                className="discover-artist-editorial-media"
              >
                <div className="discover-artist-editorial-copy">
                  <span>{feature.eyebrow}</span>
                  <h2>{feature.title}</h2>
                </div>
              </PlaceholderMedia>

              <div className="discover-artist-editorial-meta">
                <span>Loremipsum Dolorit</span>
                <span>Eiusmod Tempor</span>
                <span>Explore more ↗</span>
              </div>
            </article>
          ))}
        </section>

        <ArtistShelf title="Top Albums" items={TOP_ALBUMS} square />

        <ArtistShelf
          title="Support New Artists"
          items={SUPPORT_NEW_ARTISTS}
          footerCopy="1500+ artists trending online"
        />

        <ReadyToCutTracks songs={readyToCutSongs} />

        <div
          className="discover-artist-footer"
          style={{ paddingBottom: playerVisible ? "72px" : "8px" }}
        >
          <Footer />
        </div>
      </div>
    </main>
  );
}
