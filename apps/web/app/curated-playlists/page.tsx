"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { CuratedPlaylistCard } from "@/components/curated/CuratedPlaylistShelf";
import Footer from "@/components/Footer";
import GlobalSearchBar from "@/components/GlobalSearchBar";
import GlobalReferenceSearch from "@/components/GlobalReferenceSearch";
import type {
  CuratedBrowseTag,
  CuratedPlaylist,
} from "@/lib/curatedPlaylists";
import type {
  CuratedBrowseAssignment,
  CuratedBrowseTaxonomy,
} from "@/lib/curatedBrowseTaxonomy";
import CuratedFeatureFilters from "./CuratedFeatureFilters";

type CuratedPlaylistWithBrowseAssignments = CuratedPlaylist & {
  browse_assignments?: CuratedBrowseAssignment[];
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
      <div className="curated-page-skeleton-feature-carousel">
        <div className="curated-page-skeleton-feature-viewport">
          <div className="curated-page-skeleton-feature-track">
            {Array.from({ length: 3 }, (_, index) => (
              <div
                key={index}
                className="curated-page-skeleton-feature-card"
              >
                <div className="curated-page-skeleton-feature-media">
                  <span
                    className={`curated-page-skeleton-feature-title is-${index}`}
                  />
                </div>
                {index === 1 && (
                  <>
                    <span className="curated-page-skeleton-feature-bookmark" />
                    <span className="curated-page-skeleton-feature-play" />
                  </>
                )}
              </div>
            ))}
          </div>
          <span className="curated-page-skeleton-feature-arrow is-left" />
          <span className="curated-page-skeleton-feature-arrow is-right" />
        </div>
      </div>

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

      {[0, 1, 2].map((groupIndex) => (
        <section key={groupIndex} className="curated-page-skeleton-grid-group">
          <div className="curated-page-skeleton-grid-head">
            <span className="curated-page-skeleton-heading" />
          </div>

          <div className="curated-page-skeleton-grid">
            {Array.from({ length: 6 }, (_, cardIndex) => (
              <article
                key={cardIndex}
                className="curated-page-skeleton-grid-card"
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeBrowseFilter, setActiveBrowseFilter] =
    useState<CuratedBrowseTag | null>(null);
  const [activeBrowseSubcategoryId, setActiveBrowseSubcategoryId] =
    useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const [playlistRes, taxonomyRes] = await Promise.all([
          fetch("/api/curated-playlists"),
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

        const visiblePlaylists: CuratedPlaylistWithBrowseAssignments[] =
          Array.isArray(playlistData)
            ? playlistData.filter((playlist) => !playlist.discover_section)
            : [];

        if (!cancelled) {
          setPlaylists(visiblePlaylists);
          setBrowseTaxonomy(taxonomyData);
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

  const visiblePlaylists = useMemo(() => {
    const normalizedSearchQuery = searchQuery.trim().toLowerCase();
    let results = normalizedSearchQuery
      ? playlists.filter((playlist) =>
          [playlist.name, playlist.description, playlist.kicker].some((value) =>
            String(value || "")
              .toLowerCase()
              .includes(normalizedSearchQuery),
          ),
        )
      : [...playlists];

    if (activeBrowseFilter) {
      results = results.filter((playlist) =>
        playlist.browse_tags.includes(activeBrowseFilter),
      );

      if (activeBrowseSubcategoryId !== null) {
        results = results.filter((playlist) =>
          (playlist.browse_assignments ?? []).some(
            (assignment) =>
              assignment.browse_filter === activeBrowseFilter &&
              assignment.subcategory_id === activeBrowseSubcategoryId,
          ),
        );
      }

      return results.sort((a, b) => a.position - b.position);
    }

    return results.sort(sortNewestFirst);
  }, [
    activeBrowseFilter,
    activeBrowseSubcategoryId,
    playlists,
    searchQuery,
  ]);

  const hasActiveSearch = searchQuery.trim().length > 0;

  return (
    <main className="curated-playlists-page-root">
      <GlobalSearchBar layer="high" />

      <section className="curated-playlists-page-layer">
        <div className="px-8">
          {!loading && !error && playlists.length > 0 && (
            <CuratedFeatureFilters
              activeFilter={activeBrowseFilter}
              activeSubcategoryId={activeBrowseSubcategoryId}
              browseTaxonomy={browseTaxonomy}
              onFilterChange={(filter) => {
                setActiveBrowseFilter(filter);
                setActiveBrowseSubcategoryId(null);
              }}
              onSubcategoryChange={setActiveBrowseSubcategoryId}
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
            visiblePlaylists.length === 0 && (
              <div className="mt-[75px] text-sm text-[var(--text-secondary)]">
                {hasActiveSearch
                  ? "No curated playlists match your search."
                  : "No playlists are assigned to this filter yet."}
              </div>
            )}

          {!loading &&
            !error &&
            visiblePlaylists.length > 0 && (
              <section className="curated-page-grid-group">
                <div className="curated-page-playlist-grid">
                  {visiblePlaylists.map((playlist, index) => (
                    <CuratedPlaylistCard
                      key={playlist.id}
                      playlist={playlist}
                      index={index}
                    />
                  ))}
                </div>
              </section>
            )}

          {!loading && !error && playlists.length > 0 && (
            <section className="curated-page-reference-search">
              <div className="curated-page-reference-search-heading">
                <span>Search by song</span>
              </div>
              <div className="curated-page-reference-search-card">
                <GlobalReferenceSearch embedded />
              </div>
            </section>
          )}

        </div>
      </section>
      <Footer />
    </main>
  );
}
