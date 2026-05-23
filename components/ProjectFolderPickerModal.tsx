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
      footer={
        <button
          type="button"
          className={modalPrimaryButtonClass}
          onClick={() => onConfirm(selectedFolderId)}
        >
          {confirmLabel}
        </button>
      }
    >
      <div className="overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="flex h-[320px] min-w-0 overflow-x-auto overflow-y-hidden">
          {columns.map((column, columnIndex) => {
            const isRootPreviewColumn = column.parentId === "root-preview";
            const hasItems = column.folders.length > 0 || column.songs.length > 0;

            return (
              <div
                key={column.parentId ?? "root"}
                className="flex min-w-[150px] flex-[1_1_0] flex-col border-r border-[var(--border)] last:border-r-0 sm:min-w-[170px]"
              >
                <div className="flex-shrink-0 px-3 pb-1.5 pt-3 text-[11px] font-medium text-[var(--text-muted)]">
                  {isRootPreviewColumn
                    ? "Selected"
                    : column.parentId == null
                      ? "Root"
                      : foldersById.get(column.parentId)?.name || "Folder"}
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
                  <div className="grid gap-1">
                    {columnIndex === 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedFolderId(null)}
                        className={`flex h-8 cursor-pointer items-center justify-between gap-2 rounded-full px-2.5 text-left text-xs transition ${
                          selectedFolderId == null
                            ? "bg-[var(--text-primary)] text-[var(--bg-primary)]"
                            : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover-strong)] hover:text-[var(--text-primary)]"
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <FolderGlyph small />
                          <span className="truncate font-medium">Root</span>
                        </span>
                        <span className="text-sm opacity-60">›</span>
                      </button>
                    )}

                    {column.folders.map((folder) => {
                      const isSelected = selectedFolderId === folder.id;

                      return (
                        <button
                          key={folder.id}
                          type="button"
                          onClick={() => setSelectedFolderId(folder.id)}
                          className={`group flex h-8 cursor-pointer items-center justify-between gap-2 rounded-full px-2.5 text-left text-xs transition ${
                            isSelected
                              ? "bg-[var(--text-primary)] text-[var(--bg-primary)]"
                              : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover-strong)] hover:text-[var(--text-primary)]"
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <FolderGlyph small />
                            <span className="truncate font-medium">{folder.name}</span>
                          </span>
                          <span className="text-sm opacity-60">›</span>
                        </button>
                      );
                    })}

                    {column.songs.map((song) => (
                      <div
                        key={song.id}
                        className="flex h-8 items-center gap-2 rounded-full px-2.5 text-left text-xs text-[var(--text-secondary)]"
                      >
                        <MusicGlyph small />
                        <span className="min-w-0 truncate font-medium">{song.title}</span>
                      </div>
                    ))}

                    {!hasItems && (
                      <div className="flex h-[250px] items-center justify-center rounded-xl border border-dashed border-[var(--border)] px-4 text-center text-xs text-[var(--text-muted)]">
                        {isRootPreviewColumn ? "Root selected" : "No folders or files"}
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
