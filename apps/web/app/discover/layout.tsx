import DiscoverHeaderScrollState from "./DiscoverSharedHeaderSearch";

const DISCOVER_LAYOUT_STYLE = `
  body:has(.discover-page-root) {
    --discover-page-gutter: clamp(28px, 5.2vw, 82px);
  }

  body:has(.discover-page-root) .filmwave-header,
  body:has(.discover-page-root) .filmwave-header .filmwave-header-tonal-wordmark,
  body:has(.discover-page-root) .filmwave-header .filmwave-header-logo-action,
  body:has(.discover-page-root) .filmwave-header .filmwave-header-nav-link,
  body:has(.discover-page-root) .filmwave-header .filmwave-header-actions {
    transition:
      background-color 180ms ease,
      border-color 180ms ease,
      color 180ms ease !important;
  }

  body:not(.filmwave-discover-scrolled):has(.discover-page-root) .filmwave-header {
    --filmwave-chrome-surface: transparent;
    border-bottom-color: rgba(255, 255, 255, 0.12) !important;
    background: transparent !important;
    background-color: transparent !important;
    color: #fff !important;
  }

  body:not(.filmwave-discover-scrolled):has(.discover-page-root)
    .filmwave-header
    .filmwave-header-tonal-wordmark,
  body:not(.filmwave-discover-scrolled):has(.discover-page-root)
    .filmwave-header
    .filmwave-header-logo-action,
  body:not(.filmwave-discover-scrolled):has(.discover-page-root)
    .filmwave-header
    .filmwave-header-actions {
    color: #fff !important;
  }

  body:not(.filmwave-discover-scrolled):has(.discover-page-root)
    .filmwave-header
    .filmwave-header-nav-link {
    color: rgba(255, 255, 255, 0.72) !important;
  }

  body:not(.filmwave-discover-scrolled):has(.discover-page-root)
    .filmwave-header
    .filmwave-header-nav-link:hover,
  body:not(.filmwave-discover-scrolled):has(.discover-page-root)
    .filmwave-header
    .filmwave-header-nav-link.is-active {
    background: rgba(255, 255, 255, 0.13) !important;
    color: #fff !important;
  }

  body.filmwave-discover-scrolled:has(.discover-page-root) .filmwave-header {
    --filmwave-chrome-surface: var(--bg-primary);
    border-bottom-color: var(--border) !important;
    background: var(--bg-primary) !important;
    background-color: var(--bg-primary) !important;
    color: var(--text-primary) !important;
  }

  body.filmwave-discover-scrolled:has(.discover-page-root)
    .filmwave-header
    .filmwave-header-tonal-wordmark,
  body.filmwave-discover-scrolled:has(.discover-page-root)
    .filmwave-header
    .filmwave-header-logo-action,
  body.filmwave-discover-scrolled:has(.discover-page-root)
    .filmwave-header
    .filmwave-header-actions {
    color: var(--text-primary) !important;
  }

  body.filmwave-discover-scrolled:has(.discover-page-root)
    .filmwave-header
    .filmwave-header-nav-link {
    color: var(--text-secondary) !important;
  }

  body.filmwave-discover-scrolled:has(.discover-page-root)
    .filmwave-header
    .filmwave-header-nav-link:hover,
  body.filmwave-discover-scrolled:has(.discover-page-root)
    .filmwave-header
    .filmwave-header-nav-link.is-active {
    background: var(--bg-hover-strong) !important;
    color: var(--text-primary) !important;
  }

  .discover-page-root {
    min-height: 100vh;
    overflow: hidden;
    margin-left: var(--sidebar-width);
    background: var(--bg-primary);
    color: var(--text-primary);
    transition: margin-left 200ms ease;
  }

  .discover-hero {
    position: relative;
    display: flex;
    width: 100%;
    min-height: clamp(500px, 69vh, 760px);
    overflow: hidden;
    align-items: stretch;
    background: #0b0d0d;
    color: #fff;
  }

  .discover-hero-image,
  .discover-hero-fallback {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .discover-hero-fallback {
    background:
      radial-gradient(circle at 70% 38%, rgba(126, 144, 125, 0.42), transparent 34%),
      linear-gradient(115deg, #07100f 0%, #17231f 55%, #0d1110 100%);
  }

  .discover-hero-overlay {
    position: absolute;
    inset: 0;
    background:
      linear-gradient(180deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.08) 30%, rgba(0, 0, 0, 0.54) 100%),
      linear-gradient(90deg, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0.1) 72%);
    pointer-events: none;
  }

  .discover-hero-inner {
    position: relative;
    z-index: 1;
    display: flex;
    width: 100%;
    align-items: center;
    justify-content: center;
    padding: var(--filmwave-header-height) var(--discover-page-gutter) 0;
  }

  .discover-hero-content {
    width: min(860px, 100%);
    margin: 0 auto;
  }

  .discover-hero-content h1 {
    margin: 0 0 18px;
    font-family: var(--font-aktiv-grotesk), var(--font-aktiv-grotesk), sans-serif;
    font-size: clamp(18px, 1.45vw, 24px) !important;
    font-weight: 400 !important;
    letter-spacing: -0.045em !important;
    line-height: 1.1 !important;
  }

  .discover-hero-search {
    display: grid;
    width: min(780px, 100%);
    min-height: 58px;
    grid-template-columns: 39px minmax(0, 1fr) 120px;
    align-items: center;
    border: 1px solid rgba(255, 255, 255, 0.7);
    background: rgba(255, 255, 255, 0.96);
    color: #111;
    box-shadow: 0 16px 45px rgba(0, 0, 0, 0.18);
  }

  .discover-hero-search-icon {
    justify-self: center;
  }

  .discover-hero-search button {
    height: calc(100% - 16px);
    cursor: pointer;
    border: 0;
    background: #111;
    color: #fff;
    font-family: inherit;
    font-size: 12px;
    font-weight: 500;
    margin-right: 8px;
    padding: 0 20px;
    transition: opacity 150ms ease;
  }

  .discover-hero-search button:hover {
    opacity: 0.82;
  }

  .discover-hero-values {
    display: grid;
    width: min(780px, 100%);
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: clamp(28px, 7vw, 92px);
    margin-top: 28px;
  }

  .discover-hero-values > div {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 5px;
  }

  .discover-hero-values strong {
    font-size: 12px;
    font-weight: 600;
    line-height: 1.2;
  }

  .discover-hero-values span {
    color: rgba(255, 255, 255, 0.7);
    font-size: 10.5px;
    font-weight: 400;
    line-height: 1.45;
  }

  .discover-content {
    padding: 42px var(--discover-page-gutter) 0;
  }

  .discover-section {
    margin-top: 58px;
  }

  .discover-section:first-child {
    margin-top: 0;
  }

  .discover-section-heading {
    display: flex;
    min-height: 34px;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 16px;
  }

  .discover-section-heading > a {
    color: var(--text-subtle);
  }

  .discover-section-heading > a:hover {
    color: var(--text-primary);
  }

  .discover-shelf-controls {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .discover-shelf-controls button {
    display: inline-flex;
    width: 30px;
    height: 30px;
    cursor: pointer;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--border-subtle);
    border-radius: 999px;
    background: transparent;
    color: var(--text-secondary);
    padding: 0;
    transition:
      background-color 150ms ease,
      color 150ms ease,
      opacity 150ms ease;
  }

  .discover-shelf-controls button:hover:not(:disabled) {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .discover-shelf-controls button:disabled {
    cursor: default;
    opacity: 0.28;
  }

  .discover-mood-scroller {
    display: flex;
    width: calc(100% + (var(--discover-page-gutter) * 2));
    overflow-x: auto;
    overflow-y: hidden;
    align-items: flex-start;
    gap: 12px;
    margin-right: calc(var(--discover-page-gutter) * -1);
    margin-left: calc(var(--discover-page-gutter) * -1);
    overscroll-behavior-x: contain;
    overscroll-behavior-y: none;
    scroll-behavior: smooth;
    scroll-padding-inline: var(--discover-page-gutter);
    scroll-snap-type: x proximity;
    scrollbar-width: none;
    padding: 0 var(--discover-page-gutter) 2px;
  }

  .discover-mood-scroller::-webkit-scrollbar {
    display: none;
  }

  .discover-mood-card {
    display: block;
    min-width: min(43vw, 560px);
    flex: 0 0 min(43vw, 560px);
    scroll-snap-align: start;
    color: inherit;
    text-decoration: none;
  }

  .discover-mood-image {
    position: relative;
    width: 100%;
    aspect-ratio: 1.72 / 1;
    overflow: hidden;
    background: var(--bg-secondary);
  }

  .discover-mood-image::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(0, 0, 0, 0.03), rgba(0, 0, 0, 0.2));
    pointer-events: none;
  }

  .discover-mood-image img {
    transition: transform 500ms ease;
  }

  .discover-mood-card:hover .discover-mood-image img {
    transform: scale(1.025);
  }

  .discover-card-arrow {
    position: absolute;
    top: 14px;
    right: 14px;
    z-index: 2;
    display: inline-flex;
    width: 30px;
    height: 30px;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(255, 255, 255, 0.34);
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.14);
    color: #fff;
    backdrop-filter: blur(8px);
  }

  .discover-mood-card h3,
  .discover-playlist-card h3 {
    margin: 10px 0 0;
    color: var(--text-primary);
    font-size: 13.5px;
    font-weight: 500;
    line-height: 1.25;
  }

  .discover-mood-card p,
  .discover-playlist-card p {
    margin: 4px 0 0;
    color: var(--text-muted);
    font-size: 11.5px;
    font-weight: 400;
    line-height: 1.45;
  }

  .discover-playlist-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: clamp(10px, 1.25vw, 18px);
  }

  .discover-playlist-card {
    display: block;
    min-width: 0;
    color: inherit;
    text-decoration: none;
  }

  .discover-playlist-image {
    position: relative;
    width: 100%;
    aspect-ratio: 1;
    overflow: hidden;
    background: var(--bg-secondary);
  }

  .discover-playlist-image img {
    transition: transform 500ms ease;
  }

  .discover-playlist-card:hover .discover-playlist-image img {
    transform: scale(1.025);
  }

  .discover-media-fallback {
    position: absolute;
    inset: 0;
    background:
      linear-gradient(145deg, color-mix(in srgb, var(--bg-tertiary) 82%, var(--text-muted) 18%), var(--bg-secondary));
  }

  .discover-song-section .fw-song-list {
    width: 100% !important;
    margin: 0 !important;
  }

  .discover-song-section .fw-song-list-head {
    margin-bottom: 12px !important;
  }

  .discover-song-skeleton {
    width: 100%;
    height: 64px;
    margin-bottom: 2px;
  }

  .discover-card-skeleton {
    position: relative;
    overflow: hidden;
    background: var(--bg-secondary);
  }

  .discover-mood-card.discover-card-skeleton {
    aspect-ratio: 1.72 / 1;
  }

  .discover-playlist-card.discover-card-skeleton {
    aspect-ratio: 1;
  }

  .discover-card-skeleton::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent,
      color-mix(in srgb, var(--bg-hover) 58%, transparent),
      transparent
    );
    transform: translateX(-100%);
    animation: discover-card-shimmer 1.45s ease-in-out infinite;
  }

  @keyframes discover-card-shimmer {
    to {
      transform: translateX(100%);
    }
  }

  .discover-footer-wrap {
    margin-right: calc(32px - var(--discover-page-gutter));
    margin-left: calc(32px - var(--discover-page-gutter));
    padding-top: 64px;
  }

  @media (max-width: 1280px) {
    .discover-playlist-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }

  @media (max-width: 980px) {
    .discover-page-root {
      margin-left: var(--sidebar-width);
    }

    .discover-mood-card {
      min-width: min(68vw, 500px);
      flex-basis: min(68vw, 500px);
    }

    .discover-playlist-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (max-width: 720px) {
    body:has(.discover-page-root) {
      --discover-page-gutter: 20px;
    }

    .discover-hero {
      min-height: 590px;
    }

    .discover-hero-inner {
      align-items: center;
      justify-content: center;
      padding: var(--filmwave-header-height) var(--discover-page-gutter) 0;
    }

    .discover-hero-content {
      margin: 0 auto;
    }

    .discover-hero-search {
      grid-template-columns: 39px minmax(0, 1fr) 92px;
    }

    .discover-hero-values {
      grid-template-columns: 1fr;
      gap: 14px;
      margin-top: 22px;
    }

    .discover-mood-card {
      min-width: 82vw;
      flex-basis: 82vw;
    }

    .discover-playlist-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (prefers-reduced-motion: reduce) {
    body:has(.discover-page-root) *,
    body:has(.discover-page-root) *::before,
    body:has(.discover-page-root) *::after {
      scroll-behavior: auto !important;
      transition-duration: 0.01ms !important;
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
    }
  }
`;

export default function DiscoverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style>{DISCOVER_LAYOUT_STYLE}</style>
      <DiscoverHeaderScrollState />
      {children}
    </>
  );
}
