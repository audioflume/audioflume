"use client";

import { MusicListShell } from "@filmwave/shared";
import EditPlaylistModal from "@/components/EditPlaylistModal";
import Footer from "@/components/Footer";
import SkeletonSongList from "@/components/SkeletonSongCard";
import SongCard from "@/components/SongCard";
import Toast from "@/components/Toast";
import FilterTags from "@/components/FilterTags";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import SearchIcon from "@/components/icons/SearchIcon";
import {
  quickFilterButtonClass,
  quickFilterButtonActiveClass,
} from "@/components/uiClasses";
import { useFavorites } from "@/context/FavoritesContext";
import { usePlayer } from "@/context/PlayerContext";
import { usePlaylists } from "@/hooks/usePlaylists";
import type { PublicArtistPlaylist } from "@/lib/publicArtist";
import type { Playlist, Song } from "@/lib/types";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import artistDrawerStyles from "@/components/artists/PublicArtistCollectionDrawer.module.css";
import "@/app/music/music-library-redesign.css";

const GRADIENTS = [
  "linear-gradient(160deg,#1a3a2a,#2d5a3d)",
  "linear-gradient(160deg,#111827,#1f2937)",
  "linear-gradient(160deg,#7f1d1d,#b91c1c)",
  "linear-gradient(160deg,#1c1c2e,#2d2d44)",
  "linear-gradient(160deg,#003d40,#006064)",
  "linear-gradient(160deg,#4a0e0e,#7b1515)",
  "linear-gradient(160deg,#1a2535,#2c3e50)",
  "linear-gradient(160deg,#0f172a,#1e3a5f)",
  "linear-gradient(160deg,#2d0a3a,#4a1258)",
  "linear-gradient(160deg,#0f1a0f,#1a2e1a)",
];

const QUICK_FILTERS = [
  { label: "Newest", value: "newest" },
  { label: "Oldest", value: "oldest" },
  { label: "Alphabetical", value: "alphabetical" },
  { label: "Liked", value: "liked" },
] as const;

type QuickFilterValue = (typeof QUICK_FILTERS)[number]["value"];

type PlaylistSong = Song & {
  created_at?: string;
  playlist_song_id?: number;
  playlist_id?: number;
  song_id?: string;
  position?: number;
};

type PublicArtistPlaylistPayload = {
  collection?: PublicArtistPlaylist;
  songs?: PlaylistSong[];
  error?: string;
};

function ShareGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="14.5" cy="4.5" r="2.25" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="5.5" cy="10" r="2.25" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="14.5" cy="15.5" r="2.25" stroke="currentColor" strokeWidth="1.4" />
      <path d="m7.5 8.9 5-3.1M7.5 11.1l5 3.1" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function PlaylistDetailSkeleton() {
  return (
    <div className="playlist-detail-card">
      <div className="playlist-detail-card-inner">
        <section className="playlist-detail-hero playlist-detail-skeleton-hero">
          <div className="playlist-detail-cover playlist-detail-skeleton-cover skeleton-block" />
          <div className="min-w-0">
            <div className="playlist-detail-skeleton-kicker skeleton-block" />
            <div className="playlist-detail-skeleton-title skeleton-block" />
            <div className="playlist-detail-skeleton-meta">
              <div className="playlist-detail-skeleton-meta-line skeleton-block" />
              <div className="playlist-detail-skeleton-meta-line short skeleton-block" />
            </div>
            <div className="playlist-detail-actions">
              <div className="playlist-detail-skeleton-button skeleton-block" />
              <div className="playlist-detail-skeleton-button secondary skeleton-block" />
            </div>
          </div>
        </section>
        <section className="playlist-detail-section">
          <SkeletonSongList />
        </section>
      </div>
    </div>
  );
}

function getTopGenres(songs: Song[]) {
  const counts = new Map<string, number>();
  songs.forEach((song) => {
    song.genres.forEach((genre) => {
      counts.set(genre, (counts.get(genre) || 0) + 1);
    });
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([genre]) => genre);
}

function formatSongCount(count: number) {
  return `${count} song${count === 1 ? "" : "s"}`;
}

function getSongAddedTime(song: PlaylistSong) {
  if (!song.created_at) return 0;
  const time = new Date(song.created_at).getTime();
  return Number.isFinite(time) ? time : 0;
}

export default function PlaylistDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentSong, setQueue } = usePlayer();
  const { favoriteIdSet } = useFavorites();
  const { playlists, setPlaylists, loading: playlistsLoading } = usePlaylists();

  const playlistId = String(params.playlistId || "");
  const artistSlug = searchParams.get("artist")?.trim() || null;
  const playerVisible = !!currentSong;
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [songs, setSongs] = useState<PlaylistSong[]>([]);
  const [songsLoading, setSongsLoading] = useState(true);
  const [publicArtistPlaylist, setPublicArtistPlaylist] = useState<PublicArtistPlaylist | null>(null);
  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilterValue>("newest");
  const [error, setError] = useState("");
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [editName, setEditName] = useState("");
  const [editCoverPreview, setEditCoverPreview] = useState<string | null>(null);
  const [isSavingPlaylist, setIsSavingPlaylist] = useState(false);
  const [deletingPlaylistId, setDeletingPlaylistId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const ownedPlaylist = useMemo(
    () => playlists.find((item) => String(item.id) === playlistId),
    [playlists, playlistId],
  );
  const playlist = ownedPlaylist ?? publicArtistPlaylist;

  const playlistIndex = useMemo(() => {
    const index = playlists.findIndex((item) => String(item.id) === playlistId);
    return index >= 0 ? index : 0;
  }, [playlists, playlistId]);

  const searchedSongs = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return songs;
    return songs.filter((song) => {
      const searchableText = [song.title, song.artist, song.key, ...song.genres, ...song.moods, ...song.instruments, ...song.builds, ...song.vocals]
        .join(" ").toLowerCase();
      return searchableText.includes(query);
    });
  }, [songs, search]);

  const filteredSongs = useMemo(() => {
    const indexedSongs = searchedSongs.map((song, index) => ({ song, index }));
    const nextSongs = quickFilter === "liked"
      ? indexedSongs.filter(({ song }) => favoriteIdSet.has(song.id))
      : indexedSongs;
    const sortedSongs = [...nextSongs].sort((a, b) => {
      if (quickFilter === "alphabetical") return a.song.title.localeCompare(b.song.title, undefined, { sensitivity: "base" });
      const aTime = getSongAddedTime(a.song);
      const bTime = getSongAddedTime(b.song);
      if (aTime !== bTime) return quickFilter === "oldest" ? aTime - bTime : bTime - aTime;
      return quickFilter === "oldest" ? a.index - b.index : b.index - a.index;
    });
    return sortedSongs.map(({ song }) => song);
  }, [searchedSongs, quickFilter, favoriteIdSet]);

  const topGenres = useMemo(() => getTopGenres(songs), [songs]);

  useEffect(() => {
    if (!playlistId) return;
    let cancelled = false;
    async function loadSongs() {
      setSongsLoading(true);
      setError("");
      if (artistSlug) setPublicArtistPlaylist(null);
      try {
        if (artistSlug) {
          const res = await fetch(
            `/api/public/artists/${encodeURIComponent(
              artistSlug,
            )}/collection?kind=playlist&id=${encodeURIComponent(playlistId)}`,
          );
          const data = (await res.json()) as PublicArtistPlaylistPayload;
          if (!res.ok || !data.collection) {
            throw new Error(data?.error || "Failed to load playlist songs.");
          }
          if (cancelled) return;
          setPublicArtistPlaylist(data.collection);
          setSongs(
            (Array.isArray(data.songs) ? data.songs : []).filter(
              (song: PlaylistSong) => song.id,
            ),
          );
          return;
        }

        setPublicArtistPlaylist(null);
        const res = await fetch(`/api/playlists/${playlistId}/songs`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load playlist songs.");
        const loadedSongs = Array.isArray(data) ? data
          : Array.isArray(data?.songs) ? data.songs
          : Array.isArray(data?.playlistSongs) ? data.playlistSongs
          : [];
        if (cancelled) return;
        setSongs(loadedSongs.filter((song: PlaylistSong) => song.id));
      } catch (err) {
        if (cancelled) return;
        setSongs([]);
        setPublicArtistPlaylist(null);
        setError(err instanceof Error ? err.message : "Failed to load playlist songs.");
      } finally {
        if (!cancelled) setSongsLoading(false);
      }
    }
    loadSongs();
    return () => { cancelled = true; };
  }, [artistSlug, playlistId]);

  useEffect(() => {
    setQueue(filteredSongs.filter((song) => song.audioUrl));
  }, [filteredSongs, setQueue]);

  function playFirstSong() {
    const firstSongButton = document.querySelector<HTMLButtonElement>(`[aria-label="Play song"], [aria-label="Pause song"]`);
    firstSongButton?.click();
  }

  async function sharePlaylist() {
    if (!playlist) return;
    const url = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({ title: playlist.name, url });
        return;
      }
      await navigator.clipboard?.writeText(url);
    } catch {
      // Sharing was cancelled or unavailable.
    }
  }

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 1800);
  };

  const handleSaveEdit = async () => {
    if (!editingPlaylist || isSavingPlaylist) return;
    setIsSavingPlaylist(true);
    try {
      const res = await fetch(`/api/playlists/${editingPlaylist.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, cover_image_url: editCoverPreview }),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (!res.ok) { console.error("Failed to save playlist:", data || res.statusText); return; }
      setPlaylists((prev) => prev.map((p) => p.id === editingPlaylist.id ? data || { ...p, name: editName, cover_image_url: editCoverPreview } : p));
      showToast("Changes saved");
      setEditingPlaylist(null);
    } finally {
      setIsSavingPlaylist(false);
    }
  };

  const handleDelete = async () => {
    if (!editingPlaylist || deletingPlaylistId) return;
    const confirmed = window.confirm(`Are you sure you want to delete "${editingPlaylist.name}"? This cannot be undone.`);
    if (!confirmed) return;
    const playlistIdToDelete = editingPlaylist.id;
    setEditingPlaylist(null);
    setDeletingPlaylistId(playlistIdToDelete);
    try {
      const res = await fetch(`/api/playlists/${playlistIdToDelete}`, { method: "DELETE" });
      if (res.ok) {
        setPlaylists((prev) => prev.filter((p) => p.id !== playlistIdToDelete));
        showToast("Playlist deleted");
        router.push("/playlists");
      }
    } finally {
      setDeletingPlaylistId(null);
    }
  };

  const showPlaylistLoading = artistSlug ? songsLoading : playlistsLoading;
  const stageStyle = playlist?.cover_image_url
    ? { backgroundImage: `url(${JSON.stringify(playlist.cover_image_url)})` }
    : { background: GRADIENTS[playlistIndex % GRADIENTS.length] };

  return (
    <>
      <style>{`
        .playlist-detail-page {
          --playlist-detail-control-strip-height: 86px;
          margin-left: var(--sidebar-width);
          margin-top: 56px;
          min-height: calc(100vh - 56px);
          overflow-x: clip;
          overflow-y: visible;
          background: var(--bg-primary);
          color: var(--text-primary);
          transition: margin-left 0.2s ease;
        }

        .playlist-detail-shell {
          position: relative;
          z-index: 2;
          display: grid;
          width: calc(
            100% - var(--filmwave-editorial-inset) - var(--filmwave-editorial-inset)
          );
          max-width: var(--filmwave-editorial-max-width);
          grid-template-columns: 82px minmax(0, 1fr) 35px;
          align-items: start;
          column-gap: 18px;
          margin: 0 auto;
          padding: 22px 0;
        }

        .playlist-detail-search-sticky {
          position: static;
          grid-column: 2;
          grid-row: 1;
          box-sizing: border-box;
          width: min(640px, 100%);
          justify-self: end;
          margin: 0;
          background: transparent;
        }

        .playlist-detail-search-row {
          display: flex;
          width: 100%;
          height: 42px;
          min-height: 42px;
          align-items: center;
          gap: 12px;
          border: 1px solid var(--filmwave-border-color);
          border-radius: 0;
          background: var(--bg-primary);
          padding: 0 14px;
          color: var(--text-muted);
          box-shadow: none;
        }

        .playlist-detail-search-inner {
          display: flex;
          width: auto;
          min-width: 0;
          flex: 1 1 auto;
          align-items: center;
          gap: 12px;
          padding: 0;
        }

        .playlist-detail-search-input {
          min-width: 0;
          flex: 1 1 auto;
          border: 0;
          outline: 0;
          background: transparent;
          color: var(--text-primary);
          font-family: inherit;
          font-size: 12px;
          font-style: italic;
        }

        .playlist-detail-search-input::placeholder {
          color: var(--text-muted);
        }

        .playlist-detail-stage {
          position: relative;
          z-index: 1;
          width: 100%;
          overflow: hidden;
          margin-top: calc(var(--playlist-detail-control-strip-height) * -1);
          background-position: center;
          background-size: cover;
          padding:
            calc(clamp(54px, 5vw, 84px) + var(--playlist-detail-control-strip-height))
            0
            clamp(58px, 5.5vw, 92px);
          isolation: isolate;
        }

        .playlist-detail-stage::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -1;
          background: rgba(0, 0, 0, 0.2);
          pointer-events: none;
        }

        .playlist-detail-card {
          --bg-primary: var(--filmwave-white);
          --bg-secondary: var(--filmwave-white);
          --bg-tertiary: #f2f2f2;
          --bg-hover: #f2f2f2;
          --bg-hover-strong: #e8e8e8;
          --text-primary: var(--filmwave-black);
          --text-secondary: color-mix(in srgb, var(--filmwave-black) 48%, transparent);
          --text-muted: color-mix(in srgb, var(--filmwave-black) 42%, transparent);
          --text-subtle: color-mix(in srgb, var(--filmwave-black) 48%, transparent);
          --icon-color: color-mix(in srgb, var(--filmwave-black) 48%, transparent);
          --border: color-mix(in srgb, var(--filmwave-black) 9%, transparent);
          --border-subtle: color-mix(in srgb, var(--filmwave-black) 9%, transparent);
          --filmwave-border-color: color-mix(in srgb, var(--filmwave-black) 9%, transparent);
          --waveform-color: color-mix(in srgb, var(--filmwave-black) 30%, transparent);
          --waveform-progress: var(--filmwave-black);
          position: relative;
          z-index: 1;
          width: calc(
            100% - var(--filmwave-editorial-inset) - var(--filmwave-editorial-inset)
          );
          max-width: var(--filmwave-editorial-max-width);
          margin: 0 auto;
          background: var(--filmwave-white);
          color: var(--filmwave-black);
        }

        .playlist-detail-card-inner {
          padding: 44px var(--filmwave-page-gutter) 34px;
        }

        .playlist-detail-hero {
          position: relative;
          display: grid;
          grid-template-columns: auto minmax(260px, 1fr);
          align-items: center;
          gap: 30px;
          padding: 0;
        }

        .playlist-detail-cover {
          position: relative;
          width: 188px;
          overflow: hidden;
          aspect-ratio: 1;
          background: var(--bg-tertiary);
        }

        .playlist-detail-cover img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .playlist-detail-hero > .min-w-0 {
          min-width: 0;
        }

        .playlist-detail-kicker,
        .playlist-detail-meta {
          color: var(--text-muted);
          font-family: var(--font-aktiv-grotesk), sans-serif;
          font-size: 11px;
          font-weight: 400;
          letter-spacing: normal;
          line-height: 1.45;
        }

        .playlist-detail-kicker {
          display: block;
          margin-bottom: 9px;
        }

        .playlist-detail-title {
          margin: 0;
          color: var(--text-primary);
          font-family: var(--font-aktiv-grotesk), sans-serif;
          font-size: clamp(28px, 2.25vw, 36px);
          font-weight: 400;
          letter-spacing: -0.035em;
          line-height: 0.98;
        }

        .playlist-detail-meta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          margin: 10px 0 0;
        }

        .playlist-detail-dot {
          color: var(--text-muted);
        }

        .playlist-detail-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 24px;
        }

        .playlist-detail-quick-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px;
          margin-top: 38px;
          background: transparent;
          padding: 0;
        }

        .playlist-detail-section {
          margin-top: 18px;
        }

        .playlist-detail-empty {
          display: flex;
          min-height: 280px;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          color: var(--text-secondary);
        }

        .playlist-detail-empty h2 {
          color: var(--text-primary);
          font-size: 14px;
          font-weight: 500;
        }

        .playlist-detail-empty p {
          max-width: 320px;
          margin-top: 6px;
          font-size: 12px;
          line-height: 1.6;
        }

        .playlist-detail-skeleton-cover {
          background: var(--bg-tertiary);
        }

        .playlist-detail-skeleton-kicker {
          width: 72px;
          height: 8px;
        }

        .playlist-detail-skeleton-title {
          width: min(360px, 72%);
          height: 30px;
          margin-top: 10px;
        }

        .playlist-detail-skeleton-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 14px;
        }

        .playlist-detail-skeleton-meta-line {
          width: 72px;
          height: 8px;
        }

        .playlist-detail-skeleton-meta-line.short {
          width: 140px;
        }

        .playlist-detail-skeleton-button {
          width: 42px;
          height: 42px;
          border-radius: 999px;
        }

        .playlist-detail-skeleton-button.secondary {
          width: 42px;
        }

        .playlist-detail-footer-shell {
          width: calc(
            100% - var(--filmwave-editorial-inset) - var(--filmwave-editorial-inset)
          );
          max-width: var(--filmwave-editorial-max-width);
          margin: 0 auto;
          padding-top: 64px;
        }

        @media (max-width: 760px) {
          .playlist-detail-shell {
            grid-template-columns: 82px minmax(0, 1fr) 35px;
            row-gap: 12px;
          }

          .playlist-detail-search-sticky {
            width: 100%;
          }

          .playlist-detail-stage {
            padding-top: calc(36px + var(--playlist-detail-control-strip-height));
            padding-bottom: 42px;
          }

          .playlist-detail-card-inner {
            padding-top: 30px;
          }

          .playlist-detail-cover {
            width: 142px;
          }
        }

        @media (max-width: 560px) {
          .playlist-detail-hero {
            grid-template-columns: 1fr;
          }

          .playlist-detail-cover {
            width: 100%;
            max-width: 220px;
          }
        }
      `}</style>

      <main className="playlist-detail-page">
        <div className="playlist-detail-shell">
          <div className="playlist-detail-search-sticky">
            <div className="playlist-detail-search-row" onClick={() => searchInputRef.current?.focus()}>
              <label className="playlist-detail-search-inner">
                <SearchIcon className="shrink-0 text-[var(--text-muted)]" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search Playlist"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="playlist-detail-search-input"
                />
              </label>
              <FilterTags
                selectedMoods={[]} selectedGenres={[]} selectedInstruments={[]}
                selectedBuilds={[]} selectedVocals={[]} selectedDurations={[]}
                instrumental={false} bpmValue={null} keyValue={null} selectedPlaylist={null}
                shuffleActive={false}
                onRemoveMood={() => {}} onRemoveGenre={() => {}} onRemoveInstrument={() => {}}
                onRemoveBuild={() => {}} onRemoveVocal={() => {}} onRemoveDuration={() => {}}
                onRemoveInstrumental={() => {}} onRemoveBpm={() => {}} onRemoveKey={() => {}}
                onRemovePlaylist={() => {}} onRemoveShuffle={() => {}}
              />
            </div>
          </div>
        </div>

        <div className="playlist-detail-stage" style={stageStyle}>
          {showPlaylistLoading ? (
            <PlaylistDetailSkeleton />
          ) : !playlist ? (
            <div className="playlist-detail-card">
              <div className="playlist-detail-card-inner">
                <div className="playlist-detail-empty">
                  <h2>Couldn&apos;t load playlist</h2>
                  <p>The playlist could not be found.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="playlist-detail-card">
              <div className="playlist-detail-card-inner">
                <section className="playlist-detail-hero">
                  <div
                    className="playlist-detail-cover"
                    style={{
                      background: playlist.cover_image_url
                        ? "var(--bg-tertiary)"
                        : GRADIENTS[playlistIndex % GRADIENTS.length],
                    }}
                  >
                    {playlist.cover_image_url && (
                      <img src={playlist.cover_image_url} alt={playlist.name} />
                    )}
                  </div>

                  <div className="min-w-0">
                    <span className="playlist-detail-kicker">Playlist</span>
                    <h1 className="playlist-detail-title">{playlist.name || "Playlist"}</h1>
                    <p className="playlist-detail-meta">
                      <span>{formatSongCount(filteredSongs.length)}</span>
                      {topGenres.length > 0 && (
                        <>
                          <span className="playlist-detail-dot">·</span>
                          <span>{topGenres.join(" · ")}</span>
                        </>
                      )}
                    </p>
                    <div className="playlist-detail-actions">
                      <button
                        type="button"
                        onClick={playFirstSong}
                        disabled={filteredSongs.length === 0}
                        className={artistDrawerStyles.roundAction}
                        aria-label={`Play ${playlist.name}`}
                      >
                        <span style={{ display: "inline-flex", transform: "translateX(0.5px)" }}>
                          <PlayIconSmall size={15} />
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={sharePlaylist}
                        className={artistDrawerStyles.roundAction}
                        aria-label={`Share ${playlist.name}`}
                      >
                        <ShareGlyph />
                      </button>
                    </div>
                  </div>
                </section>

                <div className="playlist-detail-quick-row">
                  {QUICK_FILTERS.map((filter) => {
                    const isActive = quickFilter === filter.value;
                    return (
                      <button
                        key={filter.value}
                        type="button"
                        onClick={() => setQuickFilter(filter.value)}
                        className={`${quickFilterButtonClass} ${isActive ? quickFilterButtonActiveClass : ""}`}
                      >
                        {filter.label}
                      </button>
                    );
                  })}
                </div>

                <section className="playlist-detail-section">
                  {songsLoading ? (
                    <SkeletonSongList />
                  ) : error ? (
                    <div className="playlist-detail-empty">
                      <h2>Couldn&apos;t load playlist songs</h2>
                      <p>{error}</p>
                    </div>
                  ) : songs.length === 0 ? (
                    <div className="playlist-detail-empty">
                      <h2>No songs yet</h2>
                      <p>Add songs from the music library, then they will appear here as a playable playlist.</p>
                    </div>
                  ) : filteredSongs.length === 0 ? (
                    <div className="playlist-detail-empty">
                      <h2>No songs found</h2>
                      <p>Try searching for a different title, artist, genre, mood, tag, or filter.</p>
                    </div>
                  ) : (
                    <MusicListShell title={null}>
                      {filteredSongs.map((song, index) => (
                        <SongCard
                          key={song.id}
                          song={song}
                          isFirst={index === 0}
                          isLast={index === filteredSongs.length - 1}
                          showDivider={false}
                          playlistId={ownedPlaylist ? playlistId : undefined}
                          onRemoveFromPlaylist={
                            ownedPlaylist
                              ? (songId) => {
                                  setSongs((prev) => prev.filter((item) => item.id !== songId));
                                  showToast("Song removed");
                                }
                              : undefined
                          }
                        />
                      ))}
                    </MusicListShell>
                  )}
                </section>
              </div>
            </div>
          )}
        </div>

        {!showPlaylistLoading && (
          <div
            className="playlist-detail-footer-shell"
            style={{ paddingBottom: playerVisible ? "72px" : "8px" }}
          >
            <Footer />
          </div>
        )}
      </main>

      <Toast message={toastMessage} bottomOffset={playerVisible ? "88px" : "24px"} />

      <EditPlaylistModal
        isOpen={!!editingPlaylist}
        playlist={editingPlaylist}
        name={editName}
        coverPreview={editCoverPreview}
        isSaving={isSavingPlaylist}
        onNameChange={setEditName}
        onCoverPreviewChange={setEditCoverPreview}
        onSave={handleSaveEdit}
        onDelete={handleDelete}
        onClose={() => setEditingPlaylist(null)}
      />
    </>
  );
}
