"use client";

import { MusicListShell } from "@filmwave/shared";
import Footer from "@/components/Footer";
import RecentPlaylistTracker from "@/components/RecentPlaylistTracker";
import SkeletonSongList from "@/components/SkeletonSongCard";
import SongCard from "@/components/SongCard";
import FilterTags from "@/components/FilterTags";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import SearchIcon from "@/components/icons/SearchIcon";
import ShuffleIconSmall from "@/components/icons/ShuffleIconSmall";
import {
  quickFilterButtonClass,
  quickFilterButtonActiveClass,
} from "@/components/uiClasses";
import { useFavorites } from "@/context/FavoritesContext";
import { usePlayer } from "@/context/PlayerContext";
import { useUserPreferences } from "@/context/UserPreferencesContext";
import type { CuratedPlaylist, CuratedPlaylistSong } from "@/lib/curatedPlaylists";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import artistDrawerStyles from "@/components/artists/PublicArtistCollectionDrawer.module.css";
import "@/app/music/music-library-redesign.css";
import "@/app/playlist-detail-unified.css";

const QUICK_FILTERS = [
  { label: "Default", value: "default" },
  { label: "Alphabetical", value: "alphabetical" },
  { label: "Liked", value: "liked" },
] as const;

const FALLBACK_BACKGROUND =
  "linear-gradient(135deg,#372f4f 0%,#111111 48%,#75649a 100%)";

type QuickFilterValue = (typeof QUICK_FILTERS)[number]["value"];

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

function getTopGenres(songs: CuratedPlaylistSong[]) {
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

function playCoverVideo(element: HTMLElement) {
  const video = element.querySelector<HTMLVideoElement>("video");
  if (!video) return;
  video.pause();
  video.currentTime = 0;
  void video.play().catch(() => {});
}

function pauseCoverVideo(element: HTMLElement) {
  element.querySelector<HTMLVideoElement>("video")?.pause();
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

        if (!playlistRes.ok) {
          throw new Error(playlistData?.error || "Failed to load playlist");
        }
        if (!songsRes.ok) {
          throw new Error(songsData?.error || "Failed to load songs");
        }
        if (!Array.isArray(songsData)) {
          throw new Error("Invalid songs response");
        }

        if (!cancelled) {
          setPlaylist(playlistData);
          setSongs(songsData);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load playlist");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (playlistId) void loadPlaylist();
    return () => {
      cancelled = true;
    };
  }, [playlistId]);

  const searchedSongs = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return songs;
    return songs.filter((song) => {
      const text = [
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
      return text.includes(query);
    });
  }, [songs, search]);

  const filteredSongs = useMemo(() => {
    let result = [...searchedSongs];

    if (quickFilter === "liked") {
      result = result.filter((song) => favoriteIdSet.has(song.id));
    } else if (quickFilter === "alphabetical") {
      result = result.sort((a, b) =>
        a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
      );
    } else {
      result = result.sort((a, b) => a.position - b.position);
    }

    if (!shuffleOrderIds) return result;

    const orderMap = new Map(shuffleOrderIds.map((id, index) => [id, index]));
    return [...result].sort((a, b) => {
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
    setQueue(filteredSongs.filter((song) => song.audioUrl));
  }, [filteredSongs, setQueue]);

  useEffect(() => {
    setShuffleOrderIds(null);
  }, [quickFilter, search]);

  function playFirstSong() {
    const button = document.querySelector<HTMLButtonElement>(
      '[aria-label="Play song"], [aria-label="Pause song"]',
    );
    button?.click();
  }

  function shufflePlaylist() {
    if (filteredSongs.length < 2) return;
    const shuffled = shuffleSongList(filteredSongs);
    setShuffleOrderIds(shuffled.map((song) => song.id));
    setQueue(shuffled.filter((song) => song.audioUrl));
  }

  const stageStyle = playlist?.cover_image_url
    ? { backgroundImage: `url(${JSON.stringify(playlist.cover_image_url)})` }
    : { background: FALLBACK_BACKGROUND };

  return (
    <>
      <RecentPlaylistTracker />

      <main className="playlist-detail-page">
        <div className="playlist-detail-shell">
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
                  onChange={(event) => {
                    setSearch(event.target.value);
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
        </div>

        <div className="playlist-detail-stage" style={stageStyle}>
          {loading ? (
            <PlaylistDetailSkeleton />
          ) : error ? (
            <div className="playlist-detail-card">
              <div className="playlist-detail-card-inner">
                <div className="playlist-detail-empty">
                  <h2>Couldn&apos;t load playlist</h2>
                  <p>{error}</p>
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
                      background:
                        playlist?.cover_video_url || playlist?.cover_image_url
                          ? "var(--bg-tertiary)"
                          : FALLBACK_BACKGROUND,
                    }}
                    onMouseEnter={(event) => playCoverVideo(event.currentTarget)}
                    onMouseLeave={(event) => pauseCoverVideo(event.currentTarget)}
                  >
                    {playlist?.cover_video_url ? (
                      <video
                        src={playlist.cover_video_url}
                        poster={playlist.cover_image_url || undefined}
                        muted
                        loop
                        playsInline
                        preload="none"
                        aria-label={`${playlist.name} cover video`}
                      />
                    ) : (
                      playlist?.cover_image_url && (
                        <img src={playlist.cover_image_url} alt={playlist.name} />
                      )
                    )}
                  </div>

                  <div className="min-w-0">
                    <span className="playlist-detail-kicker">
                      {playlist?.kicker || "Curated Playlist"}
                    </span>
                    <h1 className="playlist-detail-title">
                      {playlist?.name || "Playlist"}
                    </h1>
                    <p className="playlist-detail-meta">
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
                    </p>

                    <div className="playlist-detail-actions">
                      <button
                        type="button"
                        onClick={playFirstSong}
                        disabled={filteredSongs.length === 0}
                        className={artistDrawerStyles.roundAction}
                        aria-label={`Play ${playlist?.name || "playlist"}`}
                      >
                        <PlayIconSmall size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={shufflePlaylist}
                        disabled={filteredSongs.length < 2}
                        className={artistDrawerStyles.roundAction}
                        aria-label={`Shuffle ${playlist?.name || "playlist"}`}
                      >
                        <ShuffleIconSmall />
                      </button>
                    </div>
                  </div>
                </section>

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
                        className={`${quickFilterButtonClass} ${
                          isActive ? quickFilterButtonActiveClass : ""
                        }`}
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
                    <MusicListShell title={null}>
                      {filteredSongs.map((song, index) => (
                        <SongCard
                          key={song.id}
                          song={song}
                          isFirst={index === 0}
                          isLast={index === filteredSongs.length - 1}
                          showDivider={false}
                          showEditPointMarkers={showEditPointMarkers}
                        />
                      ))}
                    </MusicListShell>
                  )}
                </section>
              </div>
            </div>
          )}
        </div>

        {!loading && (
          <div
            className="playlist-detail-footer-shell"
            style={{ paddingBottom: playerVisible ? "72px" : "8px" }}
          >
            <Footer />
          </div>
        )}
      </main>
    </>
  );
}
