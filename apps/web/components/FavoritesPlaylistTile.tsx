"use client";

import Link from "next/link";
import ArrowUpRightIcon from "@/components/icons/ArrowUpRightIcon";
import HeartIcon from "@/components/icons/HeartIcon";
import { useFavorites } from "@/context/FavoritesContext";
import type { PlaylistViewMode } from "@/context/UserPreferencesContext";
import styles from "./FavoritesPlaylistTile.module.css";

function formatTrackCount(count: number) {
  return `${count} track${count === 1 ? "" : "s"}`;
}

export default function FavoritesPlaylistTile({
  viewMode,
}: {
  viewMode: PlaylistViewMode;
}) {
  const { favoriteIds } = useFavorites();
  const trackCount = formatTrackCount(favoriteIds.length);

  if (viewMode === "list") {
    return (
      <div className="playlist-index-row-shell">
        <Link href="/favorites" className="playlist-index-row">
          <div className="playlist-row-number" aria-hidden="true" />
          <div className={`playlist-row-cover ${styles.rowCover}`}>
            <div className={styles.rowCoverSurface}>
              <HeartIcon size={18} filled />
            </div>
          </div>
          <div className="playlist-row-main">
            <span>Favorites</span>
            <small>Saved tracks</small>
          </div>
          <div className="playlist-row-count">{trackCount}</div>
        </Link>
      </div>
    );
  }

  return (
    <div className="playlist-gallery-card">
      <Link href="/favorites" className="playlist-gallery-link">
        <div className="playlist-gallery-art-wrap">
          <div className={`playlist-gallery-art ${styles.art}`}>
            <div className={styles.icon}>
              <HeartIcon size={42} filled />
            </div>
          </div>
          <div className="playlist-gallery-top-row">
            <div className="playlist-gallery-arrow">
              <ArrowUpRightIcon />
            </div>
          </div>
          <div className="playlist-gallery-content">
            <h3>Favorites</h3>
            <p>{trackCount}</p>
          </div>
        </div>
      </Link>
    </div>
  );
}
