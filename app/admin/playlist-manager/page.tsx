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

  async function loadPlaylists() {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/admin/curated-playlists");
      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "Failed to load playlists");
      if (!Array.isArray(data)) throw new Error("Invalid playlists response");

      setPlaylists(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load playlists");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInitialPlaylists() {
      try {
        setLoading(true);
        setError("");
        const res = await fetch("/api/admin/curated-playlists");
        const data = await res.json();

        if (!res.ok) throw new Error(data?.error || "Failed to load playlists");
        if (!Array.isArray(data)) throw new Error("Invalid playlists response");

        if (!cancelled) setPlaylists(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load playlists");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadInitialPlaylists();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] pt-14 text-[var(--text-primary)] md:ml-[var(--admin-sidebar-width)]">
      <AdminSidebar />

      <div className="px-5 py-6 md:px-8 lg:px-10">
        <section className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">
                Music Library
              </div>
              <h1 className="mt-2 font-[family-name:var(--font-instrument-sans)] text-[clamp(34px,5vw,58px)] font-medium leading-none tracking-[-0.07em]">
                Playlist Manager
              </h1>
              <p className="mt-3 max-w-[620px] text-sm leading-6 text-[var(--text-secondary)]">
                Create playlist cards, manage their groups, and edit the curated playlists shown on the public Curated Playlists page.
              </p>
            </div>

            <Link href="/admin/playlist-manager/new" className={primaryPillButtonClass}>
              <PlusIcon />
              New Playlist
            </Link>
          </div>

          <div className="mt-6 border-t border-[var(--border)] pt-5">
            <AdminPlaylistGroupManager onGroupsChanged={loadPlaylists} />
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">
                Playlists
              </div>
              <h2 className="mt-2 font-[family-name:var(--font-instrument-sans)] text-2xl font-medium tracking-[-0.05em]">
                Curated Playlists
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Create and edit the playlist cards that appear in public curated playlist rows.
              </p>
            </div>
          </div>

          {loading && (
            <div className="h-64 animate-pulse rounded-2xl bg-[var(--bg-tertiary)]" />
          )}

          {!loading && error && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] p-6 text-sm text-[var(--danger)]">
              {error}
            </div>
          )}

          {!loading && !error && playlists.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-primary)] p-8 text-sm text-[var(--text-secondary)]">
              No curated playlists yet. Create your first playlist to populate the front end rows.
            </div>
          )}

          {!loading && !error && playlists.length > 0 && (
            <div className="grid gap-3">
              {playlists.map((playlist) => (
                <Link
                  key={playlist.id}
                  href={`/admin/playlist-manager/${playlist.id}/edit`}
                  className="group flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] p-3 transition hover:border-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
                >
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[var(--bg-tertiary)]">
                    {playlist.cover_image_url && (
                      <Image
                        src={playlist.cover_image_url}
                        alt={playlist.name}
                        fill
                        sizes="80px"
                        className="object-cover"
                        unoptimized
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-[family-name:var(--font-instrument-sans)] text-2xl font-medium tracking-[-0.055em]">
                      {playlist.name}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-[var(--text-secondary)]">
                      <span>{playlist.kicker}</span>
                      <span>·</span>
                      <span>{playlist.playlist_group}</span>
                      <span>·</span>
                      <span>{playlist.song_count || 0} songs</span>
                    </div>
                  </div>
                  <div className="hidden text-xs font-medium text-[var(--text-muted)] transition group-hover:text-[var(--text-primary)] sm:block">
                    Edit
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
