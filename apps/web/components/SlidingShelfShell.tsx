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
    if (el) el.scrollBy({ left: direction * Math.max(el.clientWidth * 0.8, 360), behavior: "smooth" });
  };

  return (
    <div className={styles.shelf}>
      <button type="button" className={styles.arrow + " " + styles.left} onClick={() => slide(-1)} disabled={disabled || !previous} aria-label={"Scroll " + label + " left"}><ChevronLeftIcon size={18} /></button>
      <div ref={scroller} className={styles.scroller} aria-label={label}>{children}</div>
      <button type="button" className={styles.arrow + " " + styles.right} onClick={() => slide(1)} disabled={disabled || !next} aria-label={"Scroll " + label + " right"}><ChevronRightIcon size={18} /></button>
    </div>
  );
}
