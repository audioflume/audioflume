"use client";

import { useEffect, useRef, useState } from "react";

import ShelfNavigationControls from "@/components/ShelfNavigationControls";

const PLACEHOLDER_COUNT = 14;

export default function PlaylistSimilarSounds() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  function updateScrollState() {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;
    setCanScrollPrev(scroller.scrollLeft > 4);
    setCanScrollNext(scroller.scrollLeft < maxScrollLeft - 4);
  }

  function scrollShelf(direction: -1 | 1) {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    scroller.scrollBy({
      left: direction * Math.max(scroller.clientWidth * 0.82, 320),
      behavior: "smooth",
    });
  }

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    updateScrollState();
    scroller.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(scroller);

    return () => {
      scroller.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <section className="playlist-detail-similar" aria-labelledby="playlist-similar-heading">
      <div className="playlist-detail-similar-heading">
        <h2 id="playlist-similar-heading">Similar Sounds</h2>
        <ShelfNavigationControls
          label="Similar Sounds"
          onPrev={() => scrollShelf(-1)}
          onNext={() => scrollShelf(1)}
          canScrollPrev={canScrollPrev}
          canScrollNext={canScrollNext}
        />
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
