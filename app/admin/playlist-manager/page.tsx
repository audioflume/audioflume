"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminPlaylistGroupManager from "@/components/admin/AdminPlaylistGroupManager";
import PlusIcon from "@/components/icons/PlusIcon";
import { primaryPillButtonClass } from "@/components/uiClasses";
import type { CuratedPlaylist } from "@/lib/curatedPlaylists";

export default function PlaylistManagerPage() {
  const [playlists, setPlaylists] = useState<CuratedPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadPlaylists() {
      try {
        setLoading(true);
        setError("");
        const res = await fetch("/api/admin/curated-playlists");
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load playlists");
        if (!Array.isArray(data)) throw new Error("Invalid playlists response");
        if (!cancelled) setPlaylists(data);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load playlists");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPlaylists();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] pt-14 text-[var(--text-primary)] md:ml-[var(--admin-sidebar-width)]">
      <AdminSidebar />

      <div className="flex items-end justify-between gap-4 px-8 pt-14 pb-8">
        <div>
          <h1 className="font-[family-name:var(--font-instrument-sans)] text-[34px] font-medium leading-none tracking-[-0.045em] text-[var(--text-primary)]">
            Playlist Manager
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Manage curated playlists and their groups.
          </p>
        </div>
        <Link
          href="/admin/playlist-manager/new"
          className={`${primaryPillButtonClass} hidden md:flex`}
        >
          <PlusIcon />
          <span>New Playlist</span>
        </Link>
      </div>

      <div className="grid gap-3 px-8 pb-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* Playlists panel */}
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]">
          <div className="flex h-[58px] items-center justify-between border-b border-[var(--border)] px-4">
            <div>
              <h2 className="text-sm font-medium text-[var(--text-primary)]">
                Curated Playlists
              </h2>
              <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
                {loading
                  ? "Loading..."
                  : `${playlists.length} playlist${playlists.length === 1 ? "" : "s"}`}
              </p>
            </div>
            <Link
              href="/admin/playlist-manager/new"
              className="text-xs font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
            >
              + New
            </Link>
          </div>

          {loading && (
            <div>
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex h-[52px] animate-pulse items-center gap-3 px-4"
                  style={{
                    borderBottom:
                      i < 5 ? "1px solid var(--border-subtle)" : "none",
                  }}
                >
                  <div className="h-8 w-8 shrink-0 rounded bg-[var(--bg-tertiary)]" />
                  <div className="flex-1">
                    <div className="h-2 w-[45%] rounded bg-[var(--bg-tertiary)]" />
                    <div className="mt-1.5 h-2 w-[30%] rounded bg-[var(--bg-tertiary)]" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="p-4 text-sm text-[var(--danger)]">{error}</div>
          )}

          {!loading && !error && playlists.length === 0 && (
            <div className="flex min-h-[140px] items-center justify-center px-4 text-sm text-[var(--text-secondary)]">
              No playlists yet.
            </div>
          )}

          {!loading && !error && playlists.length > 0 && (
            <div>
              {playlists.map((playlist, index) => (
                <Link
                  key={playlist.id}
                  href={`/admin/playlist-manager/${playlist.id}/edit`}
                  className="group flex items-center gap-3 px-4 py-2.5 transition hover:bg-[var(--bg-hover)]"
                  style={{
                    borderBottom:
                      index < playlists.length - 1
                        ? "1px solid var(--border-subtle)"
                        : "none",
                  }}
                >
                  <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md bg-[var(--bg-tertiary)]">
                    {playlist.cover_image_url && (
                      <Image
                        src={playlist.cover_image_url}
                        alt={playlist.name}
                        fill
                        sizes="32px"
                        className="object-cover"
                        unoptimized
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-[var(--text-primary)]">
                      {playlist.name}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                      <span>{playlist.playlist_group}</span>
                      <span>·</span>
                      <span>{playlist.song_count || 0} songs</span>
                    </div>
                  </div>
                  <div className="text-[11px] font-medium text-[var(--text-muted)] opacity-0 transition group-hover:opacity-100">
                    Edit
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Groups panel */}
        <AdminPlaylistGroupManager embedded />
      </div>
    </main>
  );
}
