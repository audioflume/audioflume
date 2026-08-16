"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import CuratedPlaylistShelf from "@/components/curated/CuratedPlaylistShelf";
import Footer from "@/components/Footer";
import type {
  CuratedBrowseTag,
  CuratedPlaylist,
} from "@/lib/curatedPlaylists";
import type {
  CuratedBrowseAssignment,
  CuratedBrowseTaxonomy,
} from "@/lib/curatedBrowseTaxonomy";
import type { CuratedPlaylistShelfState } from "@/lib/curatedPlaylistShelves";
import CuratedFeatureFilters, { getCuratedGroupId } from "./CuratedFeatureFilters";

type CuratedPlaylistWithBrowseAssignments = CuratedPlaylist & {
  browse_assignments?: CuratedBrowseAssignment[];
};

type CuratedShelfGroup = {
  name: string;
  description: string | null;
  playlists: CuratedPlaylist[];
};

type ManualShelfIds = {
  popular: number[];
  trending: number[];
};

function sortNewestFirst(a: CuratedPlaylist, b: CuratedPlaylist) {
  const aTime = a.created_at ? Date.parse(a.created_at) : 0;
  const bTime = b.created_at ? Date.parse(b.created_at) : 0;

  if (aTime !== bTime) return bTime - aTime;
  return b.id - a.id;
}

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
  const [playlists, setPlaylists] = useState<CuratedPlaylistWithBrowseAssignments[]>([]);
  const [browseTaxonomy, setBrowseTaxonomy] =
    useState<CuratedBrowseTaxonomy | null>(null);
  const [manualShelfIds, setManualShelfIds] = useState<ManualShelfIds>({
    popular: [],
    trending: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeBrowseFilter, setActiveBrowseFilter] =
    useState<CuratedBrowseTag | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const [playlistRes, shelfRes, taxonomyRes] = await Promise.all([
          fetch("/api/curated-playlists"),
          fetch("/api/curated-playlist-shelves").catch(() => null),
          fetch("/api/curated-browse-taxonomy"),
        ]);

        const playlistData = await playlistRes.json();
        const taxonomyData = (await taxonomyRes.json()) as CuratedBrowseTaxonomy & {
          error?: string;
        };

        if (!playlistRes.ok) {
          throw new Error(playlistData?.error || "Failed to load playlists");
        }
        if (!taxonomyRes.ok) {
          throw new Error(
            taxonomyData?.error || "Failed to load browse subcategories",
          );
        }

        let shelfData: CuratedPlaylistShelfState | null = null;

        if (shelfRes?.ok) {
          try {
            shelfData = await shelfRes.json();
          } catch {
            shelfData = null;
          }
        }

        const visiblePlaylists: CuratedPlaylistWithBrowseAssignments[] =
          Array.isArray(playlistData)
            ? playlistData.filter((playlist) => !playlist.discover_section)
            : [];

        if (!cancelled) {
          setPlaylists(visiblePlaylists);
          setBrowseTaxonomy(taxonomyData);
          setManualShelfIds({
            popular: Array.isArray(shelfData?.popular)
              ? shelfData.popular.map((item) => Number(item.playlist_id))
              : [],
            trending: Array.isArray(shelfData?.trending)
              ? shelfData.trending.map((item) => Number(item.playlist_id))
              : [],
          });
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

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const groupedPlaylists = useMemo(() => {
    const normalizedSearchQuery = searchQuery.trim().toLowerCase();
    const searchablePlaylists = normalizedSearchQuery
      ? playlists.filter((playlist) =>
          [playlist.name, playlist.description, playlist.kicker].some((value) =>
            String(value || "")
              .toLowerCase()
              .includes(normalizedSearchQuery),
          ),
        )
      : playlists;

    if (activeBrowseFilter) {
      const activeFilter = browseTaxonomy?.filters.find(
        (filter) => filter.value === activeBrowseFilter,
      );

      if (!activeFilter) return [];

      const filteredPlaylists = searchablePlaylists.filter((playlist) =>
        playlist.browse_tags.includes(activeBrowseFilter),
      );

      const subcategoryGroups: CuratedShelfGroup[] = activeFilter.subcategories
        .map((subcategory) => ({
          name: subcategory.label,
          description: null,
          playlists: filteredPlaylists
            .filter((playlist) =>
              (playlist.browse_assignments ?? []).some(
                (assignment) =>
                  assignment.browse_filter === activeBrowseFilter &&
                  assignment.subcategory_id === subcategory.id,
              ),
            )
            .sort((a, b) => a.position - b.position),
        }))
        .filter((group) => group.playlists.length > 0);

      const uncategorizedPlaylists = filteredPlaylists
        .filter(
          (playlist) =>
            !(playlist.browse_assignments ?? []).some(
              (assignment) => assignment.browse_filter === activeBrowseFilter,
            ),
        )
        .sort((a, b) => a.position - b.position);

      if (uncategorizedPlaylists.length > 0) {
        subcategoryGroups.push({
          name: "More",
          description: null,
          playlists: uncategorizedPlaylists,
        });
      }

      return subcategoryGroups;
    }

    if (normalizedSearchQuery) {
      return searchablePlaylists.length > 0
        ? [
            {
              name: "Search Results",
              description: null,
              playlists: [...searchablePlaylists].sort(sortNewestFirst),
            },
          ]
        : [];
    }

    const searchableById = new Map(
      searchablePlaylists.map((playlist) => [playlist.id, playlist]),
    );
    const popular = manualShelfIds.popular
      .map((id) => searchableById.get(id))
      .filter((playlist): playlist is CuratedPlaylist => Boolean(playlist));
    const newlyAdded = [...searchablePlaylists]
      .sort(sortNewestFirst)
      .slice(0, 10);
    const trending = manualShelfIds.trending
      .map((id) => searchableById.get(id))
      .filter((playlist): playlist is CuratedPlaylist => Boolean(playlist));

    const groups: CuratedShelfGroup[] = [];

    if (popular.length > 0) {
      groups.push({
        name: "Popular Right Now",
        description: null,
        playlists: popular,
      });
    }
    if (newlyAdded.length > 0) {
      groups.push({
        name: "Newly Added",
        description: null,
        playlists: newlyAdded,
      });
    }
    if (trending.length > 0) {
      groups.push({
        name: "Trending Playlists",
        description: null,
        playlists: trending,
      });
    }

    return groups;
  }, [activeBrowseFilter, browseTaxonomy, manualShelfIds, playlists, searchQuery]);

  const hasActiveSearch = searchQuery.trim().length > 0;

  return (
    <main className="curated-playlists-page-root">
      <section className="curated-playlists-page-layer">
        <div className="px-8">
          <section
            className="mt-[calc(clamp(56px,5vw,80px)-var(--filmwave-page-top-gap,22px))] mb-[clamp(56px,5vw,80px)] grid grid-cols-1 items-start gap-8 md:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)] md:[align-items:last_baseline] md:gap-[clamp(64px,9vw,150px)]"
            aria-labelledby="curated-page-heading"
          >
            <div>
              <h1
                id="curated-page-heading"
                className="audioflume-editorial-display"
                style={{ fontSize: "42px", maxWidth: "520px" }}
              >
                Human Curated Playlists Made by Real Filmmakers.
              </h1>
            </div>
            <p className="audioflume-editorial-support">
              Playlists shaped by real working filmmakers that help find the right
              track faster and cut through the noise.
            </p>
          </section>

          {!loading && !error && playlists.length > 0 && (
            <CuratedFeatureFilters
              activeFilter={activeBrowseFilter}
              onFilterChange={setActiveBrowseFilter}
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
            />
          )}

          {loading && <CuratedPlaylistsLoadingSkeleton />}

          {!loading && error && (
            <div className="mt-8 rounded-[18px] border border-[var(--border)] bg-[var(--bg-secondary)] p-8 text-[var(--text-secondary)]">
              {error}
            </div>
          )}

          {!loading && !error && playlists.length === 0 && (
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
            playlists.length > 0 &&
            (activeBrowseFilter || hasActiveSearch) &&
            groupedPlaylists.length === 0 && (
              <div className="mt-[75px] text-sm text-[var(--text-secondary)]">
                {hasActiveSearch
                  ? "No curated playlists match your search."
                  : "No playlists are assigned to this filter yet."}
              </div>
            )}

          {!loading &&
            !error &&
            groupedPlaylists.map(
              ({ name, description, playlists: groupPlaylists }) => (
                <div key={name} id={getCuratedGroupId(name)} className="scroll-mt-28">
                  <CuratedPlaylistShelf
                    title={name}
                    description={description ?? undefined}
                    playlists={groupPlaylists}
                    className="mt-10"
                  />
                </div>
              ),
            )}
        </div>
      </section>
      <Footer />
    </main>
  );
}
