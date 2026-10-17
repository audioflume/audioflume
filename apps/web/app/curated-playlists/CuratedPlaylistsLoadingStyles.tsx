const CURATED_PLAYLIST_LOADING_STYLES = `
  body:has(.curated-playlists-page-root) {
    --curated-skeleton-fill: color-mix(
      in srgb,
      var(--text-primary) 7%,
      transparent
    );
    --curated-skeleton-fill-muted: color-mix(
      in srgb,
      var(--text-primary) 5%,
      transparent
    );
  }

  body:has(.curated-playlists-page-root) .curated-page-skeleton {
    padding-top: 0;
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-feature-carousel {
    width: 100vw;
    margin-left: calc(50% - 50vw);
    margin-bottom: 24px;
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-feature-viewport {
    position: relative;
    width: 100%;
    overflow: hidden;
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-feature-track {
    --curated-feature-carousel-card-width: min(720px, 52vw);
    position: relative;
    left: 50%;
    display: flex;
    width: max-content;
    gap: 24px;
    transform: translateX(-50%);
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-feature-card {
    position: relative;
    width: var(--curated-feature-carousel-card-width);
    min-width: var(--curated-feature-carousel-card-width);
    flex: 0 0 var(--curated-feature-carousel-card-width);
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-feature-media {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    background: var(--curated-skeleton-fill);
    animation: curated-page-skeleton-pulse 1.35s ease-in-out infinite;
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-feature-title {
    position: absolute;
    right: 56px;
    bottom: 22px;
    left: 24px;
    display: block;
    width: 42%;
    height: clamp(16px, 1.35vw, 22px);
    background: color-mix(
      in srgb,
      var(--text-primary) 12%,
      transparent
    );
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-feature-title.is-0 {
    width: 34%;
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-feature-title.is-2 {
    width: 28%;
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-feature-bookmark {
    position: absolute;
    top: 16px;
    right: 16px;
    width: 24px;
    height: 24px;
    background: var(--curated-skeleton-fill-muted);
    animation: curated-page-skeleton-pulse 1.35s ease-in-out infinite;
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-feature-play {
    position: absolute;
    right: 16px;
    bottom: 16px;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--curated-skeleton-fill-muted);
    animation: curated-page-skeleton-pulse 1.35s ease-in-out infinite;
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-feature-arrow {
    position: absolute;
    top: 50%;
    z-index: 2;
    display: block;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: var(--curated-skeleton-fill);
    transform: translateY(-50%);
    animation: curated-page-skeleton-pulse 1.35s ease-in-out infinite;
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-feature-arrow.is-left {
    left: 32px;
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-feature-arrow.is-right {
    right: 32px;
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-filters {
    display: grid;
    width: calc(
      100vw - var(--curated-feature-edge) - var(--curated-feature-edge)
    );
    grid-template-columns: repeat(8, minmax(0, 1fr));
    gap: 8px;
    margin-left: calc(50% - 50vw + var(--curated-feature-edge));
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-filter {
    display: flex;
    box-sizing: border-box;
    height: 52px;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: 1.25px solid var(--border);
    background: transparent;
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-filter-icon,
  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-filter-label,
  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-heading,
  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-card,
  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-card-title,
  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-card-meta {
    display: block;
    background: var(--curated-skeleton-fill);
    animation: curated-page-skeleton-pulse 1.35s ease-in-out infinite;
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-filter-icon {
    width: 13px;
    height: 13px;
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-filter-icon.is-1 {
    width: 11px;
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-filter-icon.is-2 {
    width: 15px;
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-filter-label {
    width: 52px;
    height: 10px;
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-filter-label.is-1 {
    width: 60px;
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-filter-label.is-2 {
    width: 44px;
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-filter-label.is-3 {
    width: 68px;
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-grid-group {
    width: min(100%, var(--filmwave-editorial-max-width));
    margin: 75px auto 0;
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-grid-head {
    margin-bottom: var(--filmwave-section-title-margin-bottom);
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-heading {
    width: 92px;
    height: 8px;
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 32px 12px;
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-grid-card {
    min-width: 0;
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-card {
    width: 100%;
    aspect-ratio: 16 / 9;
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-card-title {
    width: 72%;
    height: 11px;
    margin-top: 12px;
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-card-meta {
    width: 34%;
    height: 7px;
    margin-top: 8px;
    background: var(--curated-skeleton-fill-muted);
  }

  @media (max-width: 900px) {
    body:has(.curated-playlists-page-root)
      .curated-page-skeleton-feature-track {
      --curated-feature-carousel-card-width: 72vw;
    }
  }

  @media (max-width: 620px) {
    body:has(.curated-playlists-page-root)
      .curated-page-skeleton-feature-carousel {
      margin-bottom: 16px;
    }

    body:has(.curated-playlists-page-root)
      .curated-page-skeleton-feature-track {
      --curated-feature-carousel-card-width: 82vw;
    }

    body:has(.curated-playlists-page-root)
      .curated-page-skeleton-feature-title {
      right: 56px;
      bottom: 16px;
      left: 16px;
    }

    body:has(.curated-playlists-page-root)
      .curated-page-skeleton-feature-arrow {
      display: none;
    }
  }

  @media (max-width: 1040px) {
    body:has(.curated-playlists-page-root)
      .curated-page-skeleton-filters {
      display: flex;
      box-sizing: border-box;
      width: 100%;
      gap: 8px;
      margin-left: 0;
      overflow: hidden;
      padding-right: var(--curated-page-gutter);
      padding-left: var(--curated-page-gutter);
    }

    body:has(.curated-playlists-page-root)
      .curated-page-skeleton-filter {
      min-width: 132px;
      flex: 0 0 132px;
    }
  }

  @media (max-width: 620px) {
  }

  @media (max-width: 900px) {
    body:has(.curated-playlists-page-root)
      .curated-page-skeleton-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 560px) {
    body:has(.curated-playlists-page-root)
      .curated-page-skeleton-grid-group {
      margin-top: 58px;
    }

    body:has(.curated-playlists-page-root)
      .curated-page-skeleton-grid {
      grid-template-columns: 1fr;
    }
  }

  @keyframes curated-page-skeleton-pulse {
    0%,
    100% {
      opacity: 0.45;
    }

    50% {
      opacity: 0.9;
    }
  }
`

export default function CuratedPlaylistsLoadingStyles() {
  return <style>{CURATED_PLAYLIST_LOADING_STYLES}</style>;
}
