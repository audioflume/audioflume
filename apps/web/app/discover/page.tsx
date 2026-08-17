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
    note: "Authentic, emotive music for real stories",
  },
  {
    name: "No Data",
    note: "Cinematic texture, fractured rhythm, modern tension",
  },
];

const ARTISTS_WATCHING: ShelfItem[] = [
  { title: "Mara Vela", subtitle: "Alternative / Cinematic" },
  { title: "Northline", subtitle: "Indie / Electronic" },
  { title: "Elena Vale", subtitle: "Soul / Alternative" },
  { title: "Sundown Club", subtitle: "Ambient / Organic" },
  { title: "Orbit Glass", subtitle: "Experimental / Electronic" },
  { title: "Quiet Hours", subtitle: "Minimal / Intimate" },
  { title: "Soft Static", subtitle: "Indie / Textural" },
];

const TOP_ALBUMS: ShelfItem[] = [
  { title: "Peripheral Light", subtitle: "Mara Vela" },
  { title: "Human Signal", subtitle: "Northline" },
  { title: "Be Voyager", subtitle: "Elena Vale" },
  { title: "Room Tone", subtitle: "Sundown Club" },
  { title: "Loose Ends", subtitle: "Orbit Glass" },
  { title: "After Image", subtitle: "Quiet Hours" },
  { title: "Open Field", subtitle: "Soft Static" },
];

const SUPPORT_NEW_ARTISTS: ShelfItem[] = [
  { title: "Ari Sol", subtitle: "New this week" },
  { title: "Tape Garden", subtitle: "New this week" },
  { title: "Nia March", subtitle: "New this week" },
  { title: "Mono Lake", subtitle: "New this week" },
  { title: "Glass House", subtitle: "New this week" },
  { title: "Fallow", subtitle: "New this week" },
  { title: "Low Season", subtitle: "New this week" },
];

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
            key={`${title}-${item.title}`}
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
          <p>
            Independent voices, new releases, and artists building the next wave
            of music for film.
          </p>
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
              <span>Real music</span> made by <span>real artists.</span>
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

            <p>
              Independent artists, distinctive voices, and music with enough
              personality to carry a story.
            </p>
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
                <span>Audioflume editorial</span>
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
