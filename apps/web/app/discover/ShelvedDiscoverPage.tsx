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
import ArrowUpRightIcon from "@/components/icons/ArrowUpRightIcon";
import ChevronLeftIcon from "@/components/icons/ChevronLeftIcon";
import ChevronRightIcon from "@/components/icons/ChevronRightIcon";
import PauseIcon from "@/components/icons/PauseIcon";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import PlaybackStateIcon from "@/components/icons/PlaybackStateIcon";
import XIcon from "@/components/icons/XIcon";
import { usePlayer } from "@/context/PlayerContext";
import { useSongs } from "@/hooks/useSongs";
import WaveformIcon from "@/components/icons/WaveformIcon";
import type { Song } from "@/lib/types";

type ShelfItem = {
  title: string;
  subtitle: string;
  image: string;
  song?: Song;
  slug?: string;
  imagePositionX?: number;
  imagePositionY?: number;
  genres?: string[];
};

type DirectoryArtist = {
  id: string;
  name: string;
  slug: string;
  designation: string | null;
  profile_image_url: string | null;
  hero_image_url: string | null;
  hero_image_position_x: number;
  hero_image_position_y: number;
  genres: string[];
  songs: Song[];
};

type EditorialPlaylist = { id: number; name: string; cover_image_url: string | null; feature_cover_image_url?: string | null };

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
  designation: string | null;
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
      <PlaybackStateIcon playing={isPlaying} size={18} />
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
        <PlaybackStateIcon playing={playing} size={15} />
      </button>
    </article>
  );
}

function ReadyToCutTracks({ songs }: { songs: Song[] }) {
  if (songs.length === 0) return null;

  return (
    <section className="discover-track-section">
      <div className="discover-track-section-heading filmwave-section-heading-row">
        <SectionTitle variant="small">Ready-to-cut tracks</SectionTitle>
        <Link href="/music" className="audioflume-arrow-text-link inline-flex items-center gap-[5px]">Explore more tracks<ArrowUpRightIcon size={16} strokeWidth={1.5} className="translate-y-[2px]" /></Link>
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
  enablePlayback = false,
  compactArtistCards = false,
  compactNames = false,
  songTextStyle = false,
}: {
  title: string;
  items: ShelfItem[];
  square?: boolean;
  footerCopy?: string;
  enablePlayback?: boolean;
  compactArtistCards?: boolean;
  compactNames?: boolean;
  songTextStyle?: boolean;
}) {
  const { currentSong, isPlaying, setQueue, togglePlayPause } = usePlayer();
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
    <section className={`discover-artist-shelf-section${compactArtistCards ? " audioflume-home-mockup-more-artists" : ""}${compactNames ? " is-discover-compact-names" : ""}${songTextStyle ? " is-discover-song-text" : ""}`}>
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
          {items.map((item, index) => compactArtistCards ? (
            <article key={`${title}-${index}`} className="audioflume-home-reference-artist-card">
              <div className="audioflume-home-reference-artist-link">
                {item.slug ? (
                  <Link href={`/artists/${item.slug}`} className="audioflume-home-reference-artist-card-overlay-link" aria-label={`View ${item.title}`} />
                ) : null}
                <div className="audioflume-home-reference-artist-media discover-artist-shelf-media">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt=""
                      draggable={false}
                      style={{ objectPosition: `${item.imagePositionX ?? 50}% ${item.imagePositionY ?? 50}%` }}
                    />
                  ) : null}
                </div>
                <div className="audioflume-home-reference-artist-bar">
                  <span className="audioflume-home-reference-artist-copy">
                    <strong>{item.title}</strong>
                    {item.subtitle ? <span className="audioflume-home-reference-artist-designation">{item.subtitle}</span> : null}
                    <span className="audioflume-genre-filter-pills audioflume-discover-featured-track-genres" aria-label="Artist genres">
                      {[0, 1, 2].map((genreIndex) => {
                        const genres = Array.from(new Set((item.genres ?? []).filter(Boolean))).sort((a, b) => a.localeCompare(b));
                        const genre = genres[genreIndex];
                        return genre ? (
                          <Link href={`/music?genre=${encodeURIComponent(genre)}`} className="audioflume-genre-filter-pill" key={genre}>{genre}</Link>
                        ) : (
                          <span className="audioflume-genre-filter-pill is-placeholder" key={`placeholder-${genreIndex}`}>{genreIndex === 0 && genres.length === 0 ? "Genre TBA" : ""}</span>
                        );
                      })}
                    </span>
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="audioflume-home-reference-artist-play"
                disabled={!item.song?.audioUrl}
                aria-label={isPlaying && currentSong?.id === item.song?.id ? `Pause ${item.title}` : `Play ${item.title}`}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (!item.song?.audioUrl) return;
                  if (currentSong?.id === item.song.id && isPlaying) {
                    togglePlayPause(currentSong);
                    return;
                  }
                  setQueue([item.song]);
                  togglePlayPause(item.song);
                }}
              >
                <div className="grid h-full w-full place-items-center leading-none"><PlaybackStateIcon playing={Boolean(isPlaying && currentSong?.id === item.song?.id)} size={15} /></div>
                <span>{isPlaying && currentSong?.id === item.song?.id ? "Pause Music" : "Play Music"}</span>
              </button>
            </article>
          ) : (
            <article
              key={`${title}-${index}`}
              className={`discover-artist-shelf-card${square ? " is-square" : ""}`}
            >
              <PlaceholderMedia
                index={index + (square ? 2 : 0)}
                imageSrc={item.image}
                className="discover-artist-shelf-media"
              >
                {item.slug ? (
                  <Link
                    href={`/artists/${item.slug}`}
                    aria-label={`View ${item.title}`}
                    className="absolute inset-0 z-[1]"
                  />
                ) : null}
                <div
                  className="discover-artist-card-overlay"
                  style={{
                    ...(!item.image ? { background: "transparent" } : {}),
                    ...(item.slug ? { pointerEvents: "none" } : {}),
                  }}
                >
                  <div>
                    <strong>{item.title}</strong>
                    {!compactNames ? <span>{item.subtitle}</span> : null}
                  </div>
                  {enablePlayback && item.song ? (
                    <button
                      type="button"
                      className="discover-artist-card-play-button"
                      style={item.slug ? { pointerEvents: "auto" } : undefined}
                      disabled={!item.song.audioUrl}
                      aria-label={isPlaying && currentSong?.id === item.song.id ? `Pause ${item.title} preview` : `Play ${item.title} preview`}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (!item.song) return;
                        setQueue([item.song]);
                        togglePlayPause(item.song);
                      }}
                    >
                      <span className="discover-artist-play-badge" aria-hidden="true">
                        <PlaybackStateIcon playing={Boolean(isPlaying && currentSong?.id === item.song.id)} size={18} />
                      </span>
                    </button>
                  ) : !enablePlayback ? (
                    <PlayBadge />
                  ) : null}
                </div>
              </PlaceholderMedia>

              <div className="discover-artist-card-meta">
                <strong className={songTextStyle ? "audioflume-home-song-title" : undefined}>{item.title}</strong>
                <span className={songTextStyle ? "audioflume-home-song-artist" : undefined}>{item.subtitle}</span>
              </div>
            </article>
          ))}
        </div>
      </div>

      {footerCopy && (
        <div className="discover-artist-shelf-footer">
          <p>{MOCKUP_LOREM}</p>
          <span className="audioflume-editorial-meta">{footerCopy}</span>
        </div>
      )}
    </section>
  );
}

export function DiscoverArchivedSections({
  albumsTitle = "Top albums",
  watchingArtists = ARTISTS_WATCHING,
  compactWatchingCards = false,
  featuredSongs = TOP_ALBUMS,
  supportArtists = SUPPORT_NEW_ARTISTS,
  supportArtistsTitle = "Support new artists",
  featuredPlaylists,
  enableArtistPlayback = false,
  playlistsAfterSupport = false,
  activeDiscoverTypography = false,
  sections = "all",
  afterPlaylists,
}: {
  albumsTitle?: string;
  watchingArtists?: ShelfItem[];
  compactWatchingCards?: boolean;
  featuredSongs?: ShelfItem[];
  supportArtists?: ShelfItem[];
  supportArtistsTitle?: string;
  featuredPlaylists?: { name: string; image: string; href?: string }[];
  enableArtistPlayback?: boolean;
  playlistsAfterSupport?: boolean;
  activeDiscoverTypography?: boolean;
  sections?: "all" | "featuredSongs" | "remaining" | "playlists" | "artistsOnly" | "withoutWatchingAndPlaylists" | "watchingAndPlaylists" | "watchingOnly" | "supportAndPlaylists";
  afterPlaylists?: ReactNode;
}) {
  const playlistBlocks = (
      <section className="discover-artist-editorial-grid">
        {EDITORIAL_FEATURES.map((feature, index) => {
          const playlist = featuredPlaylists?.[index];
          return (
          <article key={feature.eyebrow} className="discover-artist-editorial-card">
            <PlaceholderMedia
              index={index + 3}
              imageSrc={playlist?.image ?? feature.image}
              className="discover-artist-editorial-media"
            >
              {playlist?.href ? (
                <Link href={playlist.href} className="absolute inset-0 z-[3]" aria-label={`View ${playlist.name}`} />
              ) : null}
              <div className="discover-artist-editorial-copy">
                <span>{feature.eyebrow}</span>
                {featuredPlaylists === undefined ? <h2>{feature.title}</h2> : null}
              </div>
            </PlaceholderMedia>
  
            <div className={featuredPlaylists !== undefined ? "discover-artist-editorial-meta is-active-playlist-meta" : "discover-artist-editorial-meta"}>
              <span className={featuredPlaylists !== undefined ? "is-active-playlist-name" : undefined}>{playlist?.name ?? "Loremipsum Dolorit"}</span>
              {featuredPlaylists === undefined ? <span>Eiusmod Tempor</span> : null}
              {playlist?.href ? <Link href={playlist.href}>Explore more ↗</Link> : <span>Explore more ↗</span>}
            </div>
          </article>
          );
        })}
      </section>
  );

  return (
    <>
    {sections !== "featuredSongs" && sections !== "playlists" && sections !== "withoutWatchingAndPlaylists" && sections !== "supportAndPlaylists" ? <ArtistShelf
      title="Artists we're watching"
      items={watchingArtists}
      enablePlayback={enableArtistPlayback}
      compactArtistCards={compactWatchingCards}
      compactNames={activeDiscoverTypography}
      footerCopy="1500+ artists trending online"
    /> : null}

    {sections !== "featuredSongs" && sections !== "artistsOnly" && sections !== "withoutWatchingAndPlaylists" && sections !== "watchingOnly" && !playlistsAfterSupport ? <>{playlistBlocks}{afterPlaylists}</> : null}

    {sections !== "remaining" && sections !== "playlists" && sections !== "artistsOnly" && sections !== "watchingAndPlaylists" && sections !== "watchingOnly" && sections !== "supportAndPlaylists" ? <ArtistShelf title={albumsTitle} items={featuredSongs} square enablePlayback={enableArtistPlayback} songTextStyle={activeDiscoverTypography} /> : null}

    {sections !== "featuredSongs" && sections !== "playlists" && sections !== "watchingAndPlaylists" && sections !== "watchingOnly" ? <ArtistShelf
      title={supportArtistsTitle}
      items={supportArtists}
      enablePlayback={enableArtistPlayback}
      compactNames={activeDiscoverTypography}
      footerCopy="1500+ artists trending online"
    /> : null}

    {sections !== "featuredSongs" && sections !== "artistsOnly" && sections !== "withoutWatchingAndPlaylists" && sections !== "watchingOnly" && playlistsAfterSupport ? <>{playlistBlocks}{afterPlaylists}</> : null}

    </>
  );
}

export default function DiscoverPage({ afterPlaylists, afterFeaturedSongs, liveContent = false, moveWatchingAndPlaylistsAfterReadyToCut = false, discover2Layout = false }: { afterPlaylists?: ReactNode; afterFeaturedSongs?: ReactNode; liveContent?: boolean; moveWatchingAndPlaylistsAfterReadyToCut?: boolean; discover2Layout?: boolean } = {}) {
  const { songs } = useSongs();
  const { currentSong, isPlaying, setQueue, togglePlayPause } = usePlayer();
  const [featuredArtists, setFeaturedArtists] = useState<DiscoverFeaturedArtist[]>([]);
  const [featuredArtistsLoading, setFeaturedArtistsLoading] = useState(true);
  const [featureCardArtists, setFeatureCardArtists] = useState<
    DiscoverFeatureCardArtist[]
  >([]);
  const [featureCardArtistsLoading, setFeatureCardArtistsLoading] =
    useState(true);
  const [activeFeaturedIndex, setActiveFeaturedIndex] = useState(0);
  const [directoryArtists, setDirectoryArtists] = useState<DirectoryArtist[]>([]);
  const [editorialPlaylists, setEditorialPlaylists] = useState<EditorialPlaylist[]>([]);
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
      } finally {
        if (!cancelled) setFeatureCardArtistsLoading(false);
      }
    }

    void loadFeatureCardArtists();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!liveContent) return;
    const controller = new AbortController();

    async function loadDirectory() {
      try {
        const response = await fetch("/api/artists/directory", { signal: controller.signal });
        if (!response.ok) throw new Error("Failed to load artists");
        const data = await response.json();
        if (!controller.signal.aborted) {
          setDirectoryArtists(Array.isArray(data?.artists) ? data.artists : []);
        }
      } catch {
        if (!controller.signal.aborted) setDirectoryArtists([]);
      }
    }

    async function loadPlaylists() {
      try {
        const [playlistsResponse, sectionsResponse] = await Promise.all([
          fetch("/api/curated-playlists", { signal: controller.signal }),
          fetch("/api/discover-sections", { signal: controller.signal }),
        ]);
        if (!playlistsResponse.ok || !sectionsResponse.ok) throw new Error("Failed to load playlists");
        const [playlists, sections] = await Promise.all([
          playlistsResponse.json(),
          sectionsResponse.json(),
        ]);
        const allPlaylists: EditorialPlaylist[] = Array.isArray(playlists) ? playlists : [];
        const byId = new Map(allPlaylists.map((playlist) => [playlist.id, playlist]));
        const featuredIds = Array.isArray(sections?.discover_curated)
          ? sections.discover_curated.map((entry: { playlist_id: number }) => entry.playlist_id)
          : [];
        const featured = featuredIds.flatMap((id: number) => {
          const playlist = byId.get(id);
          return playlist ? [playlist] : [];
        });
        const remaining = allPlaylists.filter((playlist) => !featuredIds.includes(playlist.id));
        if (!controller.signal.aborted) setEditorialPlaylists([...featured, ...remaining].slice(0, 3));
      } catch {
        if (!controller.signal.aborted) setEditorialPlaylists([]);
      }
    }

    void loadDirectory();
    void loadPlaylists();
    return () => controller.abort();
  }, [liveContent]);

  const directoryShelfItems = (artists: DirectoryArtist[]): ShelfItem[] =>
    artists.map((artist) => ({
      title: artist.name,
      subtitle: artist.designation ?? "",
      image: artist.hero_image_url || artist.profile_image_url || "",
      slug: artist.slug,
      imagePositionX: artist.hero_image_position_x,
      imagePositionY: artist.hero_image_position_y,
      genres: artist.genres,
      song: artist.songs.find((song) => Boolean(song.audioUrl)),
    }));

  // Discover2-only layout previews: no artist route or playable track is assigned.
  const previewArtistShelfItems = (realArtists: DirectoryArtist[], startIndex: number): ShelfItem[] => {
    const realItems = directoryShelfItems(realArtists);
    return [
      ...realItems,
      ...Array.from({ length: Math.max(0, 12 - realItems.length) }, (_, index) => ({
        title: `Artist preview ${String(startIndex + index + 1).padStart(2, "0")}`,
        subtitle: "Layout preview",
        image: playableSongs.length > 0
          ? playableSongs[(startIndex + index) % playableSongs.length].coverArt || ""
          : "",
      })),
    ];
  };

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
      <GlobalSearchBar musicFieldStyle darkSimilarButton />

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
                    <>
                      <span className="is-placeholder" aria-hidden="true" />
                      <span className="is-placeholder" aria-hidden="true" />
                      <span className="is-placeholder" aria-hidden="true" />
                    </>
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
          loading={featureCardArtistsLoading}
          showHeading={featuredArtistCount > 0 || featureCardArtistsLoading}
        />

        <DiscoverArchivedSections
          sections={discover2Layout ? "featuredSongs" : moveWatchingAndPlaylistsAfterReadyToCut ? "withoutWatchingAndPlaylists" : "all"}
          afterPlaylists={discover2Layout || moveWatchingAndPlaylistsAfterReadyToCut ? undefined : afterPlaylists}
          albumsTitle={liveContent ? "Top songs" : "Top albums"}
          enableArtistPlayback={liveContent}
          watchingArtists={liveContent ? previewArtistShelfItems(directoryArtists.slice(0, 7), 0) : undefined}
          supportArtists={liveContent ? previewArtistShelfItems(directoryArtists.slice(7, 14), 12) : undefined}
          featuredSongs={liveContent ? playableSongs.slice(0, 12).map((song) => ({
            title: song.title,
            subtitle: song.artist,
            image: song.coverArt || "",
            song,
          })) : undefined}
          featuredPlaylists={liveContent ? editorialPlaylists.map((playlist) => ({
            name: playlist.name,
            image: playlist.feature_cover_image_url || playlist.cover_image_url || "",
            href: `/curated-playlists/${playlist.id}`,
          })) : undefined}
        />

        {discover2Layout ? (
          <>
            {afterFeaturedSongs}
            {afterPlaylists}
          </>
        ) : null}

        <ReadyToCutTracks songs={readyToCutSongs} />

        {discover2Layout ? (
          <DiscoverArchivedSections
            sections="supportAndPlaylists"
            supportArtistsTitle="Artists we're watching"
            playlistsAfterSupport
            enableArtistPlayback={liveContent}
            supportArtists={liveContent ? previewArtistShelfItems(directoryArtists.slice(7, 14), 12) : undefined}
            featuredPlaylists={liveContent ? editorialPlaylists.map((playlist) => ({
              name: playlist.name,
              image: playlist.feature_cover_image_url || playlist.cover_image_url || "",
              href: `/curated-playlists/${playlist.id}`,
            })) : undefined}
          />
        ) : null}

        {moveWatchingAndPlaylistsAfterReadyToCut ? (
          <DiscoverArchivedSections
            sections="watchingAndPlaylists"
            afterPlaylists={afterPlaylists}
            enableArtistPlayback={liveContent}
            watchingArtists={liveContent ? previewArtistShelfItems(directoryArtists.slice(0, 7), 0) : undefined}
            featuredPlaylists={liveContent ? editorialPlaylists.map((playlist) => ({
              name: playlist.name,
              image: playlist.feature_cover_image_url || playlist.cover_image_url || "",
              href: `/curated-playlists/${playlist.id}`,
            })) : undefined}
          />
        ) : null}

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
