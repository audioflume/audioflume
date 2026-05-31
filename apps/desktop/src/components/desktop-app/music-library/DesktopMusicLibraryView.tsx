import {
  EDIT_POINT_FILTER_OPTIONS,
  FilterTrigger,
  getMusicLibrarySearchPlaceholder,
  isCoreEditPointType,
  MusicBpmFilter,
  MusicDurationFilter,
  MusicKeyFilter,
  MusicPlaylistFilter,
  normalizeEditPointType,
  SearchFilterChrome,
  SearchFilterInput,
  SearchFilterQuickButton,
} from "@filmwave/shared";
import { exists } from "@tauri-apps/plugin-fs";
import { load } from "@tauri-apps/plugin-store";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CheckIcon from "../../icons/CheckIcon";
import PlaylistIcon from "../../icons/PlaylistIcon";
import PlusIcon from "../../icons/PlusIcon";
import SearchIconSmall from "../../icons/SearchIconSmall";
import {
  desktopSongs,
  getFilmwaveSongs,
  type DesktopSong,
} from "../../../lib/desktopSongs";
import {
  getMusicLibrarySyncedSongPath,
  syncSongToMusicLibraryFolder,
} from "../../../lib/musicLibrarySync";
import DesktopFilterDropdown from "./DesktopFilterDropdown";
import DesktopFilterTags from "./DesktopFilterTags";
import DesktopMusicPlayer, { type DesktopMusicPlayerSeekRequest } from "./DesktopMusicPlayer";
import DesktopSongCard from "./DesktopSongCard";
import type { DesktopMusicFilterKey, DesktopMusicFilterState } from "./musicLibraryTypes";
import {
  EMPTY_FILTERS,
  FILTER_TITLES,
  QUICK_GENRES,
  filterDesktopMusicSongs,
  getDesktopMusicFilterOptions,
  getDesktopPlaylistFilterOptions,
  shuffleDesktopMusicSongs,
} from "./musicLibraryUtils";
import "./DesktopMusicLibraryView.css";
import "./DesktopMusicLibraryRefinements.css";
import "./DesktopMusicLibrarySpacing.css";

const SETTINGS_STORE = "filmwave-settings.json";
const TRACK_SCROLL_TOP_PADDING = 112;
const TRACK_SCROLL_BOTTOM_PADDING = 104;

type SongSyncStatus = "idle" | "syncing" | "synced" | "error";

type DesktopPlaybackProgress = {
  songId: string | null;
  currentTime: number;
  duration: number;
};

function shouldIgnorePlaybackShortcutTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  const tagName = target.tagName.toLowerCase();

  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    target.isContentEditable
  );
}

export default function DesktopMusicLibraryView({
  apiBaseUrl,
  syncFolder,
}: {
  apiBaseUrl?: string | null;
  syncFolder?: string | null;
}) {
  const [songs, setSongs] = useState<DesktopSong[]>([]);
  const [songsLoading, setSongsLoading] = useState(true);
  const [songsError, setSongsError] = useState<string | null>(null);
  const [filters, setFilters] = useState<DesktopMusicFilterState>(EMPTY_FILTERS);
  const [openDropdown, setOpenDropdown] = useState<DesktopMusicFilterKey | null>(null);
  const [shuffleOrderIds, setShuffleOrderIds] = useState<string[] | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => new Set());
  const [activeSongId, setActiveSongId] = useState<string | null>(null);
  const [playerPlaying, setPlayerPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState<DesktopPlaybackProgress>({
    songId: null,
    currentTime: 0,
    duration: 0,
  });
  const [seekRequest, setSeekRequest] = useState<DesktopMusicPlayerSeekRequest | null>(null);
  const [savedSyncFolder, setSavedSyncFolder] = useState<string | null>(syncFolder ?? null);
  const [syncingSongIds, setSyncingSongIds] = useState<Set<string>>(() => new Set());
  const [syncedSongPaths, setSyncedSongPaths] = useState<Record<string, string>>({});
  const [syncErrorSongIds, setSyncErrorSongIds] = useState<Set<string>>(() => new Set());
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const songCardRefs = useRef(new Map<string, HTMLElement>());
  const seekRequestIdRef = useRef(0);
  const scrollRequestedSongIdRef = useRef<string | null>(null);
  const effectiveSyncFolder = syncFolder ?? savedSyncFolder;

  useEffect(() => {
    if (syncFolder) setSavedSyncFolder(syncFolder);
  }, [syncFolder]);

  useEffect(() => {
    let cancelled = false;

    async function loadSavedSyncFolder() {
      if (syncFolder) return;

      const store = await load(SETTINGS_STORE);
      const nextSyncFolder = await store.get<string>("syncFolder");

      if (!cancelled && nextSyncFolder) setSavedSyncFolder(nextSyncFolder);
    }

    void loadSavedSyncFolder();

    return () => {
      cancelled = true;
    };
  }, [syncFolder]);

  useEffect(() => {
    let cancelled = false;

    async function loadSongs() {
      setSongsLoading(true);
      setSongsError(null);

      try {
        const realSongs = await getFilmwaveSongs(apiBaseUrl);
        if (cancelled) return;
        setSongs(realSongs);
        setFavoriteIds(
          (current) =>
            new Set(
              [...current].filter((songId) =>
                realSongs.some((song) => song.id === songId),
              ),
            ),
        );
      } catch (error) {
        console.error(error);
        if (cancelled) return;
        setSongs(desktopSongs);
        setSongsError(
          error instanceof Error ? error.message : "Could not load Filmwave songs.",
        );
      } finally {
        if (!cancelled) setSongsLoading(false);
      }
    }

    void loadSongs();

    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl]);

  useEffect(() => {
    let cancelled = false;

    async function loadSyncedSongs() {
      if (!effectiveSyncFolder || songs.length === 0) {
        setSyncedSongPaths({});
        return;
      }

      const nextSyncedSongPaths: Record<string, string> = {};

      await Promise.all(
        songs.map(async (song) => {
          const localPath = getMusicLibrarySyncedSongPath({ song, syncFolder: effectiveSyncFolder });

          if (await exists(localPath)) {
            nextSyncedSongPaths[song.id] = localPath;
          }
        }),
      );

      if (!cancelled) setSyncedSongPaths(nextSyncedSongPaths);
    }

    void loadSyncedSongs();

    return () => {
      cancelled = true;
    };
  }, [songs, effectiveSyncFolder]);

  const filterOptions = useMemo(() => getDesktopMusicFilterOptions(), []);
  const playlistOptions = useMemo(() => getDesktopPlaylistFilterOptions(songs), [songs]);

  const filteredSongs = useMemo(
    () => filterDesktopMusicSongs(songs, filters),
    [songs, filters],
  );

  const displayedSongs = useMemo(() => {
    if (!shuffleOrderIds) return filteredSongs;

    const orderMap = new Map(shuffleOrderIds.map((songId, index) => [songId, index]));

    return [...filteredSongs].sort((a, b) => {
      const aOrder = orderMap.get(a.id);
      const bOrder = orderMap.get(b.id);

      if (aOrder === undefined && bOrder === undefined) return 0;
      if (aOrder === undefined) return 1;
      if (bOrder === undefined) return -1;

      return aOrder - bOrder;
    });
  }, [filteredSongs, shuffleOrderIds]);

  const activeSong = useMemo(
    () => songs.find((song) => song.id === activeSongId) ?? null,
    [activeSongId, songs],
  );

  const activeSongIndex = useMemo(
    () => displayedSongs.findIndex((song) => song.id === activeSongId),
    [activeSongId, displayedSongs],
  );

  const filterKeys = (Object.keys(FILTER_TITLES) as DesktopMusicFilterKey[]).filter(
    (filterKey) => filterKey !== "cuePoint",
  );
  const selectedCoreCuePointTypes = filters.cuePoint
    .map(normalizeEditPointType)
    .filter(isCoreEditPointType);
  const searchPlaceholder = getMusicLibrarySearchPlaceholder(filters.selectedPlaylist?.name);

  useEffect(() => {
    setPlaybackProgress({
      songId: activeSongId,
      currentTime: 0,
      duration: activeSong?.durationSeconds || 0,
    });
  }, [activeSongId, activeSong?.durationSeconds]);

  useEffect(() => {
    const songId = scrollRequestedSongIdRef.current;
    if (!songId || songId !== activeSongId) return;

    scrollRequestedSongIdRef.current = null;

    window.requestAnimationFrame(() => {
      const card = songCardRefs.current.get(songId);
      if (!card) return;

      const rect = card.getBoundingClientRect();
      const visibleTop = TRACK_SCROLL_TOP_PADDING;
      const visibleBottom = window.innerHeight - TRACK_SCROLL_BOTTOM_PADDING;

      if (rect.top >= visibleTop && rect.bottom <= visibleBottom) return;

      card.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }, [activeSongId]);

  function setFilterValue(key: DesktopMusicFilterKey, value: string) {
    setFilters((current) => ({
      ...current,
      [key]: current[key].includes(value)
        ? current[key].filter((item) => item !== value)
        : [...current[key], value],
    }));
  }

  function removeFilterValue(key: DesktopMusicFilterKey, value: string) {
    setFilters((current) => ({
      ...current,
      [key]: current[key].filter((item) => item !== value),
    }));
  }

  function toggleShuffle() {
    const nextOrder = shuffleDesktopMusicSongs(filteredSongs).map((song) => song.id);
    setShuffleOrderIds(nextOrder);
    setFilters((current) => ({ ...current, shuffle: true }));
  }

  function removeShuffle() {
    setShuffleOrderIds(null);
    setFilters((current) => ({ ...current, shuffle: false }));
  }

  function toggleFavorite(songId: string) {
    setFavoriteIds((current) => {
      const next = new Set(current);
      if (next.has(songId)) next.delete(songId);
      else next.add(songId);
      return next;
    });
  }

  function getSongSyncStatus(songId: string): SongSyncStatus {
    if (syncingSongIds.has(songId)) return "syncing";
    if (syncedSongPaths[songId]) return "synced";
    if (syncErrorSongIds.has(songId)) return "error";
    return "idle";
  }

  async function syncSong(song: DesktopSong) {
    if (!effectiveSyncFolder || syncingSongIds.has(song.id) || syncedSongPaths[song.id]) return;

    setSyncingSongIds((current) => new Set(current).add(song.id));
    setSyncErrorSongIds((current) => {
      const next = new Set(current);
      next.delete(song.id);
      return next;
    });

    try {
      const localPath = await syncSongToMusicLibraryFolder({ song, syncFolder: effectiveSyncFolder });
      setSyncedSongPaths((current) => ({ ...current, [song.id]: localPath }));
    } catch (error) {
      console.error(error);
      setSyncErrorSongIds((current) => new Set(current).add(song.id));
    } finally {
      setSyncingSongIds((current) => {
        const next = new Set(current);
        next.delete(song.id);
        return next;
      });
    }
  }

  function playSong(song: DesktopSong) {
    if (activeSongId === song.id) {
      setPlayerPlaying((playing) => !playing);
      return;
    }

    setActiveSongId(song.id);
    setPlayerPlaying(true);
  }

  function seekSong(song: DesktopSong, progress: number) {
    const shouldPlay = activeSongId === song.id ? playerPlaying : playerPlaying;
    const safeProgress = Number.isFinite(progress)
      ? Math.max(0, Math.min(1, progress))
      : 0;
    const duration = song.durationSeconds || 0;

    if (activeSongId !== song.id) {
      setActiveSongId(song.id);
    }

    setPlayerPlaying(shouldPlay);
    setPlaybackProgress({
      songId: song.id,
      currentTime: duration * safeProgress,
      duration,
    });
    setSeekRequest({
      id: ++seekRequestIdRef.current,
      songId: song.id,
      progress: safeProgress,
      shouldPlay,
    });
  }

  const playSongAtIndex = useCallback((index: number, shouldPlay = playerPlaying) => {
    if (!displayedSongs.length) return;

    if (index < 0 || index >= displayedSongs.length) {
      setPlayerPlaying(false);
      return;
    }

    const nextSong = displayedSongs[index];

    scrollRequestedSongIdRef.current = nextSong.id;
    setActiveSongId(nextSong.id);
    setPlayerPlaying(shouldPlay);
  }, [displayedSongs, playerPlaying]);

  const playPreviousSong = useCallback(() => {
    if (activeSongIndex === -1) return;
    playSongAtIndex(activeSongIndex - 1);
  }, [activeSongIndex, playSongAtIndex]);

  const playNextSong = useCallback(() => {
    if (activeSongIndex === -1) {
      playSongAtIndex(0);
      return;
    }

    playSongAtIndex(activeSongIndex + 1);
  }, [activeSongIndex, playSongAtIndex]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (shouldIgnorePlaybackShortcutTarget(event.target)) return;

      if (event.code === "Space") {
        if (!activeSongId) return;
        event.preventDefault();
        setPlayerPlaying((playing) => !playing);
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        playNextSong();
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        playPreviousSong();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeSongId, playNextSong, playPreviousSong]);

  function getSongPlaybackProgress(songId: string) {
    if (playbackProgress.songId !== songId || playbackProgress.duration <= 0) return 0;

    return Math.max(
      0,
      Math.min(1, playbackProgress.currentTime / playbackProgress.duration),
    );
  }

  return (
    <section className={`desktop-music-page${activeSong ? " has-player" : ""}`}>
      <SearchFilterChrome
        onSearchRowClick={() => searchInputRef.current?.focus()}
        search={
          <SearchFilterInput
            icon={<SearchIconSmall />}
            inputRef={searchInputRef}
            value={filters.search}
            placeholder={searchPlaceholder}
            onChange={(event) =>
              setFilters((current) => ({ ...current, search: event.target.value }))
            }
          />
        }
        tags={
          <DesktopFilterTags
            filters={filters}
            onRemoveFilter={removeFilterValue}
            onRemovePlaylist={() =>
              setFilters((current) => ({ ...current, selectedPlaylist: null }))
            }
            onRemoveBpm={() =>
              setFilters((current) => ({ ...current, bpmValue: null }))
            }
            onRemoveKey={() =>
              setFilters((current) => ({ ...current, keyValue: null }))
            }
            onRemoveDuration={() =>
              setFilters((current) => ({ ...current, selectedDurations: [] }))
            }
            onRemoveShuffle={removeShuffle}
          />
        }
        filters={
          <>
            <MusicPlaylistFilter
              selected={filters.selectedPlaylist}
              playlists={playlistOptions}
              loading={songsLoading}
              loaded={!songsLoading}
              playlistIcon={<PlaylistIcon size={13} />}
              checkIcon={<CheckIcon size={11} />}
              plusIcon={<PlusIcon size={11} />}
              onChange={(selectedPlaylist) =>
                setFilters((current) => ({ ...current, selectedPlaylist }))
              }
            />

            {filterKeys.map((filterKey) => (
              <DesktopFilterDropdown
                key={filterKey}
                filterKey={filterKey}
                label={FILTER_TITLES[filterKey]}
                options={filterOptions[filterKey]}
                selected={filters[filterKey]}
                open={openDropdown === filterKey}
                onOpenChange={(open) => setOpenDropdown(open ? filterKey : null)}
                onToggleOption={(value) => setFilterValue(filterKey, value)}
              />
            ))}

            <MusicBpmFilter
              value={filters.bpmValue}
              onChange={(bpmValue) =>
                setFilters((current) => ({ ...current, bpmValue }))
              }
            />

            <MusicKeyFilter
              value={filters.keyValue}
              onChange={(keyValue) =>
                setFilters((current) => ({ ...current, keyValue }))
              }
            />

            <MusicDurationFilter
              selected={filters.selectedDurations}
              onChange={(selectedDurations) =>
                setFilters((current) => ({ ...current, selectedDurations }))
              }
            />

            <DesktopFilterDropdown
              filterKey="cuePoint"
              label={FILTER_TITLES.cuePoint}
              options={filterOptions.cuePoint}
              selected={filters.cuePoint}
              open={openDropdown === "cuePoint"}
              onOpenChange={(open) => setOpenDropdown(open ? "cuePoint" : null)}
              onToggleOption={(value) => setFilterValue("cuePoint", value)}
            />

            <FilterTrigger
              label="Markers"
              active={filters.markers}
              showActiveDot
              hideChevron
              onClick={() =>
                setFilters((current) => ({ ...current, markers: !current.markers }))
              }
            />

            <button
              type="button"
              className={`desktop-shuffle-button${filters.shuffle ? " is-active" : ""}`}
              onClick={toggleShuffle}
              aria-label="Shuffle songs"
              aria-pressed={filters.shuffle}
            >
              <ShuffleIcon />
            </button>
          </>
        }
        quickFilters={
          <>
            {QUICK_GENRES.map((genre) => {
              const active = filters.genre.includes(genre);

              return (
                <SearchFilterQuickButton
                  key={genre}
                  active={active}
                  onClick={() => setFilterValue("genre", genre)}
                >
                  {genre}
                </SearchFilterQuickButton>
              );
            })}
          </>
        }
      />

      {songsError && (
        <div className="desktop-music-load-notice">
          Could not load live songs. Showing sample tracks. {songsError}
        </div>
      )}

      <div className="desktop-music-list">
        {songsLoading && (
          <div className="desktop-music-empty-state">
            <h3>Loading music library</h3>
            <p>Fetching published Filmwave songs from the website.</p>
          </div>
        )}

        {!songsLoading &&
          displayedSongs.map((song) => (
            <DesktopSongCard
              key={song.id}
              song={song}
              favorite={favoriteIds.has(song.id)}
              markersVisible={filters.markers}
              selectedCuePointTypes={selectedCoreCuePointTypes}
              isPlaying={activeSongId === song.id && playerPlaying}
              playbackProgress={getSongPlaybackProgress(song.id)}
              syncStatus={getSongSyncStatus(song.id)}
              syncedPath={syncedSongPaths[song.id] ?? null}
              cardRef={(node) => {
                if (node) songCardRefs.current.set(song.id, node);
                else songCardRefs.current.delete(song.id);
              }}
              onFavoriteToggle={() => toggleFavorite(song.id)}
              onPlay={() => playSong(song)}
              onSeek={(progress) => seekSong(song, progress)}
              onSync={() => syncSong(song)}
            />
          ))}

        {!songsLoading && displayedSongs.length === 0 && (
          <div className="desktop-music-empty-state">
            <h3>No songs found</h3>
            <p>Clear a filter or search for a different cue.</p>
          </div>
        )}
      </div>

      {activeSong && (
        <DesktopMusicPlayer
          song={activeSong}
          isPlaying={playerPlaying}
          favorite={favoriteIds.has(activeSong.id)}
          markersVisible={filters.markers}
          selectedCuePointTypes={selectedCoreCuePointTypes}
          seekRequest={seekRequest}
          onMarkersVisibleChange={(visible) =>
            setFilters((current) => ({ ...current, markers: visible }))
          }
          onFavoriteToggle={() => toggleFavorite(activeSong.id)}
          onPlayPause={() => setPlayerPlaying((playing) => !playing)}
          onPrevious={playPreviousSong}
          onNext={playNextSong}
          onProgressChange={setPlaybackProgress}
        />
      )}
    </section>
  );
}

function ShuffleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      fill="currentColor"
      viewBox="0 0 16 16"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M0 3.5A.5.5 0 0 1 .5 3H1c2.202 0 3.827 1.24 4.874 2.418.49.552.865 1.102 1.126 1.532.260-.43.636-.98 1.126-1.532C9.173 4.24 10.798 3 13 3v1c-1.798 0-3.173 1.01-4.126 2.082A9.6 9.6 0 0 0 7.556 8a9.6 9.6 0 0 0 1.317 1.918C9.828 10.99 11.204 12 13 12v1c-2.202 0-3.827-1.24-4.874-2.418A10.6 10.6 0 0 1 7 9.05c-.26.43-.636.98-1.126 1.532C4.827 11.76 3.202 13 1 13H.5a.5.5 0 0 1 0-1H1c1.798 0 3.173-1.01 4.126-2.082A9.6 9.6 0 0 0 6.444 8a9.6 9.6 0 0 0-1.317-1.918C4.172 5.01 2.796 4 1 4H.5a.5.5 0 0 1-.5-.5"
      />
      <path d="M13 5.466V1.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384l-2.36 1.966a.25.25 0 0 1-.41-.192m0 9v-3.932a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384l-2.36 1.966a.25.25 0 0 1-.41-.192" />
    </svg>
  );
}
