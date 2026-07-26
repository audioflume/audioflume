"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import PlaylistDetailActionsMenu from "./PlaylistDetailActionsMenu";

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

  return (
    <>
      <PlaylistDetailActionsMenu />
      {isPlaylistDetail && target
        ? createPortal(
            <>
              <style>{`
                .playlist-detail-page .playlist-detail-shell {
                  --playlist-detail-control-inset-left: var(--fw-music-content-inset-left, 28px);
                  --playlist-detail-control-inset-right: var(--fw-music-content-inset-right, 20px);
                  grid-template-columns: 82px minmax(0, 1fr) 42px !important;
                  padding-left: var(--playlist-detail-control-inset-left) !important;
                  padding-right: var(--playlist-detail-control-inset-right) !important;
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

                .playlist-detail-page .playlist-detail-hero,
                .playlist-detail-page .playlist-detail-quick-row,
                .playlist-detail-page .playlist-detail-section,
                .playlist-detail-page .playlist-detail-shell > .playlist-detail-empty {
                  margin-left: calc(
                    var(--playlist-detail-page-gutter) -
                      var(--playlist-detail-control-inset-left)
                  ) !important;
                  margin-right: calc(
                    var(--playlist-detail-page-gutter) -
                      var(--playlist-detail-control-inset-right)
                  ) !important;
                }

                .playlist-detail-page .playlist-detail-hero,
                .playlist-detail-page .playlist-detail-section {
                  box-sizing: border-box;
                  width: min(100%, 1120px);
                  justify-self: center;
                  margin-right: auto !important;
                  margin-left: auto !important;
                }

                .playlist-detail-page .playlist-detail-shell > div:has(> footer) {
                  margin-left: calc(
                    32px - var(--playlist-detail-control-inset-left)
                  ) !important;
                  margin-right: calc(
                    32px - var(--playlist-detail-control-inset-right)
                  ) !important;
                }

                @media (max-width: 720px) {
                  .playlist-detail-page .playlist-detail-shell {
                    --playlist-detail-control-inset-left: 20px;
                    --playlist-detail-control-inset-right: 20px;
                  }

                  .playlist-detail-page .playlist-detail-shell > div:has(> footer) {
                    margin-left: 12px !important;
                    margin-right: 12px !important;
                  }
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
          )
        : null}
    </>
  );
}
