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

function formatFolderMeta(folder: ProjectFolderWithCounts, childCount: number) {
  const fileCount = folder.recursive_asset_count ?? folder.asset_count ?? 0;
  const fileLabel = `${fileCount} ${fileCount === 1 ? "file" : "files"}`;
  const folderLabel = `${childCount} ${childCount === 1 ? "folder" : "folders"}`;

  if (childCount > 0) return `${fileLabel} · ${folderLabel}`;
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
  const [direction, setDirection] = useState<"forward" | "back">("forward");

  const foldersById = useMemo(
    () => new Map(folders.map((folder) => [folder.id, folder])),
    [folders],
  );

  useEffect(() => {
    if (!isOpen) return;

    setSelectedFolderId(initialFolderId);
    setQuery("");
    setDirection("forward");
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

  const selectedFolder = selectedFolderId == null ? null : foldersById.get(selectedFolderId) ?? null;
  const selectedPath = selectedFolder ? getFolderPath(selectedFolder, foldersById) : "Root";

  const currentFolders = useMemo(
    () =>
      folders
        .filter((folder) => folder.parent_folder_id === selectedFolderId)
        .sort(sortFolders),
    [folders, selectedFolderId],
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
      .slice(0, 14);
  }, [folders, foldersById, query]);

  function selectFolder(folderId: number | null, nextDirection: "forward" | "back" = "forward") {
    setDirection(nextDirection);
    setSelectedFolderId(folderId);
    setQuery("");
  }

  const parentFolderId = selectedFolder?.parent_folder_id ?? null;
  const pathParts = ["Root", ...selectedChain.map((folder) => folder.name)];
  const transitionClass = direction === "forward" ? "animate-[moveTrayIn_0.18s_ease-out]" : "animate-[moveTrayBack_0.18s_ease-out]";

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
      footer={
        <div className="sticky bottom-0 flex w-full items-center justify-between gap-4 border-t border-[var(--border)] bg-[var(--bg-primary)] px-1 py-1">
          <div className="min-w-0 text-left">
            <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">
              Move destination
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
      <style jsx global>{`
        @keyframes moveTrayIn {
          from {
            opacity: 0;
            transform: translateX(10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes moveTrayBack {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>

      <div className="-mx-1 flex flex-col gap-4">
        <div className="rounded-[22px] border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
                Destination path
              </div>
              <div className="mt-2 max-w-full truncate font-[family-name:var(--font-instrument-sans)] text-[28px] font-medium leading-none tracking-[-0.055em] text-[var(--text-primary)]">
                {selectedPath}
              </div>
              <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
                {pathParts.map((part, index) => {
                  const folder = index === 0 ? null : selectedChain[index - 1];
                  const isLast = index === pathParts.length - 1;

                  return (
                    <span key={`${part}-${index}`} className="flex min-w-0 items-center gap-1.5">
                      {index > 0 && <span className="text-[var(--text-muted)]">/</span>}
                      <button
                        type="button"
                        onClick={() => selectFolder(folder?.id ?? null, "back")}
                        className={`max-w-[140px] cursor-pointer truncate rounded-full px-2 py-1 transition ${
                          isLast
                            ? "bg-[var(--text-primary)] text-[var(--bg-primary)]"
                            : "bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover-strong)] hover:text-[var(--text-primary)]"
                        }`}
                      >
                        {part}
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>

            {selectedFolderId !== null && (
              <button
                type="button"
                onClick={() => selectFolder(parentFolderId, "back")}
                className="mt-1 shrink-0 cursor-pointer rounded-full bg-[var(--bg-hover)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover-strong)] hover:text-[var(--text-primary)]"
              >
                Back
              </button>
            )}
          </div>

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="mt-4 h-10 w-full rounded-full border border-[var(--border)] bg-[var(--bg-primary)] px-4 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--text-muted)]"
            placeholder="Search destinations..."
          />
        </div>

        <div className="rounded-[22px] border border-[var(--border)] bg-[var(--bg-primary)] p-3">
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <div>
              <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
                {query.trim() ? "Search results" : "Folder tray"}
              </div>
              <div className="mt-1 text-xs text-[var(--text-secondary)]">
                {query.trim()
                  ? `${searchResults.length} matching destinations`
                  : currentFolders.length > 0
                    ? "Choose a folder below, or move directly to the current destination."
                    : "No folders inside this destination."}
              </div>
            </div>

            {!query.trim() && (
              <button
                type="button"
                onClick={() => onConfirm(selectedFolderId)}
                className="shrink-0 cursor-pointer rounded-full bg-[var(--bg-hover)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover-strong)] hover:text-[var(--text-primary)]"
              >
                Use this destination
              </button>
            )}
          </div>

          <div key={`${selectedFolderId ?? "root"}-${query.trim() ? "search" : "tray"}`} className={`${transitionClass} max-h-[290px] overflow-y-auto pr-1`}>
            {query.trim() ? (
              searchResults.length > 0 ? (
                <div className="grid gap-2">
                  {searchResults.map(({ folder, path }) => (
                    <button
                      key={folder.id}
                      type="button"
                      onClick={() => selectFolder(folder.id)}
                      className="group flex min-h-[58px] cursor-pointer items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2.5 text-left transition hover:border-[var(--border-hover)] hover:bg-[var(--bg-hover)]"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-hover)] text-[var(--text-primary)]">
                          <FolderIcon size={15} />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-[var(--text-primary)]">
                            {folder.name}
                          </span>
                          <span className="mt-0.5 block truncate text-[11px] text-[var(--text-secondary)]">
                            {path}
                          </span>
                        </span>
                      </span>
                      <span className="text-lg leading-none text-[var(--text-muted)] transition group-hover:text-[var(--text-primary)]">
                        ›
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex min-h-[170px] items-center justify-center rounded-2xl border border-dashed border-[var(--border)] text-xs text-[var(--text-secondary)]">
                  No folders match your search.
                </div>
              )
            ) : currentFolders.length > 0 ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(138px,1fr))] gap-2.5">
                {currentFolders.map((folder) => {
                  const childCount = folders.filter((child) => child.parent_folder_id === folder.id).length;

                  return (
                    <button
                      key={folder.id}
                      type="button"
                      onClick={() => selectFolder(folder.id)}
                      className="group min-h-[118px] cursor-pointer rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-3 text-left transition hover:-translate-y-0.5 hover:border-[var(--border-hover)] hover:bg-[var(--bg-hover)]"
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--bg-hover)] text-[var(--text-primary)] transition group-hover:bg-[var(--bg-hover-strong)]">
                          <FolderIcon size={16} />
                        </span>
                        {childCount > 0 && (
                          <span className="text-lg leading-none text-[var(--text-muted)] transition group-hover:text-[var(--text-primary)]">
                            ›
                          </span>
                        )}
                      </span>
                      <span className="mt-4 block truncate text-sm font-medium text-[var(--text-primary)]">
                        {folder.name}
                      </span>
                      <span className="mt-1 block truncate text-[11px] text-[var(--text-secondary)]">
                        {formatFolderMeta(folder as ProjectFolderWithCounts, childCount)}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex min-h-[170px] items-center justify-center rounded-2xl border border-dashed border-[var(--border)] text-xs text-[var(--text-secondary)]">
                Move here, or go back to choose another destination.
              </div>
            )}
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
