"use client";

import type { Song } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AlertIcon from "@/components/icons/AlertIcon";
import CheckIcon from "@/components/icons/CheckIcon";
import FailedIcon from "@/components/icons/FailedIcon";
import SearchIcon from "@/components/icons/SearchIcon";
import TrashIcon from "@/components/icons/TrashIcon";
import UploadIcon from "@/components/icons/UploadIcon";
import AdminSongRow from "@/components/admin/AdminSongRow";
import Toast from "@/components/Toast";
import {
  primaryPillButtonClass,
  secondaryPillButtonClass,
} from "@/components/uiClasses";
import { usePlayer } from "@/context/PlayerContext";
import { songHasIssue } from "@/lib/songHealth";

type IssueFilterKey =
  | "all"
  | "coverArt"
  | "songInfo"
  | "peakData"
  | "tags"
  | "editPoints";

type HealthStatus = "success" | "warning" | "error";
type IssueSeverity = "success" | "warning" | "error" | "neutral";

const VALID_ISSUE_FILTERS: IssueFilterKey[] = [
  "all",
  "coverArt",
  "songInfo",
  "peakData",
  "tags",
  "editPoints",
];

const STATUS_COLORS = {
  success: "var(--status-success, #48b571)",
  warning: "var(--status-warning, #d9a441)",
  error: "var(--status-error, #dc584f)",
};

const STATUS_BACKGROUNDS = {
  success: "var(--status-success-soft, rgba(72, 181, 113, 0.12))",
  warning: "var(--status-warning-soft, rgba(217, 164, 65, 0.12))",
  error: "var(--status-error-soft, rgba(220, 88, 79, 0.12))",
};

function StatusIcon({ status }: { status: HealthStatus }) {
  return (
    <div
      className="flex h-7 w-7 items-center justify-center rounded-md"
      style={{
        backgroundColor: STATUS_BACKGROUNDS[status],
        color: STATUS_COLORS[status],
      }}
    >
      {status === "success" && <CheckIcon />}
      {status === "warning" && <AlertIcon />}
      {status === "error" && <FailedIcon />}
    </div>
  );
}

function HealthIconSkeleton() {
  return (
    <div className="h-7 w-7 animate-pulse rounded-md bg-[var(--bg-tertiary)]" />
  );
}

function getIssueFilterSeverity(key: IssueFilterKey): IssueSeverity {
  if (key === "coverArt" || key === "songInfo" || key === "peakData") {
    return "error";
  }

  if (key === "tags") {
    return "warning";
  }

  return "neutral";
}

function getInitialIssueFilter(issueParam: string | null): IssueFilterKey {
  if (VALID_ISSUE_FILTERS.includes(issueParam as IssueFilterKey)) {
    return issueParam as IssueFilterKey;
  }

  return "all";
}

export default function AdminMusicLibraryPage() {
  const searchParams = useSearchParams();
  const issueParam = searchParams.get("issue");

  const [search, setSearch] = useState("");
  const [issueFilter, setIssueFilter] = useState<IssueFilterKey>(
    getInitialIssueFilter(issueParam),
  );
  const [songs, setSongs] = useState<Song[]>([]);
  const [songsLoading, setSongsLoading] = useState(true);
  const [songsError, setSongsError] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [selectedSongIds, setSelectedSongIds] = useState<string[]>([]);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);

  const { setQueue, currentSong } = usePlayer();
  const playerVisible = !!currentSong;

  useEffect(() => {
    setIssueFilter(getInitialIssueFilter(issueParam));
  }, [issueParam]);

  const fetchSongs = async () => {
    try {
      setSongsLoading(true);
      setSongsError("");

      const res = await fetch("/api/songs");

      if (!res.ok) {
        throw new Error("Failed to load songs.");
      }

      const data = (await res.json()) as Song[];
      setSongs(data);
    } catch (err) {
      setSongsError(
        err instanceof Error ? err.message : "Failed to load songs.",
      );
    } finally {
      setSongsLoading(false);
    }
  };

  useEffect(() => {
    fetchSongs();
  }, []);

  const issueCounts = useMemo(() => {
    const songFiles = songs.filter((song) =>
      songHasIssue(song, "audio"),
    ).length;
    const coverArt = songs.filter((song) =>
      songHasIssue(song, "coverArt"),
    ).length;
    const songInfo = songs.filter((song) =>
      songHasIssue(song, "songInfo"),
    ).length;
    const peakData = songs.filter((song) =>
      songHasIssue(song, "waveformPeaks"),
    ).length;
    const tags = songs.filter((song) => songHasIssue(song, "tags")).length;
    const editPoints = songs.filter((song) =>
      songHasIssue(song, "editPoints"),
    ).length;

    return {
      all: songs.length,
      songFiles,
      coverArt,
      songInfo,
      peakData,
      tags,
      editPoints,
    };
  }, [songs]);

  const healthStatus: HealthStatus = useMemo(() => {
    const hasFailedIssues =
      issueCounts.songFiles > 0 ||
      issueCounts.coverArt > 0 ||
      issueCounts.songInfo > 0 ||
      issueCounts.peakData > 0;

    if (hasFailedIssues) return "error";
    if (issueCounts.tags > 0) return "warning";

    return "success";
  }, [issueCounts]);

  const healthLabel = songsLoading
    ? "Checking library health..."
    : healthStatus === "error"
      ? "Failed issues found"
      : healthStatus === "warning"
        ? "Warnings found"
        : "All good";

  const issueFilters: {
    key: IssueFilterKey;
    label: string;
    count: number;
  }[] = [
    { key: "all", label: "All Songs", count: issueCounts.all },
    { key: "coverArt", label: "Missing Art", count: issueCounts.coverArt },
    { key: "songInfo", label: "Missing Info", count: issueCounts.songInfo },
    { key: "peakData", label: "Missing Peaks", count: issueCounts.peakData },
    { key: "tags", label: "Missing Tags", count: issueCounts.tags },
    {
      key: "editPoints",
      label: "Missing Edit Points",
      count: issueCounts.editPoints,
    },
  ];

  const searchedSongs = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return songs;

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

      return searchableText.includes(q);
    });
  }, [songs, search]);

  const filteredSongs = useMemo(() => {
    if (issueFilter === "all") return searchedSongs;

    return searchedSongs.filter((song) => {
      if (issueFilter === "coverArt") return songHasIssue(song, "coverArt");
      if (issueFilter === "songInfo") return songHasIssue(song, "songInfo");
      if (issueFilter === "peakData") {
        return songHasIssue(song, "waveformPeaks");
      }
      if (issueFilter === "tags") return songHasIssue(song, "tags");
      if (issueFilter === "editPoints") {
        return songHasIssue(song, "editPoints");
      }

      return true;
    });
  }, [searchedSongs, issueFilter]);

  const visibleSongs = useMemo(() => {
    return [...filteredSongs].reverse();
  }, [filteredSongs]);

  const filteredSongIds = useMemo(
    () => filteredSongs.map((song) => song.id),
    [filteredSongs],
  );

  const selectedCount = selectedSongIds.length;
  const selectionMode = selectedCount > 0;
  const allFilteredSelected =
    filteredSongIds.length > 0 &&
    filteredSongIds.every((songId) => selectedSongIds.includes(songId));

  useEffect(() => {
    setSelectedSongIds((currentIds) =>
      currentIds.filter((songId) => songs.some((song) => song.id === songId)),
    );
  }, [songs]);

  useEffect(() => {
    setQueue(visibleSongs.filter((song) => song.audioUrl));
  }, [visibleSongs, setQueue]);

  useEffect(() => {
    if (!currentSong) return;

    const activeRow = document.querySelector(
      `[data-admin-song-id="${currentSong.id}"]`,
    );

    if (!(activeRow instanceof HTMLElement)) return;

    const rowRect = activeRow.getBoundingClientRect();

    const stickyHeaderOffset = 56;
    const stickySearchOffset = 54;
    const topPadding = 12;
    const bottomPadding = playerVisible ? 88 : 16;

    const visibleTop = stickyHeaderOffset + stickySearchOffset + topPadding;
    const visibleBottom = window.innerHeight - bottomPadding;

    if (rowRect.top < visibleTop) {
      window.scrollBy({
        top: rowRect.top - visibleTop,
        behavior: "smooth",
      });
    }

    if (rowRect.bottom > visibleBottom) {
      window.scrollBy({
        top: rowRect.bottom - visibleBottom,
        behavior: "smooth",
      });
    }
  }, [currentSong, playerVisible]);

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(""), 1800);
  };

  const handleSongDeleted = (songId: string) => {
    setSongs((currentSongs) =>
      currentSongs.filter((song) => song.id !== songId),
    );
    setSelectedSongIds((currentIds) =>
      currentIds.filter((id) => id !== songId),
    );
    showToast("Song deleted");
  };

  const handleSelectedChange = (songId: string, checked: boolean) => {
    setSelectedSongIds((currentIds) => {
      if (checked) {
        return currentIds.includes(songId)
          ? currentIds
          : [...currentIds, songId];
      }

      return currentIds.filter((id) => id !== songId);
    });
  };

  const toggleSelectAllFiltered = (checked: boolean) => {
    if (checked) {
      setSelectedSongIds((currentIds) =>
        Array.from(new Set([...currentIds, ...filteredSongIds])),
      );
      return;
    }

    setSelectedSongIds((currentIds) =>
      currentIds.filter((songId) => !filteredSongIds.includes(songId)),
    );
  };

  const clearSelection = () => {
    setSelectedSongIds([]);
  };

  const handleBatchDelete = async () => {
    if (selectedSongIds.length === 0 || isBatchDeleting) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedSongIds.length} song${
        selectedSongIds.length === 1 ? "" : "s"
      }? This cannot be undone.`,
    );

    if (!confirmed) return;

    const idsToDelete = [...selectedSongIds];

    try {
      setIsBatchDeleting(true);

      const res = await fetch("/api/admin/songs/batch-delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          songIds: idsToDelete,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to delete selected songs");
      }

      setSongs((currentSongs) =>
        currentSongs.filter((song) => !idsToDelete.includes(song.id)),
      );
      setSelectedSongIds([]);

      showToast(
        `${idsToDelete.length} song${idsToDelete.length === 1 ? "" : "s"} deleted`,
      );
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to delete selected songs",
      );
    } finally {
      setIsBatchDeleting(false);
    }
  };

  useEffect(() => {
    const handleDeletedEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ songId?: string }>;
      const songId = customEvent.detail?.songId;

      if (!songId) return;

      setSongs((currentSongs) =>
        currentSongs.filter((song) => song.id !== songId),
      );

      setSelectedSongIds((currentIds) =>
        currentIds.filter((id) => id !== songId),
      );

      showToast("Song deleted");
    };

    window.addEventListener("admin-song-deleted", handleDeletedEvent);

    return () => {
      window.removeEventListener("admin-song-deleted", handleDeletedEvent);
    };
  }, []);

  const showSkeleton = songsLoading && songs.length === 0 && !songsError;

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] pt-14 text-[var(--text-primary)] md:ml-[var(--admin-sidebar-width)]">
      <AdminSidebar />

      <style>{`
        .admin-song-menu-btn,
        .admin-song-edit-btn {
          opacity: 0;
        }

        .admin-song-menu-btn:hover,
        .admin-song-menu-btn.is-open,
        .admin-song-edit-btn:hover {
          opacity: 1;
        }

        .admin-song-row:hover .admin-song-menu-btn,
        .admin-song-row:hover .admin-song-edit-btn,
        .admin-song-menu-btn.is-open {
          opacity: 1;
        }

        .admin-song-row.is-error {
          background: var(--status-error-faint);
        }

        .admin-song-row.is-warning {
          background: var(--status-warning-faint);
        }

        .admin-song-row.is-error:hover {
          background: var(--status-error-hover);
        }

        .admin-song-row.is-warning:hover {
          background: var(--status-warning-hover);
        }

        .admin-song-select-wrap {
          width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 1;
          cursor: pointer;
          transition: opacity 0.15s ease;
        }

        .admin-song-select-input {
          position: absolute;
          opacity: 0;
          pointer-events: none;
        }

        .admin-song-select-box {
          width: 16px;
          height: 16px;
          border-radius: 4px;
          border: 1px solid var(--border);
          background: var(--bg-secondary);
          color: var(--bg-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: border 0.15s ease, background 0.15s ease, color 0.15s ease;
        }

        .admin-song-select-box svg {
          opacity: 0;
          transition: opacity 0.15s ease;
        }

        .admin-song-select-wrap:hover .admin-song-select-box {
          border-color: var(--text-secondary);
        }

        .admin-song-select-input:checked + .admin-song-select-box {
          border-color: var(--text-primary);
          background: var(--text-primary);
          color: var(--bg-primary);
        }

        .admin-song-select-input:checked + .admin-song-select-box svg {
          opacity: 1;
        }

        .admin-song-dropdown {
          z-index: 25;
          width: 138px;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 8px;
          overflow: hidden;
          box-shadow: var(--shadow-ui);
          backdrop-filter: blur(12px);
        }

        .admin-song-dropdown button,
        .admin-song-dropdown a {
          display: block;
          width: 100%;
          padding: 9px 12px;
          text-align: left;
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
          background: none;
          border: none;
          cursor: pointer;
          transition: background 0.1s, color 0.1s;
          text-decoration: none;
        }

        .admin-song-dropdown button:hover,
        .admin-song-dropdown a:hover {
          background: var(--bg-hover-strong);
          color: var(--text-primary);
        }

        .admin-song-dropdown .danger-action {
          color: var(--danger);
        }

        .admin-song-dropdown .danger-action:hover {
          color: var(--danger);
        }

        .admin-song-dropdown button:disabled {
          cursor: default;
          opacity: 0.45;
        }

        .admin-song-dropdown button:disabled:hover {
          background: transparent;
          color: var(--text-secondary);
        }

        .admin-batch-delete-btn {
          background: var(--danger) !important;
          color: var(--danger-contrast) !important;
        }

        .admin-batch-delete-btn:hover {
          background: var(--danger-hover, var(--danger)) !important;
          color: var(--danger-contrast) !important;
        }
      `}</style>

      <section className="min-h-screen">
        <div className="flex items-end justify-between gap-4 px-8 pt-14 pb-8">
          <div>
            <h1 className="font-[family-name:var(--font-instrument-sans)] text-[34px] font-medium leading-none tracking-[-0.045em] text-[var(--text-primary)]">
              Music Library
            </h1>

            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Search and manage uploaded songs.
            </p>
          </div>

          <Link
            href="/admin/songs/new"
            className={`${primaryPillButtonClass} hidden md:flex`}
          >
            <UploadIcon size={13} />
            <span>Upload Song</span>
          </Link>
        </div>

        <div className="sticky top-[55px] z-[40] flex h-[49px] w-full flex-col gap-0 overflow-hidden border-y border-[var(--border)] bg-[var(--bg-primary)] px-8 pt-0 pb-0">
          <div className="flex items-center gap-3">
            {selectionMode ? (
              <div className="flex h-[48px] w-full items-center gap-3">
                <div className="text-sm font-medium text-[var(--text-primary)]">
                  {selectedCount} song{selectedCount === 1 ? "" : "s"} selected
                </div>

                <button
                  type="button"
                  onClick={handleBatchDelete}
                  disabled={isBatchDeleting}
                  className={`admin-batch-delete-btn ml-auto ${primaryPillButtonClass} disabled:cursor-default disabled:opacity-50`}
                >
                  <TrashIcon />
                  {isBatchDeleting
                    ? "Deleting..."
                    : `Delete ${selectedCount} song${selectedCount === 1 ? "" : "s"}`}
                </button>

                <button
                  type="button"
                  onClick={clearSelection}
                  disabled={isBatchDeleting}
                  className={`${secondaryPillButtonClass} disabled:cursor-default disabled:opacity-50`}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex w-[320px] flex-shrink-0 items-center gap-2 py-3 pr-4">
                <SearchIcon
                  size={16}
                  className="shrink-0 text-[var(--text-muted)]"
                />

                <input
                  type="text"
                  placeholder="Search Music Library"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-transparent text-[15px] font-[300] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                />
              </div>
            )}
          </div>
        </div>

        <div
          className="px-8"
          style={{
            paddingBottom: playerVisible ? "104px" : "32px",
          }}
        >
          <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)]">
            <div className="flex flex-col gap-3 border-b border-[var(--border)] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                {songsLoading ? (
                  <HealthIconSkeleton />
                ) : (
                  <StatusIcon status={healthStatus} />
                )}

                <div>
                  <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    Library Health
                  </div>

                  <div className="mt-1 text-xs text-[var(--text-secondary)]">
                    {healthLabel}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {issueFilters.map((filter) => {
                  const active = issueFilter === filter.key;
                  const severity = getIssueFilterSeverity(filter.key);
                  const severityColor =
                    severity === "error"
                      ? STATUS_COLORS.error
                      : severity === "warning"
                        ? STATUS_COLORS.warning
                        : undefined;

                  return (
                    <button
                      key={filter.key}
                      type="button"
                      onClick={() => setIssueFilter(filter.key)}
                      className={`flex h-8 cursor-pointer items-center gap-2 rounded-full px-3 text-xs font-medium transition ${
                        active
                          ? "bg-[var(--bg-hover)] text-[var(--text-primary)]"
                          : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      <span>{filter.label}</span>
                      <span
                        className="rounded-full bg-[var(--bg-secondary)] px-1.5 py-[1px] text-[10px]"
                        style={{
                          color:
                            filter.count > 0 && severityColor
                              ? severityColor
                              : active
                                ? "var(--text-primary)"
                                : "var(--text-muted)",
                        }}
                      >
                        {filter.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="overflow-x-auto overflow-y-hidden">
              <div className="min-w-[1080px]">
                <div className="grid h-[38px] grid-cols-[28px_48px_minmax(180px,1.5fr)_minmax(130px,1fr)_24px_120px_80px_80px_72px] items-center gap-3 border-b border-[var(--border)] px-6 text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--text-muted)]">
                  <div className="flex items-center">
                    <label
                      className="admin-song-select-wrap is-visible"
                      aria-label="Select all visible songs"
                    >
                      <input
                        type="checkbox"
                        checked={allFilteredSelected}
                        onChange={(e) =>
                          toggleSelectAllFiltered(e.target.checked)
                        }
                        className="admin-song-select-input"
                      />

                      <span className="admin-song-select-box">
                        <CheckIcon size={11} strokeWidth={3} />
                      </span>
                    </label>
                  </div>

                  <div />
                  <div>Song</div>
                  <div>Artist</div>
                  <div />
                  <div>Status</div>
                  <div>Key</div>
                  <div>BPM</div>
                  <div />
                </div>

                {showSkeleton && (
                  <div className="grid gap-0">
                    {Array.from({ length: 10 }, (_, index) => (
                      <div
                        key={index}
                        className="grid min-h-[46px] grid-cols-[28px_48px_minmax(180px,1.5fr)_minmax(130px,1fr)_24px_120px_80px_80px_72px] items-center gap-3 px-6"
                        style={{
                          borderBottom:
                            index === 9
                              ? "none"
                              : "1px solid var(--border-subtle)",
                        }}
                      >
                        <div className="flex items-center">
                          <div className="h-4 w-4 rounded-[4px] bg-[var(--bg-tertiary)]" />
                        </div>

                        <div className="h-8 w-8 rounded bg-[var(--bg-tertiary)]" />
                        <div className="h-2 w-[60%] bg-[var(--bg-tertiary)]" />
                        <div className="h-2 w-[50%] bg-[var(--bg-tertiary)]" />
                        <div className="h-2 w-2 rounded-full bg-[var(--bg-tertiary)]" />
                        <div className="h-2 w-[78px] bg-[var(--bg-tertiary)]" />
                        <div className="h-2 w-[32px] bg-[var(--bg-tertiary)]" />
                        <div className="h-2 w-[42px] bg-[var(--bg-tertiary)]" />
                        <div className="h-2 w-[50px] bg-[var(--bg-tertiary)]" />
                      </div>
                    ))}
                  </div>
                )}

                {songsError && !songsLoading && (
                  <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 px-8 text-center">
                    <div className="text-sm font-medium text-[var(--text-primary)]">
                      Couldn&apos;t load songs
                    </div>

                    <div className="max-w-[320px] text-xs leading-5 text-[var(--text-secondary)]">
                      {songsError}
                    </div>

                    <button
                      type="button"
                      onClick={fetchSongs}
                      className={primaryPillButtonClass}
                    >
                      Try Again
                    </button>
                  </div>
                )}

                {!songsError && !showSkeleton && visibleSongs.length === 0 && (
                  <div className="flex min-h-[180px] items-center justify-center px-8 text-sm text-[var(--text-secondary)]">
                    No songs found.
                  </div>
                )}

                {!songsError && !showSkeleton && visibleSongs.length > 0 && (
                  <div className="admin-song-row-group">
                    {visibleSongs.map((song, index) => (
                      <AdminSongRow
                        key={song.id}
                        song={song}
                        isLast={index === visibleSongs.length - 1}
                        selected={selectedSongIds.includes(song.id)}
                        selectionMode={selectionMode}
                        onSelectedChange={handleSelectedChange}
                        onDeleted={handleSongDeleted}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Toast
        message={toastMessage}
        bottomOffset={playerVisible ? "96px" : "24px"}
      />
    </main>
  );
}
