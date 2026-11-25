"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { CuratedPlaylistCard } from "@/components/curated/CuratedPlaylistShelf";
import Footer from "@/components/Footer";
import GlobalSearchBar from "@/components/GlobalSearchBar";
import CatalogueHeadingSearch from "@/components/CatalogueHeadingSearch";
import styles from "../artist2/page.module.css";
import { MusicLibraryEmptyState } from "@filmwave/shared";
import type {
  CuratedPlaylist,
} from "@/lib/curatedPlaylists";
import type {
  CuratedBrowseAssignment,
} from "@/lib/curatedBrowseTaxonomy";
import "../home-page.css";

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
    <div className={styles.grid} aria-label="Loading playlists">
      {Array.from({ length: 9 }, (_, index) => (
        <div className={styles.skeletonCard} key={index}>
          <div className={styles.skeleton} />
          <div className={styles.skeletonTitle} />
          <div className={styles.skeletonSubtitle} />
        </div>
      ))}
    </div>
  );
}

export default function CuratedPlaylistsPage() {
  const [playlists, setPlaylists] = useState<CuratedPlaylistWithBrowseAssignments[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const playlistRes = await fetch("/api/curated-playlists");

        const playlistData = await playlistRes.json();

        if (!playlistRes.ok) {
          throw new Error(playlistData?.error || "Failed to load playlists");
        }

        const visiblePlaylists: CuratedPlaylistWithBrowseAssignments[] =
          Array.isArray(playlistData)
            ? playlistData.filter((playlist) => !playlist.discover_section)
            : [];

        if (!cancelled) {
          setPlaylists(visiblePlaylists);
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
    const results = normalizedSearchQuery
      ? playlists.filter((playlist) =>
          [playlist.name, playlist.description, playlist.kicker].some((value) =>
            String(value || "")
              .toLowerCase()
              .includes(normalizedSearchQuery),
          ),
        )
      : [...playlists];

    return results.sort(sortNewestFirst);
  }, [
    playlists,
    searchQuery,
  ]);

  const hasActiveSearch = searchQuery.trim().length > 0;

  return (
    <main className={`${styles.page} artist2-page-root`}>
      <div className={styles.searchbarBackground}>
        <GlobalSearchBar musicFieldStyle darkSimilarButton />
      </div>
      <div className={styles.content}>
        <CatalogueHeadingSearch
          title="Curated playlists made for the edit."
          description="A highly curated collection of playlists built around moods, genres, scenes, and production styles."
          placeholder="search by playlist, genre, or keyword"
          searchLabel="Search playlists"
          query={searchQuery}
          onQueryChange={setSearchQuery}
        />
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
            hasActiveSearch &&
            visiblePlaylists.length === 0 && (
              <MusicLibraryEmptyState
                title="No playlists found"
                description="Search for something different."
              />
            )}

          {!loading &&
            !error &&
            visiblePlaylists.length > 0 && (
              <section className={styles.grid} aria-label="Curated playlists">
                  {visiblePlaylists.map((playlist, index) => (
                    <CuratedPlaylistCard
                      key={playlist.id}
                      playlist={playlist}
                      index={index}
                      variant="curatedPage"
                    />
                  ))}
              </section>
            )}

      </div>
      <Footer showTopBorder={false} />
    </main>
  );
}
