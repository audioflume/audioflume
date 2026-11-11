"use client";

import { useEffect, useState, type PointerEvent, type RefObject } from "react";
import ChevronLeftIcon from "@/components/icons/ChevronLeftIcon";
import ChevronRightIcon from "@/components/icons/ChevronRightIcon";
import styles from "./ShelfIndicatorNavigation.module.css";

type Props = {
  label: string;
  scrollerRef: RefObject<HTMLDivElement | null>;
  itemCount: number;
  onPrev: () => void;
  onNext: () => void;
  disabled?: boolean;
  className?: string;
  progressScrollbar?: boolean;
};

export default function ShelfIndicatorNavigation({
  label,
  scrollerRef,
  itemCount,
  onPrev,
  onNext,
  disabled = false,
  className = "",
  progressScrollbar = false,
}: Props) {
  const [position, setPosition] = useState({
    canPrev: false,
    canNext: false,
    current: 0,
    ratio: 0,
  });

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const update = () => {
      const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
      const current = maxScroll > 0
        ? Math.round((scroller.scrollLeft / maxScroll) * 3)
        : 0;
      setPosition({
        canPrev: scroller.scrollLeft > 4,
        canNext: scroller.scrollLeft < maxScroll - 4,
        current,
        ratio: maxScroll > 0 ? scroller.scrollLeft / maxScroll : 0,
      });
    };

    update();
    scroller.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    const observer = new ResizeObserver(update);
    observer.observe(scroller);

    return () => {
      scroller.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      observer.disconnect();
    };
  }, [scrollerRef, itemCount]);

  function dragProgress(event: PointerEvent<HTMLDivElement>) {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const track = event.currentTarget;
    const thumb = track.firstElementChild as HTMLElement | null;
    if (!thumb) return;
    const bounds = track.getBoundingClientRect();
    const travel = Math.max(0, bounds.width - thumb.getBoundingClientRect().width);
    const position = Math.max(0, Math.min(travel, event.clientX - bounds.left - thumb.getBoundingClientRect().width / 2));
    scroller.scrollLeft = travel > 0
      ? (position / travel) * Math.max(0, scroller.scrollWidth - scroller.clientWidth)
      : 0;
  }

  function handleProgressPointerDown(event: PointerEvent<HTMLDivElement>) {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    scroller.style.scrollSnapType = "none";
    scroller.style.scrollBehavior = "auto";
    dragProgress(event);
  }

  function handleProgressPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) dragProgress(event);
  }

  function handleProgressPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    const scroller = scrollerRef.current;
    if (scroller) {
      scroller.style.scrollSnapType = "";
      scroller.style.scrollBehavior = "";
    }
  }

  return (
    <div className={`audioflume-discover-artist-navigation ${styles.navigation} ${className}`} aria-label={`${label} navigation`}>
      {progressScrollbar ? (
        <div
          className={styles.scrollbarTrack}
          role="scrollbar"
          aria-label={`Scroll ${label}`}
          aria-orientation="horizontal"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(position.ratio * 100)}
          tabIndex={0}
          onPointerDown={handleProgressPointerDown}
          onPointerMove={handleProgressPointerMove}
          onPointerUp={handleProgressPointerUp}
          onPointerCancel={handleProgressPointerUp}
          onKeyDown={(event) => {
            const scroller = scrollerRef.current;
            if (!scroller || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
            if (event.key === "Home") scroller.scrollTo({ left: 0 });
            else if (event.key === "End") scroller.scrollTo({ left: maxScroll });
            else scroller.scrollBy({ left: (event.key === "ArrowRight" ? 1 : -1) * Math.max(60, scroller.clientWidth / 3) });
          }}
        >
          <span className={styles.scrollbarThumb} style={{ transform: `translateX(${position.ratio * 300}%)` }} />
        </div>
      ) : (
        <div className={`audioflume-discover-artist-navigation-progress ${styles.progress}`} aria-hidden="true">
          {Array.from({ length: 4 }, (_, index) => (
            <span key={index} className={index === position.current ? `is-active ${styles.active}` : ""} />
          ))}
        </div>
      )}
      <div className={`audioflume-discover-artist-navigation-arrows ${styles.arrows}`}>
        <button type="button" onClick={onPrev} disabled={disabled || !position.canPrev} aria-label={`Previous ${label}`}>
          <ChevronLeftIcon size={18} />
        </button>
        <button type="button" onClick={onNext} disabled={disabled || !position.canNext} aria-label={`Next ${label}`}>
          <ChevronRightIcon size={18} />
        </button>
      </div>
    </div>
  );
}
