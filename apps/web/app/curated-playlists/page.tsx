"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import CuratedPlaylistPlayButton from "@/components/curated/CuratedPlaylistPlayButton";
import CuratedPlaylistShelf from "@/components/curated/CuratedPlaylistShelf";
import Footer from "@/components/Footer";
import ChevronRightIcon from "@/components/icons/ChevronRightIcon";
import type {
  CuratedPlaylist,
  CuratedPlaylistSong,
} from "@/lib/curatedPlaylists";
import CuratedFeatureFilters, { getCuratedGroupId } from "./CuratedFeatureFilters";

type GroupMeta = {
  name: string;
  position: number;
  description: string | null;
};

function getTopGenres(songs: CuratedPlaylistSong[]) {
  const genreCounts = new Map<string, { label: string; count: number }>();

  for (const song of songs) {
    for (const rawGenre of song.genres || []) {
      const label = String(rawGenre || "").trim();
      if (!label) continue;

      const key = label.toLowerCase();
      const current = genreCounts.get(key);

      if (current) {
        current.count += 1;
      } else {
        genreCounts.set(key, { label, count: 1 });
      }
    }
  }

  return [...genreCounts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((genre) => genre.label);
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

function FeaturedPlaylistSkeleton() {
  return (
    <section
      className="curated-feature-hero curated-feature-hero-loading"
      aria-hidden="true"
    >
      <div className="curated-feature-hero-loading-media" />
    </section>
  );
}

function playCoverVideo(element: HTMLElement) {
  const video = element.querySelector<HTMLVideoElement>("video");

  if (!video) return;

  video.pause();
  video.currentTime = 0;
  void video.play().catch(() => {});
}

function pauseCoverVideo(element: HTMLElement) {
  element.querySelector<HTMLVideoElement>("video")?.pause();
}

function FeaturedPlaylistBlock({
  playlists,
  activeIndex,
  onSelect,
  genres,
}: {
  playlists: CuratedPlaylist[];
  activeIndex: number;
  onSelect: (index: number) => void;
  genres: string[];
}) {
  const playlist = playlists[activeIndex];
  const heroRef = useRef<HTMLElement | null>(null);
  const videoActiveRef = useRef(false);
  const [videoVisible, setVideoVisible] = useState(false);

  useEffect(() => {
    const hero = heroRef.current;

    videoActiveRef.current = false;
    setVideoVisible(false);

    if (!hero || !playlist?.cover_video_url) {
      if (hero) pauseCoverVideo(hero);
      return;
    }

    const shouldActivate =
      hero.matches(":hover") || hero.contains(document.activeElement);

    if (!shouldActivate) {
      pauseCoverVideo(hero);
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      if (
        heroRef.current !== hero ||
        (!hero.matches(":hover") && !hero.contains(document.activeElement))
      ) {
        return;
      }

      videoActiveRef.current = true;
      playCoverVideo(hero);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [playlist?.id, playlist?.cover_video_url]);

  if (!playlist) return null;

  const playlistHref = `/curated-playlists/${playlist.id}`;
  const supportingText =
    playlist.description?.trim() || playlist.kicker?.trim() || "Curated for the edit.";
  const songCount = Number(playlist.song_count || 0);

  function activateVideo(element: HTMLElement) {
    videoActiveRef.current = true;
    playCoverVideo(element);
  }

  function deactivateVideo(element: HTMLElement) {
    videoActiveRef.current = false;
    setVideoVisible(false);
    pauseCoverVideo(element);
  }

  function selectOffset(offset: number) {
    if (playlists.length < 2) return;
    onSelect((activeIndex + offset + playlists.length) % playlists.length);
  }

  return (
    <section
      ref={heroRef}
      className="curated-feature-hero"
      aria-labelledby={`curated-feature-hero-${playlist.id}`}
      onMouseEnter={(event) => activateVideo(event.currentTarget)}
      onMouseLeave={(event) => deactivateVideo(event.currentTarget)}
      onFocus={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          activateVideo(event.currentTarget);
        }
      }}
      onBlur={(event) => {
        if (
          !event.currentTarget.contains(event.relatedTarget as Node | null) &&
          !event.currentTarget.matches(":hover")
        ) {
          deactivateVideo(event.currentTarget);
        }
      }}
    >
      {playlist.cover_image_url && (
        <Image
          key={`${playlist.id}-feature-image`}
          src={playlist.cover_image_url}
          alt=""
          fill
          priority={activeIndex === 0}
          unoptimized
          sizes="calc(100vw - 40px)"
          className="curated-feature-hero-media"
        />
      )}

      {!playlist.cover_image_url && (
        <div className="curated-feature-hero-fallback" aria-hidden="true" />
      )}

      {playlist.cover_video_url && (
        <video
          key={`${playlist.id}-feature-video`}
          src={playlist.cover_video_url}
          className={`curated-feature-hero-media curated-feature-hero-video${
            videoVisible ? " is-visible" : ""
          }`}
          muted
          loop
          playsInline
          preload="none"
          onPlaying={() => {
            if (videoActiveRef.current) setVideoVisible(true);
          }}
          aria-label={`${playlist.name} cover video`}
        />
      )}

      <div className="curated-feature-hero-overlay" aria-hidden="true" />

      <Link
        href={playlistHref}
        className="curated-feature-hero-open"
        aria-label={`Open ${playlist.name}`}
      />

      <div className="curated-feature-hero-title-block">
        <span>Featured Playlist</span>
        <h1 id={`curated-feature-hero-${playlist.id}`}>{playlist.name}</h1>
      </div>

      <div className="curated-feature-hero-info">
        <div className="curated-feature-hero-play-row">
          <CuratedPlaylistPlayButton
            playlistId={playlist.id}
            playlistName={playlist.name}
            className="curated-feature-hero-play-button"
          />
          <div className="curated-feature-hero-play-copy">
            <strong>{supportingText}</strong>
            <span>
              {songCount} track{songCount === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {genres.length > 0 && (
          <div className="curated-feature-hero-tags">
            {genres.map((genre) => (
              <span key={genre}>{genre}</span>
            ))}
          </div>
        )}

        {playlists.length > 0 && (
          <div
            className="curated-feature-hero-indicators"
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
        )}
      </div>

      <div
        className="curated-feature-hero-navigation"
        aria-label="Featured playlist navigation"
      >
        {playlists.length > 1 && (
          <>
            <button
              type="button"
              className="curated-feature-hero-navigation-button is-previous"
              aria-label="Show previous featured playlist"
              onClick={() => selectOffset(-1)}
            >
              <ChevronRightIcon size={14} />
            </button>
            <button
              type="button"
              className="curated-feature-hero-navigation-button"
              aria-label="Show next featured playlist"
              onClick={() => selectOffset(1)}
            >
              <ChevronRightIcon size={14} />
            </button>
          </>
        )}
        <span className="curated-feature-hero-navigation-count" aria-live="polite">
          {activeIndex + 1}/{playlists.length}
        </span>
      </div>
    </section>
  );
}

export default function CuratedPlaylistsPage() {
  const [playlists, setPlaylists] = useState<CuratedPlaylist[]>([]);
  const [groups, setGroups] = useState<GroupMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFeaturedIndex, setActiveFeaturedIndex] = useState(0);
  const [featuredGenresByPlaylist, setFeaturedGenresByPlaylist] = useState<
    Record<number, string[]>
  >({});

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

        const visiblePlaylists: CuratedPlaylist[] = Array.isArray(playlistData)
          ? playlistData.filter((playlist) => !playlist.discover_section)
          : [];
        const featuredPlaylistIds = visiblePlaylists
          .filter((playlist) => playlist.show_on_curated_feature)
          .map((playlist) => playlist.id);
        const featuredGenreEntries = await Promise.all(
          featuredPlaylistIds.map(async (playlistId) => {
            try {
              const response = await fetch(
                `/api/curated-playlists/${encodeURIComponent(String(playlistId))}/songs`,
              );
              const data = await response.json();

              if (!response.ok || !Array.isArray(data)) {
                return [playlistId, []] as const;
              }

              return [
                playlistId,
                getTopGenres(data as CuratedPlaylistSong[]),
              ] as const;
            } catch {
              return [playlistId, []] as const;
            }
          }),
        );

        if (!cancelled) {
          setPlaylists(visiblePlaylists);
          setFeaturedGenresByPlaylist(Object.fromEntries(featuredGenreEntries));
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

  const featuredPlaylists = useMemo(
    () =>
      playlists
        .filter((playlist) => playlist.show_on_curated_feature)
        .sort((a, b) => {
          const timeA = a.created_at ? Date.parse(a.created_at) : 0;
          const timeB = b.created_at ? Date.parse(b.created_at) : 0;

          if (timeA !== timeB) return timeB - timeA;
          return b.id - a.id;
        }),
    [playlists],
  );

  useEffect(() => {
    if (activeFeaturedIndex >= featuredPlaylists.length) {
      setActiveFeaturedIndex(0);
    }
  }, [activeFeaturedIndex, featuredPlaylists.length]);

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

  const activeFeaturedPlaylist = featuredPlaylists[activeFeaturedIndex];
  const activeFeaturedGenres = activeFeaturedPlaylist
    ? featuredGenresByPlaylist[activeFeaturedPlaylist.id] ?? []
    : [];

  return (
    <main className="curated-playlists-page-root">
      <section className="curated-playlists-page-layer">
        <div className="px-8">
          {loading && <FeaturedPlaylistSkeleton />}

          {!loading && featuredPlaylists.length > 0 && (
            <FeaturedPlaylistBlock
              playlists={featuredPlaylists}
              activeIndex={activeFeaturedIndex}
              onSelect={setActiveFeaturedIndex}
              genres={activeFeaturedGenres}
            />
          )}

          {!loading && !error && groupedPlaylists.length > 0 && (
            <CuratedFeatureFilters groups={groupedPlaylists} />
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
