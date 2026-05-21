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
        .sort((a, b) => {
          const positionA = a.position ?? 0;
          const positionB = b.position ?? 0;

          return positionA - positionB || a.name.localeCompare(b.name);
        }),
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
      maxWidth="max-w-[720px]"
      maxHeight="520px"
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
      <div className="flex flex-col gap-3">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--text-muted)]"
          placeholder="Search folders..."
        />

        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2 text-[11px] text-[var(--text-secondary)]">
            <span className="truncate">Destination: {selectedPath}</span>
            <button
              type="button"
              onClick={() => setSelectedFolderId(null)}
              className="cursor-pointer text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
            >
              Root
            </button>
          </div>

          {query.trim() ? (
            <div className="max-h-[300px] overflow-y-auto p-2">
              {searchResults.length > 0 ? (
                <div className="grid gap-1">
                  {searchResults.map(({ folder, path }) => (
                    <button
                      key={folder.id}
                      type="button"
                      onClick={() => setSelectedFolderId(folder.id)}
                      className={`flex h-9 cursor-pointer items-center gap-2 rounded-lg px-2.5 text-left text-xs transition ${
                        selectedFolderId === folder.id
                          ? "bg-[var(--text-primary)] text-[var(--bg-primary)]"
                          : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover-strong)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      <FolderIcon size={14} />
                      <span className="truncate">{path}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex min-h-[120px] items-center justify-center text-xs text-[var(--text-secondary)]">
                  No folders match your search.
                </div>
              )}
            </div>
          ) : (
            <div className="flex min-h-[280px] overflow-x-auto">
              {columns.map((column, columnIndex) => (
                <div
                  key={column.parentId ?? "root"}
                  className="min-w-[185px] flex-1 border-r border-[var(--border)] last:border-r-0"
                >
                  <div className="border-b border-[var(--border)] px-3 py-2 text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">
                    {column.parentId == null
                      ? "Root"
                      : foldersById.get(column.parentId)?.name || "Folder"}
                  </div>

                  <div className="grid gap-1 p-2">
                    {columnIndex === 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedFolderId(null)}
                        className={`flex h-9 cursor-pointer items-center gap-2 rounded-lg px-2.5 text-left text-xs transition ${
                          selectedFolderId == null
                            ? "bg-[var(--text-primary)] text-[var(--bg-primary)]"
                            : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover-strong)] hover:text-[var(--text-primary)]"
                        }`}
                      >
                        <FolderIcon size={14} />
                        <span className="truncate">Root</span>
                      </button>
                    )}

                    {column.folders.length > 0 ? (
                      column.folders.map((folder) => (
                        <button
                          key={folder.id}
                          type="button"
                          onClick={() => setSelectedFolderId(folder.id)}
                          className={`flex h-9 cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 text-left text-xs transition ${
                            selectedFolderId === folder.id
                              ? "bg-[var(--text-primary)] text-[var(--bg-primary)]"
                              : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover-strong)] hover:text-[var(--text-primary)]"
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <FolderIcon size={14} />
                            <span className="truncate">{folder.name}</span>
                          </span>
                          {folders.some((child) => child.parent_folder_id === folder.id) && (
                            <span className="text-[13px] opacity-60">›</span>
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="px-2 py-8 text-center text-xs text-[var(--text-muted)]">
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
