"use client";

import { useEffect, useMemo, useState } from "react";
import ModalShell from "@/components/ModalShell";
import { modalPrimaryButtonClass } from "@/components/uiClasses";
import {
  FolderGlyph,
  MusicGlyph,
} from "@/components/project-browser/ProjectBrowserGlyphs";
import type { ProjectFolder } from "@/lib/types";

type ProjectFolderPickerModalProps = {
  isOpen: boolean;
  folders: ProjectFolder[];
  initialFolderId: number | null;
  title?: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: (folderId: number | null) => void;
};

type ProjectPickerSong = {
  id: string;
  title: string;
  artist?: string;
  project_folder_id?: number | null;
};

function sortFolders(folderA: ProjectFolder, folderB: ProjectFolder) {
  const positionA = folderA.position ?? 0;
  const positionB = folderB.position ?? 0;

  return positionA - positionB || folderA.name.localeCompare(folderB.name);
}

function sortSongs(songA: ProjectPickerSong, songB: ProjectPickerSong) {
  return songA.title.localeCompare(songB.title, undefined, { sensitivity: "base" });
}

export default function ProjectFolderPickerModal({
  isOpen,
  folders,
  initialFolderId,
  title = "Choose Folder",
  confirmLabel = "Move Here",
  onClose,
  onConfirm,
}: ProjectFolderPickerModalProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(initialFolderId);
  const [songs, setSongs] = useState<ProjectPickerSong[]>([]);

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
      return;
    }

    let cancelled = false;

    async function loadProjectSongs() {
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

  const columns = useMemo(() => {
    const parentIds = [null, ...selectedChain.map((folder) => folder.id)];
    const visibleParentIds = parentIds.length === 1 ? [null, "root-preview"] : parentIds;

    return visibleParentIds.map((parentId) => {
      if (parentId === "root-preview") {
        return {
          parentId,
          folders: [] as ProjectFolder[],
          songs: songs.filter((song) => (song.project_folder_id ?? null) === null).sort(sortSongs),
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

  // Label shown beneath the button indicating where the item will land
  const destinationLabel = useMemo(() => {
    if (selectedFolderId == null) return "Root";
    return foldersById.get(selectedFolderId)?.name ?? "Selected folder";
  }, [selectedFolderId, foldersById]);

  return (
    <ModalShell
      isOpen={isOpen}
      title={title}
      onClose={onClose}
      closeLabel="Close folder picker"
      centerTitle
      maxWidth="max-w-[740px]"
      maxHeight="500px"
      bodyClassName="pb-0"
      footerClassName="justify-center flex-col gap-1"
      footer={
        <>
          <button
            type="button"
            className={`${modalPrimaryButtonClass} w-full`}
            onClick={() => onConfirm(selectedFolderId)}
          >
            {confirmLabel}
          </button>
          <span className="text-[11px] text-[var(--text-muted)]">
            Into: <span className="font-medium text-[var(--text-secondary)]">{destinationLabel}</span>
          </span>
        </>
      }
    >
      {/* Column browser — edge-to-edge with border-t separator */}
      <div className="-mx-5 border-t border-[var(--border)]">
        <div className="flex h-[300px] min-w-0 overflow-x-auto overflow-y-hidden">
          {columns.map((column, columnIndex) => {
            const isRootPreviewColumn = column.parentId === "root-preview";
            const hasItems = column.folders.length > 0 || column.songs.length > 0;

            return (
              <div
                key={column.parentId ?? "root"}
                className="flex min-w-[150px] flex-[1_1_0] flex-col border-r border-[var(--border)] last:border-r-0 sm:min-w-[170px]"
              >
                {/* Column header */}
                <div className="flex-shrink-0 px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  {isRootPreviewColumn
                    ? "Selected"
                    : column.parentId == null
                      ? "Root"
                      : foldersById.get(column.parentId as number)?.name || "Folder"}
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
                  <div className="grid gap-0.5">
                    {/* Root option in first column */}
                    {columnIndex === 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedFolderId(null)}
                        className={`group flex h-9 cursor-pointer items-center justify-between gap-2.5 rounded-lg px-2.5 text-left text-xs font-medium transition-colors ${
                          selectedFolderId == null
                            ? "bg-[var(--accent)] text-black"
                            : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <FolderGlyph small />
                          <span className="truncate">Root</span>
                        </span>
                        <span className={`text-sm ${selectedFolderId == null ? "opacity-70" : "opacity-40"}`}>›</span>
                      </button>
                    )}

                    {/* Folder rows */}
                    {column.folders.map((folder) => {
                      const isSelected = selectedFolderId === folder.id;

                      return (
                        <button
                          key={folder.id}
                          type="button"
                          onClick={() => setSelectedFolderId(folder.id)}
                          className={`group flex h-9 cursor-pointer items-center justify-between gap-2.5 rounded-lg px-2.5 text-left text-xs font-medium transition-colors ${
                            isSelected
                              ? "bg-[var(--accent)] text-black"
                              : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <FolderGlyph small />
                            <span className="truncate">{folder.name}</span>
                          </span>
                          <span className={`text-sm ${isSelected ? "opacity-70" : "opacity-40"}`}>›</span>
                        </button>
                      );
                    })}

                    {/* Song rows (non-interactive) */}
                    {column.songs.map((song) => (
                      <div
                        key={song.id}
                        className="flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-xs text-[var(--text-muted)]"
                      >
                        <MusicGlyph small />
                        <span className="min-w-0 truncate font-medium">{song.title}</span>
                      </div>
                    ))}

                    {/* Empty state */}
                    {!hasItems && (
                      <div className="flex h-[220px] items-center justify-center rounded-lg px-4 text-center text-xs text-[var(--text-muted)]">
                        {isRootPreviewColumn ? "Root selected" : "Empty folder"}
                      </div>
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
