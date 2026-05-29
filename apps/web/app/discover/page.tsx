"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  KeyboardEvent,
  MouseEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ArrowUpRightIcon from "@/components/icons/ArrowUpRightIcon";
import CuratedPlaylistShelf from "@/components/curated/CuratedPlaylistShelf";
import type { CuratedPlaylist } from "@/lib/curatedPlaylists";
import PauseIcon from "@/components/icons/PauseIcon";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import SearchIcon from "@/components/icons/SearchIcon";
import MusicIcon from "@/components/icons/MusicIcon";
import WaveformIcon from "@/components/icons/WaveformIcon";
import Footer from "@/components/Footer";
import { usePlayer } from "@/context/PlayerContext";
import { useSongs } from "@/hooks/useSongs";
import type { Song } from "@/lib/types";

const COMPACT_SONG_COUNT = 9;
const FAST_SCAN_SONG_COUNT = 24;

const searchPrompts = [
  "Cinematic",
  "Documentary",
  "Ambient",
  "Piano",
  "Travel",
  "Dark",
];

function formatDuration(seconds: number) {
  if (!seconds || !Number.isFinite(seconds)) return "0:00";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function getFallbackGradient(index: number) {
  const gradients = [
    "linear-gradient(135deg, #372f4f 0%, #111111 48%, #75649a 100%)",
    "linear-gradient(135deg, #1f3d3a 0%, #111111 52%, #4d8c7b 100%)",
    "linear-gradient(135deg, #4f3529 0%, #111111 50%, #b66c45 100%)",
    "linear-gradient(135deg, #25364f 0%, #111111 52%, #6287c4 100%)",
    "linear-gradient(135deg, #45233d 0%, #111111 52%, #b75d91 100%)",
  ];

  return gradients[index % gradients.length];
}

function sortSongsForVisuals(songs: Song[]) {
  return [...songs]
    .filter((song) => song.audioUrl)
    .sort((a, b) => {
      const aScore = (a.coverArt ? 2 : 0) + a.genres.length + a.moods.length;
      const bScore = (b.coverArt ? 2 : 0) + b.genres.length + b.moods.length;

      if (bScore !== aScore) return bScore - aScore;

      return a.title.localeCompare(b.title);
    });
}

function getFastScanSongs(playableSongs: Song[]) {
  if (playableSongs.length === 0) return [];

  const nextBatch = playableSongs.slice(
    COMPACT_SONG_COUNT,
    COMPACT_SONG_COUNT + FAST_SCAN_SONG_COUNT,
  );

  if (nextBatch.length >= FAST_SCAN_SONG_COUNT) return nextBatch;

  const fallbackBatch = playableSongs
    .filter((song) => !nextBatch.some((nextSong) => nextSong.id === song.id))
    .slice(0, FAST_SCAN_SONG_COUNT - nextBatch.length);

  return [...nextBatch, ...fallbackBatch].slice(0, FAST_SCAN_SONG_COUNT);
}

function stopPlaybackKeyEvent(event: KeyboardEvent<HTMLElement>) {
  event.preventDefault();
  event.stopPropagation();
  event.nativeEvent.stopImmediatePropagation();
}

function stopPlaybackMouseEvent(event: MouseEvent<HTMLElement>) {
  event.preventDefault();
  event.stopPropagation();
  event.nativeEvent.stopImmediatePropagation();
}

function KickerPill({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex w-fit max-w-full items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-medium leading-none text-white/76 backdrop-blur">
      <span className="truncate">{children}</span>
    </div>
  );
}

function DiscoverSkeletonBlock({ className = "" }: { className?: string }) {
  return <span className={`discover-skeleton-block ${className}`} />;
}

function DiscoverSectionHeadingSkeleton({ wide = false }: { wide?: boolean }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <DiscoverSkeletonBlock
          className={wide ? "h-5 w-52 rounded-md" : "h-5 w-40 rounded-md"}
        />
        <DiscoverSkeletonBlock
          className={wide ? "mt-2 h-2.5 w-72 rounded-full" : "mt-2 h-2.5 w-64 rounded-full"}
        />
      </div>
      <DiscoverSkeletonBlock className="hidden h-3 w-16 rounded-full sm:block" />
    </div>
  );
}

function DiscoverLargeCardSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`discover-skeleton-card ${className}`}>
      <DiscoverSkeletonBlock className="discover-skeleton-pill" />
      <div className="discover-skeleton-card-copy">
        <DiscoverSkeletonBlock className="h-6 w-[72%] rounded-md" />
        <DiscoverSkeletonBlock className="mt-3 h-2.5 w-[56%] rounded-full" />
        <DiscoverSkeletonBlock className="mt-2 h-2.5 w-[42%] rounded-full" />
      </div>
    </div>
  );
}

function DiscoverCompactSongsSkeleton() {
  return (
    <section className="mt-10 discover-skeleton-section">
      <DiscoverSectionHeadingSkeleton wide />
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: COMPACT_SONG_COUNT }).map((_, index) => (
          <div key={index} className="discover-skeleton-song-row">
            <DiscoverSkeletonBlock className="h-9 w-9 shrink-0 rounded-md" />
            <div className="min-w-0 flex-1">
              <DiscoverSkeletonBlock className="h-2.5 w-[72%] rounded-full" />
              <DiscoverSkeletonBlock className="mt-2 h-2 w-[48%] rounded-full" />
            </div>
            <DiscoverSkeletonBlock className="h-8 w-8 shrink-0 rounded-full" />
          </div>
        ))}
      </div>
    </section>
  );
}

function DiscoverProductionSkeleton() {
  return (
    <section className="mt-12 discover-skeleton-section">
      <DiscoverSectionHeadingSkeleton wide />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <DiscoverLargeCardSkeleton key={index} className="min-h-[245px]" />
        ))}
      </div>
    </section>
  );
}

function DiscoverCuratedShelfSkeleton() {
  return (
    <section className="mt-10 discover-skeleton-section">
      <DiscoverSectionHeadingSkeleton />
      <div className="relative -mx-8 overflow-hidden">
        <div className="flex gap-3 overflow-hidden pl-8 pr-20">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="discover-skeleton-shelf-card" />
          ))}
        </div>
      </div>
    </section>
  );
}

function DiscoverFastScanSkeleton() {
  return (
    <section className="mt-12 discover-skeleton-section">
      <DiscoverSectionHeadingSkeleton wide />
      <div className="rounded-[18px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-2">
        <div className="grid gap-x-2 gap-y-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: FAST_SCAN_SONG_COUNT }).map((_, index) => (
            <div key={index} className="discover-skeleton-fast-row">
              <DiscoverSkeletonBlock className="h-2 w-4 rounded-full" />
              <div className="min-w-0 flex-1">
                <DiscoverSkeletonBlock className="h-2 w-[74%] rounded-full" />
                <DiscoverSkeletonBlock className="mt-1.5 h-1.5 w-[46%] rounded-full" />
              </div>
              <DiscoverSkeletonBlock className="h-2 w-8 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DiscoverPageSkeleton() {
  return (
    <>
      <style>{`
        .discover-skeleton-section,
        .discover-skeleton-hero {
          animation: skeleton-fade-in 0.3s ease-out both;
        }

        .discover-skeleton-section:nth-of-type(2) {
          animation-delay: 0.04s;
        }

        .discover-skeleton-section:nth-of-type(3) {
          animation-delay: 0.08s;
        }

        .discover-skeleton-block,
        .discover-skeleton-card,
        .discover-skeleton-shelf-card,
        .discover-skeleton-song-row,
        .discover-skeleton-fast-row {
          position: relative;
          overflow: hidden;
        }

        .discover-skeleton-block {
          display: block;
          background: var(--bg-tertiary);
        }

        .discover-skeleton-card,
        .discover-skeleton-shelf-card,
        .discover-skeleton-song-row,
        .discover-skeleton-fast-row {
          border: 1px solid var(--border-subtle);
          background: var(--bg-card);
        }

        .discover-skeleton-block::after,
        .discover-skeleton-card::after,
        .discover-skeleton-shelf-card::after,
        .discover-skeleton-song-row::after,
        .discover-skeleton-fast-row::after {
          content: "";
          position: absolute;
          inset: 0;
          transform: translateX(-100%);
          background: linear-gradient(
            90deg,
            transparent,
            color-mix(in srgb, var(--bg-hover) 48%, transparent),
            transparent
          );
          animation: discover-skeleton-shimmer 1.6s ease-in-out infinite;
        }

        @keyframes discover-skeleton-shimmer {
          100% {
            transform: translateX(100%);
          }
        }

        .discover-skeleton-card {
          border-radius: 18px;
          padding: 16px;
        }

        .discover-skeleton-pill {
          height: 22px;
          width: 110px;
          border-radius: 999px;
        }

        .discover-skeleton-card-copy {
          position: absolute;
          left: 16px;
          right: 16px;
          bottom: 16px;
        }

        .discover-skeleton-song-row {
          display: flex;
          height: 54px;
          align-items: center;
          gap: 8px;
          border-radius: 8px;
          padding: 0 8px;
        }

        .discover-skeleton-fast-row {
          display: flex;
          height: 34px;
          align-items: center;
          gap: 8px;
          border-radius: 6px;
          border-color: transparent;
          background: transparent;
          padding: 0 8px;
        }

        .discover-skeleton-shelf-card {
          min-height: 210px;
          min-width: 250px;
          flex: 0 0 250px;
          border-radius: 18px;
        }

        @media (min-width: 640px) {
          .discover-skeleton-shelf-card {
            min-width: 285px;
            flex-basis: 285px;
          }
        }

        @media (min-width: 1024px) {
          .discover-skeleton-shelf-card {
            min-width: 320px;
            flex-basis: 320px;
          }
        }
      `}</style>

      <div className="discover-skeleton-hero">
        <div className="mb-6 grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] xl:items-end">
          <div>
            <DiscoverSkeletonBlock className="mb-3 h-3 w-36 rounded-full" />
            <DiscoverSkeletonBlock className="h-[clamp(92px,11vw,150px)] w-[min(640px,84%)] rounded-xl" />
          </div>
          <div className="xl:justify-self-end">
            <DiscoverSkeletonBlock className="h-2.5 w-[min(540px,80vw)] rounded-full" />
            <DiscoverSkeletonBlock className="mt-3 h-2.5 w-[min(440px,72vw)] rounded-full" />
          </div>
        </div>

        <div className="flex min-h-[58px] items-center gap-3 rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-4">
          <DiscoverSkeletonBlock className="h-9 w-9 shrink-0 rounded-full" />
          <DiscoverSkeletonBlock className="h-2.5 flex-1 rounded-full" />
          <div className="hidden items-center gap-1.5 lg:flex">
            {Array.from({ length: 4 }).map((_, index) => (
              <DiscoverSkeletonBlock key={index} className="h-7 w-20 rounded-full" />
            ))}
          </div>
          <DiscoverSkeletonBlock className="hidden h-9 w-28 shrink-0 rounded-full sm:block" />
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
          <DiscoverLargeCardSkeleton className="min-h-[420px]" />
          <div className="grid gap-4">
            <DiscoverLargeCardSkeleton className="min-h-[204px]" />
            <div className="grid gap-4 sm:grid-cols-2">
              <DiscoverLargeCardSkeleton className="min-h-[188px]" />
              <DiscoverLargeCardSkeleton className="min-h-[188px]" />
            </div>
          </div>
        </div>
      </div>

      <DiscoverCompactSongsSkeleton />
      <DiscoverProductionSkeleton />
      <DiscoverCuratedShelfSkeleton />
      <DiscoverFastScanSkeleton />
    </>
  );
}

function CoverImage({
  song,
  index,
  className,
}: {
  song: Song;
  index: number;
  className: string;
}) {
  return (
    <div
      className={`relative overflow-hidden bg-[var(--bg-tertiary)] ${className}`}
      style={{
        background: song.coverArt ? undefined : getFallbackGradient(index),
      }}
    >
      {song.coverArt ? (
        <Image
          src={song.coverArt}
          alt={`${song.title} cover art`}
          fill
          sizes="(min-width: 1280px) 60vw, (min-width: 768px) 50vw, 100vw"
          className="object-cover"
          unoptimized
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-[var(--text-muted)]">
          <WaveformIcon size={34} />
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
    </div>
  );
}

function PlayButton({
  song,
  size = "small",
}: {
  song: Song;
  size?: "large" | "small";
}) {
  const { currentSong, isPlaying, togglePlayPause } = usePlayer();
  const active = currentSong?.id === song.id;
  const playing = active && isPlaying;
  const buttonSize = size === "large" ? "h-12 w-12" : "h-9 w-9";
  const iconSize = size === "large" ? 20 : 15;
  const shadowClass =
    size === "large"
      ? "shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
      : "shadow-[0_8px_24px_rgba(0,0,0,0.22)]";

  return (
    <button
      type="button"
      onClick={(event) => {
        stopPlaybackMouseEvent(event);
        togglePlayPause(song);
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;

        stopPlaybackKeyEvent(event);

        if (!event.repeat) togglePlayPause(song);
      }}
      onKeyUp={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;

        stopPlaybackKeyEvent(event);
      }}
      className={`flex ${buttonSize} ${shadowClass} shrink-0 cursor-pointer items-center justify-center rounded-full bg-white text-black transition hover:scale-105 disabled:cursor-default disabled:opacity-50`}
      disabled={!song.audioUrl}
      aria-label={playing ? `Pause ${song.title}` : `Play ${song.title}`}
    >
      {playing ? (
        <PauseIcon size={iconSize} />
      ) : (
        <PlayIconSmall size={iconSize} />
      )}
    </button>
  );
}

function usePlayableCard(song: Song) {
  const { togglePlayPause } = usePlayer();

  function playCard() {
    if (!song.audioUrl) return;

    togglePlayPause(song);
  }

  return {
    role: "button",
    tabIndex: song.audioUrl ? 0 : -1,
    onClick: (event: MouseEvent<HTMLElement>) => {
      stopPlaybackMouseEvent(event);
      playCard();
    },
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (event.key !== "Enter" && event.key !== " ") return;

      stopPlaybackKeyEvent(event);

      if (!event.repeat) playCard();
    },
    onKeyUp: (event: KeyboardEvent<HTMLElement>) => {
      if (event.key !== "Enter" && event.key !== " ") return;

      stopPlaybackKeyEvent(event);
    },
  };
}

function FullWidthSearchBar() {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanSearch = search.trim();

    if (!cleanSearch) {
      router.push("/music");
      return;
    }

    router.push(`/music?search=${encodeURIComponent(cleanSearch)}`);
  }

  function searchPrompt(prompt: string) {
    router.push(`/music?search=${encodeURIComponent(prompt)}`);
  }

  return (
    <section className="mt-6">
      <form
        onSubmit={handleSubmit}
        onClick={() => searchInputRef.current?.focus()}
        className="group flex min-h-[58px] w-full cursor-text items-center gap-3 rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-4 transition hover:bg-[var(--bg-hover)] focus-within:bg-[var(--bg-hover)]"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)] transition group-focus-within:text-[var(--text-primary)]">
          <SearchIcon size={15} />
        </div>

        <input
          ref={searchInputRef}
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by scene, mood, artist, genre, instrument, or title..."
          className="h-full min-w-0 flex-1 bg-transparent text-sm font-light text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
        />

        <div className="hidden items-center gap-1.5 lg:flex">
          {searchPrompts.slice(0, 4).map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                searchPrompt(prompt);
              }}
              className="h-7 cursor-pointer rounded-full border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-[11px] font-medium text-[var(--text-secondary)] transition hover:border-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              {prompt}
            </button>
          ))}
        </div>

        <button
          type="submit"
          onClick={(event) => event.stopPropagation()}
          className="hidden h-9 shrink-0 cursor-pointer items-center rounded-full bg-[var(--text-primary)] px-10 text-xs font-medium text-[var(--bg-primary)] transition hover:opacity-80 sm:flex"
        >
          Search
        </button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2 lg:hidden">
        {searchPrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => searchPrompt(prompt)}
            className="h-7 cursor-pointer rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-3 text-[11px] font-medium text-[var(--text-secondary)] transition hover:border-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            {prompt}
          </button>
        ))}
      </div>
    </section>
  );
}

function DiscoveryHeroCard({ playlist }: { playlist: CuratedPlaylist }) {
  return (
    <Link
      href={`/curated-playlists/${playlist.id}`}
      className="group relative min-h-[420px] overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--bg-secondary)]"
    >
      {playlist.cover_image_url && (
        <Image
          src={playlist.cover_image_url}
          alt={playlist.name}
          fill
          sizes="(min-width: 1280px) 50vw, 100vw"
          className="object-cover transition duration-700 group-hover:scale-[1.04]"
          priority
        />
      )}

      <div className="absolute inset-0 bg-black/35" />

      <div className="relative z-10 flex min-h-[420px] flex-col justify-between p-6 md:p-8">
        <KickerPill>{playlist.kicker}</KickerPill>

        <div className="max-w-[520px]">
          <h1 className="font-[family-name:var(--font-instrument-sans)] text-[clamp(32px,4.8vw,58px)] font-medium leading-[0.9] tracking-[-0.065em] text-white">
            {playlist.name}
          </h1>

          {playlist.description && (
            <p className="mt-4 max-w-[420px] text-sm leading-6 text-white/72">
              {playlist.description}
            </p>
          )}

          {playlist.discover_button_enabled && (
            <div className="mt-7 inline-flex h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-black transition group-hover:scale-[1.02]">
              {playlist.discover_button_text || "Explore this mood"}
              <ArrowUpRightIcon />
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

function DiscoverySideCard({ playlist }: { playlist: CuratedPlaylist }) {
  return (
    <Link
      href={`/curated-playlists/${playlist.id}`}
      className="group relative min-h-[204px] overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--bg-secondary)]"
    >
      {playlist.cover_image_url && (
        <Image
          src={playlist.cover_image_url}
          alt={playlist.name}
          fill
          sizes="(min-width: 1280px) 30vw, 100vw"
          className="object-cover transition duration-700 group-hover:scale-[1.04]"
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-r from-black/78 via-black/46 to-black/10" />

      <div className="relative z-10 flex min-h-[204px] flex-col justify-between p-5">
        <KickerPill>{playlist.kicker}</KickerPill>

        <div>
          <h2 className="font-[family-name:var(--font-instrument-sans)] text-[30px] font-medium leading-[1.05] tracking-[-0.055em] text-white">
            {playlist.name}
          </h2>

          {playlist.description && (
            <p className="mt-2 max-w-[320px] text-xs leading-5 text-white/68">
              {playlist.description}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

function DiscoveryMiniCard({ playlist }: { playlist: CuratedPlaylist }) {
  return (
    <Link
      href={`/curated-playlists/${playlist.id}`}
      className="group relative min-h-[188px] overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--bg-secondary)]"
    >
      {playlist.cover_image_url && (
        <Image
          src={playlist.cover_image_url}
          alt={playlist.name}
          fill
          sizes="(min-width: 1280px) 20vw, 50vw"
          className="object-cover transition duration-700 group-hover:scale-[1.04]"
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/22 to-black/8" />

      <div className="relative z-10 flex min-h-[188px] flex-col justify-end gap-2 p-4">
        <KickerPill>{playlist.kicker}</KickerPill>

        <h3 className="font-[family-name:var(--font-instrument-sans)] text-[24px] font-medium leading-[1.05] tracking-[-0.05em] text-white">
          {playlist.name}
        </h3>
      </div>
    </Link>
  );
}

function VisualDiscoverySection({ blocks }: { blocks: CuratedPlaylist[] }) {
  if (blocks.length === 0) return null;

  const [hero, side, ...minis] = blocks;

  return (
    <section>
      <div className="mb-6 grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] xl:items-end">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
            <MusicIcon size={13} />
            Discover by scene
          </div>

          <h1 className="max-w-[720px] font-[family-name:var(--font-instrument-sans)] text-[clamp(42px,6vw,78px)] font-medium leading-[0.9] tracking-[-0.07em]">
            Start with the feeling, then find the track.
          </h1>
        </div>

        <p className="max-w-[560px] text-sm leading-6 text-[var(--text-secondary)] xl:justify-self-end">
          Move through the library like a visual treatment — documentary warmth,
          after-dark tension, open travel cues, and polished brand motion.
        </p>
      </div>

      <FullWidthSearchBar />

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
        {hero && <DiscoveryHeroCard playlist={hero} />}

        <div className="grid gap-4">
          {side && <DiscoverySideCard playlist={side} />}

          {minis.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {minis.slice(0, 2).map((playlist) => (
                <DiscoveryMiniCard key={playlist.id} playlist={playlist} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ProductionStyleCard({ playlist }: { playlist: CuratedPlaylist }) {
  return (
    <Link
      href={`/curated-playlists/${playlist.id}`}
      className="group relative min-h-[245px] overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--bg-secondary)] transition hover:border-[var(--text-muted)]"
    >
      {playlist.cover_image_url && (
        <Image
          src={playlist.cover_image_url}
          alt={playlist.name}
          fill
          sizes="(min-width: 1280px) 25vw, 100vw"
          className="object-cover transition duration-700 group-hover:scale-[1.04]"
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/36 to-black/8" />

      <div className="relative z-10 flex min-h-[245px] flex-col justify-between p-4">
        <div className="flex items-start justify-between gap-3">
          <KickerPill>{playlist.kicker}</KickerPill>

          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/12 text-white backdrop-blur transition group-hover:bg-white group-hover:text-black">
            <ArrowUpRightIcon />
          </div>
        </div>

        <div>
          <h3 className="font-[family-name:var(--font-instrument-sans)] text-[28px] font-medium leading-[1.05] tracking-[-0.055em] text-white">
            {playlist.name}
          </h3>

          {playlist.description && (
            <p className="mt-3 max-w-[320px] text-xs leading-5 text-white/68">
              {playlist.description}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

function ProductionStylesSection({ blocks }: { blocks: CuratedPlaylist[] }) {
  if (blocks.length === 0) return null;

  return (
    <section className="mt-12">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-[family-name:var(--font-instrument-sans)] text-2xl font-medium tracking-[-0.05em]">
            Browse by production style
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Visual entry points for common edits, pacing, and film tone.
          </p>
        </div>

        <Link
          href="/music"
          className="hidden text-xs font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] sm:block"
        >
          View library
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {blocks.map((playlist) => (
          <ProductionStyleCard key={playlist.id} playlist={playlist} />
        ))}
      </div>
    </section>
  );
}

function CuratedPlaylistsSection({ playlists }: { playlists: CuratedPlaylist[] }) {
  if (playlists.length === 0) return null;

  return (
    <CuratedPlaylistShelf
      title="Curated playlists"
      description="Built for faster starting points, rough cuts, and client-facing treatments."
      playlists={playlists}
      viewAllHref="/curated-playlists"
    />
  );
}

function CompactSongCard({ song, index }: { song: Song; index: number }) {
  const cardPlayProps = usePlayableCard(song);

  return (
    <article
      {...cardPlayProps}
      className="group flex h-[54px] cursor-pointer items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-2 transition hover:bg-[var(--bg-hover)] focus:outline-none focus-visible:border-[var(--text-muted)]"
      aria-label={`Play ${song.title} by ${song.artist}`}
    >
      <CoverImage
        song={song}
        index={index}
        className="h-9 w-9 shrink-0 rounded-md"
      />

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

      <PlayButton song={song} size="small" />
    </article>
  );
}

function FastScanPlayIcon({ song }: { song: Song }) {
  const { currentSong, isPlaying } = usePlayer();
  const active = currentSong?.id === song.id;
  const playing = active && isPlaying;

  return (
    <span
      className={`flex h-5 w-5 items-center justify-center rounded-full transition ${
        active
          ? "bg-white text-black opacity-100"
          : "bg-transparent text-[var(--text-muted)] opacity-0 group-hover:bg-white group-hover:text-black group-hover:opacity-100"
      }`}
    >
      {playing ? <PauseIcon size={9} /> : <PlayIconSmall size={9} />}
    </span>
  );
}

function FastScanSongCard({ song, index }: { song: Song; index: number }) {
  const { currentSong } = usePlayer();
  const cardPlayProps = usePlayableCard(song);
  const number = String(index + 1).padStart(2, "0");
  const active = currentSong?.id === song.id;

  return (
    <article
      {...cardPlayProps}
      className={`group grid h-[34px] cursor-pointer grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2 rounded-md px-2 text-left transition focus:outline-none focus-visible:bg-[var(--bg-hover)] ${
        active ? "bg-[var(--bg-hover)]" : "hover:bg-[var(--bg-hover)]"
      }`}
      aria-label={`Play ${song.title} by ${song.artist}`}
    >
      <span className="text-[9px] font-medium tabular-nums text-[var(--text-muted)] transition group-hover:text-[var(--text-secondary)]">
        {number}
      </span>

      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="truncate text-[12px] font-medium leading-none text-[var(--text-primary)]">
            {song.title}
          </h3>
          <span className="hidden shrink-0 text-[9px] text-[var(--text-muted)] sm:inline">
            {song.key || "—"}
          </span>
        </div>

        <div className="mt-1 truncate text-[9px] leading-none text-[var(--text-muted)]">
          {song.artist}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="hidden text-[9px] tabular-nums text-[var(--text-muted)] sm:inline">
          {song.bpm ? `${song.bpm}` : "—"}
        </span>
        <span className="text-[9px] tabular-nums text-[var(--text-muted)]">
          {formatDuration(song.duration)}
        </span>
        <FastScanPlayIcon song={song} />
      </div>
    </article>
  );
}

function CompactSongsSection({ songs }: { songs: Song[] }) {
  if (songs.length === 0) return null;

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-[family-name:var(--font-instrument-sans)] text-2xl font-medium tracking-[-0.05em]">
            Ready-to-cut tracks
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Quick options for pacing out a scene, testing a tone, or finding a
            first pass.
          </p>
        </div>

        <Link
          href="/music"
          className="hidden text-xs font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] sm:block"
        >
          Open music
        </Link>
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {songs.map((song, index) => (
          <CompactSongCard key={song.id} song={song} index={index + 30} />
        ))}
      </div>
    </section>
  );
}

function FastScanSection({ songs }: { songs: Song[] }) {
  if (songs.length === 0) return null;

  return (
    <section className="mt-12">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-[family-name:var(--font-instrument-sans)] text-2xl font-medium tracking-[-0.05em]">
            Fast tracks
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            A denser list for quick auditioning when you already know the lane.
          </p>
        </div>

        <Link
          href="/music"
          className="hidden text-xs font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] sm:block"
        >
          Browse all
        </Link>
      </div>

      <div className="rounded-[18px] border border-[var(--border)] bg-[var(--bg-secondary)] p-2">
        <div className="grid gap-x-2 gap-y-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {songs.map((song, index) => (
            <FastScanSongCard
              key={`${song.id}-${index}`}
              song={song}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function DashboardPage() {
  const { songs, loading: songsLoading } = useSongs();
  const { currentSong, setQueue } = usePlayer();
  const [playlists, setPlaylists] = useState<CuratedPlaylist[]>([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/curated-playlists")
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setPlaylists(data);
      })
      .catch(() => {})
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

  const productionBlocks = useMemo(
    () =>
      playlists
        .filter((playlist) =>
          playlist.discover_section?.startsWith("production_style_"),
        )
        .sort((a, b) =>
          (a.discover_section ?? "").localeCompare(b.discover_section ?? ""),
        ),
    [playlists],
  );

  const discoverCuratedPlaylists = useMemo(
    () =>
      playlists
        .filter(
          (playlist) => playlist.show_on_discover && !playlist.discover_section,
        )
        .sort((a, b) => a.discover_position - b.discover_position),
    [playlists],
  );

  const playableSongs = useMemo(() => sortSongsForVisuals(songs), [songs]);
  const compactSongs = playableSongs.slice(0, COMPACT_SONG_COUNT);
  const fastScanSongs = getFastScanSongs(playableSongs);
  const playerVisible = !!currentSong;
  const pageLoading = playlistsLoading || songsLoading;

  useEffect(() => {
    if (!pageLoading) {
      setQueue(playableSongs);
    }
  }, [pageLoading, playableSongs, setQueue]);

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <section className="ml-[var(--sidebar-width)] min-h-screen pt-14 transition-[margin-left] duration-200">
        <div className="px-8 pt-6">
          {pageLoading ? (
            <DiscoverPageSkeleton />
          ) : (
            <>
              <VisualDiscoverySection blocks={discoverBlocks} />

              <CompactSongsSection songs={compactSongs} />

              <ProductionStylesSection blocks={productionBlocks} />

              <CuratedPlaylistsSection playlists={discoverCuratedPlaylists} />

              <FastScanSection songs={fastScanSongs} />
            </>
          )}

          <div
            className="pt-10"
            style={{ paddingBottom: playerVisible ? "72px" : "8px" }}
          >
            <Footer />
          </div>
        </div>
      </section>
    </main>
  );
}
