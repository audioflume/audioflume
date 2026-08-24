"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import HeartIcon from "@/components/icons/HeartIcon";

import drawerStyles from "./PublicArtistCollectionDrawer.module.css";
import styles from "./ArtistProfileActions.module.css";

const LIKED_ARTISTS_STORAGE_KEY = "audioflume-liked-artists";

function ShareGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="14.5" cy="4.5" r="2.25" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="5.5" cy="10" r="2.25" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="14.5" cy="15.5" r="2.25" stroke="currentColor" strokeWidth="1.4" />
      <path d="m7.5 8.9 5-3.1M7.5 11.1l5 3.1" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function readLikedArtistIds() {
  try {
    const stored = window.localStorage.getItem(LIKED_ARTISTS_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

export default function ArtistProfileActions({
  artistId,
  artistName,
}: {
  artistId: string;
  artistName: string;
}) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    setTarget(document.querySelector<HTMLElement>(".artist-public-feature-grid"));
    setLiked(readLikedArtistIds().includes(artistId));
  }, [artistId]);

  function toggleLike() {
    const current = readLikedArtistIds();
    const nextLiked = !current.includes(artistId);
    const next = nextLiked
      ? [...current, artistId]
      : current.filter((id) => id !== artistId);

    try {
      window.localStorage.setItem(LIKED_ARTISTS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Keep the current-session state even if local storage is unavailable.
    }

    setLiked(nextLiked);
  }

  async function handleShare() {
    const url = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({ title: artistName, url });
        return;
      }
      await navigator.clipboard?.writeText(url);
    } catch {
      // Sharing was cancelled or unavailable.
    }
  }

  if (!target) return null;

  return createPortal(
    <div className={styles.actions}>
      <button
        type="button"
        className={drawerStyles.roundAction}
        onClick={toggleLike}
        aria-label={liked ? `Unlike ${artistName}` : `Like ${artistName}`}
        aria-pressed={liked}
      >
        <HeartIcon size={15} filled={liked} />
      </button>
      <button
        type="button"
        className={drawerStyles.roundAction}
        onClick={handleShare}
        aria-label={`Share ${artistName}`}
      >
        <ShareGlyph />
      </button>
    </div>,
    target,
  );
}
