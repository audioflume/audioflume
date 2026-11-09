"use client";

import Link from "next/link";

import ArrowUpRightIcon from "@/components/icons/ArrowUpRightIcon";
import FeaturedArtistCard from "@/components/discover/FeaturedArtistCard";
import SlidingShelfShell from "@/components/SlidingShelfShell";
import type { Song } from "@/lib/types";

export type DiscoverFeatureCardArtist = {
  id: string;
  name: string;
  slug: string;
  designation: string | null;
  custom_text: string | null;
  hero_image_url: string | null;
  hero_image_position_x: number;
  hero_image_position_y: number;
  songs: Song[];
};

export default function FeaturedArtistShelf({
  artists,
  loading = false,
  showHeading,
}: {
  artists: DiscoverFeatureCardArtist[];
  loading?: boolean;
  showHeading?: boolean;
}) {
  const headingVisible = showHeading ?? (loading || artists.length > 0);

  return (
    <section className="discover-artist-featured">
      {headingVisible ? (
        <div className={`discover-artist-featured-heading${loading ? " is-loading" : ""}`}>
          {loading ? (
            <>
              <span className="discover-artist-featured-heading-skeleton is-title" aria-hidden="true" />
              <span className="discover-artist-featured-heading-skeleton is-link" aria-hidden="true" />
            </>
          ) : (
            <>
              <span>This month&apos;s featured artists</span>
              <Link href="/discover" className="audioflume-arrow-text-link inline-flex items-center gap-[5px]">Explore artists &amp; composers<ArrowUpRightIcon size={16} strokeWidth={1.5} className="translate-y-[2px]" /></Link>
            </>
          )}
        </div>
      ) : null}

      <SlidingShelfShell label="featured artists" itemCount={loading ? 4 : artists.length} disabled={loading}>
          {loading
            ? Array.from({ length: 4 }, (_, index) => (
                <article
                  key={index}
                  className="discover-artist-feature-card discover-artist-feature-card-skeleton"
                  aria-hidden="true"
                >
                  <div className="discover-artist-feature-media-home discover-artist-feature-skeleton-media">
                    <div className="discover-artist-feature-bar">
                      <span className="discover-artist-feature-copy">
                        <span className="discover-artist-feature-skeleton-line is-name" />
                        <span className="discover-artist-feature-skeleton-line is-designation" />
                        <span className="discover-artist-feature-genres discover-artist-feature-skeleton-genres">
                          <span />
                          <span />
                          <span />
                        </span>
                      </span>
                    </div>
                    <span className="discover-artist-feature-skeleton-play" />
                  </div>
                </article>
              ))
            : artists.map((artist) => (
                <FeaturedArtistCard key={artist.id} artist={artist} />
              ))}
      </SlidingShelfShell>
    </section>
  );
}
