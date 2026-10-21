"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import ArrowUpRightIcon from "@/components/icons/ArrowUpRightIcon";
import ChevronLeftIcon from "@/components/icons/ChevronLeftIcon";
import ChevronRightIcon from "@/components/icons/ChevronRightIcon";
import FeaturedArtistCard from "@/components/discover/FeaturedArtistCard";
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
  showHeading,
}: {
  artists: DiscoverFeatureCardArtist[];
  showHeading?: boolean;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const headingVisible = showHeading ?? artists.length > 0;

  function updateScrollState() {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;
    setCanScrollPrev(scroller.scrollLeft > 4);
    setCanScrollNext(scroller.scrollLeft < maxScrollLeft - 4);
  }

  function scroll(direction: "prev" | "next") {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const amount = Math.max(scroller.clientWidth * 0.8, 360);
    scroller.scrollBy({
      left: direction === "next" ? amount : -amount,
      behavior: "smooth",
    });
  }

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    updateScrollState();
    scroller.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    const observer = new ResizeObserver(updateScrollState);
    observer.observe(scroller);

    return () => {
      scroller.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
      observer.disconnect();
    };
  }, [artists.length]);

  return (
    <section className="discover-artist-featured">
      {headingVisible ? (
        <div className="discover-artist-featured-heading">
          <span>This month&apos;s featured artists</span>
          <Link href="/discover" className="audioflume-arrow-text-link inline-flex items-center gap-[5px]">Explore artists &amp; composers<ArrowUpRightIcon size={16} strokeWidth={1.5} className="translate-y-[2px]" /></Link>
        </div>
      ) : null}

      <div className="discover-artist-featured-shelf">
        <button
          type="button"
          className="discover-artist-featured-shelf-arrow is-left"
          onClick={() => scroll("prev")}
          disabled={!canScrollPrev}
          aria-label="Scroll featured artists left"
        >
          <ChevronLeftIcon size={18} />
        </button>

        <div ref={scrollerRef} className="discover-artist-featured-scroller">
          {artists.map((artist) => (
            <FeaturedArtistCard key={artist.id} artist={artist} />
          ))}
        </div>

        <button
          type="button"
          className="discover-artist-featured-shelf-arrow is-right"
          onClick={() => scroll("next")}
          disabled={!canScrollNext}
          aria-label="Scroll featured artists right"
        >
          <ChevronRightIcon size={18} />
        </button>
      </div>
    </section>
  );
}
