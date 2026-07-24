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

function syncPlaylistDetailBanner(target: HTMLElement | null) {
  const hero = target?.querySelector<HTMLElement>(".playlist-detail-hero");
  const cover = hero?.querySelector<HTMLElement>(".playlist-detail-cover");
  const image = cover?.querySelector<HTMLImageElement>("img");

  if (!hero) return;

  const imageUrl = image?.currentSrc || image?.src;
  if (imageUrl) {
    const escapedUrl = imageUrl.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    hero.style.setProperty(
      "--playlist-detail-banner-image",
      `url("${escapedUrl}")`,
    );
    return;
  }

  const coverBackground = cover
    ? window.getComputedStyle(cover).backgroundImage
    : "none";
  hero.style.setProperty(
    "--playlist-detail-banner-image",
    coverBackground && coverBackground !== "none"
      ? coverBackground
      : "linear-gradient(135deg, #25262b 0%, #111214 52%, #3a3c43 100%)",
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
      syncPlaylistDetailBanner(nextTarget);
      setTarget((currentTarget) =>
        currentTarget === nextTarget ? currentTarget : nextTarget,
      );
    };

    updateTarget();
    const observer = new MutationObserver(updateTarget);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src"],
    });
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

                body .playlist-detail-page .playlist-detail-hero {
                  isolation: isolate;
                  box-sizing: border-box !important;
                  grid-row: 1 / span 2 !important;
                  z-index: 0;
                  width: calc(
                    100% + var(--playlist-detail-control-inset-left) +
                      var(--playlist-detail-control-inset-right)
                  ) !important;
                  min-height: var(--playlist-detail-featured-hero-height) !important;
                  margin-top: 0 !important;
                  margin-right: calc(0px - var(--playlist-detail-control-inset-right)) !important;
                  margin-left: calc(0px - var(--playlist-detail-control-inset-left)) !important;
                  overflow: hidden !important;
                  background-color: #0b0d0d !important;
                  color: #fff !important;
                  padding: clamp(96px, 12vh, 132px) var(--playlist-detail-page-gutter) clamp(58px, 7vh, 86px) !important;
                }

                body .playlist-detail-page .playlist-detail-hero::before,
                body .playlist-detail-page .playlist-detail-hero::after {
                  content: "";
                  position: absolute;
                  pointer-events: none;
                }

                body .playlist-detail-page .playlist-detail-hero::before {
                  inset: -14px;
                  z-index: 0;
                  background-image: var(--playlist-detail-banner-image);
                  background-position: center;
                  background-repeat: no-repeat;
                  background-size: cover;
                  filter: blur(10px);
                  transform: scale(1.04);
                }

                body .playlist-detail-page .playlist-detail-hero::after {
                  inset: 0;
                  z-index: 1;
                  background:
                    linear-gradient(
                      180deg,
                      rgba(0, 0, 0, 0.4) 0%,
                      rgba(0, 0, 0, 0.08) 30%,
                      rgba(0, 0, 0, 0.56) 100%
                    ),
                    linear-gradient(
                      90deg,
                      rgba(0, 0, 0, 0.54) 0%,
                      rgba(0, 0, 0, 0.12) 72%
                    );
                }

                body .playlist-detail-page .playlist-detail-cover,
                body .playlist-detail-page .playlist-detail-hero > .min-w-0 {
                  z-index: 2 !important;
                }

                body .playlist-detail-page .playlist-detail-cover {
                  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.28);
                }

                body .playlist-detail-page .playlist-detail-title,
                body .playlist-detail-page .playlist-detail-rename-input {
                  color: #fff !important;
                }

                body .playlist-detail-page .playlist-detail-meta {
                  color: rgba(255, 255, 255, 0.76) !important;
                }

                body .playlist-detail-page .playlist-detail-dot {
                  color: rgba(255, 255, 255, 0.46) !important;
                }

                body .playlist-detail-page .playlist-detail-actions > button:first-child {
                  border-color: #fff !important;
                  background: #fff !important;
                  color: #111 !important;
                }

                body .playlist-detail-page .playlist-detail-actions > button:first-child:hover {
                  border-color: rgba(255, 255, 255, 0.88) !important;
                  background: rgba(255, 255, 255, 0.88) !important;
                }

                body .playlist-detail-page .playlist-detail-actions > button:nth-child(2) {
                  border: 1px solid rgba(255, 255, 255, 0.34) !important;
                  background: rgba(255, 255, 255, 0.08) !important;
                  color: #fff !important;
                }

                body .playlist-detail-page .playlist-detail-actions > button:nth-child(2):hover {
                  border-color: rgba(255, 255, 255, 0.48) !important;
                  background: rgba(255, 255, 255, 0.16) !important;
                }

                .playlist-detail-page .playlist-detail-browser-back,
                .playlist-detail-page .playlist-detail-search-sticky,
                .playlist-detail-page .playlist-detail-top-actions > button:last-child {
                  position: relative !important;
                  z-index: 4 !important;
                }

                .playlist-detail-page .playlist-detail-browser-back,
                .playlist-detail-page .playlist-detail-top-actions > button:last-child {
                  border-color: rgba(255, 255, 255, 0.34) !important;
                  background: rgba(0, 0, 0, 0.18) !important;
                  color: #fff !important;
                  backdrop-filter: blur(12px);
                }

                .playlist-detail-page .playlist-detail-browser-back:hover,
                .playlist-detail-page .playlist-detail-top-actions > button:last-child:hover {
                  border-color: rgba(255, 255, 255, 0.52) !important;
                  background: rgba(255, 255, 255, 0.14) !important;
                  color: #fff !important;
                }

                .playlist-detail-page .playlist-detail-search-row {
                  border-color: rgba(255, 255, 255, 0.34) !important;
                  background: rgba(0, 0, 0, 0.18) !important;
                  color: rgba(255, 255, 255, 0.72) !important;
                  backdrop-filter: blur(12px);
                }

                .playlist-detail-page .playlist-detail-search-input {
                  color: #fff !important;
                }

                .playlist-detail-page .playlist-detail-search-input::placeholder {
                  color: rgba(255, 255, 255, 0.62) !important;
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

                  body .playlist-detail-page .playlist-detail-hero {
                    padding-right: var(--playlist-detail-page-gutter) !important;
                    padding-left: var(--playlist-detail-page-gutter) !important;
                  }

                  .playlist-detail-page .playlist-detail-shell > div:has(> footer) {
                    margin-left: 12px !important;
                    margin-right: 12px !important;
                  }
                }

                @media (max-width: 560px) {
                  body .playlist-detail-page .playlist-detail-hero {
                    min-height: auto !important;
                    padding-top: 112px !important;
                    padding-bottom: 56px !important;
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
