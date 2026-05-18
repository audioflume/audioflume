"use client";

import EditPlaylistModal from "@/components/EditPlaylistModal";
import Footer from "@/components/Footer";
import SkeletonSongList from "@/components/SkeletonSongCard";
import SongCard from "@/components/SongCard";
import Toast from "@/components/Toast";
import FilterTags from "@/components/FilterTags";
import EditIcon from "@/components/icons/EditIcon";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import SearchIcon from "@/components/icons/SearchIcon";
import ShuffleIconSmall from "@/components/icons/ShuffleIconSmall";
import {
  borderedIconButtonClass,
  primaryPillButtonClass,
  secondaryPillButtonClass,
  quickFilterButtonClass,
  quickFilterButtonActiveClass,
} from "@/components/uiClasses";
import { useFavorites } from "@/context/FavoritesContext";
import { usePlayer } from "@/context/PlayerContext";
import { usePlaylists } from "@/hooks/usePlaylists";
import type { Playlist, Song } from "@/lib/types";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

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

function BackIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M15 5L8 12L15 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlaylistDetailSkeleton() {
  return (
    <>
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
    </>
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

function shuffleSongList<T>(songs: T[]) {
  if (songs.length < 2) return [...songs];
  let bestShuffle = [...songs];
  let bestMovedCount = -1;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const shuffled = [...songs];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = temp;
    }
    const movedCount = shuffled.filter((song, index) => song !== songs[index]).length;
    if (movedCount > bestMovedCount) {
      bestShuffle = shuffled;
      bestMovedCount = movedCount;
    }
    if (movedCount >= Math.floor(songs.length * 0.85)) break;
  }
  return bestShuffle;
}

export default function PlaylistDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { currentSong, setQueue } = usePlayer();
  const { favoriteIdSet } = useFavorites();
  const { playlists, setPlaylists, loading: playlistsLoading } = usePlaylists();

  const playlistId = String(params.playlistId || "");
  const playerVisible = !!currentSong;
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [songs, setSongs] = useState<PlaylistSong[]>([]);
  const [songsLoading, setSongsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilterValue>("newest");
  const [error, setError] = useState("");
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [editName, setEditName] = useState("");
  const [editCoverPreview, setEditCoverPreview] = useState<string | null>(null);
  const [isSavingPlaylist, setIsSavingPlaylist] = useState(false);
  const [deletingPlaylistId, setDeletingPlaylistId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [shuffleOrderIds, setShuffleOrderIds] = useState<string[] | null>(null);
  const shuffleActive = shuffleOrderIds !== null;

  const playlist = useMemo(
    () => playlists.find((item) => String(item.id) === playlistId),
    [playlists, playlistId],
  );

  const playlistIndex = useMemo(() => {
    const index = playlists.findIndex((item) => String(item.id) === playlistId);
    return index >= 0 ? index : 0;
  }, [playlists, playlistId]);

  const searchedSongs = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return songs;
    return songs.filter((song) => {
      const searchableText = [song.title, song.artist, song.key, ...song.genres, ...song.moods, ...song.instruments, ...song.builds, ...song.vocals]
        .join(" ")
        .toLowerCase();
      return searchableText.includes(query);
    });
  }, [songs, search]);

  const filteredSongs = useMemo(() => {
    const indexedSongs = searchedSongs.map((song, index) => ({ song, index }));
    const nextSongs = quickFilter === "liked"
      ? indexedSongs.filter(({ song }) => favoriteIdSet.has(song.id))
      : indexedSongs;
    const sortedSongs = [...nextSongs].sort((a, b) => {
      if (quickFilter === "alphabetical") {
        return a.song.title.localeCompare(b.song.title, undefined, { sensitivity: "base" });
      }
      const aTime = getSongAddedTime(a.song);
      const bTime = getSongAddedTime(b.song);
      if (aTime !== bTime) return quickFilter === "oldest" ? aTime - bTime : bTime - aTime;
      return quickFilter === "oldest" ? a.index - b.index : b.index - a.index;
    });
    if (!shuffleOrderIds) return sortedSongs.map(({ song }) => song);
    const orderMap = new Map(shuffleOrderIds.map((songId, index) => [songId, index]));
    return sortedSongs.map(({ song }) => song).sort((a, b) => {
      const aOrder = orderMap.get(a.id);
      const bOrder = orderMap.get(b.id);
      if (aOrder === undefined && bOrder === undefined) return 0;
      if (aOrder === undefined) return 1;
      if (bOrder === undefined) return -1;
      return aOrder - bOrder;
    });
  }, [searchedSongs, quickFilter, favoriteIdSet, shuffleOrderIds]);

  const topGenres = useMemo(() => getTopGenres(songs), [songs]);

  useEffect(() => {
    if (!playlistId) return;
    let cancelled = false;

    async function loadSongs() {
      setSongsLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/playlists/${playlistId}/songs`);
        // Read JSON first so we can surface the real API error message
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || "Failed to load playlist songs.");
        }
        const loadedSongs = Array.isArray(data)
          ? data
          : Array.isArray(data?.songs)
            ? data.songs
            : Array.isArray(data?.playlistSongs)
              ? data.playlistSongs
              : [];
        if (cancelled) return;
        setSongs(loadedSongs.filter((song: PlaylistSong) => song.id));
      } catch (err) {
        if (cancelled) return;
        setSongs([]);
        setError(err instanceof Error ? err.message : "Failed to load playlist songs.");
      } finally {
        if (!cancelled) setSongsLoading(false);
      }
    }

    loadSongs();
    return () => { cancelled = true; };
  }, [playlistId]);

  useEffect(() => {
    setQueue(filteredSongs.filter((song) => song.audioUrl));
  }, [filteredSongs, setQueue]);

  useEffect(() => {
    setShuffleOrderIds(null);
  }, [quickFilter, search]);

  function playFirstSong() {
    const firstSong = filteredSongs[0];
    if (!firstSong) return;
    const firstSongButton = document.querySelector<HTMLButtonElement>(`[aria-label="Play song"], [aria-label="Pause song"]`);
    firstSongButton?.click();
  }

  function shufflePlaylist() {
    if (filteredSongs.length < 2) return;
    const shuffled = shuffleSongList(filteredSongs);
    setShuffleOrderIds(shuffled.map((song) => song.id));
    setQueue(shuffled.filter((song) => song.audioUrl));
  }

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 1800);
  };

  const openEdit = () => {
    if (!playlist) return;
    setEditingPlaylist(playlist);
    setEditName(playlist.name);
    setEditCoverPreview(playlist.cover_image_url ?? null);
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
      if (!res.ok) {
        console.error("Failed to save playlist:", data || res.statusText);
        return;
      }
      setPlaylists((prev) =>
        prev.map((p) =>
          p.id === editingPlaylist.id
            ? data || { ...p, name: editName, cover_image_url: editCoverPreview }
            : p,
        ),
      );
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

  const showLoading = playlistsLoading || songsLoading;

  return (
    <>
      <style>{`
        .playlist-detail-page {
          margin-left: var(--sidebar-width);
          margin-top: 56px;
          min-height: calc(100vh - 56px);
          overflow-x: clip;
          overflow-y: visible;
          background: var(--bg-primary);
          color: var(--text-primary);
          transition: margin-left 0.2s ease;
        }
        .playlist-detail-shell { position: relative; padding: 0 28px; }
        .playlist-detail-top-actions {
          display: flex; min-height: 32px; align-items: center;
          justify-content: space-between; gap: 12px; padding-top: 24px;
        }
        .playlist-detail-hero {
          display: grid; grid-template-columns: 162px minmax(0, 1fr);
          gap: 32px; align-items: stretch; padding: 36px 0 30px;
        }
        .playlist-detail-cover {
          position: relative; height: 100%; min-height: 162px;
          overflow: hidden; border-radius: 18px; background: var(--bg-secondary);
        }
        .playlist-detail-cover img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
        .playlist-detail-cover::after {
          content: ""; position: absolute; inset: 0;
          background: linear-gradient(to top, var(--media-overlay-button), transparent), linear-gradient(to bottom, var(--media-overlay-highlight), transparent);
          pointer-events: none;
        }
        .playlist-detail-kicker { font-size: 10px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-muted); }
        .playlist-detail-title { margin-top: 8px; max-width: 640px; font-family: var(--font-instrument-sans); font-size: 56px; font-weight: 500; line-height: 0.94; letter-spacing: -0.055em; color: var(--text-primary); }
        .playlist-detail-meta { margin-top: 16px; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 11px; color: var(--text-secondary); }
        .playlist-detail-dot { color: var(--text-muted); }
        .playlist-detail-actions { margin-top: 24px; display: flex; align-items: center; gap: 8px; }
        .playlist-detail-search-sticky { position: sticky; top: 55px; z-index: 90; margin-left: -28px; margin-right: -28px; background: var(--bg-primary); }
        .playlist-detail-search-row { display: flex; min-height: 49px; align-items: center; gap: 3px; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); padding: 0 28px; cursor: text; }
        .playlist-detail-search-inner { display: flex; width: 320px; flex-shrink: 0; align-items: center; gap: 8px; padding: 12px 16px 12px 0; cursor: text; }
        .playlist-detail-search-input { width: 100%; background: transparent; font-size: 15px; font-weight: 300; color: var(--text-primary); outline: none; }
        .playlist-detail-search-input::placeholder { color: var(--text-muted); }
        .playlist-detail-quick-row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-left: -28px; margin-right: -28px; background: var(--bg-primary); padding: 16px 28px; }
        .playlist-detail-section { margin-left: -28px; margin-right: -28px; }
        .playlist-detail-empty { display: flex; min-height: 280px; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: var(--text-secondary); }
        .playlist-detail-empty h2 { font-size: 14px; font-weight: 500; color: var(--text-primary); }
        .playlist-detail-empty p { margin-top: 6px; max-width: 320px; font-size: 12px; line-height: 1.6; }
        .playlist-detail-skeleton-cover { background: var(--bg-elevated); }
        .playlist-detail-skeleton-cover::after { display: none; }
        .playlist-detail-skeleton-kicker { width: 82px; height: 8px; margin-top: 2px; }
        .playlist-detail-skeleton-title { width: min(420px, 72%); height: 52px; margin-top: 13px; }
        .playlist-detail-skeleton-meta { display: flex; align-items: center; gap: 8px; margin-top: 18px; }
        .playlist-detail-skeleton-meta-line { width: 72px; height: 8px; }
        .playlist-detail-skeleton-meta-line.short { width: 140px; }
        .playlist-detail-skeleton-button { width: 70px; height: 36px; border-radius: 999px; }
        .playlist-detail-skeleton-button.secondary { width: 92px; }
        @media (max-width: 760px) {
          .playlist-detail-shell { padding: 0 18px; }
          .playlist-detail-hero { grid-template-columns: minmax(0, 1fr); gap: 0; padding: 36px 0 30px; }
          .playlist-detail-cover { display: none; }
          .playlist-detail-search-sticky, .playlist-detail-section, .playlist-detail-quick-row { margin-left: -18px; margin-right: -18px; }
          .playlist-detail-search-row, .playlist-detail-quick-row { padding-left: 18px; padding-right: 18px; }
          .playlist-detail-search-inner { width: 100%; padding-right: 0; }
          .playlist-detail-skeleton-title { width: min(420px, 88%); }
        }
      `}</style>

      <main className="playlist-detail-page">
        <div className="playlist-detail-shell">
          <div className="playlist-detail-top-actions">
            <button
              type="button"
              onClick={() => router.push("/playlists")}
              className="inline-flex cursor-pointer items-center gap-2 text-[13px] font-normal text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
            >
              <BackIcon />
              Back to playlists
            </button>
            <button
              type="button"
              onClick={openEdit}
              disabled={!playlist}
              className={`${borderedIconButtonClass} ${playlist ? "" : "pointer-events-none invisible"}`}
              aria-label={playlist ? `Edit ${playlist.name}` : "Edit playlist"}
            >
              <EditIcon />
            </button>
          </div>

          {showLoading ? (
            <PlaylistDetailSkeleton />
          ) : error ? (
            <div className="playlist-detail-empty">
              <h2>Couldn&apos;t load playlist</h2>
              <p>{error}</p>
            </div>
          ) : (
            <>
              <section className="playlist-detail-hero">
                <div
                  className="playlist-detail-cover"
                  style={{
                    background: playlist?.cover_image_url
                      ? "var(--media-overlay-solid)"
                      : GRADIENTS[playlistIndex % GRADIENTS.length],
                  }}
                >
                  {playlist?.cover_image_url && (
                    <img src={playlist.cover_image_url} alt={playlist.name} />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="playlist-detail-kicker">Playlist</div>
                  <h1 className="playlist-detail-title">{playlist?.name || "Playlist"}</h1>
                  <div className="playlist-detail-meta">
                    <span>{formatSongCount(filteredSongs.length)}</span>
                    {topGenres.length > 0 && (
                      <>
                        <span className="playlist-detail-dot">·</span>
                        <span>{topGenres.join(" · ")}</span>
                      </>
                    )}
                  </div>
                  <div className="playlist-detail-actions">
                    <button
                      type="button"
                      onClick={playFirstSong}
                      disabled={filteredSongs.length === 0}
                      className={`${primaryPillButtonClass} disabled:cursor-default disabled:opacity-40`}
                    >
                      <PlayIconSmall />
                      Play
                    </button>
                    <button
                      type="button"
                      onClick={shufflePlaylist}
                      disabled={filteredSongs.length < 2}
                      className={`${secondaryPillButtonClass} disabled:cursor-default disabled:opacity-40`}
                    >
                      <ShuffleIconSmall />
                      Shuffle
                    </button>
                  </div>
                </div>
              </section>

              <div className="playlist-detail-search-sticky">
                <div className="playlist-detail-search-row" onClick={() => searchInputRef.current?.focus()}>
                  <label className="playlist-detail-search-inner">
                    <SearchIcon className="shrink-0 text-[var(--text-muted)]" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search Playlist"
                      value={search}
                      onChange={(event) => { setSearch(event.target.value); setShuffleOrderIds(null); }}
                      className="playlist-detail-search-input"
                    />
                  </label>
                  <FilterTags
                    selectedMoods={[]} selectedGenres={[]} selectedInstruments={[]}
                    selectedBuilds={[]} selectedVocals={[]} selectedDurations={[]}
                    instrumental={false} bpmValue={null} keyValue={null} selectedPlaylist={null}
                    shuffleActive={shuffleActive}
                    onRemoveMood={() => {}} onRemoveGenre={() => {}} onRemoveInstrument={() => {}}
                    onRemoveBuild={() => {}} onRemoveVocal={() => {}} onRemoveDuration={() => {}}
                    onRemoveInstrumental={() => {}} onRemoveBpm={() => {}} onRemoveKey={() => {}}
                    onRemovePlaylist={() => {}} onRemoveShuffle={() => setShuffleOrderIds(null)}
                  />
                </div>
              </div>

              <div className="playlist-detail-quick-row">
                {QUICK_FILTERS.map((filter) => {
                  const isActive = !shuffleActive && quickFilter === filter.value;
                  return (
                    <button
                      key={filter.value}
                      type="button"
                      onClick={() => { setQuickFilter(filter.value); setShuffleOrderIds(null); }}
                      className={`${quickFilterButtonClass} ${isActive ? quickFilterButtonActiveClass : ""}`}
                    >
                      {filter.label}
                    </button>
                  );
                })}
              </div>

              <section className="playlist-detail-section">
                {songs.length === 0 ? (
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
                  <div>
                    {filteredSongs.map((song, index) => (
                      <SongCard
                        key={song.id}
                        song={song}
                        isFirst={index === 0}
                        isLast={index === filteredSongs.length - 1}
                        playlistId={playlistId}
                        onRemoveFromPlaylist={(songId) => {
                          setSongs((prev) => prev.filter((item) => item.id !== songId));
                          showToast("Song removed");
                        }}
                      />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {!showLoading && (
            <div className="pt-10" style={{ paddingBottom: playerVisible ? "72px" : "8px" }}>
              <Footer />
            </div>
          )}
        </div>
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
