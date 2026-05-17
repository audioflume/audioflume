"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import CuratedPlaylistShelf from "@/components/curated/CuratedPlaylistShelf";
import Footer from "@/components/Footer";
import WaveformIcon from "@/components/icons/WaveformIcon";
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

        // Fetch playlists (required) and groups (optional — used for ordering + descriptions)
        const [playlistRes, groupRes] = await Promise.all([
          fetch("/api/curated-playlists"),
          fetch("/api/curated-playlist-groups").catch(() => null),
        ]);

        const playlistData = await playlistRes.json();
        if (!playlistRes.ok)
          throw new Error(playlistData?.error || "Failed to load playlists");

        let groupData: GroupMeta[] = [];
        if (groupRes?.ok) {
          try {
            groupData = await groupRes.json();
          } catch {
            groupData = [];
          }
        }

        if (!cancelled) {
          setPlaylists(Array.isArray(playlistData) ? playlistData : []);
          setGroups(
            Array.isArray(groupData)
              ? [...groupData].sort((a, b) => a.position - b.position)
              : [],
          );
        }
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : "Failed to load curated playlists",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Group playlists by group name, preserving group position order
  const groupedPlaylists = useMemo(() => {
    const playlistMap = new Map<string, CuratedPlaylist[]>();
    for (const p of playlists) {
      const key = p.playlist_group || "Editor Picks";
      if (!playlistMap.has(key)) playlistMap.set(key, []);
      playlistMap.get(key)!.push(p);
    }

    // Use groups order if available, otherwise fall back to insertion order from API
    const orderedGroupNames =
      groups.length > 0
        ? groups.map((g) => g.name).filter((name) => playlistMap.has(name))
        : [...playlistMap.keys()];

    // Include any groups not in the groups list (orphans)
    for (const key of playlistMap.keys()) {
      if (!orderedGroupNames.includes(key)) orderedGroupNames.push(key);
    }

    return orderedGroupNames
      .map((name) => ({
        name,
        description: groups.find((g) => g.name === name)?.description ?? null,
        playlists: (playlistMap.get(name) ?? []).sort(
          (a, b) => a.position - b.position,
        ),
      }))
      .filter((g) => g.playlists.length > 0);
  }, [playlists, groups]);

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <section className="ml-[var(--sidebar-width)] min-h-screen pt-14 transition-[margin-left] duration-200">
        <div className="px-5 py-6 md:px-8 lg:px-10">
          <section className="relative overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--bg-secondary)] p-6 md:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(117,100,154,0.26),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(77,140,123,0.2),transparent_30%)]" />
            <div className="relative z-10 max-w-[780px]">
              <div className="mb-3 inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
                <WaveformIcon size={13} />
                Curated playlists
              </div>

              <h1 className="font-[family-name:var(--font-instrument-sans)] text-[clamp(42px,6vw,78px)] font-medium leading-[0.9] tracking-[-0.07em]">
                Netflix-style rows for finding a cue faster.
              </h1>

              <p className="mt-5 max-w-[560px] text-sm leading-6 text-[var(--text-secondary)]">
                Browse hand-built playlist lanes by mood, scene, and production
                style. Pick a collection to open its track list and start
                auditioning immediately.
              </p>
            </div>
          </section>

          {loading && (
            <div className="mt-8 grid gap-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-[260px] animate-pulse rounded-[18px] border border-[var(--border)] bg-[var(--bg-secondary)]"
                />
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="mt-8 rounded-[18px] border border-[var(--border)] bg-[var(--bg-secondary)] p-8 text-[var(--text-secondary)]">
              {error}
            </div>
          )}

          {!loading && !error && groupedPlaylists.length === 0 && (
            <div className="mt-8 rounded-[18px] border border-[var(--border)] bg-[var(--bg-secondary)] p-8 text-[var(--text-secondary)]">
              No curated playlists have been published yet. Visit the admin{" "}
              <Link
                href="/admin/playlist-manager"
                className="font-medium text-[var(--text-primary)] underline"
              >
                Playlist Manager
              </Link>
              .
            </div>
          )}

          {!loading &&
            !error &&
            groupedPlaylists.map(({ name, description, playlists: groupPlaylists }) => (
              <CuratedPlaylistShelf
                key={name}
                title={name}
                description={description ?? undefined}
                playlists={groupPlaylists}
                className="mt-10"
              />
            ))}

          <div
            className="pt-10"
            style={{ paddingBottom: playerVisible ? "72px" : "8px" }}
          >
            <Footer />
          </div>
        </div>
      </section>
    </main>
  );
}
