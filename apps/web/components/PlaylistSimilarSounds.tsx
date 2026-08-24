"use client";

import { useRef } from "react";

const PLACEHOLDER_COUNT = 14;

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={direction === "left" ? "M15 5L8 12L15 19" : "M9 5L16 12L9 19"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function PlaylistSimilarSounds() {
  const scrollerRef = useRef<HTMLDivElement>(null);

  function scrollShelf(direction: -1 | 1) {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    scroller.scrollBy({
      left: direction * Math.max(scroller.clientWidth * 0.82, 320),
      behavior: "smooth",
    });
  }

  return (
    <section className="playlist-detail-similar" aria-labelledby="playlist-similar-heading">
      <div className="playlist-detail-similar-heading">
        <h2 id="playlist-similar-heading">Similar Sounds</h2>
        <div className="playlist-detail-similar-controls" aria-label="Similar Sounds navigation">
          <button type="button" aria-label="Previous Similar Sounds" onClick={() => scrollShelf(-1)}>
            <ChevronIcon direction="left" />
          </button>
          <button type="button" aria-label="Next Similar Sounds" onClick={() => scrollShelf(1)}>
            <ChevronIcon direction="right" />
          </button>
        </div>
      </div>

      <div ref={scrollerRef} className="playlist-detail-similar-scroller">
        {Array.from({ length: PLACEHOLDER_COUNT }, (_, index) => (
          <article key={index} className="playlist-detail-similar-card">
            <div className="playlist-detail-similar-placeholder" aria-hidden="true" />
            <div className="playlist-detail-similar-copy">
              <h3>Test Album {index + 1}</h3>
              <p>{6 + (index % 5)} songs</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
