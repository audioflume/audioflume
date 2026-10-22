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
    .curated-page-skeleton-intro {
    display: grid;
    width: min(calc(100% - 40px), 580px);
    gap: 0;
    margin: 64px auto 62px;
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-intro-line,
  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-search-pill,
  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-pill,
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
    .curated-page-skeleton-intro-line {
    height: 32px;
    margin: 0 auto;
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-intro-line.is-long {
    width: 100%;
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-intro-line.is-short {
    width: 72%;
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-pill-row {
    display: flex;
    width: min(calc(100% - 80px), 1320px);
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin: 0 auto;
    padding: 0 10px 2px;
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-search-pill {
    width: 250px;
    height: 30px;
    border-radius: 999px;
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-pill {
    width: 70px;
    height: 30px;
    border-radius: 999px;
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-pill.is-1 {
    width: 84px;
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-pill.is-2 {
    width: 62px;
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-pill.is-3 {
    width: 76px;
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-grid-group {
    width: 100%;
    margin: 75px 0 0;
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 32px;
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
    width: 68%;
    height: 16px;
    margin-top: 9px;
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-card-title.is-1 {
    width: 78%;
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-card-title.is-2 {
    width: 56%;
  }

  body:has(.curated-playlists-page-root)
    .curated-page-skeleton-card-meta {
    width: 42px;
    height: 8px;
    margin-top: 6px;
    background: var(--curated-skeleton-fill-muted);
  }

  @media (max-width: 980px) {
    body:has(.curated-playlists-page-root)
      .curated-page-skeleton-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    body:has(.curated-playlists-page-root)
      .curated-page-skeleton-pill-row {
      width: calc(100% - 64px);
    }
  }

  @media (max-width: 620px) {
    body:has(.curated-playlists-page-root)
      .curated-page-skeleton-grid {
      row-gap: 24px;
      column-gap: 12px;
    }
  }

  @media (max-width: 720px) {
    body:has(.curated-playlists-page-root)
      .curated-page-skeleton-pill-row {
      width: calc(100% - 32px);
      gap: 7px;
      padding-right: 4px;
      padding-left: 4px;
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
