"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import ChevronLeftIcon from "@/components/icons/ChevronLeftIcon";
import ChevronRightIcon from "@/components/icons/ChevronRightIcon";
import styles from "./SlidingShelfShell.module.css";

type Props = { children: ReactNode; label: string; itemCount: number; disabled?: boolean };

export default function SlidingShelfShell({ children, label, itemCount, disabled = false }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const [previous, setPrevious] = useState(false);
  const [next, setNext] = useState(false);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const update = () => {
      setPrevious(el.scrollLeft > 4);
      setNext(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    const resize = new ResizeObserver(update);
    resize.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      resize.disconnect();
    };
  }, [itemCount]);

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
      <button type="button" className={styles.arrow + " " + styles.left} onClick={() => slide(-1)} disabled={disabled || !previous} aria-label={"Scroll " + label + " left"}><ChevronLeftIcon size={18} /></button>
      <div ref={scroller} className={styles.scroller} aria-label={label}>{children}</div>
      <button type="button" className={styles.arrow + " " + styles.right} onClick={() => slide(1)} disabled={disabled || !next} aria-label={"Scroll " + label + " right"}><ChevronRightIcon size={18} /></button>
    </div>
  );
}
