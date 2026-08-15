"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import DropdownShell from "@/components/DropdownShell";
import MoreIcon from "@/components/icons/MoreIcon";
import PlusIcon from "@/components/icons/PlusIcon";
import PlaylistIcon from "@/components/icons/PlaylistIcon";
import { primaryPillButtonClass } from "@/components/uiClasses";
import type { CuratedPlaylist } from "@/lib/curatedPlaylists";

export const PLAYLIST_MANAGER_GRID_CLASS =
  "grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-3 xl:grid-cols-5";

const PLAYLIST_MANAGER_ARTWORK_SIZES =
  "(min-width: 1280px) 20vw, (min-width: 768px) 33vw, 50vw";

export function sortPlaylistNewestFirst(
  a: CuratedPlaylist,
  b: CuratedPlaylist,
) {
  const aTime = a.created_at ? Date.parse(a.created_at) : 0;
  const bTime = b.created_at ? Date.parse(b.created_at) : 0;

  if (aTime !== bTime) return bTime - aTime;
  return b.id - a.id;
}

export function PlaylistManagerArtwork({
  playlist,
}: {
  playlist: CuratedPlaylist;
}) {
  return playlist.cover_image_url ? (
    <Image
      src={playlist.cover_image_url}
      alt={playlist.name}
      fill
      sizes={PLAYLIST_MANAGER_ARTWORK_SIZES}
      className="object-cover"
      unoptimized
    />
  ) : (
    <span className="absolute inset-0 flex items-center justify-center text-[var(--text-muted)]">
      <PlaylistIcon size={18} />
    </span>
  );
}

type LibraryCardProps = {
  playlist: CuratedPlaylist;
  editHref: string;
  meta: string;
  editLabel: string;
  deleteLabel: string;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  deleting: boolean;
  onDeletePlaylist: (playlist: CuratedPlaylist) => void | Promise<void>;
};

function PlaylistManagerLibraryCard({
  playlist,
  editHref,
  meta,
  editLabel,
  deleteLabel,
  menuOpen,
  onMenuOpenChange,
  deleting,
  onDeletePlaylist,
}: LibraryCardProps) {
  return (
    <article className="group min-w-0">
      <div className="relative aspect-[16/9] overflow-hidden bg-[var(--bg-tertiary)]">
        <Link href={editHref} className="absolute inset-0 block">
          <PlaylistManagerArtwork playlist={playlist} />
        </Link>
      </div>

      <div className="mt-2.5 flex min-w-0 items-start gap-3">
        <Link href={editHref} className="min-w-0 flex-1">
          <h3 className="truncate text-[13px] font-medium tracking-[-0.02em] text-[var(--text-primary)]">
            {playlist.name}
          </h3>
          <p className="mt-0.5 truncate text-[10px] text-[var(--text-muted)]">
            {meta}
          </p>
        </Link>

        <DropdownShell
          open={menuOpen}
          onOpenChange={onMenuOpenChange}
          placement="bottom-end"
          trigger={() => (
            <button
              type="button"
              className={`flex h-7 w-7 shrink-0 items-center justify-center bg-transparent text-[var(--text-muted)] transition-colors hover:text-[var(--filmwave-black)] ${
                menuOpen ? "text-[var(--filmwave-black)]" : ""
              }`}
              aria-label={`Manage ${playlist.name}`}
            >
              <MoreIcon size={14} />
            </button>
          )}
        >
          <Link href={editHref} onClick={() => onMenuOpenChange(false)}>
            {editLabel}
          </Link>
          <button
            type="button"
            className="danger-hover"
            disabled={deleting}
            onClick={() => {
              onMenuOpenChange(false);
              void onDeletePlaylist(playlist);
            }}
          >
            {deleting ? "Deleting..." : deleteLabel}
          </button>
        </DropdownShell>
      </div>
    </article>
  );
}

type SortableCardProps = {
  playlist: CuratedPlaylist;
  editHref: string;
  meta: string;
  removeAriaLabel: string;
  removeTitle: string;
  onRemove: () => void;
};

export function PlaylistManagerSortableCard({
  playlist,
  editHref,
  meta,
  removeAriaLabel,
  removeTitle,
  onRemove,
}: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: playlist.id });

  return (
    <article
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
        zIndex: isDragging ? 2 : "auto",
      }}
      className="group relative min-w-0"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-[var(--bg-tertiary)]">
        <Link href={editHref} className="absolute inset-0 block">
          <PlaylistManagerArtwork playlist={playlist} />
        </Link>

        <button
          type="button"
          className="absolute left-2 top-2 z-10 flex h-8 w-8 cursor-grab items-center justify-center bg-transparent text-white opacity-0 transition group-hover:opacity-100 active:cursor-grabbing"
          aria-label={`Drag ${playlist.name} to reorder`}
          {...attributes}
          {...listeners}
        >
          <span className="inline-flex scale-x-[1.45]">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M8 7H16M8 12H16M8 17H16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </button>

        <button
          type="button"
          onClick={onRemove}
          className="absolute right-2 top-2 z-10 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-[var(--bg-primary)] text-lg font-light leading-none text-[var(--text-secondary)] opacity-0 transition hover:bg-[var(--danger-hover)] hover:text-[var(--danger)] group-hover:opacity-100"
          aria-label={removeAriaLabel}
          title={removeTitle}
        >
          ×
        </button>
      </div>

      <Link href={editHref} className="mt-2.5 block min-w-0">
        <h4 className="truncate text-[13px] font-medium tracking-[-0.02em] text-[var(--text-primary)]">
          {playlist.name}
        </h4>
        <p className="mt-0.5 truncate text-[10px] text-[var(--text-muted)]">
          {meta}
        </p>
      </Link>
    </article>
  );
}

export function PlaylistManagerStaticCard({
  playlist,
  editHref,
  meta,
}: {
  playlist: CuratedPlaylist;
  editHref: string;
  meta: string;
}) {
  return (
    <article className="min-w-0">
      <Link
        href={editHref}
        className="relative block aspect-[16/9] overflow-hidden bg-[var(--bg-tertiary)]"
      >
        <PlaylistManagerArtwork playlist={playlist} />
      </Link>
      <Link href={editHref} className="mt-2.5 block min-w-0">
        <h4 className="truncate text-[13px] font-medium tracking-[-0.02em] text-[var(--text-primary)]">
          {playlist.name}
        </h4>
        <p className="mt-0.5 truncate text-[10px] text-[var(--text-muted)]">
          {meta}
        </p>
      </Link>
    </article>
  );
}

type CollapsibleSectionProps = {
  title: string;
  subtitle: string;
  collapsed: boolean;
  onToggle: () => void;
  actions?: ReactNode;
  wrapHeader?: boolean;
  wrapActions?: boolean;
  children: ReactNode;
};

export function PlaylistManagerCollapsibleSection({
  title,
  subtitle,
  collapsed,
  onToggle,
  actions,
  wrapHeader = false,
  wrapActions = false,
  children,
}: CollapsibleSectionProps) {
  return (
    <section className="rounded-[10px] border border-[var(--border)] bg-[var(--bg-primary)] p-4 sm:p-5">
      <div
        className={`${wrapHeader ? "flex flex-wrap" : "flex"} items-end justify-between gap-4`}
      >
        <div>
          <h3 className="text-base font-medium tracking-[-0.03em] text-[var(--text-primary)]">
            {title}
          </h3>
          <p className="mt-1 text-[11px] text-[var(--text-muted)]">
            {subtitle}
          </p>
        </div>

        <div
          className={`${wrapActions ? "flex flex-wrap" : "flex"} items-center gap-2`}
        >
          {actions}
          <button
            type="button"
            onClick={onToggle}
            className="flex h-8 w-8 shrink-0 items-center justify-center text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
            aria-label={collapsed ? `Expand ${title}` : `Collapse ${title}`}
            aria-expanded={!collapsed}
            title={collapsed ? `Expand ${title}` : `Collapse ${title}`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className={`h-4 w-4 transition-transform duration-300 ${
                collapsed ? "" : "rotate-180"
              }`}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        </div>
      </div>

      <div
        className={`grid transition-[grid-template-rows,opacity,margin-top] duration-300 ease-out ${
          collapsed
            ? "mt-0 grid-rows-[0fr] opacity-0 pointer-events-none"
            : "mt-4 grid-rows-[1fr] opacity-100"
        }`}
        aria-hidden={collapsed}
      >
        <div className="min-h-0 overflow-hidden">{children}</div>
      </div>
    </section>
  );
}

type LibrarySectionProps = {
  title: string;
  subtitle: string;
  createHref: string;
  createLabel: string;
  playlists: CuratedPlaylist[];
  emptyMessage: string;
  getEditHref: (playlist: CuratedPlaylist) => string;
  getMeta: (playlist: CuratedPlaylist) => string;
  editLabel: string;
  deleteLabel: string;
  openMenuId: number | null;
  setOpenMenuId: (id: number | null) => void;
  deletingId: number | null;
  onDeletePlaylist: (playlist: CuratedPlaylist) => void | Promise<void>;
};

export function PlaylistManagerLibrarySection({
  title,
  subtitle,
  createHref,
  createLabel,
  playlists,
  emptyMessage,
  getEditHref,
  getMeta,
  editLabel,
  deleteLabel,
  openMenuId,
  setOpenMenuId,
  deletingId,
  onDeletePlaylist,
}: LibrarySectionProps) {
  return (
    <section className="mt-0">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h3 className="text-base font-medium tracking-[-0.03em] text-[var(--text-primary)]">
            {title}
          </h3>
          <p className="mt-1 text-[11px] text-[var(--text-muted)]">
            {subtitle}
          </p>
        </div>

        <Link href={createHref} className={primaryPillButtonClass}>
          <PlusIcon size={13} />
          <span>{createLabel}</span>
        </Link>
      </div>

      {playlists.length === 0 ? (
        <div className="flex min-h-[180px] items-center justify-center border border-[var(--border)] text-sm text-[var(--text-secondary)]">
          {emptyMessage}
        </div>
      ) : (
        <div className={PLAYLIST_MANAGER_GRID_CLASS}>
          {playlists.map((playlist) => (
            <PlaylistManagerLibraryCard
              key={playlist.id}
              playlist={playlist}
              editHref={getEditHref(playlist)}
              meta={getMeta(playlist)}
              editLabel={editLabel}
              deleteLabel={deleteLabel}
              menuOpen={openMenuId === playlist.id}
              onMenuOpenChange={(open) =>
                setOpenMenuId(open ? playlist.id : null)
              }
              deleting={deletingId === playlist.id}
              onDeletePlaylist={onDeletePlaylist}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function PlaylistManagerLoadingGrid({
  count,
  className = PLAYLIST_MANAGER_GRID_CLASS,
}: {
  count: number;
  className?: string;
}) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="animate-pulse">
          <div className="aspect-[16/9] bg-[var(--bg-tertiary)]" />
          <div className="mt-3 h-3 w-2/3 bg-[var(--bg-tertiary)]" />
          <div className="mt-2 h-2 w-1/3 bg-[var(--bg-tertiary)]" />
        </div>
      ))}
    </div>
  );
}
