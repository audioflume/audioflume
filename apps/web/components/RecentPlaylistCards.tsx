"use client";

import Link from "next/link";
import "./recent-playlist-cards.css";

export type RecentPlaylistCardItem = {
  key: string;
  href: string;
  name: string;
  coverImageUrl: string | null;
  metadata: string;
};

type RecentPlaylistCardsProps = {
  playlists?: RecentPlaylistCardItem[];
  loading?: boolean;
  loadingCount?: number;
  variant?: "default" | "hero" | "sidebar";
};

export default function RecentPlaylistCards({
  playlists = [],
  loading = false,
  loadingCount = 5,
  variant = "default",
}: RecentPlaylistCardsProps) {
  const listClassName = [
    "recent-playlist-card-list",
    variant === "hero" ? "is-hero" : "",
    variant === "sidebar" ? "is-sidebar" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (loading) {
    return (
      <div className={listClassName} aria-hidden="true">
        {Array.from({ length: loadingCount }).map((_, index) => (
          <div
            className="recent-playlist-card recent-playlist-card-loading"
            key={index}
          >
            <span className="recent-playlist-card-placeholder" />
            <span className="recent-playlist-card-copy">
              <span className="recent-playlist-card-loading-line" />
              <span className="recent-playlist-card-loading-line recent-playlist-card-loading-line-small" />
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={listClassName}>
      {playlists.map((playlist) => (
        <Link
          className="recent-playlist-card"
          href={playlist.href}
          key={playlist.key}
        >
          {playlist.coverImageUrl ? (
            <img
              className="recent-playlist-card-cover"
              src={playlist.coverImageUrl}
              alt=""
            />
          ) : (
            <span
              className="recent-playlist-card-placeholder"
              aria-hidden="true"
            />
          )}

          <span className="recent-playlist-card-copy">
            <strong>{playlist.name}</strong>
            <small>{playlist.metadata}</small>
          </span>
        </Link>
      ))}
    </div>
  );
}
