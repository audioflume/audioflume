"use client";

import { MusicListShell } from "@filmwave/shared";
import Link from "next/link";
import Footer from "@/components/Footer";
import PlaylistDetailBackdropEnhancer from "@/components/PlaylistDetailBackdropEnhancer";
import SkeletonSongList from "@/components/SkeletonSongCard";
import SongCard from "@/components/SongCard";
import Toast from "@/components/Toast";
import FilterTags from "@/components/FilterTags";
import PauseIcon from "@/components/icons/PauseIcon";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import SearchIcon from "@/components/icons/SearchIcon";
import {
  quickFilterButtonActiveClass,
  quickFilterButtonClass,
} from "@/components/uiClasses";
import { useFavorites } from "@/context/FavoritesContext";
import { usePlayer } from "@/context/PlayerContext";
import { useUserPreferences } from "@/context/UserPreferencesContext";
import type { PublicArtistRelease } from "@/lib/publicArtist";
import type { Song } from "@/lib/types";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import artistDrawerStyles from "@/components/artists/PublicArtistCollectionDrawer.module.css";
import "@/app/music/music-library-redesign.css";
import "@/app/playlist-detail-unified.css";
import "@/app/curated-playlists/[playlistId]/curated-playlist-detail.css";

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

type AlbumPayload = {
  collection?: PublicArtistRelease;
  songs?: Song[];
  all_songs?: Song[];
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

function AlbumDetailSkeleton() {
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

function formatTrackCount(count: number) {
  return `${count} track${count === 1 ? "" : "s"}`;
}

function formatReleaseYear(value: string | null) {
  if (!value) return null;
  return value.match(/^(\d{4})/)?.[1] ?? null;
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

function getTopSimilarSoundTags(songs: Song[]) {
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

export default function AlbumDetailPage() {
  const params = useParams();
  const artistSlug = String(params.slug || "");
  const releaseId = String(params.releaseId || "");
  const { currentSong, isPlaying, setQueue, togglePlayPause } = usePlayer();
  const { favoriteIdSet } = useFavorites();
  const { showEditPointMarkers, setShowEditPointMarkers } = useUserPreferences();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [album, setAlbum] = useState<PublicArtistRelease | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilterValue>("default");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAlbum() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/public/artists/${encodeURIComponent(
            artistSlug,
          )}/collection?kind=release&id=${encodeURIComponent(releaseId)}`,
          { cache: "no-store" },
        );
        const payload = (await response.json().catch(() => null)) as
          | AlbumPayload
          | null;

        if (!response.ok || !payload?.collection) {
          throw new Error(payload?.error || "Failed to load album");
        }
        if (payload.collection.release_type !== "album") {
          throw new Error("Album not found");
        }

        if (!cancelled) {
          setAlbum(payload.collection);
          setSongs(Array.isArray(payload.songs) ? payload.songs : []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setAlbum(null);
          setSongs([]);
          setError(
            loadError instanceof Error ? loadError.message : "Failed to load album",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (artistSlug && releaseId) void loadAlbum();
    return () => {
      cancelled = true;
    };
  }, [artistSlug, releaseId]);

  const searchedSongs = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return songs;

    return songs.filter((song) =>
      [
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
        .toLowerCase()
        .includes(query),
    );
  }, [search, songs]);

  const filteredSongs = useMemo(() => {
    if (quickFilter === "liked") {
      return searchedSongs.filter((song) => favoriteIdSet.has(song.id));
    }

    if (quickFilter === "alphabetical") {
      return [...searchedSongs].sort((a, b) =>
        a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
      );
    }

    return searchedSongs;
  }, [favoriteIdSet, quickFilter, searchedSongs]);

  const topGenres = useMemo(() => getTopGenres(songs), [songs]);
  const similarSoundTags = useMemo(() => getTopSimilarSoundTags(songs), [songs]);
  const similarSoundsHref = useMemo(
    () => buildSimilarSoundsHref(similarSoundTags),
    [similarSoundTags],
  );
  const releaseYear = formatReleaseYear(album?.release_date ?? null);
  const artistName = songs[0]?.artist || null;
  const currentSongInAlbum = Boolean(
    currentSong && songs.some((song) => song.id === currentSong.id),
  );
  const albumIsPlaying = currentSongInAlbum && isPlaying;

  useEffect(() => {
    setQueue(filteredSongs.filter((song) => song.audioUrl));
  }, [filteredSongs, setQueue]);

  function playFirstSong() {
    const firstSongButton = document.querySelector<HTMLButtonElement>(
      '[aria-label="Play song"], [aria-label="Pause song"]',
    );
    firstSongButton?.click();
  }

  function toggleCoverPlayback() {
    if (albumIsPlaying && currentSong) {
      togglePlayPause(currentSong);
      return;
    }
    playFirstSong();
  }

  function showToast(message: string) {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 1800);
  }

  async function shareAlbum() {
    if (!album) return;
    const url = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({ title: album.title, url });
        showToast("Album shared");
        return;
      }
      if (!navigator.clipboard) {
        throw new Error("Clipboard unavailable");
      }
      await navigator.clipboard.writeText(url);
      showToast("Album link copied");
    } catch (shareError) {
      if (shareError instanceof Error && shareError.name === "AbortError") return;
      showToast("Could not share album");
    }
  }

  const stageStyle = album?.cover_image_url
    ? { backgroundImage: `url(${JSON.stringify(album.cover_image_url)})` }
    : { background: FALLBACK_BACKGROUND };

  return (
    <>
      <PlaylistDetailBackdropEnhancer />

      <main className="playlist-detail-page album-detail-page">
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
                  placeholder="Search Album"
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
            <AlbumDetailSkeleton />
          ) : error || !album ? (
            <div className="playlist-detail-card">
              <div className="playlist-detail-card-inner">
                <div className="playlist-detail-empty">
                  <h2>Couldn&apos;t load album</h2>
                  <p>{error || "The album could not be found."}</p>
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
                      background: album.cover_image_url
                        ? "var(--bg-tertiary)"
                        : FALLBACK_BACKGROUND,
                    }}
                  >
                    {album.cover_image_url && (
                      <img src={album.cover_image_url} alt={album.title} />
                    )}

                    <button
                      type="button"
                      onClick={toggleCoverPlayback}
                      disabled={filteredSongs.length === 0}
                      className="playlist-detail-cover-play-button"
                      aria-label={`${albumIsPlaying ? "Pause" : "Play"} ${album.title}`}
                    >
                      {albumIsPlaying ? (
                        <PauseIcon size={18} />
                      ) : (
                        <PlayIconSmall size={18} />
                      )}
                    </button>
                  </div>

                  <div className="min-w-0">
                    <span className="playlist-detail-kicker">Album</span>
                    <h1 className="playlist-detail-title">{album.title}</h1>
                    <p className="playlist-detail-meta">
                      {artistName && <span>{artistName}</span>}
                      {artistName && <span className="playlist-detail-dot">·</span>}
                      <span>{formatTrackCount(songs.length)}</span>
                      {releaseYear && (
                        <>
                          <span className="playlist-detail-dot">·</span>
                          <span>{releaseYear}</span>
                        </>
                      )}
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
                        onClick={() => void shareAlbum()}
                        className={artistDrawerStyles.roundAction}
                        aria-label={`Share ${album.title}`}
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
                    const active = quickFilter === filter.value;
                    return (
                      <button
                        key={filter.value}
                        type="button"
                        onClick={() => setQuickFilter(filter.value)}
                        className={`${quickFilterButtonClass} ${
                          active ? quickFilterButtonActiveClass : ""
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
                      <h2>No tracks yet</h2>
                      <p>This album doesn&apos;t have any published tracks yet.</p>
                    </div>
                  ) : filteredSongs.length === 0 ? (
                    <div className="playlist-detail-empty">
                      <h2>No tracks found</h2>
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
            style={{ paddingBottom: currentSong ? "72px" : "8px" }}
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
