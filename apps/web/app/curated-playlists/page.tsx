"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import CuratedFeatureCarousel from "@/components/curated/CuratedFeatureCarousel";
import { CuratedPlaylistCard } from "@/components/curated/CuratedPlaylistShelf";
import Footer from "@/components/Footer";
import SectionTitle from "@/components/SectionTitle";
import GlobalMusicSearch from "@/components/GlobalMusicSearch";
import GlobalReferenceSearch from "@/components/GlobalReferenceSearch";
import XIcon from "@/components/icons/XIcon";
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
  featured: number[];
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
      <div className="curated-page-skeleton-feature-viewport">
        <div className="curated-page-skeleton-feature-track">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="curated-page-skeleton-feature-card">
              <span
                className={`curated-page-skeleton-feature-title is-${index}`}
              />
            </div>
          ))}
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
  const [manualShelfIds, setManualShelfIds] = useState<ManualShelfIds>({
    featured: [],
    popular: [],
    trending: [],
  });
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
            featured: Array.isArray(shelfData?.featured)
              ? shelfData.featured.map((item) => Number(item.playlist_id))
              : [],
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

  const featurePlaylists = useMemo(() => {
    const playlistById = new Map(
      playlists.map((playlist) => [playlist.id, playlist]),
    );

    return manualShelfIds.featured
      .map((id) => playlistById.get(id))
      .filter(
        (playlist): playlist is CuratedPlaylistWithBrowseAssignments =>
          Boolean(playlist),
      );
  }, [manualShelfIds.featured, playlists]);

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

      if (activeBrowseSubcategoryId !== null) {
        const activeSubcategory = activeFilter.subcategories.find(
          (subcategory) => subcategory.id === activeBrowseSubcategoryId,
        );

        if (!activeSubcategory) return [];

        const subcategoryPlaylists = filteredPlaylists
          .filter((playlist) =>
            (playlist.browse_assignments ?? []).some(
              (assignment) =>
                assignment.browse_filter === activeBrowseFilter &&
                assignment.subcategory_id === activeBrowseSubcategoryId,
            ),
          )
          .sort((a, b) => a.position - b.position);

        return subcategoryPlaylists.length > 0
          ? [
              {
                name: activeSubcategory.label,
                description: null,
                playlists: subcategoryPlaylists,
              },
            ]
          : [];
      }

      const categoryPlaylists = [...filteredPlaylists].sort(
        (a, b) => a.position - b.position,
      );

      return categoryPlaylists.length > 0
        ? [
            {
              name: activeFilter.label,
              description: null,
              playlists: categoryPlaylists,
            },
          ]
        : [];
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
        name: "Staff Picks",
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
  }, [
    activeBrowseFilter,
    activeBrowseSubcategoryId,
    browseTaxonomy,
    manualShelfIds,
    playlists,
    searchQuery,
  ]);

  const hasActiveSearch = searchQuery.trim().length > 0;

  return (
    <main className="curated-playlists-page-root">
      <div className="audioflume-home-reference-searchbar-slot">
        <div className="audioflume-home-reference-searchbar">
          <Link
            href="/music?filters=open"
            className="audioflume-home-reference-searchbar-filters"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 4v16M12 4v16M19 4v16M2 8h6M9 15h6M16 10h6" />
            </svg>
            <span>Filters</span>
          </Link>

          <GlobalMusicSearch />

          <GlobalReferenceSearch />
        </div>
      </div>

      <section className="curated-playlists-page-layer">
        <div className="px-8">
          {!loading && !error && playlists.length > 0 && (
            <CuratedFeatureCarousel playlists={featurePlaylists} />
          )}

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
                <section
                  key={name}
                  id={getCuratedGroupId(name)}
                  className="curated-page-grid-group scroll-mt-28"
                >
                  <div className="curated-page-grid-heading">
                    <SectionTitle variant="small">{name}</SectionTitle>
                    {description && <p>{description}</p>}
                  </div>

                  <div className="curated-page-playlist-grid">
                    {groupPlaylists.map((playlist, index) => (
                      <CuratedPlaylistCard
                        key={playlist.id}
                        playlist={playlist}
                        index={index}
                      />
                    ))}
                  </div>
                </section>
              ),
            )}

          {!loading && !error && playlists.length > 0 && (
            <section className="curated-community-cta">
              <div className="curated-community-cta-copy">
                <h2>Made something worth sharing?</h2>
                <p>
                  Publish your playlist and help other filmmakers find their
                  next track.
                </p>
              </div>

              <div className="curated-community-cta-actions">
                <Link href="/playlists" className="curated-community-cta-primary">
                  Share a Playlist
                </Link>
                <Link
                  href="/community-playlists"
                  className="curated-community-cta-secondary"
                >
                  Explore Community Playlists
                </Link>
              </div>
            </section>
          )}
        </div>
      </section>
      <Footer />
    </main>
  );
}
