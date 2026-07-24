"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import CommunityPlaylistDetailChrome from "./CommunityPlaylistDetailChrome";

function syncCommunityPlaylistBanner() {
  const hero = document.querySelector<HTMLElement>(
    ".community-detail-page .community-detail-hero",
  );
  const cover = hero?.querySelector<HTMLElement>(".community-detail-cover");
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
      : "linear-gradient(135deg, #372f4f 0%, #111111 48%, #75649a 100%)",
  );
}

export default function CommunityPlaylistDetailLayout({
  children,
}: {
  children: ReactNode;
}) {
  useEffect(() => {
    syncCommunityPlaylistBanner();

    const observer = new MutationObserver(syncCommunityPlaylistBanner);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src"],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <style>{`
        .community-detail-page {
          margin-left: var(--filmwave-page-sidebar-offset) !important;
          margin-top: var(--filmwave-header-height, 75px) !important;
        }

        body .community-detail-page .community-detail-shell {
          grid-template-columns: 82px minmax(0, 1fr) 42px 42px !important;
          column-gap: 13px !important;
        }

        body .community-detail-page .community-detail-more-button svg {
          width: 14px !important;
          height: 14px !important;
        }

        .community-detail-page .community-detail-favorite-button {
          grid-column: 3 !important;
          transform: translateX(5px);
        }

        .community-detail-page .community-detail-more-menu {
          grid-column: 4 !important;
        }

        body .community-detail-page .community-detail-hero {
          isolation: isolate;
          box-sizing: border-box !important;
          width: calc(
            100% + var(--playlist-detail-control-inset-left) +
              var(--playlist-detail-control-inset-right)
          ) !important;
          min-height: var(--playlist-detail-featured-hero-height) !important;
          margin-top: 22px !important;
          margin-right: calc(0px - var(--playlist-detail-control-inset-right)) !important;
          margin-left: calc(0px - var(--playlist-detail-control-inset-left)) !important;
          overflow: hidden !important;
          background-color: #0b0d0d !important;
          color: #fff !important;
          padding: clamp(58px, 7vh, 86px) var(--playlist-detail-page-gutter) !important;
        }

        body .community-detail-page .community-detail-hero::before,
        body .community-detail-page .community-detail-hero::after {
          content: "";
          position: absolute;
          pointer-events: none;
        }

        body .community-detail-page .community-detail-hero::before {
          inset: -14px;
          z-index: 0;
          background-image: var(--playlist-detail-banner-image);
          background-position: center;
          background-repeat: no-repeat;
          background-size: cover;
          filter: blur(10px);
          transform: scale(1.04);
        }

        body .community-detail-page .community-detail-hero::after {
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

        body .community-detail-page .community-detail-cover,
        body .community-detail-page .community-detail-hero > .min-w-0 {
          z-index: 2 !important;
        }

        body .community-detail-page .community-detail-cover {
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.28);
        }

        body .community-detail-page .community-detail-title {
          color: #fff !important;
        }

        body .community-detail-page .community-detail-meta {
          color: rgba(255, 255, 255, 0.76) !important;
        }

        body .community-detail-page .community-detail-dot {
          color: rgba(255, 255, 255, 0.46) !important;
        }

        body .community-detail-page .community-detail-creator img,
        body .community-detail-page .community-detail-creator-placeholder {
          border: 1px solid rgba(255, 255, 255, 0.34);
        }

        body .community-detail-page .community-detail-actions > button:first-child {
          border-color: #fff !important;
          background: #fff !important;
          color: #111 !important;
        }

        body .community-detail-page .community-detail-actions > button:first-child:hover {
          border-color: rgba(255, 255, 255, 0.88) !important;
          background: rgba(255, 255, 255, 0.88) !important;
        }

        body .community-detail-page .community-detail-actions > button:nth-child(2) {
          border: 1px solid rgba(255, 255, 255, 0.34) !important;
          background: rgba(255, 255, 255, 0.08) !important;
          color: #fff !important;
        }

        body .community-detail-page .community-detail-actions > button:nth-child(2):hover {
          border-color: rgba(255, 255, 255, 0.48) !important;
          background: rgba(255, 255, 255, 0.16) !important;
        }

        @media (max-width: 720px) {
          body .community-detail-page .community-detail-hero {
            padding-right: var(--playlist-detail-page-gutter) !important;
            padding-left: var(--playlist-detail-page-gutter) !important;
          }
        }

        @media (max-width: 640px) {
          body .community-detail-page .community-detail-shell {
            grid-template-columns: 82px minmax(0, 1fr) 42px !important;
            column-gap: 18px !important;
          }

          .community-detail-page .community-detail-favorite-button {
            grid-column: 3 !important;
            transform: none;
          }
        }

        @media (max-width: 560px) {
          body .community-detail-page .community-detail-hero {
            min-height: auto !important;
            padding-top: 48px !important;
            padding-bottom: 56px !important;
          }
        }
      `}</style>
      <CommunityPlaylistDetailChrome />
      {children}
    </>
  );
}
