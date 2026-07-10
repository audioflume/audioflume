"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import SongCard from "@/components/SongCard";
import { useSongs } from "@/hooks/useSongs";

const SUGGESTED_SONG_COUNT = 10;
const SUGGESTED_PORTAL_ID = "discover-suggested-for-you-portal";

function SuggestedForYouSection({ songs }: { songs: ReturnType<typeof useSongs>["songs"] }) {
  if (songs.length === 0) return null;

  return (
    <section className="discover-suggested-for-you-section mt-10" aria-label="Newly added">
      <style>{`
        .discover-suggested-for-you-section h2 {
          font-size: 1.4em !important;
          font-weight: 300 !important;
          font-variation-settings: "wght" 300 !important;
          line-height: 2rem !important;
          letter-spacing: -0.035em !important;
        }

        .discover-suggested-library-list {
          display: flex !important;
          flex-direction: column !important;
          gap: 4px !important;
          margin: 10px 20px 28px !important;
        }

        .discover-suggested-library-list .filmwave-song-card,
        .discover-suggested-library-list .desktop-song-card,
        .discover-suggested-library-list .scroll-mt-48.scroll-mb-40.cursor-pointer.items-center {
          --filmwave-song-card-padding-left: 24px;
          --filmwave-song-card-padding-right: 18px;
          --filmwave-song-card-hover-bg: var(--bg-hover);
          border-bottom: 0 !important;
          border-radius: 16px !important;
        }
      `}</style>

      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-[family-name:var(--font-instrument-sans)] text-2xl font-medium tracking-[-0.05em]">
            Newly added
          </h2>
        </div>
      </div>

      <div className="fw-song-list discover-suggested-library-list">
        {songs.map((song) => (
          <SongCard key={song.id} song={song} />
        ))}
      </div>
    </section>
  );
}

export default function SuggestedForYouPortal() {
  const { songs, loading } = useSongs();
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);

  const recentSongs = useMemo(
    () => songs.filter((song) => song.audioUrl).slice(0, SUGGESTED_SONG_COUNT),
    [songs],
  );

  useEffect(() => {
    if (loading) return;

    let createdNode: HTMLElement | null = null;
    let timeoutId: number | null = null;

    function mountPortal() {
      const existingNode = document.getElementById(SUGGESTED_PORTAL_ID);

      if (existingNode) {
        setPortalNode(existingNode);
        return true;
      }

      const readyHeading = Array.from(document.querySelectorAll("h2")).find(
        (heading) => heading.textContent?.trim() === "Ready-to-cut tracks",
      );
      const readySection = readyHeading?.closest("section");
      const parent = readySection?.parentElement;

      if (!readySection || !parent) return false;

      createdNode = document.createElement("div");
      createdNode.id = SUGGESTED_PORTAL_ID;
      parent.insertBefore(createdNode, readySection);
      setPortalNode(createdNode);
      return true;
    }

    if (mountPortal()) {
      return () => {
        createdNode?.remove();
        setPortalNode(null);
      };
    }

    const observer = new MutationObserver(() => {
      if (mountPortal()) observer.disconnect();
    });

    observer.observe(document.body, { childList: true, subtree: true });
    timeoutId = window.setTimeout(() => observer.disconnect(), 10000);

    return () => {
      observer.disconnect();
      if (timeoutId) window.clearTimeout(timeoutId);
      createdNode?.remove();
      setPortalNode(null);
    };
  }, [loading]);

  if (!portalNode || recentSongs.length === 0) return null;

  return createPortal(<SuggestedForYouSection songs={recentSongs} />, portalNode);
}
