import {
  EDIT_POINT_FILTER_OPTIONS,
  FilterTrigger,
  MusicLibraryEmptyState,
  MusicLibraryLoadNotice,
  MusicLibrarySkeletonList,
  MusicShuffleButton,
  clampPlaybackProgress,
  getAdjacentTrackIndex,
  getMusicLibrarySearchPlaceholder,
  getPlaybackShortcutAction,
  getProgressFromTime,
  getSeekTimeFromProgress,
  isCoreEditPointType,
  MusicBpmFilter,
  MusicDurationFilter,
  MusicKeyFilter,
  MusicPlaylistFilter,
  normalizeEditPointType,
  SearchFilterChrome,
  SearchFilterInput,
  SearchFilterQuickButton,
  shouldClearPendingSeekProgress,
  shouldIgnorePlaybackShortcutTarget,
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
const TRACK_SCROLL_EDGE_PADDING = 12;

type SongSyncStatus = "idle" | "syncing" | "synced" | "error";

type DesktopPlaybackProgress = {
  songId: string | null;
  currentTime: number;
  duration: number;
};

function getScrollContainer(element: HTMLElement) {
  let parent = element.parentElement;

  while (parent) {
    const style = window.getComputedStyle(parent);
    const overflowY = style.overflowY;
    const canScroll =
      (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") &&
      parent.scrollHeight > parent.clientHeight;

    if (canScroll) return parent;

    parent = parent.parentElement;
  }

  return null;
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
  const [pendingSeekProgressBySongId, setPendingSeekProgressBySongId] = useState<Record<string, number>>({});
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
    const duration = activeSong?.durationSeconds || 0;
    const pendingSeekProgress = activeSongId ? pendingSeekProgressBySongId[activeSongId] : undefined;
    const activeSeekRequest = seekRequest?.songId === activeSongId ? seekRequest : null;
    const progress = pendingSeekProgress ?? activeSeekRequest?.progress;

    setPlaybackProgress({
      songId: activeSongId,
      currentTime: progress !== undefined ? getSeekTimeFromProgress(progress, duration) : 0,
      duration,
    });
  }, [activeSongId, activeSong?.durationSeconds, pendingSeekProgressBySongId, seekRequest]);

  useEffect(() => {
    const songId = scrollRequestedSongIdRef.current;
    if (!songId || songId !== activeSongId) return;

    scrollRequestedSongIdRef.current = null;

    window.requestAnimationFrame(() => {
      const card = songCardRefs.current.get(songId);
      if (!card) return;

      const scrollContainer = getScrollContainer(card);
      const rect = card.getBoundingClientRect();
      const containerRect = scrollContainer?.getBoundingClientRect();
      const searchFilter = document.querySelector<HTMLElement>(".filmwave-search-filter-sticky");
      const player = document.querySelector<HTMLElement>(".desktop-music-player");
      const searchFilterRect = searchFilter?.getBoundingClientRect();
      const playerRect = player?.getBoundingClientRect();
      const visibleTop = Math.max(
        (containerRect?.top ?? 0) + TRACK_SCROLL_EDGE_PADDING,
        (searchFilterRect?.bottom ?? 0) + TRACK_SCROLL_EDGE_PADDING,
      );
      const visibleBottom = Math.min(
        (containerRect?.bottom ?? window.innerHeight) - TRACK_SCROLL_EDGE_PADDING,
        (playerRect?.top ?? window.innerHeight) - TRACK_SCROLL_EDGE_PADDING,
      );

      if (rect.top >= visibleTop && rect.bottom <= visibleBottom) return;

      const scrollDelta = rect.top < visibleTop
        ? rect.top - visibleTop
        : rect.bottom - visibleBottom;

      if (scrollContainer) {
        scrollContainer.scrollBy({ top: scrollDelta, behavior: "smooth" });
        return;
      }

      window.scrollBy({ top: scrollDelta, behavior: "smooth" });
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
    }
  }

  const activeSyncStatus = activeSongId ? getSongSyncStatus(activeSongId) : "idle";

  function handleSongPlay(song: DesktopSong) {
    if (activeSongId === song.id) {
      setPlayerPlaying((current) => !current);
      return;
    }

    setActiveSongId(song.id);
    setPendingSeekProgressBySongId((current) => {
      const next = { ...current };
      delete next[song.id];
      return next;
    });
    setPlayerPlaying(true);
    scrollRequestedSongIdRef.current = song.id;
  }

  function handleSeek(songId: string, progress: number, keepPlaying: boolean) {
    setPendingSeekProgressBySongId((current) => ({
      ...current,
      [songId]: progress,
    }));
    setSeekRequest({ songId, progress, keepPlaying, requestId: ++seekRequestIdRef.current });
  }

  function navigateTrack(direction: "previous" | "next") {
    if (displayedSongs.length === 0) return;

    const currentIndex = activeSongIndex >= 0 ? activeSongIndex : 0;
    const nextIndex = getAdjacentTrackIndex(currentIndex, displayedSongs.length, direction);
    const nextSong = displayedSongs[nextIndex];
    if (!nextSong) return;

    setActiveSongId(nextSong.id);
    setPendingSeekProgressBySongId((current) => {
      const next = { ...current };
      delete next[nextSong.id];
      return next;
    });
    setPlayerPlaying(true);
    scrollRequestedSongIdRef.current = nextSong.id;
  }

  function clearPendingSeekProgress(songId: string) {
    setPendingSeekProgressBySongId((current) => {
      if (!shouldClearPendingSeekProgress(current[songId])) return current;
      const next = { ...current };
      delete next[songId];
      return next;
    });
  }

  function handleKeyboardShortcut(event: KeyboardEvent) {
    if (shouldIgnorePlaybackShortcutTarget(event.target)) return;
    const action = getPlaybackShortcutAction(event);
    if (!action) return;

    if (action === "toggle") {
      event.preventDefault();
      if (activeSongId) setPlayerPlaying((current) => !current);
      return;
    }

    event.preventDefault();
    navigateTrack(action);
  }

  useEffect(() => {
    window.addEventListener("keydown", handleKeyboardShortcut);
    return () => window.removeEventListener("keydown", handleKeyboardShortcut);
  });

  const filterControls = (
    <>
      {filterKeys.map((filterKey) => {
        const FilterComponent =
          filterKey === "key"
            ? MusicKeyFilter
            : filterKey === "bpm"
              ? MusicBpmFilter
              : filterKey === "duration"
                ? MusicDurationFilter
                : MusicPlaylistFilter;

        return (
          <FilterTrigger
            key={filterKey}
            title={FILTER_TITLES[filterKey]}
            selectedCount={filters[filterKey].length}
            open={openDropdown === filterKey}
            onOpenChange={(open) => setOpenDropdown(open ? filterKey : null)}
            options={filterOptions[filterKey]}
            selectedValues={filters[filterKey]}
            onToggle={(value) => setFilterValue(filterKey, value)}
            onClear={() => setFilters((current) => ({ ...current, [filterKey]: [] }))}
            renderPanel={({ close }) => (
              <FilterComponent
                selectedValues={filters[filterKey]}
                options={filterOptions[filterKey]}
                onToggle={(value: string) => setFilterValue(filterKey, value)}
                onClear={() => setFilters((current) => ({ ...current, [filterKey]: [] }))}
                onClose={close}
              />
            )}
          />
        );
      })}
    </>
  );

  return (
    <section className="desktop-music-page">
      <SearchFilterChrome
        title="Music Library"
        description="Search, preview, and sync Filmwave tracks directly into your local music folder."
        searchSlot={
          <SearchFilterInput
            ref={searchInputRef}
            value={filters.search}
            placeholder={searchPlaceholder}
            icon={<SearchIconSmall />}
            onChange={(value) => setFilters((current) => ({ ...current, search: value }))}
            onClear={() => setFilters((current) => ({ ...current, search: "" }))}
          />
        }
        filterSlot={filterControls}
        actionSlot={
          <button
            type="button"
            className={`search-filter-shuffle-action${filters.shuffle ? " is-active" : ""}`}
            onClick={filters.shuffle ? removeShuffle : toggleShuffle}
          >
            <MusicShuffleButton active={filters.shuffle} />
          </button>
        }
      />

      <DesktopFilterTags
        filters={filters}
        filterTitles={FILTER_TITLES}
        filterOptions={filterOptions}
        onRemove={removeFilterValue}
        onClearAll={() => setFilters(EMPTY_FILTERS)}
      />

      {songsLoading ? (
        <MusicLibrarySkeletonList count={6} />
      ) : songsError ? (
        <MusicLibraryLoadNotice
          title="Using sample library"
          message={songsError}
        />
      ) : displayedSongs.length === 0 ? (
        <MusicLibraryEmptyState
          title="No tracks match those filters"
          message="Try clearing a filter or searching for a different mood, genre, or instrument."
          actionLabel="Clear filters"
          onAction={() => setFilters(EMPTY_FILTERS)}
        />
      ) : (
        <div className="desktop-music-list" aria-label="Desktop music library">
          {displayedSongs.map((song) => {
            const syncStatus = getSongSyncStatus(song.id);
            return (
              <DesktopSongCard
                key={song.id}
                song={song}
                active={song.id === activeSongId}
                playing={song.id === activeSongId && playerPlaying}
                favorite={favoriteIds.has(song.id)}
                syncStatus={syncStatus}
                syncedPath={syncedSongPaths[song.id]}
                onPlay={() => handleSongPlay(song)}
                onFavoriteToggle={() => toggleFavorite(song.id)}
                onSync={() => syncSong(song)}
                ref={(element) => {
                  if (element) songCardRefs.current.set(song.id, element);
                  else songCardRefs.current.delete(song.id);
                }}
              />
            );
          })}
        </div>
      )}

      {activeSong && (
        <DesktopMusicPlayer
          song={activeSong}
          isPlaying={playerPlaying}
          currentTime={playbackProgress.songId === activeSong.id ? playbackProgress.currentTime : 0}
          duration={playbackProgress.songId === activeSong.id ? playbackProgress.duration : activeSong.durationSeconds}
          seekRequest={seekRequest}
          favorite={favoriteIds.has(activeSong.id)}
          markersVisible={filters.cuePoint.length > 0}
          syncStatus={activeSyncStatus}
          syncedPath={syncedSongPaths[activeSong.id]}
          onPrevious={() => navigateTrack("previous")}
          onPlayPause={() => setPlayerPlaying((current) => !current)}
          onNext={() => navigateTrack("next")}
          onSeek={(progress, keepPlaying) => handleSeek(activeSong.id, progress, keepPlaying)}
          onSeekComplete={() => clearPendingSeekProgress(activeSong.id)}
          onFavoriteToggle={() => toggleFavorite(activeSong.id)}
          onMarkersVisibleChange={(visible) =>
            setFilters((current) => ({
              ...current,
              cuePoint: visible
                ? current.cuePoint.length > 0
                  ? current.cuePoint
                  : EDIT_POINT_FILTER_OPTIONS.map((option) => option.value)
                : [],
            }))
          }
          onSync={() => syncSong(activeSong)}
          onClose={() => {
            setPlayerPlaying(false);
            setActiveSongId(null);
          }}
        />
      )}
    </section>
  );
}
