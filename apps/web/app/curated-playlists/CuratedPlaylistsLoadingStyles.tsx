const CURATED_PLAYLIST_LOADING_STYLES = `
  body:has(.curated-playlists-page-root) {
    --curated-skeleton-page: color-mix(
      in srgb,
      var(--text-primary) 8%,
      transparent
    );
    --curated-skeleton-page-muted: color-mix(
      in srgb,
      var(--text-primary) 5%,
      transparent
    );
    --curated-skeleton-highlight: color-mix(
      in srgb,
      var(--text-primary) 9%,
      transparent
    );
    --curated-skeleton-hero: rgba(255, 255, 255, 0.12);
    --curated-skeleton-hero-muted: rgba(255, 255, 255, 0.075);
  }

  body:has(.curated-playlists-page-root)
    .curated-featured-playlist-loading {
    display: grid !important;
    min-height: var(--curated-featured-hero-height) !important;
    overflow: hidden !important;
    background: #0b0d0d !important;
    border-radius: 0 !important;
  }

  body:has(.curated-playlists-page-root)
    .curated-featured-playlist-loading-image {
    position: absolute !important;
    inset: 0 !important;
    z-index: 0 !important;
    display: block !important;
    width: 100% !important;
    height: 100% !important;
    grid-column: 1 / -1 !important;
    grid-row: 1 !important;
    border-radius: 0 !important;
    background:
      linear-gradient(
          var(--curated-skeleton-hero-muted),
          var(--curated-skeleton-hero-muted)
        )
        left var(--curated-page-gutter) bottom 14px /
        calc(
          100% - var(--curated-featured-tracks-width) -
            var(--curated-page-gutter) - var(--curated-page-gutter) - 22px
        )
        1px no-repeat,
      linear-gradient(
          var(--curated-skeleton-hero),
          var(--curated-skeleton-hero)
        )
        right calc(var(--curated-page-gutter) + 58px) bottom 34px / 7px 11px
        no-repeat,
      linear-gradient(
          var(--curated-skeleton-hero),
          var(--curated-skeleton-hero)
        )
        right calc(var(--curated-page-gutter) + 39px) bottom 34px / 7px 11px
        no-repeat,
      linear-gradient(
          var(--curated-skeleton-hero-muted),
          var(--curated-skeleton-hero-muted)
        )
        right var(--curated-page-gutter) bottom 35px / 24px 8px no-repeat,
      linear-gradient(120deg, #17191a 0%, #222526 48%, #111314 100%) !important;
  }

  body:has(.curated-playlists-page-root)
    .curated-featured-playlist-loading-image::before {
    content: "";
    position: absolute;
    top: 50%;
    left: var(--curated-page-gutter);
    z-index: 1;
    width: var(--curated-featured-cover-size);
    aspect-ratio: 1;
    transform: translateY(-50%);
    background: var(--curated-skeleton-hero);
    border-radius: 0;
    animation: curated-skeleton-pulse 1.5s ease-in-out infinite;
  }

  body:has(.curated-playlists-page-root)
    .curated-featured-playlist-loading-image::after {
    content: "";
    position: absolute;
    top: 50%;
    left: calc(
      var(--curated-page-gutter) + var(--curated-featured-cover-size) +
        clamp(24px, 2.8vw, 46px)
    );
    z-index: 1;
    width: min(430px, 30vw);
    height: 150px;
    transform: translateY(-50%);
    background:
      linear-gradient(
          var(--curated-skeleton-hero),
          var(--curated-skeleton-hero)
        )
        left top / 72% 26px no-repeat,
      linear-gradient(
          var(--curated-skeleton-hero-muted),
          var(--curated-skeleton-hero-muted)
        )
        left 43px / 42% 9px no-repeat,
      linear-gradient(
          var(--curated-skeleton-hero-muted),
          var(--curated-skeleton-hero-muted)
        )
        left 65px / 78% 8px no-repeat,
      linear-gradient(
          var(--curated-skeleton-hero),
          var(--curated-skeleton-hero)
        )
        left bottom / 170px 36px no-repeat;
    border-radius: 0;
    animation: curated-skeleton-pulse 1.5s ease-in-out infinite;
  }

  body:has(.curated-playlists-page-root)
    .curated-featured-playlist-loading-tracks {
    position: relative !important;
    display: grid !important;
    width: var(--curated-featured-tracks-width) !important;
    align-self: center !important;
    justify-self: start !important;
    gap: 2px !important;
    overflow: visible !important;
    background: transparent !important;
    background-color: transparent !important;
    padding: 22px 20px 38px !important;
    translate: 0 32px !important;
    border-radius: 0 !important;
  }

  body:has(.curated-playlists-page-root)
    .curated-featured-playlist-loading-tracks::after {
    content: "";
    position: absolute;
    bottom: 10px;
    left: 50%;
    width: 112px;
    height: 8px;
    transform: translateX(-50%);
    background: var(--curated-skeleton-hero-muted);
    border-radius: 0;
    animation: curated-skeleton-pulse 1.5s ease-in-out infinite;
  }

  body:has(.curated-playlists-page-root)
    .curated-featured-playlist-loading-row,
  body:has(.curated-playlists-page-root)
    .curated-featured-playlist-track-skeleton {
    position: relative !important;
    display: block !important;
    height: 54px !important;
    overflow: hidden !important;
    background:
      linear-gradient(
          var(--curated-skeleton-hero),
          var(--curated-skeleton-hero)
        )
        left 8px center / 36px 36px no-repeat,
      linear-gradient(
          var(--curated-skeleton-hero),
          var(--curated-skeleton-hero)
        )
        left 52px top 15px / 42% 8px no-repeat,
      linear-gradient(
          var(--curated-skeleton-hero-muted),
          var(--curated-skeleton-hero-muted)
        )
        left 52px bottom 14px / 31% 6px no-repeat,
      linear-gradient(
          var(--curated-skeleton-hero),
          var(--curated-skeleton-hero)
        )
        right 8px center / 36px 36px no-repeat !important;
    background-color: transparent !important;
    border-radius: 0 !important;
  }

  body:has(.curated-playlists-page-root)
    .curated-featured-playlist-loading-row::after,
  body:has(.curated-playlists-page-root)
    .curated-featured-playlist-track-skeleton::after {
    content: "";
    position: absolute;
    inset: 0;
    transform: translateX(-100%);
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.075),
      transparent
    );
    animation: curated-skeleton-shimmer 1.55s ease-in-out infinite;
  }

  body:has(.curated-playlists-page-root)
    .curated-playlist-skeleton-shelf {
    animation: curated-skeleton-enter 180ms ease-out both !important;
  }

  body:has(.curated-playlists-page-root)
    .curated-playlist-skeleton-heading {
    width: min(190px, 42vw) !important;
    height: 20px !important;
    border-radius: 0 !important;
  }

  body:has(.curated-playlists-page-root)
    .curated-playlist-skeleton-description {
    width: min(320px, 58vw) !important;
    height: 8px !important;
    margin-top: 8px !important;
    border-radius: 0 !important;
  }

  body:has(.curated-playlists-page-root)
    .curated-playlist-skeleton-control {
    width: 32px !important;
    height: 32px !important;
    border-radius: 0 !important;
  }

  body:has(.curated-playlists-page-root)
    .curated-playlist-skeleton-block,
  body:has(.curated-playlists-page-root)
    .curated-playlist-skeleton-card {
    position: relative !important;
    overflow: hidden !important;
    background: var(--curated-skeleton-page) !important;
    border: 0 !important;
    border-radius: 0 !important;
  }

  body:has(.curated-playlists-page-root)
    .curated-playlist-skeleton-card-shell {
    position: relative !important;
    min-width: 0 !important;
    padding-bottom: 36px !important;
    animation: curated-skeleton-enter 180ms ease-out both !important;
  }

  body:has(.curated-playlists-page-root)
    .curated-playlist-skeleton-card-shell::before {
    content: "";
    position: absolute;
    right: 0;
    bottom: 18px;
    left: 0;
    height: 12px;
    background:
      linear-gradient(
          var(--curated-skeleton-page),
          var(--curated-skeleton-page)
        )
        left center / 72% 10px no-repeat,
      linear-gradient(
          var(--curated-skeleton-page-muted),
          var(--curated-skeleton-page-muted)
        )
        right center / 12px 12px no-repeat;
    border-radius: 0;
    animation: curated-skeleton-pulse 1.5s ease-in-out infinite;
  }

  body:has(.curated-playlists-page-root)
    .curated-playlist-skeleton-card-shell::after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 0;
    width: 34%;
    height: 7px;
    background: var(--curated-skeleton-page-muted);
    border-radius: 0;
    animation: curated-skeleton-pulse 1.5s ease-in-out infinite;
  }

  body:has(.curated-playlists-page-root)
    .curated-playlist-skeleton-card {
    width: 100% !important;
    height: auto !important;
    min-height: 0 !important;
    aspect-ratio: 1 !important;
  }

  body:has(.curated-playlists-page-root)
    .curated-playlist-skeleton-arrow {
    display: none !important;
  }

  body:has(.curated-playlists-page-root)
    .curated-playlist-skeleton-block::after,
  body:has(.curated-playlists-page-root)
    .curated-playlist-skeleton-card::after {
    content: "";
    position: absolute;
    inset: 0;
    transform: translateX(-100%);
    background: linear-gradient(
      90deg,
      transparent,
      var(--curated-skeleton-highlight),
      transparent
    );
    animation: curated-skeleton-shimmer 1.55s ease-in-out infinite !important;
  }

  @media (max-width: 980px) {
    body:has(.curated-playlists-page-root)
      .curated-featured-playlist-loading {
      min-height: 980px !important;
    }

    body:has(.curated-playlists-page-root)
      .curated-featured-playlist-loading-image::before,
    body:has(.curated-playlists-page-root)
      .curated-featured-playlist-loading-image::after {
      top: 330px;
    }

    body:has(.curated-playlists-page-root)
      .curated-featured-playlist-loading-image::after {
      width: min(420px, 43vw);
    }

    body:has(.curated-playlists-page-root)
      .curated-featured-playlist-loading-tracks {
      width: auto !important;
      margin: 590px var(--curated-page-gutter) 72px !important;
      translate: none !important;
    }
  }

  @media (max-width: 720px) {
    body:has(.curated-playlists-page-root)
      .curated-featured-playlist-loading-tracks {
      padding: 16px 16px 34px !important;
    }
  }

  @media (max-width: 560px) {
    body:has(.curated-playlists-page-root)
      .curated-featured-playlist-loading {
      min-height: 1040px !important;
    }

    body:has(.curated-playlists-page-root)
      .curated-featured-playlist-loading-image::before {
      top: calc(var(--filmwave-header-height, 75px) + 175px);
      left: var(--curated-page-gutter);
      transform: none;
    }

    body:has(.curated-playlists-page-root)
      .curated-featured-playlist-loading-image::after {
      top: calc(
        var(--filmwave-header-height, 75px) + var(--curated-featured-cover-size) +
          220px
      );
      right: var(--curated-page-gutter);
      left: var(--curated-page-gutter);
      width: auto;
      transform: none;
    }

    body:has(.curated-playlists-page-root)
      .curated-featured-playlist-loading-tracks {
      margin-top: 650px !important;
    }
  }

  @keyframes curated-skeleton-enter {
    from {
      opacity: 0;
    }

    to {
      opacity: 1;
    }
  }

  @keyframes curated-skeleton-pulse {
    0%,
    100% {
      opacity: 0.7;
    }

    50% {
      opacity: 1;
    }
  }

  @keyframes curated-skeleton-shimmer {
    100% {
      transform: translateX(100%);
    }
  }
`;

export default function CuratedPlaylistsLoadingStyles() {
  return <style>{CURATED_PLAYLIST_LOADING_STYLES}</style>;
}
