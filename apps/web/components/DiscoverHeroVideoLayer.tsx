"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const VIDEO_URL =
  "https://pub-cd585d75522a44bb9dad78b6f9974d03.r2.dev/5520037-hd_1920_1080_18fps.mp4";

export default function DiscoverHeroVideoLayer() {
  const [hero, setHero] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const syncHero = () => {
      const nextHero = document.querySelector<HTMLElement>(".discover-hero");
      setHero((current) => (current === nextHero ? current : nextHero));
    };

    syncHero();

    const observer = new MutationObserver(syncHero);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  if (!hero) return null;

  return createPortal(
    <>
      <style>{`
        body:has(.discover-page-root) .discover-hero {
          height: 100svh !important;
          min-height: 100svh !important;
        }

        body:has(.discover-page-root) .discover-hero-image {
          display: none !important;
        }

        body:has(.discover-page-root) .discover-hero-video {
          position: absolute;
          inset: 0;
          z-index: 0;
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        body:has(.discover-page-root) .discover-hero-overlay {
          z-index: 1;
          background:
            linear-gradient(180deg, transparent 68%, rgba(0, 0, 0, 0.38) 84%, #000 100%),
            linear-gradient(180deg, rgba(0, 0, 0, 0.12) 0%, rgba(0, 0, 0, 0.03) 44%, rgba(0, 0, 0, 0.15) 100%),
            linear-gradient(90deg, rgba(0, 0, 0, 0.08) 0%, rgba(0, 0, 0, 0) 58%) !important;
        }

        body:has(.discover-page-root) .discover-hero-inner {
          z-index: 2;
        }

        body:has(.discover-page-root) .discover-hero-content h1 {
          display: none !important;
        }

        body:has(.discover-page-root) .discover-hero-values strong {
          font-family: var(--font-aktiv-grotesk), sans-serif !important;
          font-size: clamp(11px, 0.8vw, 14px) !important;
          font-weight: 500 !important;
          letter-spacing: normal !important;
          line-height: 1.15 !important;
          text-transform: uppercase !important;
        }

        body:has(.discover-page-root) .discover-hero-values span {
          color: rgba(255, 255, 255, 0.72) !important;
          font-family: var(--font-jetbrains-mono-filmwave), monospace !important;
          font-size: clamp(8px, 0.55vw, 9.5px) !important;
          font-weight: 400 !important;
          letter-spacing: 0 !important;
          line-height: 2.05 !important;
          text-transform: uppercase !important;
        }

        body:has(.discover-page-root) .discover-section-heading h2 {
          font-family: var(--font-aktiv-grotesk), sans-serif !important;
          font-size: clamp(18px, 1.25vw, 23px) !important;
          font-weight: 500 !important;
          font-kerning: normal !important;
          letter-spacing: 0 !important;
          line-height: 1 !important;
          text-transform: uppercase !important;
        }

        body:has(.discover-page-root) .discover-curated-playlist-section {
          width: min(100%, 1120px) !important;
          margin-right: auto !important;
          margin-left: auto !important;
        }

        body:has(.discover-page-root)
          .discover-curated-playlist-section
          .discover-playlist-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          column-gap: clamp(24px, 2.4vw, 38px) !important;
          row-gap: clamp(30px, 3vw, 46px) !important;
        }

        body:has(.discover-page-root)
          .discover-curated-playlist-section
          .discover-playlist-card-shell:nth-child(n + 10) {
          display: none !important;
        }

        body:has(.discover-page-root)
          .discover-curated-playlist-section
          .discover-playlist-card-shell {
          position: relative;
          min-width: 0;
        }

        body:has(.discover-page-root)
          .discover-curated-playlist-section
          .discover-playlist-card {
          position: relative;
          display: block;
        }

        body:has(.discover-page-root)
          .discover-curated-playlist-section
          .discover-playlist-image {
          width: 100% !important;
          aspect-ratio: 16 / 9 !important;
        }

        body:has(.discover-page-root)
          .discover-curated-playlist-section
          .discover-playlist-card h3 {
          position: absolute;
          inset: 0;
          z-index: 4;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 !important;
          padding: 20px !important;
          color: #fff !important;
          font-family: var(--font-jetbrains-mono-filmwave), monospace !important;
          font-size: clamp(14px, 1vw, 18px) !important;
          font-weight: 400 !important;
          font-kerning: normal !important;
          letter-spacing: 0 !important;
          line-height: 1.05 !important;
          text-align: center;
          text-transform: uppercase !important;
          white-space: normal !important;
          pointer-events: none;
        }

        body:has(.discover-page-root)
          .discover-curated-playlist-section
          .discover-playlist-card p {
          display: none !important;
        }

        body:has(.discover-page-root)
          .discover-curated-playlist-section
          .playlist-card-menu-wrap {
          position: absolute !important;
          top: 12px !important;
          right: 12px !important;
          bottom: auto !important;
          z-index: 6 !important;
          width: 18px !important;
          height: 18px !important;
        }

        body:has(.discover-page-root)
          .discover-curated-playlist-section
          .playlist-menu-btn-grid {
          color: #fff !important;
          text-shadow: 0 1px 8px rgba(0, 0, 0, 0.55);
        }

        @media (max-width: 900px) {
          body:has(.discover-page-root)
            .discover-curated-playlist-section
            .discover-playlist-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 560px) {
          body:has(.discover-page-root)
            .discover-curated-playlist-section
            .discover-playlist-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <video
        className="discover-hero-video"
        src={VIDEO_URL}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
      />
    </>,
    hero,
  );
}
