"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import ShelfNavigationControls from "@/components/ShelfNavigationControls";

import styles from "./PublicArtistCardShelf.module.css";

type PublicArtistCardShelfProps = {
  title: string;
  countLabel: string;
  children: ReactNode;
};

export default function PublicArtistCardShelf({
  title,
  countLabel,
  children,
}: PublicArtistCardShelfProps) {
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

  function scroll(direction: "prev" | "next") {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const amount = Math.max(scroller.clientWidth * 0.82, 320);
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

    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(scroller);

    return () => {
      scroller.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
      resizeObserver.disconnect();
    };
  }, [children]);

  return (
    <section className="artist-public-section">
      <div className="artist-public-section-header">
        <h2 className="artist-public-section-title">{title}</h2>
        <div className={styles.headerActions}>
          <span className="artist-public-section-count">{countLabel}</span>
          <ShelfNavigationControls
            label={title}
            onPrev={() => scroll("prev")}
            onNext={() => scroll("next")}
            canScrollPrev={canScrollPrev}
            canScrollNext={canScrollNext}
          />
        </div>
      </div>

      <div ref={scrollerRef} className={styles.scroller}>
        {children}
      </div>
    </section>
  );
}
