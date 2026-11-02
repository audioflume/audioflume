"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ArrowUpRightIcon from "@/components/icons/ArrowUpRightIcon";

type Step = { number: string; title: string; copy: string };

export default function FoundingStepsShelf({ steps }: { steps: Step[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  const updateArrows = () => {
    const el = scroller.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 2);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  };

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const observer = new ResizeObserver(updateArrows);
    observer.observe(el);
    updateArrows();
    return () => observer.disconnect();
  }, []);

  const slide = (direction: -1 | 1) => {
    const el = scroller.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>(".af-founding-step-card");
    el.scrollBy({ left: direction * ((card?.offsetWidth ?? el.clientWidth) + 20), behavior: "smooth" });
  };

  return (
    <div className="af-founding-steps-shelf">
      <div className="af-founding-steps" ref={scroller} onScroll={updateArrows} aria-label="How to become a Founding Artist">
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
      <div className="af-founding-steps-controls">
        <button type="button" onClick={() => slide(-1)} disabled={!canLeft} aria-label="Previous steps">‹</button>
        <button type="button" onClick={() => slide(1)} disabled={!canRight} aria-label="Next steps">›</button>
      </div>
    </div>
  );
}
