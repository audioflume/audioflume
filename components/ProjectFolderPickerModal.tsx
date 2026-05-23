"use client";

import { useEffect, useMemo, useState } from "react";
import FolderIcon from "@/components/icons/FolderIcon";
import ModalShell from "@/components/ModalShell";
import { modalPrimaryButtonClass } from "@/components/uiClasses";
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

type ProjectFolderWithCounts = ProjectFolder & {
  child_count?: number;
  asset_count?: number;
  recursive_asset_count?: number;
};

function getFolderPath(folder: ProjectFolder, foldersById: Map<number, ProjectFolder>) {
  const names = [folder.name];
  const visited = new Set<number>([folder.id]);
  let current =
    folder.parent_folder_id == null ? null : foldersById.get(folder.parent_folder_id) ?? null;

  while (current && !visited.has(current.id)) {
    names.unshift(current.name);
    visited.add(current.id);
    current =
      current.parent_folder_id == null ? null : foldersById.get(current.parent_folder_id) ?? null;
  }

  return names.join(" / ");
}

function sortFolders(folderA: ProjectFolder, folderB: ProjectFolder) {
  const positionA = folderA.position ?? 0;
  const positionB = folderB.position ?? 0;

  return positionA - positionB || folderA.name.localeCompare(folderB.name);
}

function formatFolderMeta(folder: ProjectFolderWithCounts) {
  const fileCount = folder.recursive_asset_count ?? folder.asset_count ?? 0;
  const folderCount = folder.child_count ?? 0;
  const fileLabel = `${fileCount} ${fileCount === 1 ? "file" : "files"}`;
  const folderLabel = `${folderCount} ${folderCount === 1 ? "folder" : "folders"}`;

  if (folderCount > 0) return `${fileLabel} · ${folderLabel}`;
  return fileLabel;
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
  const [query, setQuery] = useState("");

  const foldersById = useMemo(
    () => new Map(folders.map((folder) => [folder.id, folder])),
    [folders],
  );

  useEffect(() => {
    if (!isOpen) return;

    setSelectedFolderId(initialFolderId);
    setQuery("");
  }, [isOpen, initialFolderId]);

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

  const currentFolders = useMemo(
    () =>
      folders
        .filter((folder) => folder.parent_folder_id === selectedFolderId)
        .sort(sortFolders),
    [folders, selectedFolderId],
  );

  const rootFolders = useMemo(
    () => folders.filter((folder) => folder.parent_folder_id == null).sort(sortFolders),
    [folders],
  );

  const searchResults = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    if (!cleanQuery) return [];

    return folders
      .filter((folder) => getFolderPath(folder, foldersById).toLowerCase().includes(cleanQuery))
      .map((folder) => ({
        folder,
        path: getFolderPath(folder, foldersById),
      }))
      .slice(0, 12);
  }, [folders, foldersById, query]);

  const selectedFolder = selectedFolderId == null ? null : foldersById.get(selectedFolderId) ?? null;
  const selectedPath = selectedFolder ? getFolderPath(selectedFolder, foldersById) : "Root";
  const shownFolders = query.trim() ? searchResults.map((result) => result.folder) : currentFolders;
  const boardTitle = selectedFolder?.name ?? "Root";
  const boardSubtitle = selectedFolderId == null ? "Top-level destinations" : selectedPath;

  return (
    <ModalShell
      isOpen={isOpen}
      title={title}
      onClose={onClose}
      closeLabel="Close folder picker"
      centerTitle
      maxWidth="max-w-[720px]"
      maxHeight="560px"
      bodyClassName="pb-0"
      footer={
        <div className="flex w-full items-center justify-between gap-4">
          <div className="min-w-0 text-left">
            <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">
              Destination
            </div>
            <div className="mt-1 truncate text-xs font-medium text-[var(--text-primary)]">
              {selectedPath}
            </div>
          </div>
          <button
            type="button"
            className={modalPrimaryButtonClass}
            onClick={() => onConfirm(selectedFolderId)}
          >
            {confirmLabel}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--text-muted)]"
            placeholder="Search folders..."
          />

          <div className="mt-3 flex min-w-0 flex-wrap items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => {
                setSelectedFolderId(null);
                setQuery("");
              }}
              className={`cursor-pointer rounded-full px-2.5 py-1 transition ${
                selectedFolderId == null
                  ? "bg-[var(--text-primary)] text-[var(--bg-primary)]"
                  : "bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover-strong)] hover:text-[var(--text-primary)]"
              }`}
            >
              Root
            </button>

            {selectedChain.map((folder) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => {
                  setSelectedFolderId(folder.id);
                  setQuery("");
                }}
                className={`min-w-0 cursor-pointer rounded-full px-2.5 py-1 transition ${
                  selectedFolderId === folder.id
                    ? "bg-[var(--text-primary)] text-[var(--bg-primary)]"
                    : "bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover-strong)] hover:text-[var(--text-primary)]"
                }`}
              >
                <span className="block max-w-[160px] truncate">{folder.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)]">
          <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-4 py-3">
            <div className="min-w-0">
              <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
                Destination Board
              </div>
              <div className="mt-1 truncate text-base font-medium text-[var(--text-primary)]">
                {query.trim() ? "Search results" : boardTitle}
              </div>
              <div className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">
                {query.trim() ? `${searchResults.length} matching destinations` : boardSubtitle}
              </div>
            </div>

            {selectedFolderId != null && !query.trim() && (
              <button
                type="button"
                onClick={() => {
                  const parentId = selectedFolder?.parent_folder_id ?? null;
                  setSelectedFolderId(parentId);
                }}
                className="cursor-pointer rounded-full bg-[var(--bg-hover)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover-strong)] hover:text-[var(--text-primary)]"
              >
                Back
              </button>
            )}
          </div>

          <div className="max-h-[310px] overflow-y-auto p-3">
            {!query.trim() && selectedFolderId !== null && (
              <button
                type="button"
                onClick={() => setSelectedFolderId(selectedFolderId)}
                className="mb-3 flex w-full cursor-pointer items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg-hover)] px-3 py-3 text-left transition hover:bg-[var(--bg-hover-strong)]"
              >
                <span className="min-w-0">
                  <span className="block text-xs font-medium text-[var(--text-primary)]">
                    Use current folder
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-[var(--text-secondary)]">
                    Move directly into {selectedPath}
                  </span>
                </span>
                <span className="text-[11px] font-medium text-[var(--text-primary)]">Selected</span>
              </button>
            )}

            {!query.trim() && selectedFolderId === null && rootFolders.length === 0 ? (
              <div className="flex min-h-[170px] items-center justify-center rounded-xl border border-dashed border-[var(--border)] text-xs text-[var(--text-secondary)]">
                No folders yet. You can move this to Root.
              </div>
            ) : shownFolders.length > 0 ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2.5">
                {query.trim()
                  ? searchResults.map(({ folder, path }) => (
                      <button
                        key={folder.id}
                        type="button"
                        onClick={() => {
                          setSelectedFolderId(folder.id);
                          setQuery("");
                        }}
                        className="group min-h-[92px] cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-3 text-left transition hover:border-[var(--border-hover)] hover:bg-[var(--bg-hover)]"
                      >
                        <span className="flex items-center gap-2 text-[var(--text-primary)]">
                          <FolderIcon size={15} />
                          <span className="min-w-0 truncate text-xs font-medium">{folder.name}</span>
                        </span>
                        <span className="mt-2 block line-clamp-2 text-[11px] leading-snug text-[var(--text-secondary)]">
                          {path}
                        </span>
                      </button>
                    ))
                  : currentFolders.map((folder) => {
                      const childCount = folders.filter((child) => child.parent_folder_id === folder.id).length;

                      return (
                        <button
                          key={folder.id}
                          type="button"
                          onClick={() => setSelectedFolderId(folder.id)}
                          className="group min-h-[104px] cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-3 text-left transition hover:border-[var(--border-hover)] hover:bg-[var(--bg-hover)]"
                        >
                          <span className="flex items-start justify-between gap-2">
                            <span className="flex min-w-0 items-center gap-2 text-[var(--text-primary)]">
                              <FolderIcon size={15} />
                              <span className="truncate text-xs font-medium">{folder.name}</span>
                            </span>
                            {childCount > 0 && (
                              <span className="text-sm leading-none text-[var(--text-muted)] transition group-hover:text-[var(--text-primary)]">
                                ›
                              </span>
                            )}
                          </span>
                          <span className="mt-3 block text-[11px] text-[var(--text-secondary)]">
                            {formatFolderMeta(folder as ProjectFolderWithCounts)}
                          </span>
                          {childCount > 0 && (
                            <span className="mt-1 block text-[10px] uppercase tracking-[0.1em] text-[var(--text-muted)]">
                              Open folder
                            </span>
                          )}
                        </button>
                      );
                    })}
              </div>
            ) : (
              <div className="flex min-h-[170px] items-center justify-center rounded-xl border border-dashed border-[var(--border)] text-xs text-[var(--text-secondary)]">
                {query.trim() ? "No folders match your search." : "No folders inside this destination."}
              </div>
            )}
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
