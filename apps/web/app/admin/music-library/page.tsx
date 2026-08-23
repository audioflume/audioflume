"use client";

import type { Song } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Footer from "@/components/Footer";
import AdminContentPage from "@/components/admin/AdminContentPage";
import AdminSearchBar from "@/components/admin/AdminSearchBar";
import { BackendButton } from "@/components/backend/BackendControls";
import AlertIcon from "@/components/icons/AlertIcon";
import CheckIcon from "@/components/icons/CheckIcon";
import FailedIcon from "@/components/icons/FailedIcon";
import TrashIcon from "@/components/icons/TrashIcon";
import UploadIcon from "@/components/icons/UploadIcon";
import AdminSongRow from "@/components/admin/AdminSongRow";
import Toast from "@/components/Toast";
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
      className="flex h-8 w-8 items-center justify-center rounded-full"
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
    <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--bg-tertiary)]" />
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
  const [filtersOpen, setFiltersOpen] = useState(false);
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
      label: "Missing Cue Points",
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

  const selectedCount = selectedSongIds.length;
  const selectionMode = selectedCount > 0;

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
    const visibleTop = 76;
    const visibleBottom = window.innerHeight - (playerVisible ? 88 : 16);

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
  const activeFilterCount = issueFilter === "all" ? 0 : 1;

  return (
    <AdminContentPage
      label="Music Library"
      title="Music Library"
      description="Search and manage uploaded songs."
      compactHeader
      contentAreaClassName="bg-[var(--filmwave-neutral-surface)]"
      contentAreaBottomPadding={false}
    >
      <style>{`
        .admin-song-menu-btn {
          opacity: 1;
        }

        .admin-song-edit-btn {
          opacity: 0;
        }

        .admin-song-edit-btn:hover,
        .admin-song-row:hover .admin-song-edit-btn {
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

        .admin-music-library-song-list .admin-song-row {
          grid-template-columns: 22px 60px minmax(120px, 1fr) minmax(120px, 1fr) minmax(120px, 1fr) 64px 76px 96px 40px;
          column-gap: 16px;
          padding-left: 20px;
          padding-right: 20px;
        }
      `}</style>

      <div
        style={{
          paddingBottom: playerVisible ? "104px" : "32px",
        }}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <AdminSearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search"
            className="w-full max-w-[500px]"
          />

          <Link
            href="/admin/songs/new"
            className="inline-flex h-10 min-w-[104px] cursor-pointer items-center justify-center gap-2 rounded-[7px] border border-[var(--text-primary)] bg-[var(--text-primary)] px-5 text-[12px] font-[320] text-[var(--bg-primary)] transition"
          >
            <UploadIcon size={13} />
            <span>Upload Song</span>
          </Link>
        </div>

        <section className="overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--bg-primary)]">
          <div className="flex flex-col gap-3 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-base font-medium text-[var(--text-primary)]">
                Music Library
              </div>
              <div className="mt-1 text-xs font-[320] text-[var(--text-secondary)]">
                {songs.length} song{songs.length === 1 ? "" : "s"}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {selectionMode && (
                <>
                  <button
                    type="button"
                    onClick={handleBatchDelete}
                    disabled={isBatchDeleting}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-[7px] bg-[var(--danger)] px-4 text-[12px] font-[320] text-[var(--danger-contrast)] transition hover:bg-[color-mix(in_srgb,var(--danger)_90%,black)] disabled:opacity-50"
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
                    className="inline-flex h-10 items-center justify-center rounded-[7px] border border-[var(--border)] bg-[var(--bg-primary)] px-4 text-[12px] font-[320] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => setFiltersOpen((open) => !open)}
                className={`flex h-10 items-center gap-2 rounded-[7px] border px-4 text-[12px] font-[320] transition-colors ${
                  filtersOpen || activeFilterCount > 0
                    ? "border-[var(--border)] bg-[var(--bg-hover)] text-[var(--text-primary)]"
                    : "border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
                aria-expanded={filtersOpen}
              >
                <span>Filters</span>
                <span
                  className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-[320] ${
                    filtersOpen || activeFilterCount > 0
                      ? "bg-[var(--bg-primary)] text-[var(--text-primary)]"
                      : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
                  }`}
                >
                  {activeFilterCount}
                </span>
              </button>
            </div>
          </div>

          {filtersOpen && (
            <div className="mx-5 mb-4 rounded-[7px] border border-[var(--border)] bg-[var(--bg-secondary)] p-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  {songsLoading ? (
                    <HealthIconSkeleton />
                  ) : (
                    <StatusIcon status={healthStatus} />
                  )}

                  <div>
                    <div className="font-[family-name:var(--font-zalando-sans)] text-[11px] font-[320] uppercase leading-none tracking-[0.02em] text-[var(--text-primary)]">
                      Library Health
                    </div>
                    <div className="mt-1.5 text-xs font-[320] text-[var(--text-secondary)]">
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
                        className={`flex h-8 items-center gap-2 rounded-full px-3 text-xs font-[320] transition ${
                          active
                            ? "bg-[var(--bg-hover)] text-[var(--text-primary)]"
                            : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                        }`}
                      >
                        <span>{filter.label}</span>
                        <span
                          className="rounded-full bg-[var(--bg-secondary)] px-1.5 py-[1px] text-[10px] font-[320]"
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
            </div>
          )}

          <div className="mb-5 overflow-hidden">
            <div className="overflow-x-auto overflow-y-hidden">
              <div className="admin-music-library-song-list min-w-[920px]">
                {showSkeleton && (
                  <div className="grid gap-0 border-t border-[var(--border-subtle)]">
                    {Array.from({ length: 10 }, (_, index) => (
                      <div
                        key={index}
                        className="grid min-h-[72px] grid-cols-[22px_60px_minmax(120px,1fr)_minmax(120px,1fr)_minmax(120px,1fr)_64px_76px_96px_40px] items-center gap-4 px-5"
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

                        <div className="h-[52px] w-[52px] bg-[var(--bg-tertiary)]" />
                        <div className="h-2 w-[60%] bg-[var(--bg-tertiary)]" />
                        <div className="h-2 w-[50%] bg-[var(--bg-tertiary)]" />
                        <div className="h-2 w-[68px] bg-[var(--bg-tertiary)]" />
                        <div className="h-2 w-[32px] bg-[var(--bg-tertiary)]" />
                        <div className="h-2 w-[42px] bg-[var(--bg-tertiary)]" />
                        <div className="h-2 w-[72px] bg-[var(--bg-tertiary)]" />
                        <div className="h-2 w-[18px] bg-[var(--bg-tertiary)]" />
                      </div>
                    ))}
                  </div>
                )}

                {songsError && !songsLoading && (
                  <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 px-8 text-center">
                    <div className="text-sm font-[320] text-[var(--text-primary)]">
                      Couldn&apos;t load songs
                    </div>

                    <div className="max-w-[320px] text-xs font-[320] leading-5 text-[var(--text-secondary)]">
                      {songsError}
                    </div>

                    <BackendButton type="button" onClick={fetchSongs} variant="primary">
                      Try Again
                    </BackendButton>
                  </div>
                )}

                {!songsError && !showSkeleton && visibleSongs.length === 0 && (
                  <div className="flex min-h-[180px] items-center justify-center px-8 text-sm font-[320] text-[var(--text-secondary)]">
                    No songs found.
                  </div>
                )}

                {!songsError && !showSkeleton && visibleSongs.length > 0 && (
                  <div className="admin-song-row-group border-t border-[var(--border-subtle)]">
                    {visibleSongs.map((song, index) => (
                      <AdminSongRow
                        key={song.id}
                        song={song}
                        isLast={index === visibleSongs.length - 1}
                        selected={selectedSongIds.includes(song.id)}
                        selectionMode={selectionMode}
                        onSelectedChange={handleSelectedChange}
                        onDeleted={handleSongDeleted}
                        statusDisplay="published"
                        size="large"
                        showAddedDate
                        colorOnlyActions
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      <Footer className="!px-0" playerPadding={false} showTopBorder={false} />

      <Toast
        message={toastMessage}
        bottomOffset={playerVisible ? "96px" : "24px"}
      />
    </AdminContentPage>
  );
}
