"use client";

import { useEffect, useState, type RefObject } from "react";
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
};

export default function ShelfIndicatorNavigation({
  label,
  scrollerRef,
  itemCount,
  onPrev,
  onNext,
  disabled = false,
  className = "",
}: Props) {
  const [position, setPosition] = useState({
    canPrev: false,
    canNext: false,
    current: 0,
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

  return (
    <div className={`audioflume-discover-artist-navigation ${styles.navigation} ${className}`} aria-label={`${label} navigation`}>
      <div className={`audioflume-discover-artist-navigation-progress ${styles.progress}`} aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <span key={index} className={index === position.current ? `is-active ${styles.active}` : ""} />
        ))}
      </div>
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
