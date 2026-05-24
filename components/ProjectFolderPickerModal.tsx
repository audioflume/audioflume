"use client";

import { useEffect, useMemo, useState } from "react";
import ModalShell from "@/components/ModalShell";
import {
  modalFieldLabelClass,
  modalPrimaryButtonClass,
} from "@/components/uiClasses";
import {
  FolderGlyph,
  MusicGlyph,
} from "@/components/project-browser/ProjectBrowserGlyphs";
import type { ProjectFolder } from "@/lib/types";

type ProjectPickerSong = {
  id: string;
  title: string;
  artist?: string;
  coverArt?: string | null;
  project_folder_id?: number | null;
};

type ProjectFolderPickerModalProps = {
  isOpen: boolean;
  folders: ProjectFolder[];
  initialFolderId: number | null;
  title?: string;
  confirmLabel?: string;
  movingSong?: ProjectPickerSong | null;
  onClose: () => void;
  onConfirm: (folderId: number | null) => void;
};

function sortFolders(folderA: ProjectFolder, folderB: ProjectFolder) {
  const positionA = folderA.position ?? 0;
  const positionB = folderB.position ?? 0;

  return positionA - positionB || folderA.name.localeCompare(folderB.name);
}

function sortSongs(songA: ProjectPickerSong, songB: ProjectPickerSong) {
  return songA.title.localeCompare(songB.title, undefined, { sensitivity: "base" });
}

function getMovingTitle(title: string) {
  return title.replace(/^Move\s+/, "").trim();
}

function SongFilePreview({ song, fallbackTitle }: { song?: ProjectPickerSong | null; fallbackTitle: string }) {
  const label = song?.artist ? `${song.title} by ${song.artist}` : song?.title || fallbackTitle;

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center">
        <MusicGlyph small />
      </span>

      <span className="block max-w-[300px] truncate text-[12px] font-medium tracking-[-0.015em] text-[var(--text-primary)]">
        {label}
      </span>
    </div>
  );
}

function FolderPreview({ name }: { name: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center">
        <FolderGlyph small />
      </span>
      <span className="block max-w-[300px] truncate text-[12px] font-medium tracking-[-0.015em] text-[var(--text-primary)]">
        {name}
      </span>
    </div>
  );
}

function ResolvingPreview({ name }: { name: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="h-6 w-6 shrink-0" />
      <span className="block max-w-[300px] truncate text-[12px] font-medium tracking-[-0.015em] text-[var(--text-primary)]">
        {name}
      </span>
    </div>
  );
}

export default function ProjectFolderPickerModal({
  isOpen,
  folders,
  initialFolderId,
  title = "Choose Folder",
  confirmLabel = "Move Here",
  movingSong = null,
  onClose,
  onConfirm,
}: ProjectFolderPickerModalProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(initialFolderId);
  const [songs, setSongs] = useState<ProjectPickerSong[]>([]);
  const [songsLoaded, setSongsLoaded] = useState(false);

  const foldersById = useMemo(
    () => new Map(folders.map((folder) => [folder.id, folder])),
    [folders],
  );

  const projectId = useMemo(() => {
    if (folders.length > 0) return folders[0].project_id;
    if (initialFolderId != null) return foldersById.get(initialFolderId)?.project_id;
    return undefined;
  }, [folders, foldersById, initialFolderId]);

  useEffect(() => {
    if (!isOpen) return;

    setSelectedFolderId(initialFolderId);
  }, [isOpen, initialFolderId]);

  useEffect(() => {
    if (!isOpen || projectId == null) {
      setSongs([]);
      setSongsLoaded(false);
      return;
    }

    let cancelled = false;

    async function loadProjectSongs() {
      setSongsLoaded(false);

      try {
        const res = await fetch(`/api/projects/${encodeURIComponent(String(projectId))}/assets?type=song`);
        const data = await res.json();

        if (!res.ok || !Array.isArray(data?.songs)) {
          if (!cancelled) setSongs([]);
          return;
        }

        if (!cancelled) setSongs(data.songs as ProjectPickerSong[]);
      } catch {
        if (!cancelled) setSongs([]);
      } finally {
        if (!cancelled) setSongsLoaded(true);
      }
    }

    loadProjectSongs();

    return () => {
      cancelled = true;
    };
  }, [isOpen, projectId]);

  const selectedChain = useMemo(() => {
    if (selectedFolderId == null) return [];

    const chain: ProjectFolder[] = [];
    const visited = new Set<number>();
    let current = foldersById.get(selectedFolderId) ?? null;

    while (current && !visited.has(current.id)) {
      chain.unshift(current);
      visited.add(current.id);
      current =
        current.parent_folder_id == null ? null : foldersById.get(current.parent_folder_id) ?? null;
    }

    return chain;
  }, [foldersById, selectedFolderId]);

  const selectedAncestorIds = useMemo(
    () => new Set(selectedChain.slice(0, -1).map((folder) => folder.id)),
    [selectedChain],
  );

  const columns = useMemo(() => {
    const parentIds = [null, ...selectedChain.map((folder) => folder.id)];
    const visibleParentIds = parentIds.length === 1 ? [null, "root-preview"] : parentIds;

    return visibleParentIds.map((parentId) => {
      if (parentId === "root-preview") {
        return {
          parentId,
          folders: [] as ProjectFolder[],
          songs: [] as ProjectPickerSong[],
        };
      }

      return {
        parentId,
        folders: folders
          .filter((folder) => folder.parent_folder_id === parentId)
          .sort(sortFolders),
        songs: songs
          .filter((song) => (song.project_folder_id ?? null) === parentId)
          .sort(sortSongs),
      };
    });
  }, [folders, selectedChain, songs]);

  const destinationLabel = useMemo(() => {
    if (selectedFolderId == null) return "All Files";
    return foldersById.get(selectedFolderId)?.name ?? "Selected folder";
  }, [selectedFolderId, foldersById]);

  const sourceLabel = useMemo(() => {
    if (initialFolderId == null) return "All Files";
    return foldersById.get(initialFolderId)?.name ?? "All Files";
  }, [initialFolderId, foldersById]);

  const movingItemName = useMemo(() => getMovingTitle(title), [title]);

  const inferredMovingSong = useMemo(() => {
    if (movingSong) return movingSong;
    if (!title.startsWith("Move ")) return null;

    return songs.find((song) => song.title === movingItemName) ?? null;
  }, [movingItemName, movingSong, songs, title]);

  const inferredMovingFolder = useMemo(() => {
    if (inferredMovingSong || !title.startsWith("Move ")) return null;

    return folders.find((folder) => folder.name === movingItemName) ?? null;
  }, [folders, inferredMovingSong, movingItemName, title]);

  const headerPreview = useMemo(() => {
    if (inferredMovingSong) {
      return <SongFilePreview song={inferredMovingSong} fallbackTitle={movingItemName} />;
    }

    if (inferredMovingFolder) {
      return <FolderPreview name={inferredMovingFolder.name} />;
    }

    if (!songsLoaded) {
      return <ResolvingPreview name={movingItemName} />;
    }

    return <FolderPreview name={movingItemName} />;
  }, [inferredMovingFolder, inferredMovingSong, movingItemName, songsLoaded]);

  return (
    <ModalShell
      isOpen={isOpen}
      title={title}
      onClose={onClose}
      closeLabel="Close folder picker"
      maxWidth="max-w-[700px]"
      maxHeight="460px"
      bodyClassName="flex flex-col px-0 pb-0"
      footerClassName="justify-between gap-4 px-5 pb-4 pt-3"
      headerContent={headerPreview}
      footer={
        <>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="min-w-0 truncate rounded-none border border-[var(--border)] bg-[var(--bg-primary)] px-3.5 py-2 text-xs text-[var(--text-muted)]">
              From: <span className="font-medium text-[var(--text-primary)]">{sourceLabel}</span>
            </div>
            <div className="min-w-0 truncate rounded-none border border-[var(--border)] bg-[var(--bg-primary)] px-3.5 py-2 text-xs text-[var(--text-muted)]">
              Into: <span className="font-medium text-[var(--text-primary)]">{destinationLabel}</span>
            </div>
          </div>
          <button
            type="button"
            className={`${modalPrimaryButtonClass} min-w-[112px] px-5`}
            onClick={() => onConfirm(selectedFolderId)}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col bg-[var(--bg-tertiary)]">
        <div className="flex min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-hidden">
          {columns.map((column, columnIndex) => {
            const isRootPreviewColumn = column.parentId === "root-preview";
            const isRootColumn = column.parentId == null;
            const hasItems = column.folders.length > 0 || column.songs.length > 0;
            const columnLabel = isRootPreviewColumn
              ? "Selected"
              : isRootColumn
                ? "All Files"
                : foldersById.get(column.parentId as number)?.name || "Folder";

            return (
              <div
                key={column.parentId ?? "root"}
                className="flex min-w-[185px] flex-[1_1_0] flex-col border-r border-[var(--border)] last:border-r-0"
              >
                <div className="flex h-8 flex-shrink-0 px-3 pt-2">
                  <span
                    className={`${modalFieldLabelClass} !mb-0 flex h-6 w-full items-center rounded-full bg-[var(--bg-hover)] px-3 text-[10px] leading-none`}
                  >
                    <span className="truncate">{columnLabel}</span>
                  </span>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
                  <div className="flex min-h-full flex-col gap-0">
                    {columnIndex === 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedFolderId(null)}
                        className={`group flex h-8 flex-shrink-0 cursor-pointer items-center justify-between gap-2 rounded-none px-2.5 text-left text-xs font-medium transition ${
                          selectedFolderId == null
                            ? "bg-[var(--bg-primary)] text-[var(--text-primary)]"
                            : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <FolderGlyph small />
                          <span className="truncate">All Files</span>
                        </span>
                        <span className="text-[var(--text-muted)] transition group-hover:text-[var(--text-primary)]">›</span>
                      </button>
                    )}

                    {isRootPreviewColumn ? (
                      <div className="flex min-h-0 flex-1 items-center justify-center px-4 text-center text-xs text-[var(--text-muted)]">
                        Currently in &quot;All Files&quot;
                      </div>
                    ) : isRootColumn ? (
                      hasItems ? (
                        <div className="ml-[17px] mt-1 border-l border-[var(--border)] pl-1">
                          {column.folders.map((folder) => {
                            const isSelected = selectedFolderId === folder.id;
                            const isAncestor = selectedAncestorIds.has(folder.id);

                            return (
                              <button
                                key={folder.id}
                                type="button"
                                onClick={() => setSelectedFolderId(folder.id)}
                                className={`group flex h-8 w-full flex-shrink-0 cursor-pointer items-center justify-between gap-2 rounded-none px-2 text-left text-xs font-medium transition ${
                                  isSelected
                                    ? "bg-[var(--bg-primary)] text-[var(--text-primary)]"
                                    : isAncestor
                                      ? "bg-[var(--bg-hover)] text-[var(--text-primary)]"
                                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                                }`}
                              >
                                <span className="flex min-w-0 items-center gap-2">
                                  <FolderGlyph small />
                                  <span className="truncate">{folder.name}</span>
                                </span>
                                <span className="text-[var(--text-muted)] transition group-hover:text-[var(--text-primary)]">›</span>
                              </button>
                            );
                          })}

                          {column.songs.map((song) => (
                            <div
                              key={song.id}
                              className="flex h-8 flex-shrink-0 items-center gap-2 rounded-none px-2 text-xs text-[var(--text-secondary)]"
                            >
                              <MusicGlyph small />
                              <span className="min-w-0 truncate font-medium">{song.title}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex min-h-0 flex-1 items-center justify-center px-4 text-center text-xs text-[var(--text-muted)]">
                          Empty folder
                        </div>
                      )
                    ) : (
                      <>
                        {hasItems ? (
                          <>
                            {column.folders.map((folder) => {
                              const isSelected = selectedFolderId === folder.id;
                              const isAncestor = selectedAncestorIds.has(folder.id);

                              return (
                                <button
                                  key={folder.id}
                                  type="button"
                                  onClick={() => setSelectedFolderId(folder.id)}
                                  className={`group flex h-8 flex-shrink-0 cursor-pointer items-center justify-between gap-2 rounded-none px-2.5 text-left text-xs font-medium transition ${
                                    isSelected
                                      ? "bg-[var(--bg-primary)] text-[var(--text-primary)]"
                                      : isAncestor
                                        ? "bg-[var(--bg-hover)] text-[var(--text-primary)]"
                                        : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                                  }`}
                                >
                                  <span className="flex min-w-0 items-center gap-2">
                                    <FolderGlyph small />
                                    <span className="truncate">{folder.name}</span>
                                  </span>
                                  <span className="text-[var(--text-muted)] transition group-hover:text-[var(--text-primary)]">›</span>
                                </button>
                              );
                            })}

                            {column.songs.map((song) => (
                              <div
                                key={song.id}
                                className="flex h-8 flex-shrink-0 items-center gap-2 rounded-none px-2.5 text-xs text-[var(--text-secondary)]"
                              >
                                <MusicGlyph small />
                                <span className="min-w-0 truncate font-medium">{song.title}</span>
                              </div>
                            ))}
                          </>
                        ) : (
                          <div className="flex min-h-0 flex-1 items-center justify-center px-4 text-center text-xs text-[var(--text-muted)]">
                            Empty folder
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ModalShell>
  );
}
