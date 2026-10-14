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
    .curated-page-skeleton-feature-viewport {
    width: 100vw;
    margin-left: calc(50% - 50vw);
    margin-bottom: 30px;
    overflow: hidden;
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-feature-track {
    position: relative;
    left: 50%;
    display: flex;
    width: max-content;
    gap: 30px;
    transform: translateX(-50%);
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-feature-card {
    position: relative;
    width: min(720px, 52vw);
    flex: 0 0 min(720px, 52vw);
    aspect-ratio: 16 / 9;
    overflow: hidden;
    background: var(--curated-skeleton-fill);
    animation: curated-page-skeleton-pulse 1.35s ease-in-out infinite;
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-feature-title {
    position: absolute;
    bottom: 22px;
    left: 24px;
    display: block;
    width: 34%;
    height: 22px;
    background: color-mix(
      in srgb,
      var(--text-primary) 12%,
      transparent
    );
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-feature-title.is-1 {
    width: 42%;
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-feature-title.is-2 {
    width: 28%;
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
    border: 1px solid var(--border);
    background: transparent;
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-filter-icon,
  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-filter-label,
  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-heading,
  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-description,
  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-controls span,
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
    .curated-page-skeleton-shelf {
    margin-top: 75px;
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-shelf-head {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 12px;
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-heading {
    width: min(190px, 42vw);
    height: 20px;
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-description {
    width: min(300px, 58vw);
    height: 8px;
    margin-top: 8px;
    background: var(--curated-skeleton-fill-muted);
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-controls {
    display: flex;
    gap: 8px;
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-controls span {
    width: 32px;
    height: 32px;
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-cards {
    display: flex;
    gap: var(--curated-landing-card-gap);
    overflow: hidden;
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-card-shell {
    width: var(--curated-landing-card-width);
    min-width: var(--curated-landing-card-width);
    flex: 0 0 var(--curated-landing-card-width);
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
      .curated-page-skeleton-feature-card {
      width: 72vw;
      flex-basis: 72vw;
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
    body:has(.curated-playlists-page-root)
      .curated-page-skeleton-feature-card {
      width: 82vw;
      flex-basis: 82vw;
    }

    body:has(.curated-playlists-page-root)
      .curated-page-skeleton-feature-title {
      bottom: 16px;
      left: 16px;
    }
  }

  @media (max-width: 640px) {
    body:has(.curated-playlists-page-root)
      .curated-page-skeleton-controls {
      display: none;
    }

    body:has(.curated-playlists-page-root)
      .curated-page-skeleton-shelf {
      margin-top: 58px;
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
