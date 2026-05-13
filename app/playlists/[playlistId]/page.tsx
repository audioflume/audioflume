"use client";

import EditPlaylistModal from "@/components/EditPlaylistModal";
import Footer from "@/components/Footer";
import SkeletonSongList from "@/components/SkeletonSongCard";
import SongCard from "@/components/SongCard";
import Toast from "@/components/Toast";
import {
  borderedIconButtonClass,
  primaryPillButtonClass,
  secondaryPillButtonClass,
} from "@/components/uiClasses";
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

function BackIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M15 5L8 12L15 19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 20H8.25L19.5 8.75C20.3284 7.92157 20.3284 6.57843 19.5 5.75L18.25 4.5C17.4216 3.67157 16.0784 3.67157 15.25 4.5L4 15.75V20Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 5.75L18.25 10"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 38.31 38.31"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 text-[var(--text-muted)]"
      aria-hidden="true"
    >
      <path
        d="M38.31,35.48l-11.75-11.74c1.89-2.49,3.03-5.58,3.03-8.94C29.6,6.64,22.96,0,14.8,0S0,6.64,0,14.8s6.64,14.8,14.8,14.8c3.36,0,6.45-1.14,8.94-3.03l11.75,11.74,2.83-2.83ZM14.8,25.6c-5.96,0-10.8-4.84-10.8-10.8S8.84,4,14.8,4s10.8,4.85,10.8,10.8-4.84,10.8-10.8,10.8Z"
        fill="currentColor"
      />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8 5V19L19 12L8 5Z" />
    </svg>
  );
}

function ShuffleIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 7H7.2C9.2 7 10.6 8.2 12 10.2L12.8 11.4"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M17 5L20 8L17 11"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.5 8H20"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M4 17H7.2C9.2 17 10.6 15.8 12 13.8L12.8 12.6"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M17 13L20 16L17 19"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.5 16H20"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
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

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([genre]) => genre);
}

function formatSongCount(count: number) {
  return `${count} song${count === 1 ? "" : "s"}`;
}

export default function PlaylistDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { currentSong, setQueue } = usePlayer();
  const { playlists, setPlaylists, loading: playlistsLoading } = usePlaylists();

  const playlistId = String(params.playlistId || "");
  const playerVisible = !!currentSong;
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [songs, setSongs] = useState<Song[]>([]);
  const [songsLoading, setSongsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [editName, setEditName] = useState("");
  const [editCoverPreview, setEditCoverPreview] = useState<string | null>(null);
  const [isSavingPlaylist, setIsSavingPlaylist] = useState(false);
  const [deletingPlaylistId, setDeletingPlaylistId] = useState<number | null>(
    null,
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const playlist = useMemo(
    () => playlists.find((item) => String(item.id) === playlistId),
    [playlists, playlistId],
  );

  const playlistIndex = useMemo(() => {
    const index = playlists.findIndex((item) => String(item.id) === playlistId);
    return index >= 0 ? index : 0;
  }, [playlists, playlistId]);

  const filteredSongs = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return songs;

    return songs.filter((song) => {
      const searchableText = [
        song.title,
        song.artist,
        song.key,
        ...song.genres,
        ...song.moods,
        ...song.instruments,
        ...song.builds,
        ...song.vocals,
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [songs, search]);

  const topGenres = useMemo(() => getTopGenres(songs), [songs]);

  useEffect(() => {
    if (!playlistId) return;

    let cancelled = false;

    async function loadSongs() {
      setSongsLoading(true);
      setError("");

      try {
        const res = await fetch(`/api/playlists/${playlistId}/songs`);

        if (!res.ok) {
          throw new Error("Failed to load playlist songs.");
        }

        const data = await res.json();

        const loadedSongs = Array.isArray(data)
          ? data
          : Array.isArray(data?.songs)
            ? data.songs
            : Array.isArray(data?.playlistSongs)
              ? data.playlistSongs
              : [];

        if (cancelled) return;

        setSongs(loadedSongs.filter((song: Song) => song.id));
      } catch (err) {
        if (cancelled) return;

        setSongs([]);
        setError(
          err instanceof Error ? err.message : "Failed to load playlist songs.",
        );
      } finally {
        if (!cancelled) {
          setSongsLoading(false);
        }
      }
    }

    loadSongs();

    return () => {
      cancelled = true;
    };
  }, [playlistId]);

  useEffect(() => {
    setQueue(filteredSongs.filter((song) => song.audioUrl));
  }, [filteredSongs, setQueue]);

  function playFirstSong() {
    const firstSong = filteredSongs[0];

    if (!firstSong) return;

    const firstSongButton = document.querySelector<HTMLButtonElement>(
      `[aria-label="Play song"], [aria-label="Pause song"]`,
    );

    firstSongButton?.click();
  }

  function shufflePlaylist() {
    if (filteredSongs.length < 2) return;

    const shuffled = [...filteredSongs].sort(() => Math.random() - 0.5);
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editName,
          cover_image_url: editCoverPreview,
        }),
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
            ? data || {
                ...p,
                name: editName,
                cover_image_url: editCoverPreview,
              }
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

    const confirmed = window.confirm(
      `Are you sure you want to delete "${editingPlaylist.name}"? This cannot be undone.`,
    );

    if (!confirmed) return;

    const playlistIdToDelete = editingPlaylist.id;

    setEditingPlaylist(null);
    setDeletingPlaylistId(playlistIdToDelete);

    try {
      const res = await fetch(`/api/playlists/${playlistIdToDelete}`, {
        method: "DELETE",
      });

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

        .playlist-detail-shell {
          position: relative;
          padding: 0 28px;
        }

        .playlist-detail-top-actions {
          display: flex;
          min-height: 32px;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding-top: 24px;
        }

        .playlist-detail-hero {
          display: grid;
          grid-template-columns: 162px minmax(0, 1fr);
          gap: 32px;
          align-items: stretch;
          padding: 36px 0 30px;
        }

        .playlist-detail-cover {
          position: relative;
          height: 100%;
          min-height: 162px;
          overflow: hidden;
          border-radius: 18px;
          background: var(--bg-secondary);
        }

        .playlist-detail-cover img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .playlist-detail-cover::after {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(to top, var(--media-overlay-button), transparent),
            linear-gradient(to bottom, var(--media-overlay-highlight), transparent);
          pointer-events: none;
        }

        .playlist-detail-kicker {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-muted);
        }

        .playlist-detail-title {
          margin-top: 8px;
          max-width: 640px;
          font-family: var(--font-instrument-sans);
          font-size: 56px;
          font-weight: 500;
          line-height: 0.94;
          letter-spacing: -0.055em;
          color: var(--text-primary);
        }

        .playlist-detail-meta {
          margin-top: 16px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          color: var(--text-secondary);
        }

        .playlist-detail-dot {
          color: var(--text-muted);
        }

        .playlist-detail-actions {
          margin-top: 24px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .playlist-detail-search-sticky {
          position: sticky;
          top: 55px;
          z-index: 90;
          margin-left: -28px;
          margin-right: -28px;
          background: var(--bg-primary);
        }

        .playlist-detail-search-row {
          display: flex;
          min-height: 49px;
          align-items: center;
          gap: 3px;
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
          padding: 0 28px;
          cursor: text;
        }

        .playlist-detail-search-inner {
          display: flex;
          width: 320px;
          flex-shrink: 0;
          align-items: center;
          gap: 8px;
          padding: 12px 16px 12px 0;
          cursor: text;
        }

        .playlist-detail-search-input {
          width: 100%;
          background: transparent;
          font-size: 15px;
          font-weight: 300;
          color: var(--text-primary);
          outline: none;
        }

        .playlist-detail-search-input::placeholder {
          color: var(--text-muted);
        }

        .playlist-detail-section {
          margin-left: -28px;
          margin-right: -28px;
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
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .playlist-detail-empty p {
          margin-top: 6px;
          max-width: 320px;
          font-size: 12px;
          line-height: 1.6;
        }

        .playlist-detail-skeleton-cover {
          background: var(--bg-elevated);
        }

        .playlist-detail-skeleton-cover::after {
          display: none;
        }

        .playlist-detail-skeleton-kicker {
          width: 82px;
          height: 8px;
          margin-top: 2px;
        }

        .playlist-detail-skeleton-title {
          width: min(420px, 72%);
          height: 52px;
          margin-top: 13px;
        }

        .playlist-detail-skeleton-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 18px;
        }

        .playlist-detail-skeleton-meta-line {
          width: 72px;
          height: 8px;
        }

        .playlist-detail-skeleton-meta-line.short {
          width: 140px;
        }

        .playlist-detail-skeleton-button {
          width: 70px;
          height: 36px;
          border-radius: 999px;
        }

        .playlist-detail-skeleton-button.secondary {
          width: 92px;
        }

        @media (max-width: 760px) {
          .playlist-detail-shell {
            padding: 0 18px;
          }

          .playlist-detail-hero {
            grid-template-columns: minmax(0, 1fr);
            gap: 0;
            padding: 36px 0 30px;
          }

          .playlist-detail-cover {
            display: none;
          }

          .playlist-detail-search-sticky,
          .playlist-detail-section {
            margin-left: -18px;
            margin-right: -18px;
          }

          .playlist-detail-search-row {
            padding-left: 18px;
            padding-right: 18px;
          }

          .playlist-detail-search-inner {
            width: 100%;
            padding-right: 0;
          }

          .playlist-detail-skeleton-title {
            width: min(420px, 88%);
          }
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
              className={`${borderedIconButtonClass} ${
                playlist ? "" : "pointer-events-none invisible"
              }`}
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

                  <h1 className="playlist-detail-title">
                    {playlist?.name || "Playlist"}
                  </h1>

                  <div className="playlist-detail-meta">
                    <span>{formatSongCount(songs.length)}</span>

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
                      <PlayIcon />
                      Play
                    </button>

                    <button
                      type="button"
                      onClick={shufflePlaylist}
                      disabled={filteredSongs.length < 2}
                      className={`${secondaryPillButtonClass} disabled:cursor-default disabled:opacity-40`}
                    >
                      <ShuffleIcon />
                      Shuffle
                    </button>
                  </div>
                </div>
              </section>

              <div className="playlist-detail-search-sticky">
                <div
                  className="playlist-detail-search-row"
                  onClick={() => searchInputRef.current?.focus()}
                >
                  <label className="playlist-detail-search-inner">
                    <SearchIcon />

                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search Playlist"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      className="playlist-detail-search-input"
                    />
                  </label>
                </div>
              </div>

              <section className="playlist-detail-section">
                {songs.length === 0 ? (
                  <div className="playlist-detail-empty">
                    <h2>No songs yet</h2>
                    <p>
                      Add songs from the music library, then they will appear
                      here as a playable playlist.
                    </p>
                  </div>
                ) : filteredSongs.length === 0 ? (
                  <div className="playlist-detail-empty">
                    <h2>No songs found</h2>
                    <p>
                      Try searching for a different title, artist, genre, mood,
                      or tag.
                    </p>
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
                          setSongs((prev) =>
                            prev.filter((item) => item.id !== songId),
                          );
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
      </main>

      <Toast
        message={toastMessage}
        bottomOffset={playerVisible ? "88px" : "24px"}
      />

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
