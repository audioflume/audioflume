import {
  EDIT_POINT_FILTER_OPTIONS,
  FilterTrigger,
  MusicLibraryEmptyState,
  MusicLibraryLoadNotice,
  MusicLibrarySkeletonList,
  MusicLibrarySortControl,
  type MusicLibrarySortValue,
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
import { useCallback, useEffect, useMemo, useRef, useState, type WheelEvent } from "react";
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
  const [sortOrder, setSortOrder] = useState<MusicLibrarySortValue>("recent");
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

  function setRandomSort() {
    const nextOrder = shuffleDesktopMusicSongs(filteredSongs).map((song) => song.id);
    setShuffleOrderIds(nextOrder);
    setSortOrder("random");
    setFilters((current) => ({ ...current, shuffle: true }));
  }

  function handleSortChange(value: MusicLibrarySortValue) {
    if (value === "random") {
      setRandomSort();
      return;
    }

    setSortOrder(value);
    setShuffleOrderIds(null);
    setFilters((current) => ({ ...current, shuffle: false }));
  }

  const displayedSongs = useMemo(() => {
    if (sortOrder === "downloaded") {
      return [...filteredSongs].sort((a, b) => b.downloadCount - a.downloadCount);
    }

    if (sortOrder !== "random" || !shuffleOrderIds) return filteredSongs;

    const orderMap = new Map(shuffleOrderIds.map((songId, index) => [songId, index]));

    return [...filteredSongs].sort((a, b) => {
      const aOrder = orderMap.get(a.id);
      const bOrder = orderMap.get(b.id);

      if (aOrder === undefined && bOrder === undefined) return 0;
      if (aOrder === undefined) return 1;
      if (bOrder === undefined) return -1;

      return aOrder - bOrder;
    });
  }, [filteredSongs, shuffleOrderIds, sortOrder]);

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

  function removeShuffle() {
    handleSortChange("recent");
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
    const shouldPlay = playerPlaying;
    const safeProgress = clampPlaybackProgress(progress);
    const duration = song.durationSeconds || 0;

    setPendingSeekProgressBySongId((current) => ({
      ...current,
      [song.id]: safeProgress,
    }));

    if (activeSongId !== song.id) {
      setActiveSongId(song.id);
    }

    setPlayerPlaying(shouldPlay);
    setPlaybackProgress({
      songId: song.id,
      currentTime: getSeekTimeFromProgress(safeProgress, duration),
      duration,
    });
    setSeekRequest({
      id: ++seekRequestIdRef.current,
      songId: song.id,
      progress: safeProgress,
      shouldPlay,
    });
  }

  function handlePlaybackProgressChange(nextProgress: DesktopPlaybackProgress) {
    setPlaybackProgress(nextProgress);

    if (!nextProgress.songId || nextProgress.duration <= 0) return;

    setPendingSeekProgressBySongId((current) => {
      const pendingProgress = current[nextProgress.songId];
      if (pendingProgress === undefined) return current;

      const nextPlaybackProgress = getProgressFromTime(nextProgress.currentTime, nextProgress.duration);

      if (!shouldClearPendingSeekProgress({ playbackProgress: nextPlaybackProgress, pendingProgress })) return current;

      const { [nextProgress.songId]: _removed, ...rest } = current;
      return rest;
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
    const previousIndex = getAdjacentTrackIndex({
      currentIndex: activeSongIndex,
      queueLength: displayedSongs.length,
      direction: "prev",
    });

    if (previousIndex === null) {
      if (activeSongIndex !== -1) setPlayerPlaying(false);
      return;
    }

    playSongAtIndex(previousIndex);
  }, [activeSongIndex, displayedSongs.length, playSongAtIndex]);

  const playNextSong = useCallback(() => {
    if (activeSongIndex === -1) {
      playSongAtIndex(0);
      return;
    }

    const nextIndex = getAdjacentTrackIndex({
      currentIndex: activeSongIndex,
      queueLength: displayedSongs.length,
      direction: "next",
    });

    if (nextIndex === null) {
      setPlayerPlaying(false);
      return;
    }

    playSongAtIndex(nextIndex);
  }, [activeSongIndex, displayedSongs.length, playSongAtIndex]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (shouldIgnorePlaybackShortcutTarget(event.target)) return;

      const action = getPlaybackShortcutAction(event);
      if (!action) return;

      if (action === "toggle-play-pause") {
        if (!activeSongId) return;
        event.preventDefault();
        setPlayerPlaying((playing) => !playing);
        return;
      }

      event.preventDefault();

      if (action === "next-track") {
        playNextSong();
        return;
      }

      if (action === "previous-track") {
        playPreviousSong();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeSongId, playNextSong, playPreviousSong]);

  function getSongPlaybackProgress(songId: string) {
    if (playbackProgress.songId !== songId || playbackProgress.duration <= 0) return 0;

    return getProgressFromTime(playbackProgress.currentTime, playbackProgress.duration);
  }

  function handleMusicPageWheelCapture(event: WheelEvent<HTMLElement>) {
    const target = event.target instanceof Element ? event.target : null;
    const filterRow = target?.closest<HTMLElement>(".filmwave-search-filter-row");

    if (!filterRow) return;

    event.preventDefault();
    event.stopPropagation();

    filterRow.scrollLeft += event.deltaX + (event.shiftKey ? event.deltaY : 0);
  }

  return (
    <section
      className={`desktop-music-page${activeSong ? " has-player" : ""}`}
      onWheelCapture={handleMusicPageWheelCapture}
    >
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
        quickActions={
          <>
            <MusicShuffleButton active={filters.shuffle} onClick={setRandomSort} />
            <MusicLibrarySortControl value={sortOrder} onChange={handleSortChange} />
          </>
        }
      />

      {songsError && (
        <MusicLibraryLoadNotice>
          Could not load live songs. Showing sample tracks. {songsError}
        </MusicLibraryLoadNotice>
      )}

      <div className="desktop-music-list">
        {songsLoading && <MusicLibrarySkeletonList />}

        {!songsLoading &&
          displayedSongs.map((song) => (
            <DesktopSongCard
              key={song.id}
              song={song}
              favorite={favoriteIds.has(song.id)}
              markersVisible={filters.markers}
              selectedCuePointTypes={selectedCoreCuePointTypes}
              isSelected={activeSongId === song.id}
              isPlaying={activeSongId === song.id && playerPlaying}
              playbackProgress={getSongPlaybackProgress(song.id)}
              pendingSeekProgress={pendingSeekProgressBySongId[song.id] ?? null}
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

        {!songsLoading && displayedSongs.length === 0 && <MusicLibraryEmptyState />}
      </div>

      {activeSong && (
        <DesktopMusicPlayer
          song={activeSong}
          isPlaying={playerPlaying}
          favorite={favoriteIds.has(activeSong.id)}
          markersVisible={filters.markers}
          selectedCuePointTypes={selectedCoreCuePointTypes}
          seekRequest={seekRequest}
          syncStatus={getSongSyncStatus(activeSong.id)}
          syncedPath={syncedSongPaths[activeSong.id] ?? null}
          canSync={Boolean(effectiveSyncFolder)}
          onMarkersVisibleChange={(visible) =>
            setFilters((current) => ({ ...current, markers: visible }))
          }
          onFavoriteToggle={() => toggleFavorite(activeSong.id)}
          onPlayPause={() => setPlayerPlaying((playing) => !playing)}
          onPrevious={playPreviousSong}
          onNext={playNextSong}
          onProgressChange={handlePlaybackProgressChange}
          onSync={() => syncSong(activeSong)}
        />
      )}
    </section>
  );
}
