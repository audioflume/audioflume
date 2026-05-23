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
  const childCount = folder.child_count ?? 0;
  const fileLabel = `${fileCount} ${fileCount === 1 ? "file" : "files"}`;
  const childLabel = `${childCount} ${childCount === 1 ? "folder" : "folders"}`;

  if (childCount > 0) return `${fileLabel} · ${childLabel}`;
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

  const columns = useMemo(() => {
    const parentIds = [null, ...selectedChain.map((folder) => folder.id)];

    return parentIds.map((parentId) => ({
      parentId,
      folders: folders
        .filter((folder) => folder.parent_folder_id === parentId)
        .sort(sortFolders),
    }));
  }, [folders, selectedChain]);

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

  return (
    <ModalShell
      isOpen={isOpen}
      title={title}
      onClose={onClose}
      closeLabel="Close folder picker"
      centerTitle
      maxWidth="max-w-[740px]"
      maxHeight="540px"
      bodyClassName="pb-0"
      footer={
        <div className="flex w-full items-center justify-between gap-4">
          <div className="min-w-0 text-left">
            <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
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
      <div className="flex flex-col gap-3">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--text-muted)]"
          placeholder="Search folders..."
        />

        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)]">
          <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3">
            <div className="min-w-0">
              <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
                Move destination
              </div>
              <div className="mt-1 truncate text-sm font-medium text-[var(--text-primary)]">
                {selectedPath}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedFolderId(null)}
              className="shrink-0 cursor-pointer rounded-full bg-[var(--bg-hover)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover-strong)] hover:text-[var(--text-primary)]"
            >
              Root
            </button>
          </div>

          {query.trim() ? (
            <div className="max-h-[310px] overflow-y-auto p-2">
              {searchResults.length > 0 ? (
                <div className="grid gap-1.5">
                  {searchResults.map(({ folder, path }) => (
                    <button
                      key={folder.id}
                      type="button"
                      onClick={() => {
                        setSelectedFolderId(folder.id);
                        setQuery("");
                      }}
                      className={`flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded-xl px-3 text-left text-xs transition ${
                        selectedFolderId === folder.id
                          ? "bg-[var(--text-primary)] text-[var(--bg-primary)]"
                          : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover-strong)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <FolderIcon size={14} />
                        <span className="min-w-0 truncate">{path}</span>
                      </span>
                      <span className="text-sm opacity-60">›</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex min-h-[160px] items-center justify-center text-xs text-[var(--text-secondary)]">
                  No folders match your search.
                </div>
              )}
            </div>
          ) : (
            <div className="flex min-h-[300px] max-h-[320px] overflow-x-auto">
              {columns.map((column, columnIndex) => (
                <div
                  key={column.parentId ?? "root"}
                  className="min-w-[196px] flex-1 border-r border-[var(--border)] last:border-r-0"
                >
                  <div className="border-b border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
                    {column.parentId == null
                      ? "Root"
                      : foldersById.get(column.parentId)?.name || "Folder"}
                  </div>

                  <div className="grid gap-1.5 p-2">
                    {columnIndex === 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedFolderId(null)}
                        className={`flex h-10 cursor-pointer items-center gap-2 rounded-xl px-3 text-left text-xs transition ${
                          selectedFolderId == null
                            ? "bg-[var(--text-primary)] text-[var(--bg-primary)]"
                            : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover-strong)] hover:text-[var(--text-primary)]"
                        }`}
                      >
                        <FolderIcon size={14} />
                        <span className="truncate font-medium">Root</span>
                      </button>
                    )}

                    {column.folders.length > 0 ? (
                      column.folders.map((folder) => {
                        const hasChildren = folders.some(
                          (child) => child.parent_folder_id === folder.id,
                        );
                        const isSelected = selectedFolderId === folder.id;

                        return (
                          <button
                            key={folder.id}
                            type="button"
                            onClick={() => setSelectedFolderId(folder.id)}
                            className={`group flex min-h-12 cursor-pointer items-center justify-between gap-2 rounded-xl px-3 text-left text-xs transition ${
                              isSelected
                                ? "bg-[var(--text-primary)] text-[var(--bg-primary)]"
                                : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover-strong)] hover:text-[var(--text-primary)]"
                            }`}
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <FolderIcon size={14} />
                              <span className="min-w-0">
                                <span className="block truncate font-medium">{folder.name}</span>
                                <span
                                  className={`mt-0.5 block truncate text-[10px] ${
                                    isSelected
                                      ? "text-[color-mix(in_srgb,var(--bg-primary)_72%,transparent)]"
                                      : "text-[var(--text-muted)]"
                                  }`}
                                >
                                  {formatFolderMeta(folder as ProjectFolderWithCounts)}
                                </span>
                              </span>
                            </span>
                            {hasChildren && <span className="text-sm opacity-60">›</span>}
                          </button>
                        );
                      })
                    ) : (
                      <div className="flex min-h-[160px] items-center justify-center rounded-xl border border-dashed border-[var(--border)] px-4 text-center text-xs text-[var(--text-muted)]">
                        No folders
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
}
