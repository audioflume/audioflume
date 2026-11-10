"use client";
import { useRef, type ReactNode } from "react";
import ShelfIndicatorNavigation from "@/components/ShelfIndicatorNavigation";
import styles from "./SlidingShelfShell.module.css";

type Props = { children: ReactNode; label: string; itemCount: number; disabled?: boolean };

export default function SlidingShelfShell({ children, label, itemCount, disabled = false }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const slide = (direction: number) => {
    const el = scroller.current;
    if (!el) return;

    const current = el.scrollLeft;
    const inset = parseFloat(getComputedStyle(el).paddingLeft) || 0;
    const bounds = el.getBoundingClientRect();
    const starts = Array.from(el.children, (child) =>
      child.getBoundingClientRect().left - bounds.left + current - inset,
    );
    const target = direction > 0
      ? starts.find((start) => start > current + 2)
      : starts.findLast((start) => start < current - 2);

    if (target !== undefined) {
      el.scrollTo({ left: target, behavior: "smooth" });
    }
  };

  return (
    <div className={styles.shelf}>
      
      <div ref={scroller} className={styles.scroller} aria-label={label}>{children}</div>
      <ShelfIndicatorNavigation label={label} itemCount={itemCount} scrollerRef={scroller} onPrev={() => slide(-1)} onNext={() => slide(1)} disabled={disabled} />
    </div>
  );
}
