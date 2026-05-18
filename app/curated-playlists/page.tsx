"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import CuratedPlaylistShelf from "@/components/curated/CuratedPlaylistShelf";
import Footer from "@/components/Footer";
import PlaylistIcon from "@/components/icons/PlaylistIcon";
import type { CuratedPlaylist } from "@/lib/curatedPlaylists";
import { usePlayer } from "@/context/PlayerContext";

type GroupMeta = {
  name: string;
  position: number;
  description: string | null;
};

export default function CuratedPlaylistsPage() {
  const { currentSong } = usePlayer();
  const playerVisible = !!currentSong;
  const [playlists, setPlaylists] = useState<CuratedPlaylist[]>([]);
  const [groups, setGroups] = useState<GroupMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError("");
        const [playlistRes, groupRes] = await Promise.all([
          fetch("/api/curated-playlists"),
          fetch("/api/curated-playlist-groups").catch(() => null),
        ]);
        const playlistData = await playlistRes.json();
        if (!playlistRes.ok) throw new Error(playlistData?.error || "Failed to load playlists");
        let groupData: GroupMeta[] = [];
        if (groupRes?.ok) {
          try { groupData = await groupRes.json(); } catch { groupData = []; }
        }
        if (!cancelled) {
          setPlaylists(Array.isArray(playlistData) ? playlistData.filter((p) => !p.discover_section) : []);
          setGroups(Array.isArray(groupData) ? [...groupData].sort((a, b) => a.position - b.position) : []);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load curated playlists");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const groupedPlaylists = useMemo(() => {
    const playlistMap = new Map<string, CuratedPlaylist[]>();
    for (const p of playlists) {
      const key = p.playlist_group || "Editor Picks";
      if (!playlistMap.has(key)) playlistMap.set(key, []);
      playlistMap.get(key)!.push(p);
    }
    const orderedGroupNames = groups.length > 0
      ? groups.map((g) => g.name).filter((name) => playlistMap.has(name))
      : [...playlistMap.keys()];
    for (const key of playlistMap.keys()) {
      if (!orderedGroupNames.includes(key)) orderedGroupNames.push(key);
    }
    return orderedGroupNames
      .map((name) => ({ name, description: groups.find((g) => g.name === name)?.description ?? null, playlists: (playlistMap.get(name) ?? []).sort((a, b) => a.position - b.position) }))
      .filter((g) => g.playlists.length > 0);
  }, [playlists, groups]);

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <section className="ml-[var(--sidebar-width)] min-h-screen pt-14 transition-[margin-left] duration-200">
        <div className="px-8 pt-6">
          <div className="mb-6 grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] xl:items-end">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]"><PlaylistIcon size={13} />Made for you</div>
              <h1 className="max-w-[720px] font-[family-name:var(--font-instrument-sans)] text-[clamp(42px,6vw,78px)] font-medium leading-[0.9] tracking-[-0.07em]">Playlists built around the scenes you&rsquo;re cutting.</h1>
            </div>
            <p className="max-w-[560px] text-sm leading-6 text-[var(--text-secondary)] xl:justify-self-end">Every collection is hand-picked for a specific mood, tone, or production style — so you can skip the search and go straight to auditioning.</p>
          </div>

          {loading && (
            <div className="mt-8 grid gap-4">
              {Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-[260px] animate-pulse rounded-[18px] border border-[var(--border)] bg-[var(--bg-secondary)]" />)}
            </div>
          )}
          {!loading && error && <div className="mt-8 rounded-[18px] border border-[var(--border)] bg-[var(--bg-secondary)] p-8 text-[var(--text-secondary)]">{error}</div>}
          {!loading && !error && groupedPlaylists.length === 0 && (
            <div className="mt-8 rounded-[18px] border border-[var(--border)] bg-[var(--bg-secondary)] p-8 text-[var(--text-secondary)]">
              No curated playlists have been published yet. Visit the admin <Link href="/admin/playlist-manager" className="font-medium text-[var(--text-primary)] underline">Playlist Manager</Link>.
            </div>
          )}
          {!loading && !error && groupedPlaylists.map(({ name, description, playlists: groupPlaylists }) => (
            <CuratedPlaylistShelf key={name} title={name} description={description ?? undefined} playlists={groupPlaylists} className="mt-10" />
          ))}

          <div className="pt-10" style={{ paddingBottom: playerVisible ? "72px" : "8px" }}><Footer /></div>
        </div>
      </section>
    </main>
  );
}
