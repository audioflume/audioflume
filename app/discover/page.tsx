"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  KeyboardEvent,
  MouseEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ArrowUpRightIcon from "@/components/icons/ArrowUpRightIcon";
import CuratedPlaylistShelf from "@/components/curated/CuratedPlaylistShelf";
import type { CuratedPlaylist } from "@/lib/curatedPlaylists";
import MusicIcon from "@/components/icons/MusicIcon";
import PauseIcon from "@/components/icons/PauseIcon";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import SearchIcon from "@/components/icons/SearchIcon";
import WaveformIcon from "@/components/icons/WaveformIcon";
import Footer from "@/components/Footer";
import { usePlayer } from "@/context/PlayerContext";
import { useSongs } from "@/hooks/useSongs";
import type { Song } from "@/lib/types";

const COMPACT_SONG_COUNT = 9;
const FAST_SCAN_SONG_COUNT = 24;

type DiscoveryScene = {
  title: string;
  kicker: string;
  description: string;
  href: string;
  image: string;
  layout: "hero" | "wide" | "small";
};

type ProductionStyle = {
  title: string;
  kicker: string;
  description: string;
  href: string;
  image: string;
};

const discoveryScenes: DiscoveryScene[] = [
  {
    title: "Quiet documentary beds",
    kicker: "Human / Minimal / Warm",
    description:
      "Soft movement, subtle pulse, and grounded tracks for voice-led edits.",
    href: "/music?genre=Documentary",
    image:
      "https://images.unsplash.com/photo-1704564552264-ca74a6e46fbc?q=80&w=2751&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    layout: "hero",
  },
  {
    title: "After-dark tension",
    kicker: "Dark / cinematic",
    description: "Slow pressure, negative space, low rhythm, and moody builds.",
    href: "/music?mood=Dark",
    image:
      "https://images.unsplash.com/photo-1654206399380-87b22188e01b?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    layout: "wide",
  },
  {
    title: "Travel light",
    kicker: "Organic / open",
    description: "Airy guitars, soft percussion, and moving landscape cues.",
    href: "/music?genre=Travel",
    image:
      "https://images.unsplash.com/photo-1732294650830-93cfc322aa62?q=80&w=2076&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    layout: "small",
  },
  {
    title: "Brand motion",
    kicker: "Clean / modern",
    description:
      "Polished, confident, and energetic tracks for commercial cuts.",
    href: "/music?genre=Commercial",
    image:
      "https://images.unsplash.com/photo-1777996625750-b934896792b9?q=80&w=1069&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    layout: "small",
  },
];

const searchPrompts = [
  "Cinematic",
  "Documentary",
  "Ambient",
  "Piano",
  "Travel",
  "Dark",
];

const productionStyles: ProductionStyle[] = [
  {
    title: "Slow travel films",
    kicker: "Open / atmospheric",
    description: "Movement, landscapes, soft rhythm, and warm horizon energy.",
    href: "/music?genre=Travel",
    image:
      "https://images.unsplash.com/photo-1668620858961-7f87a791a520?q=80&w=3185&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    title: "Intimate interviews",
    kicker: "Subtle / emotional",
    description: "Minimal beds that leave space for voice, story, and silence.",
    href: "/music?genre=Documentary",
    image:
      "https://images.unsplash.com/photo-1565288971009-a6db8844c687?q=80&w=1626&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    title: "Premium brand edits",
    kicker: "Polished / modern",
    description: "Clean pulse, confident builds, and refined commercial tone.",
    href: "/music?genre=Commercial",
    image:
      "https://images.unsplash.com/photo-1678585056636-323de5098c58?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    title: "Feel good moments",
    kicker: "Warm / uplifting",
    description:
      "Bright rhythm, easy movement, and optimistic cues for lighthearted edits.",
    href: "/music?mood=Feel%20Good",
    image:
      "https://images.unsplash.com/photo-1761926872117-f3112e63c940?q=80&w=2075&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
];

const fallbackCuratedPlaylists: CuratedPlaylist[] = [
  {
    id: 1,
    name: "Docu beds",
    kicker: "Human stories",
    song_count: 18,
    cover_image_url:
      "https://images.unsplash.com/photo-1492724441997-5dc865305da7?auto=format&fit=crop&w=900&q=80",
    playlist_group: "Documentary",
    position: 0,
  },
  {
    id: 2,
    name: "Brand polish",
    kicker: "Commercial cuts",
    song_count: 24,
    cover_image_url:
      "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=900&q=80",
    playlist_group: "Commercial",
    position: 1,
  },
  {
    id: 3,
    name: "After hours",
    kicker: "Dark tension",
    song_count: 15,
    cover_image_url:
      "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=80",
    playlist_group: "Tension",
    position: 2,
  },
  {
    id: 4,
    name: "Open roads",
    kicker: "Travel motion",
    song_count: 21,
    cover_image_url:
      "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=80",
    playlist_group: "Travel",
    position: 3,
  },
  {
    id: 5,
    name: "Soft focus",
    kicker: "Ambient texture",
    song_count: 12,
    cover_image_url:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
    playlist_group: "Ambient",
    position: 4,
  },
  {
    id: 6,
    name: "First pass",
    kicker: "Fast selects",
    song_count: 30,
    cover_image_url:
      "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=900&q=80",
    playlist_group: "Editor Picks",
    position: 5,
  },
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

  if (nextBatch.length >= FAST_SCAN_SONG_COUNT) {
    return nextBatch;
  }

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

  function handleClick(event: MouseEvent<HTMLElement>) {
    stopPlaybackMouseEvent(event);
    playCard();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;

    stopPlaybackKeyEvent(event);

    if (!event.repeat) {
      playCard();
    }
  }

  function handleKeyUp(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;

    stopPlaybackKeyEvent(event);
  }

  return {
    role: "button",
    tabIndex: song.audioUrl ? 0 : -1,
    onClick: handleClick,
    onKeyDown: handleKeyDown,
    onKeyUp: handleKeyUp,
  };
}

function DiscoveryImage({ scene }: { scene: DiscoveryScene }) {
  return (
    <Image
      src={scene.image}
      alt={scene.title}
      fill
      sizes="(min-width: 1280px) 50vw, (min-width: 768px) 50vw, 100vw"
      className="object-cover transition duration-700 group-hover:scale-[1.04]"
      priority={scene.layout === "hero"}
    />
  );
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

function DiscoveryHeroCard({ scene }: { scene: DiscoveryScene }) {
  return (
    <Link
      href={scene.href}
      className="group relative min-h-[420px] overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--bg-secondary)]"
    >
      <DiscoveryImage scene={scene} />

      <div className="absolute inset-0 bg-black/35" />

      <div className="relative z-10 flex min-h-[420px] flex-col justify-between p-6 md:p-8">
        <div className="inline-flex w-fit rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-medium text-white/76 backdrop-blur">
          {scene.kicker}
        </div>

        <div className="max-w-[520px]">
          <h1 className="font-[family-name:var(--font-instrument-sans)] text-[clamp(32px,4.8vw,58px)] font-medium leading-[0.9] tracking-[-0.065em] text-white">
            {scene.title}
          </h1>

          <p className="mt-4 max-w-[420px] text-sm leading-6 text-white/72">
            {scene.description}
          </p>

          <div className="mt-7 inline-flex h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-black transition group-hover:scale-[1.02]">
            Explore this mood
            <ArrowUpRightIcon />
          </div>
        </div>
      </div>
    </Link>
  );
}

function DiscoverySideCard({ scene }: { scene: DiscoveryScene }) {
  return (
    <Link
      href={scene.href}
      className="group relative min-h-[204px] overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--bg-secondary)]"
    >
      <DiscoveryImage scene={scene} />

      <div className="absolute inset-0 bg-gradient-to-r from-black/78 via-black/46 to-black/10" />

      <div className="relative z-10 flex min-h-[204px] flex-col justify-between p-5">
        <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/58">
          {scene.kicker}
        </div>

        <div>
          <h2 className="font-[family-name:var(--font-instrument-sans)] text-[30px] font-medium leading-[0.92] tracking-[-0.055em] text-white">
            {scene.title}
          </h2>

          <p className="mt-2 max-w-[320px] text-xs leading-5 text-white/68">
            {scene.description}
          </p>
        </div>
      </div>
    </Link>
  );
}

function DiscoveryMiniCard({ scene }: { scene: DiscoveryScene }) {
  return (
    <Link
      href={scene.href}
      className="group relative min-h-[188px] overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--bg-secondary)]"
    >
      <DiscoveryImage scene={scene} />

      <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/22 to-black/8" />

      <div className="relative z-10 flex min-h-[188px] flex-col justify-end p-4">
        <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/58">
          {scene.kicker}
        </div>

        <h3 className="mt-1 font-[family-name:var(--font-instrument-sans)] text-[24px] font-medium leading-none tracking-[-0.05em] text-white">
          {scene.title}
        </h3>
      </div>
    </Link>
  );
}

function VisualDiscoverySection() {
  const heroScene = discoveryScenes[0];
  const sideScene = discoveryScenes[1];
  const miniScenes = discoveryScenes.slice(2);

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
        <DiscoveryHeroCard scene={heroScene} />

        <div className="grid gap-4">
          <DiscoverySideCard scene={sideScene} />

          <div className="grid gap-4 sm:grid-cols-2">
            {miniScenes.map((scene) => (
              <DiscoveryMiniCard key={scene.title} scene={scene} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductionStyleCard({ style }: { style: ProductionStyle }) {
  return (
    <Link
      href={style.href}
      className="group relative min-h-[245px] overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--bg-secondary)] transition hover:border-[var(--text-muted)]"
    >
      <Image
        src={style.image}
        alt={style.title}
        fill
        sizes="(min-width: 1280px) 25vw, 100vw"
        className="object-cover transition duration-700 group-hover:scale-[1.04]"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/36 to-black/8" />

      <div className="relative z-10 flex min-h-[245px] flex-col justify-between p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/58">
            {style.kicker}
          </div>

          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/12 text-white backdrop-blur transition group-hover:bg-white group-hover:text-black">
            <ArrowUpRightIcon />
          </div>
        </div>

        <div>
          <h3 className="font-[family-name:var(--font-instrument-sans)] text-[28px] font-medium leading-[0.95] tracking-[-0.055em] text-white">
            {style.title}
          </h3>

          <p className="mt-3 max-w-[320px] text-xs leading-5 text-white/68">
            {style.description}
          </p>
        </div>
      </div>
    </Link>
  );
}

function ProductionStylesSection() {
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
        {productionStyles.map((style) => (
          <ProductionStyleCard key={style.title} style={style} />
        ))}
      </div>
    </section>
  );
}

function CuratedPlaylistsSection() {
  const [playlists, setPlaylists] = useState<CuratedPlaylist[]>(
    fallbackCuratedPlaylists,
  );

  useEffect(() => {
    let cancelled = false;

    async function loadCuratedPlaylists() {
      try {
        const res = await fetch("/api/curated-playlists");
        const data = await res.json();

        if (!res.ok || !Array.isArray(data) || data.length === 0) return;
        if (!cancelled) setPlaylists(data);
      } catch {
        // Keep the hand-picked fallback set if the API is unavailable.
      }
    }

    loadCuratedPlaylists();

    return () => {
      cancelled = true;
    };
  }, []);

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
            Fast scan selects
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

function LoadingCard() {
  return (
    <div className="min-h-[420px] animate-pulse rounded-[18px] border border-[var(--border)] bg-[var(--bg-secondary)]" />
  );
}

export default function DashboardPage() {
  const { songs, loading, error } = useSongs();
  const { currentSong, setQueue } = usePlayer();

  const playableSongs = useMemo(() => sortSongsForVisuals(songs), [songs]);

  const compactSongs = playableSongs.slice(0, COMPACT_SONG_COUNT);
  const fastScanSongs = getFastScanSongs(playableSongs);

  const playerVisible = !!currentSong;

  useEffect(() => {
    setQueue(playableSongs);
  }, [playableSongs, setQueue]);

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <section className="min-h-screen pt-14 ml-[var(--sidebar-width)] transition-[margin-left] duration-200">
        <div className="px-5 py-6 md:px-8 lg:px-10">
          {loading && playableSongs.length === 0 ? (
            <LoadingCard />
          ) : error ? (
            <div className="rounded-[18px] border border-[var(--border)] bg-[var(--bg-secondary)] p-8 text-[var(--text-secondary)]">
              Could not load songs right now. Please try the music library again
              in a moment.
            </div>
          ) : (
            <>
              <VisualDiscoverySection />
              <CompactSongsSection songs={compactSongs} />
            </>
          )}

          <ProductionStylesSection />
          <CuratedPlaylistsSection />
          <FastScanSection songs={fastScanSongs} />

          {!loading && (
            <div
              className="pt-10"
              style={{
                paddingBottom: playerVisible ? "72px" : "8px",
              }}
            >
              <Footer />
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
