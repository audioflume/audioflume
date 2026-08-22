"use client";

import Link from "next/link";
import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

import Footer from "@/components/Footer";
import SectionTitle from "@/components/SectionTitle";
import ShelfNavigationControls from "@/components/ShelfNavigationControls";
import ChevronLeftIcon from "@/components/icons/ChevronLeftIcon";
import ChevronRightIcon from "@/components/icons/ChevronRightIcon";
import PauseIcon from "@/components/icons/PauseIcon";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import { usePlayer } from "@/context/PlayerContext";
import type {
  CuratedPlaylist,
  CuratedPlaylistSong,
} from "@/lib/curatedPlaylists";
import type { DiscoverSectionShelfState } from "@/lib/discoverSections";
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
  children,
}: {
  index: number;
  className?: string;
  imageSrc?: string;
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

    updateScrollState();

    scroller.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    return () => {
      scroller.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
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
  const { currentSong, isPlaying, setQueue, togglePlayPause } = usePlayer();
  const [featuredArtists, setFeaturedArtists] = useState<DiscoverFeaturedArtist[]>([]);
  const [activeFeaturedIndex, setActiveFeaturedIndex] = useState(0);
  const [featuredCardPlaylists, setFeaturedCardPlaylists] = useState<
    CuratedPlaylist[]
  >([]);
  const [featuredCardSongs, setFeaturedCardSongs] = useState<
    Record<number, CuratedPlaylistSong[]>
  >({});
  const [activeFeaturedCardId, setActiveFeaturedCardId] = useState<number | null>(
    null,
  );
  const [loadingFeaturedCardId, setLoadingFeaturedCardId] = useState<
    number | null
  >(null);
  const playerVisible = Boolean(currentSong);
  const activeFeaturedArtist = featuredArtists[activeFeaturedIndex] ?? null;
  const featuredArtistCount = featuredArtists.length;
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

    async function loadFeaturedCards() {
      try {
        const [sectionResponse, playlistResponse] = await Promise.all([
          fetch("/api/discover-sections"),
          fetch("/api/curated-playlists"),
        ]);
        const sectionData = (await sectionResponse.json()) as
          | DiscoverSectionShelfState
          | { error?: string };
        const playlistData = await playlistResponse.json();

        if (!sectionResponse.ok || !playlistResponse.ok) return;

        const featureItems =
          "discover_feature_cards" in sectionData &&
          Array.isArray(sectionData.discover_feature_cards)
            ? [...sectionData.discover_feature_cards]
                .sort((a, b) => a.position - b.position)
                .slice(0, 2)
            : [];
        const availablePlaylists: CuratedPlaylist[] = Array.isArray(playlistData)
          ? playlistData
          : [];
        const playlistById = new Map(
          availablePlaylists.map((playlist) => [playlist.id, playlist] as const),
        );
        const selectedPlaylists = featureItems
          .map((item) => playlistById.get(item.playlist_id))
          .filter((playlist): playlist is CuratedPlaylist => Boolean(playlist));

        if (!cancelled) setFeaturedCardPlaylists(selectedPlaylists);
      } catch {
        // Leave the managed card slots empty if their playlist data is unavailable.
      }
    }

    void loadFeaturedCards();

    return () => {
      cancelled = true;
    };
  }, []);

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

  async function playFeaturedCardPlaylist(playlist: CuratedPlaylist) {
    const cachedSongs = featuredCardSongs[playlist.id] ?? [];
    const currentSongBelongsToPlaylist = Boolean(
      currentSong && cachedSongs.some((song) => song.id === currentSong.id),
    );

    if (
      activeFeaturedCardId === playlist.id &&
      currentSongBelongsToPlaylist &&
      currentSong
    ) {
      togglePlayPause(currentSong);
      return;
    }

    if (loadingFeaturedCardId === playlist.id) return;
    setLoadingFeaturedCardId(playlist.id);

    try {
      let songs = cachedSongs;

      if (songs.length === 0) {
        const response = await fetch(
          `/api/curated-playlists/${encodeURIComponent(String(playlist.id))}/songs`,
        );
        const data = await response.json();
        if (!response.ok || !Array.isArray(data)) return;

        songs = data as CuratedPlaylistSong[];
        setFeaturedCardSongs((current) => ({
          ...current,
          [playlist.id]: songs,
        }));
      }

      const playableSongs = songs.filter((song) => Boolean(song.audioUrl));
      const firstSong = playableSongs[0];
      if (!firstSong) return;

      setQueue(playableSongs);
      setActiveFeaturedCardId(playlist.id);
      togglePlayPause(firstSong);
    } finally {
      setLoadingFeaturedCardId((current) =>
        current === playlist.id ? null : current,
      );
    }
  }

  return (
    <main className="discover-page-root">
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
                <p>{activeFeaturedArtist.designation || ""}</p>
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
              <span>
                This month&apos;s
                <br />
                featured artists
              </span>
              <div aria-hidden="true" />
              <div className="flex w-[178px] justify-self-end flex-col items-end max-[720px]:hidden">
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
          <div className="discover-artist-featured-grid">
            {Array.from({ length: 2 }).map((_, index) => {
              const playlist = featuredCardPlaylists[index];
              const cachedSongs = playlist
                ? featuredCardSongs[playlist.id] ?? []
                : [];
              const playlistIsPlaying = Boolean(
                playlist &&
                  activeFeaturedCardId === playlist.id &&
                  isPlaying &&
                  currentSong &&
                  cachedSongs.some((song) => song.id === currentSong.id),
              );

              return (
                <article key={playlist?.id ?? index} className="discover-artist-feature-card">
                  <PlaceholderMedia
                    index={index}
                    imageSrc={playlist?.cover_image_url || undefined}
                    className="discover-artist-feature-media"
                  >
                    {playlist ? (
                      <div className="discover-artist-feature-overlay">
                        <div>
                          <h3>{playlist.name}</h3>
                          {playlist.kicker ? (
                            <p style={{ marginTop: "13px" }}>{playlist.kicker}</p>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          className="discover-artist-feature-play-button"
                          onClick={() => void playFeaturedCardPlaylist(playlist)}
                          disabled={loadingFeaturedCardId === playlist.id}
                          aria-label={`${playlistIsPlaying ? "Pause" : "Play"} ${playlist.name}`}
                          aria-pressed={playlistIsPlaying}
                        >
                          <PlayBadge isPlaying={playlistIsPlaying} />
                        </button>
                      </div>
                    ) : null}
                  </PlaceholderMedia>
                </article>
              );
            })}
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
