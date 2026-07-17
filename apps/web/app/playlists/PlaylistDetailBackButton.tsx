"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

function BackIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M15 5L8 12L15 19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function PlaylistDetailBackButton() {
  const pathname = usePathname();
  const router = useRouter();
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const isPlaylistDetail = /^\/playlists\/[^/]+$/.test(pathname);

  useEffect(() => {
    if (!isPlaylistDetail) {
      setTarget(null);
      return;
    }

    const updateTarget = () => {
      const nextTarget = document.querySelector<HTMLElement>(
        ".playlist-detail-page .playlist-detail-shell",
      );
      setTarget((currentTarget) =>
        currentTarget === nextTarget ? currentTarget : nextTarget,
      );
    };

    updateTarget();

    const observer = new MutationObserver(updateTarget);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [isPlaylistDetail]);

  if (!isPlaylistDetail || !target) return null;

  return createPortal(
    <>
      <style>{`
        .playlist-detail-page .playlist-detail-shell {
          grid-template-columns: 82px minmax(0, 1fr) 42px !important;
        }

        .playlist-detail-page .playlist-detail-browser-back {
          position: static !important;
          top: auto !important;
          right: auto !important;
          left: auto !important;
          grid-column: 1 !important;
          grid-row: 1 !important;
          width: 82px !important;
          min-width: 82px !important;
          height: 42px !important;
          justify-self: start;
          margin: 0 !important;
          padding: 0 14px !important;
        }

        .playlist-detail-page .playlist-detail-search-sticky {
          grid-column: 2 !important;
          grid-row: 1 !important;
        }

        .playlist-detail-page .playlist-detail-top-actions > button:last-child {
          grid-column: 3 !important;
          grid-row: 1 !important;
        }
      `}</style>
      <button
        type="button"
        className="playlist-detail-browser-back"
        onClick={() => router.back()}
        aria-label="Go back to the previous page"
      >
        <BackIcon />
        <span>Back</span>
      </button>
    </>,
    target,
  );
}
