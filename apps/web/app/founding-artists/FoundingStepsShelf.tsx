"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ArrowUpRightIcon from "@/components/icons/ArrowUpRightIcon";
import ChevronLeftIcon from "@/components/icons/ChevronLeftIcon";
import ChevronRightIcon from "@/components/icons/ChevronRightIcon";

type Step = { number: string; title: string; copy: string };

export default function FoundingStepsShelf({ steps }: { steps: Step[] }) {
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
    const amount = Math.max(scroller.clientWidth * 0.8, 360);
    scroller.scrollBy({ left: direction === "next" ? amount : -amount, behavior: "smooth" });
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
  }, [steps.length]);

  return (
    <div className="discover-artist-featured-shelf">
      <button type="button" className="discover-artist-featured-shelf-arrow is-left" onClick={() => scroll("prev")} disabled={!canScrollPrev} aria-label="Scroll application steps left">
        <ChevronLeftIcon size={18} />
      </button>
      <div ref={scrollerRef} className="discover-artist-featured-scroller" aria-label="How to become a Founding Artist">
        {steps.map(({ number, title, copy }) => (
          <article className="af-founding-step-card" key={number}>
            <div className="af-founding-step-number">{number}</div>
            <div className="af-founding-step-content"><h3>{title}</h3><p>{copy}</p></div>
          </article>
        ))}
        <Link className="af-founding-step-card af-founding-step-apply" href="/artists/apply">
          <span>READY TO JOIN?</span>
          <span className="af-founding-step-apply-bottom"><strong>Apply to become a Founding Artist</strong><ArrowUpRightIcon size={36} strokeWidth={1.5} /></span>
        </Link>
      </div>
      <button type="button" className="discover-artist-featured-shelf-arrow is-right" onClick={() => scroll("next")} disabled={!canScrollNext} aria-label="Scroll application steps right">
        <ChevronRightIcon size={18} />
      </button>
    </div>
  );
}
