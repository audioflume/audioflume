import type { ReactNode } from "react";
import CuratedJumpBackIn from "./CuratedJumpBackIn";
import CuratedOutroMount from "./CuratedOutroMount";
import CuratedVideoHero from "./CuratedVideoHero";
import "../discover/discover-reference-layout.css";
import "./curated-video-hero.css";

const CURATED_LANDING_CARD_RATIO_STYLE = `
  body:has(.curated-playlists-page-root) {
    --curated-featured-hero-height: clamp(380px, 48vh, 540px);
    --curated-landing-card-gap: 12px;
    --curated-landing-content-width: min(
      calc(
        100vw - var(--curated-page-gutter) - var(--curated-page-gutter)
      ),
      1280px
    );
    --curated-landing-card-width: calc(
      (
          var(--curated-landing-content-width) -
            var(--curated-landing-card-gap) -
            var(--curated-landing-card-gap)
        ) /
        3
    );
    --curated-landing-edge-inset: max(
      var(--curated-page-gutter),
      calc((100vw - 1280px) / 2)
    );
  }

  body:has(.curated-playlists-page-root) .curated-featured-playlist {
    height: var(--curated-featured-hero-height);
    min-height: var(--curated-featured-hero-height);
    max-height: var(--curated-featured-hero-height);
  }

  body:has(.curated-playlists-page-root) .curated-playlists-page-layer {
    padding-bottom: 0;
  }

  body:has(.curated-playlists-page-root)
    .curated-playlists-page-root
    > footer {
    box-sizing: border-box;
    padding-top: 40px;
  }

  body:has(.curated-playlists-page-root) .curated-playlist-shelf {
    width: min(100%, 1280px);
    margin-right: auto;
    margin-bottom: 0;
    margin-left: auto;
  }

  body:has(.curated-playlists-page-root) .curated-playlist-shelf-viewport {
    width: 100vw;
    margin-right: calc(50% - 50vw) !important;
    margin-left: calc(50% - 50vw) !important;
    overflow: hidden;
  }

  body:has(.curated-playlists-page-root) .curated-playlist-shelf-scroller,
  body:has(.curated-playlists-page-root)
    .curated-playlist-skeleton-shelf > .relative > .flex {
    gap: var(--curated-landing-card-gap) !important;
    padding-right: var(--curated-landing-edge-inset) !important;
    padding-left: var(--curated-landing-edge-inset) !important;
  }

  body:has(.curated-playlists-page-root) .curated-playlist-card-shell,
  body:has(.curated-playlists-page-root) .curated-playlist-skeleton-card-shell {
    width: var(--curated-landing-card-width) !important;
    flex: 0 0 var(--curated-landing-card-width) !important;
  }

  body:has(.curated-playlists-page-root) .curated-playlist-shelf-prev-floating,
  body:has(.curated-playlists-page-root) .curated-playlist-shelf-next-floating {
    top: 50% !important;
  }

  body:has(.curated-playlists-page-root)
    .curated-playlists-page-layer
    > div
    > .curated-featured-playlist
    + .mt-10 {
    margin-top: clamp(64px, 6vw, 96px) !important;
  }

  body:has(.curated-playlists-page-root)
    .curated-playlists-page-layer
    > div
    > .mt-10
    + .mt-10 {
    margin-top: clamp(64px, 6vw, 96px) !important;
  }

  body:has(.curated-playlists-page-root)
    .curated-playlists-page-layer
    > div
    > .mt-10:last-child {
    margin-bottom: 0 !important;
  }

  body:has(.curated-playlists-page-root) .curated-playlist-card {
    position: relative;
  }

  body:has(.curated-playlists-page-root) .curated-playlist-image,
  body:has(.curated-playlists-page-root) .curated-playlist-skeleton-card {
    width: 100% !important;
    height: auto !important;
    aspect-ratio: 16 / 9 !important;
  }

  body:has(.curated-playlists-page-root) .curated-playlist-card-details,
  body:has(.curated-playlists-page-root) .curated-playlist-card-copy {
    display: contents !important;
  }

  body:has(.curated-playlists-page-root) .curated-playlist-card-copy h3 {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 4;
    display: flex;
    width: 100%;
    aspect-ratio: 16 / 9;
    align-items: center;
    justify-content: center;
    margin: 0 !important;
    overflow: visible !important;
    padding: 20px;
    color: #fff !important;
    font-family: var(--font-roboto-mono-filmwave), monospace !important;
    font-size: clamp(14px, 1vw, 18px) !important;
    font-weight: 400 !important;
    font-kerning: normal !important;
    letter-spacing: 0 !important;
    line-height: 1.05 !important;
    text-align: center;
    text-overflow: clip !important;
    text-transform: uppercase !important;
    white-space: normal !important;
    pointer-events: none;
  }

  body:has(.curated-playlists-page-root) .curated-playlist-card-copy p {
    display: none !important;
  }

  body:has(.curated-playlists-page-root) .curated-playlist-menu-wrap {
    position: absolute;
    top: 12px;
    right: 12px;
    z-index: 6;
    margin: 0 !important;
  }

  body:has(.curated-playlists-page-root) .curated-playlist-menu-button {
    color: #fff !important;
    opacity: 0 !important;
    text-shadow: 0 1px 8px rgba(0, 0, 0, 0.55);
    transition: opacity 150ms ease, color 150ms ease !important;
  }

  body:has(.curated-playlists-page-root)
    .curated-playlist-card:hover
    .curated-playlist-menu-button,
  body:has(.curated-playlists-page-root)
    .curated-playlist-card:focus-within
    .curated-playlist-menu-button,
  body:has(.curated-playlists-page-root)
    .curated-playlist-card.is-menu-open
    .curated-playlist-menu-button {
    opacity: 1 !important;
  }

  body:has(.curated-playlists-page-root) .curated-playlist-shelf-heading h2 {
    font-family: var(--font-aktiv-grotesk), sans-serif !important;
    font-size: clamp(18px, 1.25vw, 23px) !important;
    font-weight: 500 !important;
    font-kerning: normal !important;
    letter-spacing: -.025em !important;
    line-height: 1 !important;
    text-transform: uppercase !important;
  }

  body:has(.curated-playlists-page-root) .curated-playlist-shelf-heading p {
    display: block !important;
    visibility: visible !important;
    max-width: 620px;
    margin: 9px 0 0 !important;
    color: var(--text-muted) !important;
    font-family: var(--font-roboto-mono-filmwave), monospace !important;
    font-size: clamp(9px, 0.65vw, 11px) !important;
    font-weight: 400 !important;
    letter-spacing: 0 !important;
    line-height: 1.55 !important;
    text-transform: uppercase !important;
    opacity: 1 !important;
  }

  @media (max-width: 900px) {
    body:has(.curated-playlists-page-root) {
      --curated-landing-card-width: calc(
        (
            var(--curated-landing-content-width) -
              var(--curated-landing-card-gap)
          ) /
          2
      );
    }
  }

  @media (max-width: 620px) {
    body:has(.curated-playlists-page-root)
      .curated-playlists-page-layer
      > div
      > .curated-featured-playlist
      + .mt-10,
    body:has(.curated-playlists-page-root)
      .curated-playlists-page-layer
      > div
      > .mt-10
      + .mt-10 {
      margin-top: 52px !important;
    }
  }

  @media (max-width: 560px) {
    body:has(.curated-playlists-page-root) {
      --curated-landing-card-width: var(--curated-landing-content-width);
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
      {children}
      <CuratedJumpBackIn />
      <CuratedOutroMount />
    </>
  );
}
