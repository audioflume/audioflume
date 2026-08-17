"use client";

import { type CSSProperties, type ReactNode, useRef } from "react";

import Footer from "@/components/Footer";
import ChevronLeftIcon from "@/components/icons/ChevronLeftIcon";
import ChevronRightIcon from "@/components/icons/ChevronRightIcon";
import { usePlayer } from "@/context/PlayerContext";

type ShelfItem = {
  title: string;
  subtitle: string;
};

const FEATURED_ARTIST = {
  name: "Isaac Haines",
  role: "Musician / Composer",
  description:
    "Musician and composer from Grand Prairie, Alberta. Creating heartfelt sounds that evoke emotion and introspection.",
};

const FEATURED_ARTISTS = [
  {
    name: "Isaac Haines",
    note: "Authentic, evocative music for real stories",
    image:
      "https://images.filmwave.io/images/discover/karsten-winegeart-2_RaLT1aqUI-unsplash.jpg",
  },
  {
    name: "No Data",
    note: "Authentic, evocative music for real stories",
    image:
      "https://images.filmwave.io/images/discover/egor-komarov-SwezL05iMjI-unsplash%20(1).jpg",
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

function PlayBadge({ style }: { style?: CSSProperties }) {
  return (
    <span className="discover-artist-play-badge" aria-hidden="true" style={style}>
      <span />
    </span>
  );
}

function PlaceholderMedia({
  index,
  className = "",
  imageSrc,
  children,
}: {
  index: number;
  className?: string;
  imageSrc?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={`discover-artist-placeholder is-tone-${index % 6} ${className}`.trim()}
    >
      {imageSrc ? (
        <img
          src={imageSrc}
          alt=""
          aria-hidden="true"
          draggable={false}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : null}
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
      <section className="discover-artist-hero" aria-label="Featured artist">
        <div className="discover-artist-hero-inner">
          <div className="discover-artist-hero-feature">
            <div className="discover-artist-hero-identity">
              <span className="discover-artist-hero-eyebrow">Featured Artist</span>
              <h1>{FEATURED_ARTIST.name}</h1>
              <p>{FEATURED_ARTIST.role}</p>
            </div>

            <div className="discover-artist-hero-detail">
              <p>{FEATURED_ARTIST.description}</p>
              <div className="discover-artist-hero-actions">
                <span className="discover-artist-hero-listen">
                  <PlayBadge
                    style={{
                      transform:
                        "translateY(clamp(-21px, calc(-7.8077px - 1.34615vw), -17.5px))",
                    }}
                  />
                  <span>Listen now</span>
                </span>
                <span>View license catalogue</span>
              </div>
            </div>
          </div>

          <div className="discover-artist-hero-featured-intro">
            <span>
              This month&apos;s
              <br />
              featured artists
            </span>
            <p>{MOCKUP_LOREM}</p>
            <div className="flex w-[178px] justify-self-end flex-col items-end max-[720px]:hidden">
              <div
                className="mb-[10px] inline-flex h-[22px] items-center gap-[7px] text-[rgba(255,255,255,0.82)]"
                aria-hidden="true"
              >
                <span className="inline-flex h-[22px] w-[18px] items-center justify-center">
                  <ChevronLeftIcon size={14} />
                </span>
                <span className="inline-flex h-[22px] w-[18px] items-center justify-center">
                  <ChevronRightIcon size={14} />
                </span>
                <span className="ml-[5px] text-[10px] font-medium leading-none [font-variant-numeric:tabular-nums]">
                  1/3
                </span>
              </div>
              <div className="discover-artist-hero-slider-marks" aria-hidden="true">
                <span />
                <span />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="discover-artist-content">
        <section className="discover-artist-featured">
          <div className="discover-artist-featured-grid">
            {FEATURED_ARTISTS.map((artist, index) => (
              <article key={artist.name} className="discover-artist-feature-card">
                <PlaceholderMedia
                  index={index}
                  imageSrc={artist.image}
                  className="discover-artist-feature-media"
                >
                  <div className="discover-artist-feature-overlay">
                    <div>
                      <h3>{artist.name}</h3>
                      <p style={{ marginTop: "13px" }}>{artist.note}</p>
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
