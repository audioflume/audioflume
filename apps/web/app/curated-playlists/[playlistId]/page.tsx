"use client";

import { MusicListShell } from "@filmwave/shared";
import Link from "next/link";
import Footer from "@/components/Footer";
import RecentPlaylistTracker from "@/components/RecentPlaylistTracker";
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
import { useUserPreferences } from "@/context/UserPreferencesContext";
import type { CuratedPlaylist, CuratedPlaylistSong } from "@/lib/curatedPlaylists";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import artistDrawerStyles from "@/components/artists/PublicArtistCollectionDrawer.module.css";
import "@/app/music/music-library-redesign.css";
import "@/app/playlist-detail-unified.css";
import "./curated-playlist-detail.css";

const QUICK_FILTERS = [
  { label: "Default", value: "default" },
  { label: "Alphabetical", value: "alphabetical" },
  { label: "Liked", value: "liked" },
] as const;

const FALLBACK_BACKGROUND =
  "linear-gradient(135deg,#372f4f 0%,#111111 48%,#75649a 100%)";

type QuickFilterValue = (typeof QUICK_FILTERS)[number]["value"];
type SimilarSoundTag = {
  type: "genre" | "mood";
  value: string;
};

function BookmarkGlyph({ filled }: { filled: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M5.5 3.25h9v13.5L10 14l-4.5 2.75V3.25Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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

function NortheastArrowGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 17L17 7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M9 7H17V15"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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

function getTopSimilarSoundTags(songs: CuratedPlaylistSong[]) {
  const counts = new Map<string, { tag: SimilarSoundTag; count: number }>();

  songs.forEach((song) => {
    song.genres.forEach((genre) => {
      const value = genre.trim();
      if (!value) return;
      const key = `genre:${value.toLowerCase()}`;
      const current = counts.get(key);
      counts.set(key, {
        tag: current?.tag ?? { type: "genre", value },
        count: (current?.count ?? 0) + 1,
      });
    });

    song.moods.forEach((mood) => {
      const value = mood.trim();
      if (!value) return;
      const key = `mood:${value.toLowerCase()}`;
      const current = counts.get(key);
      counts.set(key, {
        tag: current?.tag ?? { type: "mood", value },
        count: (current?.count ?? 0) + 1,
      });
    });
  });

  return [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map(({ tag }) => tag);
}

function buildSimilarSoundsHref(tags: SimilarSoundTag[]) {
  if (tags.length === 0) return "/music";

  const params = new URLSearchParams();
  tags.forEach((tag) => params.append(tag.type, tag.value));
  return `/music?${params.toString()}`;
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
  const [savingToPlaylists, setSavingToPlaylists] = useState(false);
  const [savedPlaylistId, setSavedPlaylistId] = useState<number | string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const savedToPlaylists = savedPlaylistId !== null;

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
          setSavedPlaylistId(null);
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

    return result;
  }, [searchedSongs, quickFilter, favoriteIdSet]);

  const topGenres = useMemo(() => getTopGenres(songs), [songs]);
  const similarSoundTags = useMemo(() => getTopSimilarSoundTags(songs), [songs]);
  const similarSoundsHref = useMemo(
    () => buildSimilarSoundsHref(similarSoundTags),
    [similarSoundTags],
  );

  useEffect(() => {
    setQueue(filteredSongs.filter((song) => song.audioUrl));
  }, [filteredSongs, setQueue]);

  function playFirstSong() {
    const button = document.querySelector<HTMLButtonElement>(
      '[aria-label="Play song"], [aria-label="Pause song"]',
    );
    button?.click();
  }

  function showToast(message: string) {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 1800);
  }

  async function sharePlaylist() {
    if (!playlist) return;
    const url = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({ title: playlist.name, url });
        showToast("Playlist shared");
        return;
      }
      if (!navigator.clipboard) {
        throw new Error("Clipboard unavailable");
      }
      await navigator.clipboard.writeText(url);
      showToast("Playlist link copied");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      showToast("Could not share playlist");
    }
  }

  async function toggleMyPlaylistsSave() {
    if (!playlist || savingToPlaylists) return;

    setSavingToPlaylists(true);

    try {
      if (savedPlaylistId !== null) {
        const removeRes = await fetch(
          `/api/playlists/${encodeURIComponent(String(savedPlaylistId))}`,
          { method: "DELETE" },
        );
        const removeData = await removeRes.json().catch(() => null);

        if (!removeRes.ok) {
          throw new Error(removeData?.error || "Failed to remove playlist");
        }

        setSavedPlaylistId(null);
        showToast(`"${playlist.name}" removed from My Playlists`);
        return;
      }

      const createRes = await fetch("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: playlist.name,
          cover_image_url: playlist.cover_image_url ?? null,
          position: 0,
        }),
      });
      const newPlaylist = await createRes.json().catch(() => null);

      if (!createRes.ok || !newPlaylist?.id) {
        throw new Error(newPlaylist?.error || "Failed to create playlist");
      }

      for (let index = 0; index < songs.length; index += 1) {
        const song = songs[index];
        const songId = song.song_id ?? song.id;
        if (!songId) continue;

        try {
          await fetch(`/api/playlists/${newPlaylist.id}/songs`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ song_id: songId, position: index }),
          });
        } catch (songError) {
          console.warn(`Error adding song ${songId}:`, songError);
        }
      }

      setSavedPlaylistId(newPlaylist.id);
      showToast(`"${playlist.name}" added to My Playlists`);
    } catch (saveError) {
      showToast(
        saveError instanceof Error ? saveError.message : "Failed to update playlist",
      );
    } finally {
      setSavingToPlaylists(false);
    }
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
                  onChange={(event) => setSearch(event.target.value)}
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
                shuffleActive={false}
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
                onRemoveShuffle={() => {}}
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

                    <button
                      type="button"
                      onClick={playFirstSong}
                      disabled={filteredSongs.length === 0}
                      className="playlist-detail-cover-play-button"
                      aria-label={`Play ${playlist?.name || "playlist"}`}
                    >
                      <PlayIconSmall size={18} />
                    </button>
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
                        onClick={() => void toggleMyPlaylistsSave()}
                        disabled={savingToPlaylists}
                        className={artistDrawerStyles.roundAction}
                        aria-label={
                          savedToPlaylists
                            ? `Remove ${playlist?.name || "playlist"} from My Playlists`
                            : `Save ${playlist?.name || "playlist"} to My Playlists`
                        }
                        aria-pressed={savedToPlaylists}
                      >
                        <BookmarkGlyph filled={savedToPlaylists} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void sharePlaylist()}
                        className={artistDrawerStyles.roundAction}
                        aria-label={`Share ${playlist?.name || "playlist"}`}
                      >
                        <ShareGlyph />
                      </button>
                    </div>

                    <div className="playlist-detail-hero-secondary-actions">
                      <Link
                        href={similarSoundsHref}
                        className="playlist-detail-hero-secondary-action playlist-detail-explore-similar-action"
                      >
                        Explore Similar Sounds
                        <NortheastArrowGlyph />
                      </Link>
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

      <Toast
        message={toastMessage}
        bottomOffset={currentSong ? "88px" : "24px"}
      />
    </>
  );
}
