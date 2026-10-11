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

function CuratedPlaylistsLoadingSkeleton() {
  return (
    <div className="curated-page-skeleton" aria-hidden="true">
      <div className="curated-page-skeleton-filters">
        {Array.from({ length: 8 }, (_, index) => (
          <div
            key={index}
            className="curated-page-skeleton-filter"
          >
            <span
              className={`curated-page-skeleton-filter-icon is-${index % 3}`}
            />
            <span
              className={`curated-page-skeleton-filter-label is-${index % 4}`}
            />
          </div>
        ))}
      </div>

      {[0, 1, 2].map((shelfIndex) => (
        <section key={shelfIndex} className="curated-page-skeleton-shelf">
          <div className="curated-page-skeleton-shelf-head">
            <div>
              <span className="curated-page-skeleton-heading" />
              <span className="curated-page-skeleton-description" />
            </div>
            <div className="curated-page-skeleton-controls">
              <span />
              <span />
            </div>
          </div>

          <div className="curated-page-skeleton-cards">
            {Array.from({ length: 4 }, (_, cardIndex) => (
              <article
                key={cardIndex}
                className="curated-page-skeleton-card-shell"
              >
                <div className="curated-page-skeleton-card" />
                <span className="curated-page-skeleton-card-title" />
                <span className="curated-page-skeleton-card-meta" />
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
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
                    className="mt-[calc(clamp(34px,3vw,48px)+20px)]"
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
