"use client";

import { type ReactNode, useRef } from "react";

import Footer from "@/components/Footer";
import ChevronLeftIcon from "@/components/icons/ChevronLeftIcon";
import ChevronRightIcon from "@/components/icons/ChevronRightIcon";
import { usePlayer } from "@/context/PlayerContext";

type ShelfItem = {
  title: string;
  subtitle: string;
};

const FEATURED_ARTISTS = [
  {
    name: "Isaac Haines",
    note: "Authentic, evocative music for real stories",
  },
  {
    name: "No Data",
    note: "Authentic, evocative music for real stories",
  },
];

const ARTISTS_WATCHING: ShelfItem[] = Array.from({ length: 7 }, () => ({
  title: "Loremipsum Dolorit",
  subtitle: "Eiusmod Tempor",
}));

const TOP_ALBUMS: ShelfItem[] = Array.from({ length: 7 }, () => ({
  title: "Loremipsum Dolorit",
  subtitle: "Eiusmod Tempor",
}));

const SUPPORT_NEW_ARTISTS: ShelfItem[] = Array.from({ length: 7 }, () => ({
  title: "Loremipsum Dolorit",
  subtitle: "Eiusmod Tempor",
}));

const EDITORIAL_FEATURES = [
  {
    eyebrow: "Trending music for brands",
    title: "In demand artists and composers.",
  },
  {
    eyebrow: "Music for real stories",
    title: "In demand artists and composers.",
  },
  {
    eyebrow: "Cinematic masterpieces",
    title: "In demand artists and composers.",
  },
];

const MOCKUP_LOREM =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore.";

function PlayBadge() {
  return (
    <span className="discover-artist-play-badge" aria-hidden="true">
      <span />
    </span>
  );
}

function PlaceholderMedia({
  index,
  className = "",
  children,
}: {
  index: number;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={`discover-artist-placeholder is-tone-${index % 6} ${className}`.trim()}
    >
      {children}
    </div>
  );
}

function ArtistShelf({
  title,
  items,
  square = false,
  footerCopy,
}: {
  title: string;
  items: ShelfItem[];
  square?: boolean;
  footerCopy?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  function scroll(direction: "prev" | "next") {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    scroller.scrollBy({
      left:
        direction === "next"
          ? Math.max(scroller.clientWidth * 0.78, 360)
          : -Math.max(scroller.clientWidth * 0.78, 360),
      behavior: "smooth",
    });
  }

  return (
    <section className="discover-artist-shelf-section">
      <div className="discover-artist-shelf-heading">
        <h2>{title}</h2>

        <div className="discover-artist-shelf-controls">
          <button
            type="button"
            onClick={() => scroll("prev")}
            aria-label={`Scroll ${title} left`}
          >
            <ChevronLeftIcon size={13} />
          </button>
          <button
            type="button"
            onClick={() => scroll("next")}
            aria-label={`Scroll ${title} right`}
          >
            <ChevronRightIcon size={13} />
          </button>
        </div>
      </div>

      <div ref={scrollerRef} className="discover-artist-shelf-scroller">
        {items.map((item, index) => (
          <article
            key={`${title}-${index}`}
            className={`discover-artist-shelf-card${square ? " is-square" : ""}`}
          >
            <PlaceholderMedia
              index={index + (square ? 2 : 0)}
              className="discover-artist-shelf-media"
            >
              <div className="discover-artist-card-overlay">
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.subtitle}</span>
                </div>
                <PlayBadge />
              </div>
            </PlaceholderMedia>

            <div className="discover-artist-card-meta">
              <strong>{item.title}</strong>
              <span>{item.subtitle}</span>
            </div>
          </article>
        ))}
      </div>

      {footerCopy && (
        <div className="discover-artist-shelf-footer">
          <p>{MOCKUP_LOREM}</p>
          <span>{footerCopy}</span>
        </div>
      )}
    </section>
  );
}

export default function DiscoverPage() {
  const { currentSong } = usePlayer();
  const playerVisible = Boolean(currentSong);

  return (
    <main className="discover-page-root">
      <section className="discover-artist-hero" aria-label="Discover artists">
        <div className="discover-artist-hero-inner">
          <div className="discover-artist-hero-word" aria-hidden="true">
            Discover
          </div>

          <div className="discover-artist-hero-copy">
            <h1>
              <span className="discover-artist-hero-regular">Real music</span>
              <span className="discover-artist-hero-thin"> made by </span>
              <span className="discover-artist-hero-regular">real artists.</span>
            </h1>
            <p>Support real-world artists and composers.</p>
          </div>
        </div>
      </section>

      <div className="discover-artist-content">
        <section className="discover-artist-featured">
          <div className="discover-artist-featured-intro">
            <h2>
              In demand artists
              <br />
              and composers.
            </h2>

            <span className="discover-artist-featured-kicker">
              This week&apos;s
              <br />
              featured artists
            </span>

            <p>{MOCKUP_LOREM}</p>
          </div>

          <div className="discover-artist-featured-grid">
            {FEATURED_ARTISTS.map((artist, index) => (
              <article key={artist.name} className="discover-artist-feature-card">
                <PlaceholderMedia
                  index={index}
                  className="discover-artist-feature-media"
                >
                  <div className="discover-artist-feature-overlay">
                    <div>
                      <h3>{artist.name}</h3>
                      <p>{artist.note}</p>
                    </div>
                    <PlayBadge />
                  </div>
                </PlaceholderMedia>
              </article>
            ))}
          </div>
        </section>

        <ArtistShelf
          title="Artists We're Watching"
          items={ARTISTS_WATCHING}
          footerCopy="1500 artists trending online"
        />

        <section className="discover-artist-editorial-grid">
          {EDITORIAL_FEATURES.map((feature, index) => (
            <article key={feature.eyebrow} className="discover-artist-editorial-card">
              <PlaceholderMedia
                index={index + 3}
                className="discover-artist-editorial-media"
              >
                <div className="discover-artist-editorial-copy">
                  <span>{feature.eyebrow}</span>
                  <h2>{feature.title}</h2>
                </div>
              </PlaceholderMedia>

              <div className="discover-artist-editorial-meta">
                <span>Loremipsum Dolorit</span>
                <span>Eiusmod Tempor</span>
                <span>Explore more ↗</span>
              </div>
            </article>
          ))}
        </section>

        <ArtistShelf title="Top Albums" items={TOP_ALBUMS} square />

        <ArtistShelf
          title="Support New Artists"
          items={SUPPORT_NEW_ARTISTS}
          footerCopy="1500 artists trending online"
        />

        <div
          className="discover-artist-footer"
          style={{ paddingBottom: playerVisible ? "72px" : "8px" }}
        >
          <Footer />
        </div>
      </div>
    </main>
  );
}
