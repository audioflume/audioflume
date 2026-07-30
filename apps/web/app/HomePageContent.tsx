"use client";

import { MusicListShell } from "@filmwave/shared";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import Footer from "@/components/Footer";
import SongCard from "@/components/SongCard";
import ArrowUpRightIcon from "@/components/icons/ArrowUpRightIcon";
import PauseIcon from "@/components/icons/PauseIcon";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import SearchIcon from "@/components/icons/SearchIcon";
import WaveformIcon from "@/components/icons/WaveformIcon";
import { usePlayer } from "@/context/PlayerContext";
import { useSongs } from "@/hooks/useSongs";
import type { CuratedPlaylist } from "@/lib/curatedPlaylists";
import type { Song } from "@/lib/types";

import "./music/music-library-redesign.css";

const NEW_SONG_COUNT = 10;
const READY_TO_CUT_SONG_COUNT = 12;
const HERO_BACKGROUND_IMAGE =
  "https://images.filmwave.io/images/discover/b7cb4a48-bd82-44d1-b02e-c104dac45339-gigapixel-low%20resolution%20v2-2x.jpeg";

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

function HomeHero() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanSearch = search.trim();
    router.push(
      cleanSearch
        ? `/music?search=${encodeURIComponent(cleanSearch)}`
        : "/music",
    );
  }

  return (
    <section className="discover-hero" aria-label="Discover music">
      <Image
        src={HERO_BACKGROUND_IMAGE}
        alt=""
        fill
        priority
        unoptimized
        sizes="100vw"
        className="discover-hero-image"
      />

      <div className="discover-hero-overlay" aria-hidden="true" />

      <div className="discover-hero-inner">
        <div className="discover-hero-content max-w-[780px]">
          <h1>Find the cue that fits the scene</h1>

          <form className="discover-hero-search" onSubmit={handleSubmit}>
            <span className="discover-hero-search-icon" aria-hidden="true">
              <SearchIcon size={14} />
            </span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search music library"
              aria-label="Search music library"
            />
            <button type="submit">Search</button>
          </form>

          <div className="discover-hero-values">
            <div>
              <strong>Human curated music library</strong>
              <span>
                Human-picked tracks, thoughtful moods, and music chosen for real
                edits.
              </span>
            </div>
            <div>
              <strong>Thousands of sound effects</strong>
              <span>
                Thousands of sound effects, textures, and details for richer
                edits.
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HomeSongs({
  songs,
  loading,
}: {
  songs: ReturnType<typeof useSongs>["songs"];
  loading: boolean;
}) {
  if (!loading && songs.length === 0) return null;

  return (
    <section className="discover-section discover-song-section discover-home-first-section">
      <div
        className="discover-section-heading"
        style={{ alignItems: "baseline" }}
      >
        <h2>Newly Added Tracks</h2>

        <Link
          href="/music"
          className="text-xs font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
        >
          Explore music library
        </Link>
      </div>

      <MusicListShell title={null}>
        {loading
          ? Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="discover-song-skeleton discover-card-skeleton"
                aria-hidden="true"
              />
            ))
          : songs.map((song) => <SongCard key={song.id} song={song} />)}
      </MusicListShell>

      <div className="mt-5 flex justify-center">
        <Link
          href="/music"
          className="inline-flex h-11 min-w-[280px] items-center justify-center rounded-none bg-[var(--bg-elevated)] px-10 text-[13px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--text-primary)] hover:text-[var(--bg-primary)] focus-visible:bg-[var(--text-primary)] focus-visible:text-[var(--bg-primary)] focus-visible:outline-none"
        >
          Explore music library
        </Link>
      </div>
    </section>
  );
}

function HomeProductionStyleCard({
  playlist,
}: {
  playlist: CuratedPlaylist;
}) {
  const supportingText = playlist.description || playlist.kicker;

  return (
    <Link
      href={`/curated-playlists/${playlist.id}`}
      className="discover-playlist-card playlist-gallery-card group"
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-[var(--bg-secondary)]">
        {playlist.cover_image_url ? (
          <Image
            src={playlist.cover_image_url}
            alt={playlist.name}
            fill
            unoptimized
            sizes="(min-width: 1280px) 23vw, (min-width: 640px) 46vw, 100vw"
            className="object-cover transition duration-500 group-hover:scale-[1.025]"
          />
        ) : (
          <div className="discover-media-fallback" />
        )}

        <div className="playlist-gallery-top-row">
          <div className="playlist-gallery-arrow">
            <ArrowUpRightIcon />
          </div>
        </div>
      </div>

      <h3>{playlist.name}</h3>
      {supportingText && <p>{supportingText}</p>}
    </Link>
  );
}

function HomeProductionStyles({
  playlists,
  loading,
}: {
  playlists: CuratedPlaylist[];
  loading: boolean;
}) {
  if (!loading && playlists.length === 0) return null;

  return (
    <section className="discover-section discover-production-section">
      <div className="discover-section-heading">
        <h2>Browse by Production Style</h2>
      </div>

      <div className="grid gap-[clamp(10px,1.25vw,18px)] sm:grid-cols-2 xl:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="discover-card-skeleton aspect-[4/5] w-full"
                aria-hidden="true"
              />
            ))
          : playlists.map((playlist) => (
              <HomeProductionStyleCard
                key={playlist.id}
                playlist={playlist}
              />
            ))}
      </div>
    </section>
  );
}

function ReadyToCutCoverImage({ song, index }: { song: Song; index: number }) {
  return (
    <div
      className="relative h-9 w-9 shrink-0 overflow-hidden bg-[var(--bg-tertiary)]"
      style={{
        background: song.coverArt ? undefined : getFallbackGradient(index),
      }}
    >
      {song.coverArt ? (
        <Image
          src={song.coverArt}
          alt={`${song.title} cover art`}
          fill
          sizes="36px"
          className="object-cover"
          unoptimized
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

function ReadyToCutPlayButton({ song }: { song: Song }) {
  const { currentSong, isPlaying, togglePlayPause } = usePlayer();
  const active = currentSong?.id === song.id;
  const playing = active && isPlaying;

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
      className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white text-black shadow-[0_8px_24px_rgba(0,0,0,0.22)] transition hover:scale-105 disabled:cursor-default disabled:opacity-50"
      disabled={!song.audioUrl}
      aria-label={playing ? `Pause ${song.title}` : `Play ${song.title}`}
    >
      {playing ? <PauseIcon size={15} /> : <PlayIconSmall size={15} />}
    </button>
  );
}

function useReadyToCutPlayableCard(song: Song) {
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

function ReadyToCutSongCard({ song, index }: { song: Song; index: number }) {
  const cardPlayProps = useReadyToCutPlayableCard(song);

  return (
    <article
      {...cardPlayProps}
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

      <ReadyToCutPlayButton song={song} />
    </article>
  );
}

function ReadyToCutTracks({
  songs,
  loading,
}: {
  songs: Song[];
  loading: boolean;
}) {
  if (!loading && songs.length === 0) return null;

  return (
    <section className="discover-section discover-ready-to-cut-section">
      <div
        className="discover-section-heading"
        style={{ alignItems: "baseline" }}
      >
        <h2>Ready-to-Cut Tracks</h2>

        <Link
          href="/music"
          className="text-xs font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
        >
          Explore more tracks
        </Link>
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {loading
          ? Array.from({ length: READY_TO_CUT_SONG_COUNT }).map((_, index) => (
              <div
                key={index}
                className="h-[54px] bg-[var(--bg-secondary)]"
                aria-hidden="true"
              />
            ))
          : songs.map((song, index) => (
              <ReadyToCutSongCard
                key={song.id}
                song={song}
                index={index + 30}
              />
            ))}
      </div>
    </section>
  );
}

export default function HomePageContent() {
  const { songs, loading: songsLoading } = useSongs();
  const { currentSong, setQueue } = usePlayer();
  const [playlists, setPlaylists] = useState<CuratedPlaylist[]>([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/curated-playlists")
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data)) {
          setPlaylists(data as CuratedPlaylist[]);
        }
      })
      .catch(() => {
        if (!cancelled) setPlaylists([]);
      })
      .finally(() => {
        if (!cancelled) setPlaylistsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

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

  const playableSongs = useMemo(
    () => songs.filter((song) => Boolean(song.audioUrl)),
    [songs],
  );
  const recentSongs = playableSongs.slice(0, NEW_SONG_COUNT);
  const readyToCutSongs = playableSongs.slice(0, READY_TO_CUT_SONG_COUNT);
  const playerVisible = Boolean(currentSong);

  useEffect(() => {
    if (!songsLoading) setQueue(playableSongs);
  }, [playableSongs, setQueue, songsLoading]);

  return (
    <main
      className="discover-page-root audioflume-home-page-root"
      style={{ marginLeft: 0 }}
    >
      <style>{`
        body:has(.audioflume-home-page-root) .discover-home-first-section {
          margin-top: 0 !important;
        }
      `}</style>

      <HomeHero />

      <div className="discover-content">
        <div
          className="discover-curated-playlist-section"
          aria-hidden="true"
        />
        <HomeSongs songs={recentSongs} loading={songsLoading} />
        <HomeProductionStyles
          playlists={productionBlocks}
          loading={playlistsLoading}
        />
        <ReadyToCutTracks songs={readyToCutSongs} loading={songsLoading} />

        <div
          className="discover-footer-wrap"
          style={{ paddingBottom: playerVisible ? "72px" : "8px" }}
        >
          <Footer />
        </div>
      </div>
    </main>
  );
}
