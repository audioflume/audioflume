"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import CuratedPlaylistShelf from "@/components/curated/CuratedPlaylistShelf";
import Footer from "@/components/Footer";
import PlaylistIcon from "@/components/icons/PlaylistIcon";
import type { CuratedPlaylist } from "@/lib/curatedPlaylists";

type GroupMeta = {
  name: string;
  position: number;
  description: string | null;
};

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <span className={`curated-playlist-skeleton-block ${className}`} />;
}

function CuratedPlaylistCardSkeleton() {
  return (
    <div className="curated-playlist-skeleton-card-shell">
      <div className="curated-playlist-skeleton-card">
        <div className="curated-playlist-skeleton-arrow" />
      </div>
    </div>
  );
}

function CuratedPlaylistShelfSkeleton({ compact = false }: { compact?: boolean }) {
  const cardCount = compact ? 4 : 5;

  return (
    <section className="curated-playlist-skeleton-shelf mt-10">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <SkeletonBlock className="curated-playlist-skeleton-heading" />
          <SkeletonBlock className="curated-playlist-skeleton-description" />
        </div>

        <div className="hidden items-center gap-2 sm:flex">
          <SkeletonBlock className="curated-playlist-skeleton-control" />
          <SkeletonBlock className="curated-playlist-skeleton-control" />
        </div>
      </div>

      <div className="relative -mx-8 overflow-hidden">
        <div className="flex gap-3 overflow-hidden pl-8 pr-20">
          {Array.from({ length: cardCount }).map((_, index) => (
            <CuratedPlaylistCardSkeleton key={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CuratedPlaylistsLoadingSkeleton() {
  return (
    <>
      <style>{`
        .curated-playlist-skeleton-shelf {
          animation: skeleton-fade-in 0.3s ease-out both;
        }

        .curated-playlist-skeleton-shelf:nth-child(2) {
          animation-delay: 0.04s;
        }

        .curated-playlist-skeleton-shelf:nth-child(3) {
          animation-delay: 0.08s;
        }

        .curated-playlist-skeleton-block {
          position: relative;
          display: block;
          overflow: hidden;
          background: var(--bg-tertiary);
        }

        .curated-playlist-skeleton-block::after,
        .curated-playlist-skeleton-card::after {
          content: "";
          position: absolute;
          inset: 0;
          transform: translateX(-100%);
          background: linear-gradient(
            90deg,
            transparent,
            color-mix(in srgb, var(--bg-hover) 48%, transparent),
            transparent
          );
          animation: curated-playlist-skeleton-shimmer 1.6s ease-in-out infinite;
        }

        @keyframes curated-playlist-skeleton-shimmer {
          100% {
            transform: translateX(100%);
          }
        }

        .curated-playlist-skeleton-heading {
          width: min(210px, 46vw);
          height: 20px;
          border-radius: 6px;
        }

        .curated-playlist-skeleton-description {
          width: min(340px, 62vw);
          height: 9px;
          margin-top: 10px;
          border-radius: 999px;
        }

        .curated-playlist-skeleton-control {
          width: 32px;
          height: 32px;
          border-radius: 999px;
        }

        .curated-playlist-skeleton-card-shell {
          flex: 0 0 250px;
          min-width: 250px;
          animation: skeleton-fade-in 0.3s ease-out both;
        }

        .curated-playlist-skeleton-card-shell:nth-child(2) {
          animation-delay: 0.03s;
        }

        .curated-playlist-skeleton-card-shell:nth-child(3) {
          animation-delay: 0.06s;
        }

        .curated-playlist-skeleton-card-shell:nth-child(4) {
          animation-delay: 0.09s;
        }

        .curated-playlist-skeleton-card-shell:nth-child(5) {
          animation-delay: 0.12s;
        }

        @media (min-width: 640px) {
          .curated-playlist-skeleton-card-shell {
            flex-basis: 285px;
            min-width: 285px;
          }
        }

        @media (min-width: 1024px) {
          .curated-playlist-skeleton-card-shell {
            flex-basis: 320px;
            min-width: 320px;
          }
        }

        .curated-playlist-skeleton-card {
          position: relative;
          min-height: 210px;
          overflow: hidden;
          border-radius: 18px;
          border: 1px solid var(--border-subtle);
          background: var(--bg-card);
        }

        .curated-playlist-skeleton-arrow {
          position: absolute;
          right: 16px;
          top: 16px;
          width: 32px;
          height: 32px;
          border-radius: 999px;
          background: var(--bg-tertiary);
        }
      `}</style>

      <div className="mt-8">
        <CuratedPlaylistShelfSkeleton />
        <CuratedPlaylistShelfSkeleton compact />
        <CuratedPlaylistShelfSkeleton />
      </div>
    </>
  );
}

export default function CuratedPlaylistsPage() {
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

        if (!playlistRes.ok) {
          throw new Error(playlistData?.error || "Failed to load playlists");
        }

        let groupData: GroupMeta[] = [];

        if (groupRes?.ok) {
          try {
            groupData = await groupRes.json();
          } catch {
            groupData = [];
          }
        }

        if (!cancelled) {
          setPlaylists(
            Array.isArray(playlistData)
              ? playlistData.filter((p) => !p.discover_section)
              : [],
          );
          setGroups(
            Array.isArray(groupData)
              ? [...groupData].sort((a, b) => a.position - b.position)
              : [],
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load curated playlists",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const groupedPlaylists = useMemo(() => {
    const playlistMap = new Map<string, CuratedPlaylist[]>();

    for (const playlist of playlists) {
      const key = playlist.playlist_group || "Editor Picks";
      if (!playlistMap.has(key)) playlistMap.set(key, []);
      playlistMap.get(key)!.push(playlist);
    }

    const orderedGroupNames =
      groups.length > 0
        ? groups.map((group) => group.name).filter((name) => playlistMap.has(name))
        : [...playlistMap.keys()];

    for (const key of playlistMap.keys()) {
      if (!orderedGroupNames.includes(key)) orderedGroupNames.push(key);
    }

    return orderedGroupNames
      .map((name) => ({
        name,
        description:
          groups.find((group) => group.name === name)?.description ?? null,
        playlists: (playlistMap.get(name) ?? []).sort(
          (a, b) => a.position - b.position,
        ),
      }))
      .filter((group) => group.playlists.length > 0);
  }, [playlists, groups]);

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <section className="ml-[var(--sidebar-width)] min-h-screen pt-14 transition-[margin-left] duration-200">
        <div className="px-8 pt-6">
          <div className="mb-6 grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] xl:items-end">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
                <PlaylistIcon size={13} />
                Made for you
              </div>
              <h1 className="max-w-[720px] font-[family-name:var(--font-instrument-sans)] text-[clamp(42px,6vw,78px)] font-medium leading-[0.9] tracking-[-0.07em]">
                Playlists built around the scenes you&rsquo;re cutting.
              </h1>
            </div>
            <p className="max-w-[560px] text-sm leading-6 text-[var(--text-secondary)] xl:justify-self-end">
              Every collection is hand-picked for a specific mood, tone, or
              production style — so you can skip the search and go straight to
              auditioning.
            </p>
          </div>

          {loading && <CuratedPlaylistsLoadingSkeleton />}

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
            groupedPlaylists.map(
              ({ name, description, playlists: groupPlaylists }) => (
                <CuratedPlaylistShelf
                  key={name}
                  title={name}
                  description={description ?? undefined}
                  playlists={groupPlaylists}
                  className="mt-10"
                />
              ),
            )}

          <div className="pt-10 pb-2">
            <Footer />
          </div>
        </div>
      </section>
    </main>
  );
}
