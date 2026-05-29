"use client";

import Footer from "@/components/Footer";
import SkeletonSongList from "@/components/SkeletonSongCard";
import SongCard from "@/components/SongCard";
import FilterTags from "@/components/FilterTags";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import SearchIcon from "@/components/icons/SearchIcon";
import ShuffleIconSmall from "@/components/icons/ShuffleIconSmall";
import {
  primaryPillButtonClass,
  secondaryPillButtonClass,
  quickFilterButtonClass,
  quickFilterButtonActiveClass,
} from "@/components/uiClasses";
import { useFavorites } from "@/context/FavoritesContext";
import { usePlayer } from "@/context/PlayerContext";
import { useUserPreferences } from "@/context/UserPreferencesContext";
import type { CuratedPlaylist, CuratedPlaylistSong } from "@/lib/curatedPlaylists";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

const QUICK_FILTERS = [
  { label: "Default", value: "default" },
  { label: "Alphabetical", value: "alphabetical" },
  { label: "Liked", value: "liked" },
] as const;

type QuickFilterValue = (typeof QUICK_FILTERS)[number]["value"];

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

function getTopGenres(songs: CuratedPlaylistSong[]) {
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

export default function CuratedPlaylistDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { currentSong, setQueue } = usePlayer();
  const { favoriteIdSet } = useFavorites();
  const { showEditPointMarkers, setShowEditPointMarkers } = useUserPreferences();

  const playlistId = String(params.playlistId || "");
  const playerVisible = !!currentSong;
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [playlist, setPlaylist] = useState<CuratedPlaylist | null>(null);
  const [songs, setSongs] = useState<CuratedPlaylistSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilterValue>("default");
  const [error, setError] = useState("");
  const [shuffleOrderIds, setShuffleOrderIds] = useState<string[] | null>(null);
  const shuffleActive = shuffleOrderIds !== null;

  useEffect(() => {
    let cancelled = false;

    async function loadPlaylist() {
      try {
        setLoading(true);
        setError("");

        const [playlistRes, songsRes] = await Promise.all([
          fetch(`/api/curated-playlists/${encodeURIComponent(playlistId)}`),
          fetch(`/api/curated-playlists/${encodeURIComponent(playlistId)}/songs`),
        ]);

        const playlistData = await playlistRes.json();
        const songsData = await songsRes.json();

        if (!playlistRes.ok) throw new Error(playlistData?.error || "Failed to load playlist");
        if (!songsRes.ok) throw new Error(songsData?.error || "Failed to load songs");
        if (!Array.isArray(songsData)) throw new Error("Invalid songs response");

        if (!cancelled) {
          setPlaylist(playlistData);
          setSongs(songsData);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load playlist");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (playlistId) loadPlaylist();
    return () => { cancelled = true; };
  }, [playlistId]);

  const searchedSongs = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return songs;
    return songs.filter((song) => {
      const text = [song.title, song.artist, song.key, ...song.genres, ...song.moods, ...song.instruments, ...song.builds, ...song.vocals].join(" ").toLowerCase();
      return text.includes(query);
    });
  }, [songs, search]);

  const filteredSongs = useMemo(() => {
    let result = [...searchedSongs];

    if (quickFilter === "liked") {
      result = result.filter((song) => favoriteIdSet.has(song.id));
    } else if (quickFilter === "alphabetical") {
      result = result.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
    } else {
      // "default" — use curated position order
      result = result.sort((a, b) => a.position - b.position);
    }

    if (!shuffleOrderIds) return result;

    const orderMap = new Map(shuffleOrderIds.map((id, i) => [id, i]));
    return [...result].sort((a, b) => {
      const aO = orderMap.get(a.id);
      const bO = orderMap.get(b.id);
      if (aO === undefined && bO === undefined) return 0;
      if (aO === undefined) return 1;
      if (bO === undefined) return -1;
      return aO - bO;
    });
  }, [searchedSongs, quickFilter, favoriteIdSet, shuffleOrderIds]);

  const topGenres = useMemo(() => getTopGenres(songs), [songs]);

  useEffect(() => {
    setQueue(filteredSongs.filter((song) => song.audioUrl));
  }, [filteredSongs, setQueue]);

  useEffect(() => {
    setShuffleOrderIds(null);
  }, [quickFilter, search]);

  function playFirstSong() {
    const firstSong = filteredSongs[0];
    if (!firstSong) return;
    const btn = document.querySelector<HTMLButtonElement>(`[aria-label="Play song"], [aria-label="Pause song"]`);
    btn?.click();
  }

  function shufflePlaylist() {
    if (filteredSongs.length < 2) return;
    const shuffled = shuffleSongList(filteredSongs);
    setShuffleOrderIds(shuffled.map((song) => song.id));
    setQueue(shuffled.filter((song) => song.audioUrl));
  }

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
          background: linear-gradient(to top, var(--media-overlay-button), transparent), linear-gradient(to bottom, var(--media-overlay-highlight), transparent);
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
        .playlist-detail-dot { color: var(--text-muted); }
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
        .playlist-detail-search-input::placeholder { color: var(--text-muted); }
        .playlist-detail-quick-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px;
          margin-left: -28px;
          margin-right: -28px;
          background: var(--bg-primary);
          padding: 16px 28px;
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
              onClick={() => router.push("/curated-playlists")}
              className="inline-flex cursor-pointer items-center gap-2 text-[13px] font-normal text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
            >
              <BackIcon />
              Back to curated playlists
            </button>
          </div>

          {loading ? (
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
                      : "linear-gradient(135deg,#372f4f 0%,#111111 48%,#75649a 100%)",
                  }}
                >
                  {playlist?.cover_image_url && (
                    <img src={playlist.cover_image_url} alt={playlist.name} />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="playlist-detail-kicker">
                    {playlist?.kicker || "Curated Playlist"}
                  </div>

                  <h1 className="playlist-detail-title">
                    {playlist?.name || "Playlist"}
                  </h1>

                  <div className="playlist-detail-meta">
                    {playlist?.playlist_group && (
                      <>
                        <span>{playlist.playlist_group}</span>
                        <span className="playlist-detail-dot">·</span>
                      </>
                    )}
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
                <div
                  className="playlist-detail-search-row"
                  onClick={() => searchInputRef.current?.focus()}
                >
                  <label className="playlist-detail-search-inner">
                    <SearchIcon className="shrink-0 text-[var(--text-muted)]" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search Playlist"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setShuffleOrderIds(null);
                      }}
                      className="playlist-detail-search-input"
                    />
                  </label>

                  <FilterTags
                    selectedMoods={[]}
                    selectedGenres={[]}
                    selectedInstruments={[]}
                    selectedBuilds={[]}
                    selectedVocals={[]}
                    selectedDurations={[]}
                    instrumental={false}
                    bpmValue={null}
                    keyValue={null}
                    selectedPlaylist={null}
                    shuffleActive={shuffleActive}
                    onRemoveMood={() => {}}
                    onRemoveGenre={() => {}}
                    onRemoveInstrument={() => {}}
                    onRemoveBuild={() => {}}
                    onRemoveVocal={() => {}}
                    onRemoveDuration={() => {}}
                    onRemoveInstrumental={() => {}}
                    onRemoveBpm={() => {}}
                    onRemoveKey={() => {}}
                    onRemovePlaylist={() => {}}
                    onRemoveShuffle={() => setShuffleOrderIds(null)}
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
                      onClick={() => {
                        setQuickFilter(filter.value);
                        setShuffleOrderIds(null);
                      }}
                      className={`${quickFilterButtonClass} ${isActive ? quickFilterButtonActiveClass : ""}`}
                    >
                      {filter.label}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setShowEditPointMarkers(!showEditPointMarkers)}
                  className={`${quickFilterButtonClass} ${
                    showEditPointMarkers ? quickFilterButtonActiveClass : ""
                  }`}
                  aria-pressed={showEditPointMarkers}
                >
                  markers
                </button>
              </div>

              <section className="playlist-detail-section">
                {songs.length === 0 ? (
                  <div className="playlist-detail-empty">
                    <h2>No songs yet</h2>
                    <p>This curated playlist doesn&apos;t have any songs yet.</p>
                  </div>
                ) : filteredSongs.length === 0 ? (
                  <div className="playlist-detail-empty">
                    <h2>No songs found</h2>
                    <p>Try searching for a different title, artist, genre, mood, or tag.</p>
                  </div>
                ) : (
                  <div>
                    {filteredSongs.map((song, index) => (
                      <SongCard
                        key={song.id}
                        song={song}
                        isFirst={index === 0}
                        isLast={index === filteredSongs.length - 1}
                        showEditPointMarkers={showEditPointMarkers}
                      />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {!loading && (
            <div className="pt-10" style={{ paddingBottom: playerVisible ? "72px" : "8px" }}>
              <Footer />
            </div>
          )}
        </div>
      </main>
    </>
  );
}
