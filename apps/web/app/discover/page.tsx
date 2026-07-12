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
  useRef,
  useState,
} from "react";

import DropdownShell from "@/components/DropdownShell";
import Footer from "@/components/Footer";
import SongCard from "@/components/SongCard";
import Toast from "@/components/Toast";
import ArrowUpRightIcon from "@/components/icons/ArrowUpRightIcon";
import ChevronLeftIcon from "@/components/icons/ChevronLeftIcon";
import ChevronRightIcon from "@/components/icons/ChevronRightIcon";
import MoreIcon from "@/components/icons/MoreIcon";
import PauseIcon from "@/components/icons/PauseIcon";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import SearchIcon from "@/components/icons/SearchIcon";
import WaveformIcon from "@/components/icons/WaveformIcon";
import { usePlayer } from "@/context/PlayerContext";
import { useSongs } from "@/hooks/useSongs";
import type { CuratedPlaylist } from "@/lib/curatedPlaylists";
import type { Song } from "@/lib/types";

import "../music/music-library-redesign.css";

const NEW_SONG_COUNT = 10;
const READY_TO_CUT_SONG_COUNT = 9;
const HERO_BACKGROUND_IMAGE =
  "https://images.filmwave.io/images/discover/donny-jiang-KFTPuUsIFME-unsplash.jpg";

function formatTrackCount(count?: number) {
  const safeCount = Number(count || 0);
  return `${safeCount} track${safeCount === 1 ? "" : "s"}`;
}

async function addCuratedPlaylistToMyPlaylists(
  playlist: CuratedPlaylist,
): Promise<void> {
  const createRes = await fetch("/api/playlists", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: playlist.name,
      cover_image_url: playlist.cover_image_url ?? null,
      position: 0,
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to create playlist");
  }

  const newPlaylist = await createRes.json();
  const newPlaylistId = newPlaylist.id;
  const songsRes = await fetch(
    `/api/curated-playlists/${encodeURIComponent(String(playlist.id))}/songs`,
  );

  if (!songsRes.ok) return;

  const songs = await songsRes.json();

  if (!Array.isArray(songs) || songs.length === 0) return;

  for (let index = 0; index < songs.length; index += 1) {
    const song = songs[index];
    const songId = song.song_id ?? song.id;

    if (!songId) continue;

    try {
      await fetch(`/api/playlists/${newPlaylistId}/songs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ song_id: songId, position: index }),
      });
    } catch (error) {
      console.warn(`Error adding song ${songId}:`, error);
    }
  }
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

function DiscoverHero() {
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

function DiscoverMoodShelf({
  playlists,
  loading,
}: {
  playlists: CuratedPlaylist[];
  loading: boolean;
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
          ? Math.max(scroller.clientWidth * 0.82, 360)
          : -Math.max(scroller.clientWidth * 0.82, 360),
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
  }, [playlists.length, loading]);

  if (!loading && playlists.length === 0) return null;

  return (
    <section className="discover-section discover-mood-section">
      <style>{`
        .discover-mood-section .curated-playlist-shelf-viewport {
          margin-left: calc(var(--discover-page-gutter) * -1);
          margin-right: calc(var(--discover-page-gutter) * -1);
          overflow: hidden;
        }

        .discover-mood-section .curated-playlist-shelf-scroller {
          padding-left: var(--discover-page-gutter);
          padding-right: 5rem;
        }

        .discover-mood-section .curated-playlist-shelf-prev-floating {
          left: 2rem;
        }

        .discover-mood-section .discover-mood-shelf-floating {
          top: calc((min(43vw, 560px) / 1.72) / 2);
        }

        .discover-mood-section .playlist-gallery-card {
          position: relative;
          min-width: 0;
          cursor: pointer;
        }

        .discover-mood-section .playlist-gallery-top-row,
        .discover-production-section .playlist-gallery-top-row {
          position: relative;
          z-index: 4;
          display: flex;
          justify-content: flex-end;
          padding: 16px;
        }

        .discover-mood-section .playlist-gallery-arrow,
        .discover-production-section .playlist-gallery-arrow {
          display: flex;
          width: 32px;
          height: 32px;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.12);
          color: white;
          backdrop-filter: blur(12px);
          transition: background 0.15s ease, color 0.15s ease, transform 0.15s ease;
        }

        .discover-mood-section .playlist-gallery-card:hover .playlist-gallery-arrow,
        .discover-mood-section .playlist-gallery-card.is-menu-open .playlist-gallery-arrow,
        .discover-production-section .playlist-gallery-card:hover .playlist-gallery-arrow,
        .discover-production-section .playlist-gallery-card.is-menu-open .playlist-gallery-arrow {
          background: white;
          color: black;
        }

        @media (max-width: 980px) {
          .discover-mood-section .discover-mood-shelf-floating {
            top: calc((min(68vw, 500px) / 1.72) / 2);
          }
        }

        @media (max-width: 720px) {
          .discover-mood-section .discover-mood-shelf-floating {
            top: calc((82vw / 1.72) / 2);
          }
        }
      `}</style>

      <div className="discover-section-heading">
        <h2>Explore these moods</h2>

        <div className="hidden items-center gap-2 sm:flex">
          <button
            type="button"
            onClick={() => scroll("prev")}
            disabled={!canScrollPrev}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition hover:border-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:pointer-events-none disabled:opacity-30"
            aria-label="Scroll Explore these moods left"
          >
            <ChevronLeftIcon size={16} />
          </button>

          <button
            type="button"
            onClick={() => scroll("next")}
            disabled={!canScrollNext}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition hover:border-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:pointer-events-none disabled:opacity-30"
            aria-label="Scroll Explore these moods right"
          >
            <ChevronRightIcon size={16} />
          </button>
        </div>
      </div>

      <div className="group/playlist-shelf curated-playlist-shelf-viewport relative">
        <button
          type="button"
          onClick={() => scroll("prev")}
          disabled={!canScrollPrev}
          className="discover-mood-shelf-floating curated-playlist-shelf-prev-floating absolute top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white text-black opacity-0 shadow-[0_12px_34px_rgba(0,0,0,0.25)] transition hover:scale-105 group-hover/playlist-shelf:opacity-100 disabled:pointer-events-none disabled:opacity-0 sm:flex"
          aria-label="Scroll Explore these moods left"
        >
          <ChevronLeftIcon size={18} />
        </button>

        <button
          type="button"
          onClick={() => scroll("next")}
          disabled={!canScrollNext}
          className="discover-mood-shelf-floating absolute right-8 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white text-black opacity-0 shadow-[0_12px_34px_rgba(0,0,0,0.25)] transition hover:scale-105 group-hover/playlist-shelf:opacity-100 disabled:pointer-events-none disabled:opacity-0 sm:flex"
          aria-label="Scroll Explore these moods right"
        >
          <ChevronRightIcon size={18} />
        </button>

        <div
          ref={scrollerRef}
          className="curated-playlist-shelf-scroller flex gap-3 overflow-x-auto overflow-y-hidden scroll-smooth overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {loading
            ? Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="discover-mood-card discover-card-skeleton"
                  aria-hidden="true"
                />
              ))
            : playlists.map((playlist) => (
                <Link
                  key={playlist.id}
                  href={`/curated-playlists/${playlist.id}`}
                  className="discover-mood-card playlist-gallery-card"
                >
                  <div className="discover-mood-image">
                    {playlist.cover_image_url ? (
                      <Image
                        src={playlist.cover_image_url}
                        alt={playlist.name}
                        fill
                        unoptimized
                        sizes="(min-width: 1280px) 34vw, (min-width: 768px) 55vw, 84vw"
                        className="object-cover"
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
                  {playlist.description && <p>{playlist.description}</p>}
                </Link>
              ))}
        </div>
      </div>
    </section>
  );
}

function DiscoverPlaylistMenu({
  playlist,
  open,
  onOpenChange,
  onAdd,
  saving,
  playerVisible,
}: {
  playlist: CuratedPlaylist;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: () => void;
  saving: boolean;
  playerVisible: boolean;
}) {
  return (
    <div data-playlist-menu className="playlist-card-menu-wrap">
      <DropdownShell
        open={open}
        onOpenChange={onOpenChange}
        placement="bottom-start"
        strategy="fixed"
        usePortal
        offsetAmount={5}
        flippedOffsetAmount={5}
        crossAxisOffset={0}
        collisionPadding={{
          top: 68,
          right: 16,
          bottom: playerVisible ? 85 : 13,
          left: 16,
        }}
        trigger={({ open: triggerOpen }) => (
          <button
            type="button"
            className={`playlist-menu-btn playlist-menu-btn-grid ${
              triggerOpen ? "is-open" : ""
            }`}
            aria-label={`${playlist.name} options`}
            disabled={saving}
          >
            <MoreIcon />
          </button>
        )}
      >
        <button type="button" onClick={onAdd} disabled={saving}>
          {saving ? "Adding…" : "Add to My Playlists"}
        </button>
      </DropdownShell>
    </div>
  );
}

function DiscoverPlaylistCard({
  playlist,
  open,
  onOpenChange,
  onAddSuccess,
  onAddError,
  playerVisible,
}: {
  playlist: CuratedPlaylist;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddSuccess: (name: string) => void;
  onAddError: (message: string) => void;
  playerVisible: boolean;
}) {
  const [saving, setSaving] = useState(false);

  async function handleAddToMyPlaylists() {
    if (saving) return;

    onOpenChange(false);
    setSaving(true);

    try {
      await addCuratedPlaylistToMyPlaylists(playlist);
      onAddSuccess(playlist.name);
    } catch (error) {
      onAddError(
        error instanceof Error ? error.message : "Failed to add playlist",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={`discover-playlist-card-shell playlist-gallery-card ${
        open ? "is-menu-open" : ""
      }`}
    >
      <Link
        href={`/curated-playlists/${playlist.id}`}
        className="discover-playlist-card"
      >
        <div className="discover-playlist-image">
          {playlist.cover_image_url ? (
            <Image
              src={playlist.cover_image_url}
              alt={playlist.name}
              fill
              unoptimized
              sizes="(min-width: 1400px) 18vw, (min-width: 900px) 24vw, 46vw"
              className="object-cover"
            />
          ) : (
            <div className="discover-media-fallback" />
          )}
        </div>
        <h3>{playlist.name}</h3>
        <p>{formatTrackCount(playlist.song_count)}</p>
      </Link>

      <DiscoverPlaylistMenu
        playlist={playlist}
        open={open}
        onOpenChange={onOpenChange}
        onAdd={handleAddToMyPlaylists}
        saving={saving}
        playerVisible={playerVisible}
      />
    </div>
  );
}

function DiscoverPlaylistGrid({
  playlists,
  loading,
}: {
  playlists: CuratedPlaylist[];
  loading: boolean;
}) {
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const { currentSong } = usePlayer();
  const playerVisible = Boolean(currentSong);

  function showToast(message: string) {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 2400);
  }

  if (!loading && playlists.length === 0) return null;

  return (
    <section className="discover-section discover-curated-playlist-section">
      <style>{`
        .discover-curated-playlist-section .discover-playlist-card-shell {
          position: relative;
          min-width: 0;
        }

        .discover-curated-playlist-section .discover-playlist-card h3,
        .discover-curated-playlist-section .discover-playlist-card p {
          padding-right: 24px;
        }

        .discover-curated-playlist-section .playlist-card-menu-wrap {
          position: absolute;
          right: 0;
          bottom: 18px;
          z-index: 12;
          display: flex;
          width: 18px;
          height: 18px;
        }

        .discover-curated-playlist-section .playlist-menu-btn-grid {
          display: flex;
          width: 18px;
          min-width: 18px;
          height: 18px;
          cursor: pointer;
          align-items: center;
          justify-content: center;
          border: 0;
          border-radius: 0;
          background: transparent;
          color: var(--text-secondary);
          padding: 0;
          opacity: 1;
          transition: color 0.15s ease;
        }

        .discover-curated-playlist-section .playlist-menu-btn-grid:hover,
        .discover-curated-playlist-section .playlist-menu-btn-grid.is-open {
          background: transparent;
          color: var(--text-primary);
        }

        .discover-curated-playlist-section .playlist-menu-btn-grid svg {
          width: 15px;
          height: 15px;
        }
      `}</style>

      <div
        className="discover-section-heading"
        style={{ alignItems: "baseline" }}
      >
        <h2>Curated playlists</h2>

        <Link
          href="/curated-playlists"
          className="text-xs font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
        >
          Explore all playlists
        </Link>
      </div>

      <div className="discover-playlist-grid">
        {loading
          ? Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="discover-playlist-card discover-card-skeleton"
                aria-hidden="true"
              />
            ))
          : playlists.map((playlist) => (
              <DiscoverPlaylistCard
                key={playlist.id}
                playlist={playlist}
                open={openMenuId === playlist.id}
                onOpenChange={(nextOpen) =>
                  setOpenMenuId(nextOpen ? playlist.id : null)
                }
                onAddSuccess={(name) =>
                  showToast(`"${name}" added to My Playlists`)
                }
                onAddError={showToast}
                playerVisible={playerVisible}
              />
            ))}
      </div>

      <Toast
        message={toastMessage}
        bottomOffset={playerVisible ? "88px" : "24px"}
      />
    </section>
  );
}

function DiscoverSongs({
  songs,
  loading,
}: {
  songs: ReturnType<typeof useSongs>["songs"];
  loading: boolean;
}) {
  if (!loading && songs.length === 0) return null;

  return (
    <section className="discover-section discover-song-section">
      <div className="discover-section-heading">
        <h2>Newly added tracks</h2>
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

function DiscoverProductionStyleCard({
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

function DiscoverProductionStyles({
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
        <h2>Browse by production style</h2>
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
              <DiscoverProductionStyleCard
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
        <h2>Ready-to-cut tracks</h2>

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

export default function DiscoverPage() {
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

  const curatedPlaylists = useMemo(() => {
    const selected = playlists
      .filter(
        (playlist) => playlist.show_on_discover && !playlist.discover_section,
      )
      .sort((a, b) => a.discover_position - b.discover_position);

    if (selected.length > 0) return selected;

    return playlists
      .filter((playlist) => Boolean(playlist.cover_image_url))
      .sort((a, b) => a.position - b.position)
      .slice(0, 10);
  }, [playlists]);

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
    <main className="discover-page-root" style={{ marginLeft: 0 }}>
      <DiscoverHero />

      <div className="discover-content">
        <DiscoverMoodShelf
          playlists={discoverBlocks}
          loading={playlistsLoading}
        />
        <DiscoverPlaylistGrid
          playlists={curatedPlaylists}
          loading={playlistsLoading}
        />
        <DiscoverSongs songs={recentSongs} loading={songsLoading} />
        <DiscoverProductionStyles
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
