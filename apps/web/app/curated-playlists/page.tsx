"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import CuratedPlaylistShelf from "@/components/curated/CuratedPlaylistShelf";
import Footer from "@/components/Footer";
import ArrowUpRightIcon from "@/components/icons/ArrowUpRightIcon";
import type { CuratedPlaylist } from "@/lib/curatedPlaylists";
import PlaylistTabsRail from "../playlists/PlaylistTabsRail";
import "../playlists/playlists-tabs-rail.css";

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

  const featuredPlaylist = useMemo(() => {
    const playlistsWithArtwork = playlists.filter((playlist) =>
      Boolean(playlist.cover_image_url),
    );
    const discoverFeatured = playlistsWithArtwork
      .filter((playlist) => playlist.show_on_discover)
      .sort((a, b) => a.discover_position - b.discover_position)[0];

    return discoverFeatured ?? playlistsWithArtwork[0] ?? playlists[0] ?? null;
  }, [playlists]);

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

  const featuredCopy =
    featuredPlaylist?.description || featuredPlaylist?.kicker || "";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <style>{`
        section.curated-playlists-page-layer {
          position: relative;
          z-index: 1;
          padding-top: calc(var(--filmwave-header-height, 56px) + 32px) !important;
        }

        .curated-featured-banner {
          position: relative;
          display: block;
          min-height: clamp(320px, 42vw, 560px);
          overflow: hidden;
          margin-top: 24px;
          background: var(--bg-secondary);
          color: #fff;
          text-decoration: none;
        }

        .curated-featured-banner-image,
        .curated-featured-banner-fallback,
        .curated-featured-banner-overlay {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }

        .curated-featured-banner-image {
          object-fit: cover;
          transition: transform 700ms ease;
        }

        .curated-featured-banner:hover .curated-featured-banner-image {
          transform: scale(1.018);
        }

        .curated-featured-banner-fallback {
          background:
            radial-gradient(circle at 72% 34%, rgba(128, 142, 126, 0.5), transparent 34%),
            linear-gradient(120deg, #111816 0%, #28332f 55%, #0c0f0e 100%);
        }

        .curated-featured-banner-overlay {
          background:
            linear-gradient(90deg, rgba(0, 0, 0, 0.76) 0%, rgba(0, 0, 0, 0.38) 48%, rgba(0, 0, 0, 0.08) 78%),
            linear-gradient(180deg, rgba(0, 0, 0, 0.04) 30%, rgba(0, 0, 0, 0.5) 100%);
        }

        .curated-featured-banner-content {
          position: relative;
          z-index: 1;
          display: flex;
          min-height: inherit;
          max-width: 560px;
          flex-direction: column;
          justify-content: flex-end;
          padding: clamp(24px, 4vw, 52px);
        }

        .curated-featured-banner-eyebrow {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.11em;
          line-height: 1;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.68);
        }

        .curated-featured-banner-title {
          margin: 10px 0 0;
          font-family: var(--font-instrument-sans), var(--font-satoshi), sans-serif;
          font-size: clamp(25px, 2.7vw, 38px);
          font-weight: 500;
          letter-spacing: -0.045em;
          line-height: 1.04;
          color: #fff;
        }

        .curated-featured-banner-copy {
          max-width: 440px;
          margin: 12px 0 0;
          font-size: 12px;
          font-weight: 400;
          line-height: 1.55;
          color: rgba(255, 255, 255, 0.72);
        }

        .curated-featured-banner-link {
          display: inline-flex;
          width: fit-content;
          align-items: center;
          gap: 7px;
          margin-top: 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.42);
          padding-bottom: 4px;
          font-size: 11px;
          font-weight: 500;
          line-height: 1;
          color: #fff;
          transition: border-color 150ms ease;
        }

        .curated-featured-banner:hover .curated-featured-banner-link {
          border-color: #fff;
        }

        .curated-featured-banner.is-loading {
          pointer-events: none;
        }

        .curated-featured-banner.is-loading::after {
          content: "";
          position: absolute;
          inset: 0;
          transform: translateX(-100%);
          background: linear-gradient(
            90deg,
            transparent,
            color-mix(in srgb, var(--bg-hover) 52%, transparent),
            transparent
          );
          animation: curated-featured-banner-shimmer 1.6s ease-in-out infinite;
        }

        @keyframes curated-featured-banner-shimmer {
          100% {
            transform: translateX(100%);
          }
        }

        @media (max-width: 720px) {
          .curated-featured-banner {
            min-height: 340px;
          }

          .curated-featured-banner-content {
            padding: 24px;
          }

          .curated-featured-banner-overlay {
            background:
              linear-gradient(90deg, rgba(0, 0, 0, 0.68) 0%, rgba(0, 0, 0, 0.28) 100%),
              linear-gradient(180deg, rgba(0, 0, 0, 0.04) 20%, rgba(0, 0, 0, 0.72) 100%);
          }
        }
      `}</style>

      <section className="curated-playlists-page-layer ml-[var(--sidebar-width)] min-h-screen pt-6 transition-[margin-left] duration-200">
        <div className="px-8">
          <PlaylistTabsRail />

          {loading && (
            <div
              className="curated-featured-banner is-loading"
              aria-hidden="true"
            />
          )}

          {!loading && featuredPlaylist && (
            <Link
              href={`/curated-playlists/${featuredPlaylist.id}`}
              className="curated-featured-banner"
              aria-label={`Open featured playlist ${featuredPlaylist.name}`}
            >
              {featuredPlaylist.cover_image_url ? (
                <img
                  src={featuredPlaylist.cover_image_url}
                  alt=""
                  className="curated-featured-banner-image"
                />
              ) : (
                <div className="curated-featured-banner-fallback" />
              )}
              <div className="curated-featured-banner-overlay" />
              <div className="curated-featured-banner-content">
                <span className="curated-featured-banner-eyebrow">
                  Featured playlist
                </span>
                <h1 className="curated-featured-banner-title">
                  {featuredPlaylist.name}
                </h1>
                {featuredCopy && (
                  <p className="curated-featured-banner-copy">{featuredCopy}</p>
                )}
                <span className="curated-featured-banner-link">
                  View playlist
                  <ArrowUpRightIcon size={12} />
                </span>
              </div>
            </Link>
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
