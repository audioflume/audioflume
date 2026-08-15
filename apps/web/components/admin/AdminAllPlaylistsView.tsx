"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import DropdownShell from "@/components/DropdownShell";
import MoreIcon from "@/components/icons/MoreIcon";
import PlusIcon from "@/components/icons/PlusIcon";
import PlaylistIcon from "@/components/icons/PlaylistIcon";
import TrashIcon from "@/components/icons/TrashIcon";
import { primaryPillButtonClass } from "@/components/uiClasses";
import type { CuratedPlaylist } from "@/lib/curatedPlaylists";

type Props = {
  playlists: CuratedPlaylist[];
  loading: boolean;
  error: string;
  deletingId: number | null;
  onDeletePlaylist: (playlist: CuratedPlaylist) => void | Promise<void>;
};

function sortNewestFirst(a: CuratedPlaylist, b: CuratedPlaylist) {
  const aTime = a.created_at ? Date.parse(a.created_at) : 0;
  const bTime = b.created_at ? Date.parse(b.created_at) : 0;

  if (aTime !== bTime) return bTime - aTime;
  return b.id - a.id;
}

function PlaylistArtwork({
  playlist,
  sizes,
}: {
  playlist: CuratedPlaylist;
  sizes: string;
}) {
  return playlist.cover_image_url ? (
    <Image
      src={playlist.cover_image_url}
      alt={playlist.name}
      fill
      sizes={sizes}
      className="object-cover"
      unoptimized
    />
  ) : (
    <span className="absolute inset-0 flex items-center justify-center text-[var(--text-muted)]">
      <PlaylistIcon size={18} />
    </span>
  );
}

function PlaylistCard({
  playlist,
  openMenuId,
  setOpenMenuId,
  deletingId,
  onDeletePlaylist,
}: {
  playlist: CuratedPlaylist;
  openMenuId: number | null;
  setOpenMenuId: (id: number | null) => void;
  deletingId: number | null;
  onDeletePlaylist: (playlist: CuratedPlaylist) => void | Promise<void>;
}) {
  const editHref = `/admin/playlist-manager/${playlist.id}/edit`;
  const menuOpen = openMenuId === playlist.id;

  return (
    <article className="group min-w-0">
      <div className="relative aspect-[16/9] overflow-hidden bg-[var(--bg-tertiary)]">
        <Link href={editHref} className="absolute inset-0 block">
          <PlaylistArtwork
            playlist={playlist}
            sizes="(min-width: 1280px) 20vw, (min-width: 768px) 33vw, 50vw"
          />
        </Link>
      </div>

      <div className="mt-2.5 flex min-w-0 items-start gap-3">
        <Link href={editHref} className="min-w-0 flex-1">
          <h3 className="truncate text-[13px] font-medium tracking-[-0.02em] text-[var(--text-primary)]">
            {playlist.name}
          </h3>
          <p className="mt-0.5 truncate text-[10px] text-[var(--text-muted)]">
            {playlist.song_count || 0} songs
          </p>
        </Link>

        <DropdownShell
          open={menuOpen}
          onOpenChange={(open) => setOpenMenuId(open ? playlist.id : null)}
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
          <Link href={editHref} onClick={() => setOpenMenuId(null)}>
            Edit Playlist
          </Link>
          <button
            type="button"
            className="danger-hover"
            disabled={deletingId === playlist.id}
            onClick={() => {
              setOpenMenuId(null);
              void onDeletePlaylist(playlist);
            }}
          >
            <span>
              {deletingId === playlist.id ? "Deleting..." : "Delete Playlist"}
            </span>
            <TrashIcon size={13} />
          </button>
        </DropdownShell>
      </div>
    </article>
  );
}

export default function AdminAllPlaylistsView({
  playlists,
  loading,
  error,
  deletingId,
  onDeletePlaylist,
}: Props) {
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const masterPlaylists = [...playlists].sort(sortNewestFirst);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="aspect-[16/9] bg-[var(--bg-tertiary)]" />
            <div className="mt-3 h-3 w-2/3 bg-[var(--bg-tertiary)]" />
            <div className="mt-2 h-2 w-1/3 bg-[var(--bg-tertiary)]" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="py-10 text-sm text-[var(--danger)]">{error}</div>;
  }

  return (
    <section className="mt-0">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h3 className="text-base font-medium tracking-[-0.03em] text-[var(--text-primary)]">
            All Playlists
          </h3>
          <p className="mt-1 text-[11px] text-[var(--text-muted)]">
            {masterPlaylists.length} playlist{masterPlaylists.length === 1 ? "" : "s"} · Master library
          </p>
        </div>

        <Link
          href="/admin/playlist-manager/new"
          className={primaryPillButtonClass}
        >
          <PlusIcon size={13} />
          <span>New Playlist</span>
        </Link>
      </div>

      {masterPlaylists.length === 0 ? (
        <div className="flex min-h-[180px] items-center justify-center border border-[var(--border)] text-sm text-[var(--text-secondary)]">
          No playlists yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-3 xl:grid-cols-5">
          {masterPlaylists.map((playlist) => (
            <PlaylistCard
              key={playlist.id}
              playlist={playlist}
              openMenuId={openMenuId}
              setOpenMenuId={setOpenMenuId}
              deletingId={deletingId}
              onDeletePlaylist={onDeletePlaylist}
            />
          ))}
        </div>
      )}
    </section>
  );
}
