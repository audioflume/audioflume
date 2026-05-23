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

  const destinationLabel = useMemo(() => {
    if (selectedFolderId == null) return "Root";
    return foldersById.get(selectedFolderId)?.name ?? "Selected folder";
  }, [selectedFolderId, foldersById]);

  const destinationPath = selectedChain.length > 0
    ? selectedChain.map((folder) => folder.name).join(" / ")
    : "Root";

  return (
    <ModalShell
      isOpen={isOpen}
      title={title}
      onClose={onClose}
      closeLabel="Close folder picker"
      centerTitle
      maxWidth="max-w-[760px]"
      maxHeight="560px"
      bodyClassName="pb-0"
      footerClassName="justify-between gap-4 px-6 pb-6 pt-3"
      footer={
        <>
          <div className="min-w-0 truncate rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-3.5 py-2 text-xs text-[var(--text-muted)]">
            Into: <span className="font-medium text-[var(--text-secondary)]">{destinationLabel}</span>
          </div>
          <button
            type="button"
            className={`${modalPrimaryButtonClass} min-w-[124px] px-5`}
            onClick={() => onConfirm(selectedFolderId)}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="rounded-[18px] border border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-4 py-3">
          <div className="min-w-0">
            <div className={`${modalFieldLabelClass} !mb-0`}>Destination</div>
            <div className="mt-1 truncate text-sm font-medium tracking-[-0.02em] text-[var(--text-primary)]">
              {destinationPath}
            </div>
          </div>
          <div className="hidden rounded-full border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-1 text-[11px] font-medium text-[var(--text-muted)] sm:block">
            Browse folders
          </div>
        </div>

        <div className="flex h-[clamp(260px,46vh,340px)] min-h-0 min-w-0 overflow-x-auto overflow-y-hidden">
          {columns.map((column, columnIndex) => {
            const isRootPreviewColumn = column.parentId === "root-preview";
            const hasItems = column.folders.length > 0 || column.songs.length > 0;

            return (
              <div
                key={column.parentId ?? "root"}
                className="flex min-w-[168px] flex-[1_1_0] flex-col border-r border-[var(--border)] last:border-r-0 sm:min-w-[190px]"
              >
                <div
                  className={`${modalFieldLabelClass} !mb-0 flex-shrink-0 border-b border-[var(--border)] px-4 py-2.5`}
                >
                  {isRootPreviewColumn
                    ? "Selected"
                    : column.parentId == null
                      ? "Root"
                      : foldersById.get(column.parentId as number)?.name || "Folder"}
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-2.5 py-2.5">
                  <div className="grid gap-1">
                    {columnIndex === 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedFolderId(null)}
                        className={`group flex min-h-10 cursor-pointer items-center justify-between gap-2.5 rounded-xl px-3 text-left text-xs font-medium transition ${
                          selectedFolderId == null
                            ? "border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
                            : "border border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          <FolderGlyph small />
                          <span className="truncate">Root</span>
                        </span>
                        <span className="text-[var(--text-muted)] transition group-hover:text-[var(--text-primary)]">›</span>
                      </button>
                    )}

                    {column.folders.map((folder) => {
                      const isSelected = selectedFolderId === folder.id;

                      return (
                        <button
                          key={folder.id}
                          type="button"
                          onClick={() => setSelectedFolderId(folder.id)}
                          className={`group flex min-h-10 cursor-pointer items-center justify-between gap-2.5 rounded-xl px-3 text-left text-xs font-medium transition ${
                            isSelected
                              ? "border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
                              : "border border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-2.5">
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
                        className="flex min-h-10 items-center gap-2.5 rounded-xl px-3 text-xs text-[var(--text-secondary)]"
                      >
                        <MusicGlyph small />
                        <span className="min-w-0 truncate font-medium">{song.title}</span>
                      </div>
                    ))}

                    {!hasItems && (
                      <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-primary)] px-4 text-center text-xs text-[var(--text-muted)]">
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
