"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import CuratedFeaturedTrackRow from "@/components/curated/CuratedFeaturedTrackRow";
import CuratedPlaylistShelf from "@/components/curated/CuratedPlaylistShelf";
import Footer from "@/components/Footer";
import ArrowUpRightIcon from "@/components/icons/ArrowUpRightIcon";
import ChevronRightIcon from "@/components/icons/ChevronRightIcon";
import { usePlayer } from "@/context/PlayerContext";
import type {
  CuratedPlaylist,
  CuratedPlaylistSong,
} from "@/lib/curatedPlaylists";
import PlaylistTabsRail from "../playlists/PlaylistTabsRail";
import "../playlists/playlists-tabs-rail.css";

type GroupMeta = {
  name: string;
  position: number;
  description: string | null;
};

const FEATURED_PLAYLIST_COUNT = 3;
const FEATURED_TRACK_COUNT = 6;

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

function FeaturedPlaylistSkeleton() {
  return (
    <section
      className="curated-featured-playlist curated-featured-playlist-loading"
      aria-hidden="true"
    >
      <div className="curated-featured-playlist-loading-image" />
      <div className="curated-featured-playlist-loading-tracks">
        {Array.from({ length: FEATURED_TRACK_COUNT }).map((_, index) => (
          <div key={index} className="curated-featured-playlist-loading-row" />
        ))}
        <div className="curated-featured-playlist-loading-link" />
      </div>
    </section>
  );
}

function FeaturedPlaylistBlock({
  playlists,
  activeIndex,
  onSelect,
  songs,
  songsLoading,
}: {
  playlists: CuratedPlaylist[];
  activeIndex: number;
  onSelect: (index: number) => void;
  songs: CuratedPlaylistSong[];
  songsLoading: boolean;
}) {
  const playlist = playlists[activeIndex];

  if (!playlist) return null;

  const visibleSongs = songs.slice(0, FEATURED_TRACK_COUNT);
  const totalSongCount = Math.max(playlist.song_count ?? 0, songs.length);
  const remainingSongCount = Math.max(totalSongCount - visibleSongs.length, 0);
  const remainingLabel =
    remainingSongCount > 0
      ? `View ${remainingSongCount} more song${remainingSongCount === 1 ? "" : "s"}`
      : `View all ${totalSongCount} song${totalSongCount === 1 ? "" : "s"}`;
  const supportingText = playlist.description;
  const playlistHref = `/curated-playlists/${playlist.id}`;

  return (
    <section
      className="curated-featured-playlist"
      aria-labelledby={`curated-featured-playlist-${playlist.id}`}
    >
      <div className="curated-featured-playlist-image-panel">
        {playlist.cover_image_url ? (
          <Image
            key={playlist.id}
            src={playlist.cover_image_url}
            alt=""
            fill
            priority={activeIndex === 0}
            unoptimized
            sizes="(min-width: 981px) 66vw, 100vw"
            className="curated-featured-playlist-image"
          />
        ) : (
          <div className="curated-featured-playlist-fallback" />
        )}

        <div className="curated-featured-playlist-overlay" aria-hidden="true" />

        <div className="curated-featured-playlist-copy">
          <span className="curated-featured-playlist-kicker">
            {playlist.kicker || "Featured playlist"}
          </span>
          <h1
            id={`curated-featured-playlist-${playlist.id}`}
            className="curated-featured-playlist-title"
          >
            {playlist.name}
          </h1>
          {supportingText && (
            <p className="curated-featured-playlist-description">
              {supportingText}
            </p>
          )}
          <Link href={playlistHref} className="curated-featured-playlist-button">
            Explore playlist
          </Link>
        </div>

        {playlists.length > 1 && (
          <>
            <button
              type="button"
              className="curated-featured-playlist-next-button"
              aria-label="Show next featured playlist"
              onClick={() => onSelect((activeIndex + 1) % playlists.length)}
            >
              <ChevronRightIcon size={18} />
            </button>

            <span
              className="curated-featured-playlist-count"
              aria-live="polite"
            >
              {activeIndex + 1}/{playlists.length}
            </span>

            <div
              className="curated-featured-playlist-indicators"
              aria-label="Featured playlists"
            >
              {playlists.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className={index === activeIndex ? "is-active" : ""}
                  aria-label={`Show featured playlist ${item.name}`}
                  aria-pressed={index === activeIndex}
                  onClick={() => onSelect(index)}
                >
                  <span />
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <aside
        className="curated-featured-playlist-tracks"
        aria-label={`${playlist.name} featured tracks`}
      >
        <div className="curated-featured-playlist-track-list">
          {songsLoading
            ? Array.from({ length: FEATURED_TRACK_COUNT }).map((_, index) => (
                <div
                  key={index}
                  className="curated-featured-playlist-track-skeleton"
                  aria-hidden="true"
                />
              ))
            : visibleSongs.map((song, index) => (
                <CuratedFeaturedTrackRow
                  key={song.id}
                  song={song}
                  index={index + 30}
                />
              ))}

          {!songsLoading && visibleSongs.length === 0 && (
            <div className="curated-featured-playlist-empty-tracks">
              No tracks have been added yet.
            </div>
          )}
        </div>

        <Link href={playlistHref} className="curated-featured-playlist-more-link">
          {remainingLabel}
          <ArrowUpRightIcon size={11} />
        </Link>
      </aside>
    </section>
  );
}

export default function CuratedPlaylistsPage() {
  const { setQueue } = usePlayer();
  const [playlists, setPlaylists] = useState<CuratedPlaylist[]>([]);
  const [groups, setGroups] = useState<GroupMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFeaturedIndex, setActiveFeaturedIndex] = useState(0);
  const [featuredSongsByPlaylist, setFeaturedSongsByPlaylist] = useState<
    Record<number, CuratedPlaylistSong[]>
  >({});
  const [featuredSongsLoading, setFeaturedSongsLoading] = useState(false);

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

  const featuredPlaylists = useMemo(() => {
    const orderedFeatured = playlists
      .filter((playlist) => playlist.show_on_discover)
      .sort((a, b) => a.discover_position - b.discover_position);
    const orderedFallbacks = playlists
      .filter((playlist) => !playlist.show_on_discover)
      .sort((a, b) => a.position - b.position);

    return [...orderedFeatured, ...orderedFallbacks].slice(
      0,
      FEATURED_PLAYLIST_COUNT,
    );
  }, [playlists]);

  useEffect(() => {
    if (activeFeaturedIndex >= featuredPlaylists.length) {
      setActiveFeaturedIndex(0);
    }
  }, [activeFeaturedIndex, featuredPlaylists.length]);

  useEffect(() => {
    let cancelled = false;
    const featuredPlaylistIds = featuredPlaylists.map(
      (playlist) => playlist.id,
    );

    if (featuredPlaylistIds.length === 0) {
      setFeaturedSongsByPlaylist({});
      setFeaturedSongsLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setFeaturedSongsLoading(true);

    Promise.all(
      featuredPlaylistIds.map(async (playlistId) => {
        try {
          const response = await fetch(
            `/api/curated-playlists/${encodeURIComponent(String(playlistId))}/songs`,
          );
          const data = await response.json();

          if (!response.ok) {
            throw new Error(
              data?.error || `Failed to load featured playlist ${playlistId}`,
            );
          }

          return [playlistId, Array.isArray(data) ? data : []] as const;
        } catch (fetchError) {
          console.error("Featured playlist songs fetch failed:", fetchError);
          return [playlistId, []] as const;
        }
      }),
    )
      .then((entries) => {
        if (!cancelled) {
          setFeaturedSongsByPlaylist(Object.fromEntries(entries));
        }
      })
      .finally(() => {
        if (!cancelled) setFeaturedSongsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [featuredPlaylists]);

  const activeFeaturedPlaylist = featuredPlaylists[activeFeaturedIndex] ?? null;
  const activeFeaturedSongs = useMemo(() => {
    if (!activeFeaturedPlaylist) return [];
    return featuredSongsByPlaylist[activeFeaturedPlaylist.id] ?? [];
  }, [activeFeaturedPlaylist, featuredSongsByPlaylist]);
  const playableFeaturedSongs = useMemo(
    () => activeFeaturedSongs.filter((song) => Boolean(song.audioUrl)),
    [activeFeaturedSongs],
  );

  useEffect(() => {
    if (!featuredSongsLoading) setQueue(playableFeaturedSongs);
  }, [featuredSongsLoading, playableFeaturedSongs, setQueue]);

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
    <main className="curated-playlists-page-root">
      <section className="curated-playlists-page-layer">
        <div className="px-8">
          <PlaylistTabsRail />

          {(loading || featuredPlaylists.length > 0) && (
            <div className="discover-section-heading curated-featured-playlist-heading">
              <h2>Featured playlists</h2>
            </div>
          )}

          {loading && <FeaturedPlaylistSkeleton />}

          {!loading && featuredPlaylists.length > 0 && (
            <FeaturedPlaylistBlock
              playlists={featuredPlaylists}
              activeIndex={activeFeaturedIndex}
              onSelect={setActiveFeaturedIndex}
              songs={activeFeaturedSongs}
              songsLoading={featuredSongsLoading}
            />
          )}

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
        </div>
      </section>
      <Footer />
    </main>
  );
}
