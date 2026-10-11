"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type CSSProperties,
  type FormEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

import Footer from "@/components/Footer";
import ReferenceSearchModal from "@/components/ReferenceSearchModal";
import SectionTitle from "@/components/SectionTitle";
import ShelfNavigationControls from "@/components/ShelfNavigationControls";
import ChevronLeftIcon from "@/components/icons/ChevronLeftIcon";
import ChevronRightIcon from "@/components/icons/ChevronRightIcon";
import PauseIcon from "@/components/icons/PauseIcon";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import WaveformIcon from "@/components/icons/WaveformIcon";
import XIcon from "@/components/icons/XIcon";
import { usePlayer } from "@/context/PlayerContext";
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
      <div className="mb-[12px] flex min-h-[28px] items-center justify-between gap-[20px]">
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
  const router = useRouter();
  const { currentSong, isPlaying, setQueue, togglePlayPause } = usePlayer();
  const [featuredArtists, setFeaturedArtists] = useState<DiscoverFeaturedArtist[]>([]);
  const [featureCardArtists, setFeatureCardArtists] = useState<
    DiscoverFeatureCardArtist[]
  >([]);
  const [activeFeaturedIndex, setActiveFeaturedIndex] = useState(0);
  const [discoverSearch, setDiscoverSearch] = useState("");
  const [referenceSearchOpen, setReferenceSearchOpen] = useState(false);
  const [referenceSearchQuery, setReferenceSearchQuery] = useState("");
  const [canScrollFeatureCardsPrev, setCanScrollFeatureCardsPrev] = useState(false);
  const [canScrollFeatureCardsNext, setCanScrollFeatureCardsNext] = useState(false);
  const searchBarRef = useRef<HTMLDivElement>(null);
  const featureCardShelfRef = useRef<HTMLDivElement>(null);
  const playerVisible = Boolean(currentSong);
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
      : "linear-gradient(#171717, #171717)",
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

  useEffect(() => {
    const searchBar = searchBarRef.current;
    if (!searchBar) return;

    const preventScrollBounce = (event: WheelEvent | TouchEvent) => {
      event.preventDefault();
    };

    searchBar.addEventListener("wheel", preventScrollBounce, { passive: false });
    searchBar.addEventListener("touchmove", preventScrollBounce, { passive: false });

    return () => {
      searchBar.removeEventListener("wheel", preventScrollBounce);
      searchBar.removeEventListener("touchmove", preventScrollBounce);
    };
  }, []);

  function submitDiscoverSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const query = discoverSearch.trim();
    router.push(query ? `/music?search=${encodeURIComponent(query)}` : "/music");
  }

  return (
    <main className={`discover-page-root${playerVisible ? " has-player" : ""}`}>
      <div className="audioflume-home-reference-searchbar-slot">
        <div
          ref={searchBarRef}
          className="audioflume-home-reference-searchbar"
        >
          <Link href="/music?filters=open" className="audioflume-home-reference-searchbar-filters">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 4v16M12 4v16M19 4v16M2 8h6M9 15h6M16 10h6" />
            </svg>
            <span>Filters</span>
          </Link>

          <form
            className="audioflume-home-reference-searchbar-field"
            onSubmit={submitDiscoverSearch}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16 16 4.5 4.5" />
            </svg>
            <input
              type="search"
              value={discoverSearch}
              onChange={(event) => setDiscoverSearch(event.target.value)}
              placeholder="Search by sound, mood, or scene"
              aria-label="Search by sound, mood, or scene"
            />
            {discoverSearch.length > 0 ? (
              <button
                type="button"
                className="audioflume-home-reference-searchbar-clear"
                onClick={() => setDiscoverSearch("")}
                aria-label="Clear search"
              >
                <XIcon size={8} />
              </button>
            ) : null}
          </form>

          <button
            type="button"
            className="audioflume-home-reference-searchbar-song"
            aria-label="Search by song"
            aria-expanded={referenceSearchOpen}
            onClick={() => setReferenceSearchOpen(true)}
          >
            <WaveformIcon size={16} />
            <span>Search by song</span>
          </button>
        </div>
      </div>

      <ReferenceSearchModal
        open={referenceSearchOpen}
        value={referenceSearchQuery}
        onChange={setReferenceSearchQuery}
        onClose={() => setReferenceSearchOpen(false)}
        onSubmit={(query, result) => {
          const params = new URLSearchParams({
            referenceSearch: query,
          });

          if (result?.kind === "track") {
            params.set("referenceTrackId", result.id);
          }

          router.push(`/music?${params.toString()}`);
        }}
      />

      <section
        className="discover-artist-hero"
        aria-label="Featured artist"
        style={heroStyle}
      >
        <div className="discover-artist-hero-inner">
          {activeFeaturedArtist ? (
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
        <section className="discover-artist-featured">
          {featuredArtistCount > 0 ? (
            <div className="discover-artist-featured-label">
              This month&apos;s
              <br />
              featured artists
            </div>
          ) : null}
          <div className="discover-artist-featured-shelf">
            <button
              type="button"
              className="discover-artist-featured-shelf-arrow is-left"
              onClick={() => scrollFeatureCardShelf("prev")}
              disabled={!canScrollFeatureCardsPrev}
              aria-label="Scroll featured artists left"
            >
              <ChevronLeftIcon size={18} />
            </button>

            <div
              ref={featureCardShelfRef}
              className="discover-artist-featured-scroller"
            >
              {featureCardArtists.map((artist) => {
              const playableSongs = (artist?.songs ?? []).filter((song) =>
                Boolean(song.audioUrl),
              );
              const artistIsPlaying = Boolean(
                artist &&
                  isPlaying &&
                  currentSong &&
                  playableSongs.some((song) => song.id === currentSong.id),
              );

              const genres = artist
                ? Array.from(
                    new Set(
                      artist.songs.flatMap((song) =>
                        Array.isArray(song.genres)
                          ? song.genres.filter(Boolean)
                          : [],
                      ),
                    ),
                  ).slice(0, 3)
                : [];

              return (
                <article
                  key={artist.id}
                  className="discover-artist-feature-card"
                >
                  <>
                      <Link
                        href={`/artists/${artist.slug}`}
                        className="discover-artist-feature-link"
                      >
                        <div className="discover-artist-feature-media-home">
                          {artist.hero_image_url ? (
                            <img
                              src={artist.hero_image_url}
                              alt=""
                              draggable={false}
                              style={{
                                objectPosition: `${artist.hero_image_position_x}% ${artist.hero_image_position_y}%`,
                              }}
                            />
                          ) : null}
                        </div>

                        <div className="discover-artist-feature-bar">
                          <span className="discover-artist-feature-copy">
                            <strong>{artist.name}</strong>
                            <span className="discover-artist-feature-genres">
                              {genres.length > 0
                                ? genres.map((genre) => (
                                    <span key={genre}>{genre}</span>
                                  ))
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
                        className="discover-artist-feature-play"
                        onClick={() => playFeatureCardArtist(artist)}
                        disabled={playableSongs.length === 0}
                        aria-label={`${artistIsPlaying ? "Pause" : "Play"} music by ${artist.name}`}
                        aria-pressed={artistIsPlaying}
                      >
                        {artistIsPlaying ? (
                          <PauseIcon size={14} />
                        ) : (
                          <PlayIconSmall size={14} />
                        )}
                      </button>
                    </>
                </article>
              );
              })}
            </div>

            <button
              type="button"
              className="discover-artist-featured-shelf-arrow is-right"
              onClick={() => scrollFeatureCardShelf("next")}
              disabled={!canScrollFeatureCardsNext}
              aria-label="Scroll featured artists right"
            >
              <ChevronRightIcon size={18} />
            </button>
          </div>
        </section>

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
