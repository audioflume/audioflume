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
    <section className="discover-suggested-for-you-section mt-10" aria-label="Suggested for you">
      <style>{`
        .discover-suggested-for-you-section h2 {
          font-size: 1.4em !important;
          font-weight: 300 !important;
          font-variation-settings: "wght" 300 !important;
          line-height: 2rem !important;
          letter-spacing: -0.035em !important;
        }

        .discover-suggested-library-block {
          box-sizing: border-box !important;
          width: min(100%, 980px) !important;
          border: 1px solid var(--border-subtle) !important;
          background: color-mix(in srgb, var(--bg-primary) 96%, var(--text-primary) 4%) !important;
          padding: 6px 0 !important;
        }

        html.light .discover-suggested-library-block,
        html[data-theme="light"] .discover-suggested-library-block {
          background: color-mix(in srgb, var(--bg-primary) 94%, var(--text-primary) 6%) !important;
        }

        .discover-suggested-library-list .filmwave-song-card,
        .discover-suggested-library-list .scroll-mt-48.scroll-mb-40.cursor-pointer.items-center {
          border-bottom: 0 !important;
          padding-right: 14px !important;
          padding-left: 14px !important;
        }
      `}</style>

      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-[family-name:var(--font-instrument-sans)] text-2xl font-medium tracking-[-0.05em]">
            Suggested for you
          </h2>
        </div>
      </div>

      <div className="discover-suggested-library-block">
        <div className="discover-suggested-library-list">
          {songs.map((song) => (
            <SongCard key={song.id} song={song} />
          ))}
        </div>
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
