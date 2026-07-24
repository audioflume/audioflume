import type { ReactNode } from "react";
import CuratedJumpBackIn from "./CuratedJumpBackIn";
import CuratedVideoHero from "./CuratedVideoHero";
import "./curated-video-hero.css";

const CURATED_LANDING_CARD_RATIO_STYLE = `
  body:has(.curated-playlists-page-root) .curated-playlist-shelf-viewport {
    --curated-landing-card-height: calc(
      (
          100cqw - var(--curated-page-gutter) - var(--curated-page-gutter) -
            var(--curated-playlist-card-gap) - var(--curated-playlist-card-gap) -
            var(--curated-playlist-card-gap) - var(--curated-playlist-card-gap)
        ) /
        5
    );
  }

  body:has(.curated-playlists-page-root) .curated-playlist-card-shell {
    flex-basis: calc(var(--curated-landing-card-height) * 16 / 9) !important;
  }

  body:has(.curated-playlists-page-root) .curated-playlist-image {
    height: var(--curated-landing-card-height) !important;
    aspect-ratio: auto !important;
  }

  @media (max-width: 1280px) {
    body:has(.curated-playlists-page-root) .curated-playlist-shelf-viewport {
      --curated-landing-card-height: calc(
        (
            100cqw - var(--curated-page-gutter) - var(--curated-page-gutter) -
              var(--curated-playlist-card-gap) - var(--curated-playlist-card-gap) -
              var(--curated-playlist-card-gap)
          ) /
          4
      );
    }
  }

  @media (max-width: 980px) {
    body:has(.curated-playlists-page-root) .curated-playlist-shelf-viewport {
      --curated-landing-card-height: calc(
        (
            100cqw - var(--curated-page-gutter) - var(--curated-page-gutter) -
              var(--curated-playlist-card-gap) - var(--curated-playlist-card-gap)
          ) /
          3
      );
    }
  }

  @media (max-width: 720px) {
    body:has(.curated-playlists-page-root) .curated-playlist-shelf-viewport {
      --curated-landing-card-height: calc(
        (
            100cqw - var(--curated-page-gutter) - var(--curated-page-gutter) -
              var(--curated-playlist-card-gap)
          ) /
          2
      );
    }
  }
`;

export default function CuratedPlaylistsTemplate({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <style>{CURATED_LANDING_CARD_RATIO_STYLE}</style>
      <CuratedVideoHero />
      <CuratedJumpBackIn />
      {children}
    </>
  );
}
