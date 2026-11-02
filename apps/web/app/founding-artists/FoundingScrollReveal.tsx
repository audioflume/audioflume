"use client";

import { useEffect } from "react";

export default function FoundingScrollReveal() {
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>(".af-founding-page .af-reveal"));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      sections.forEach((section) => section.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.01, rootMargin: "0px 0px -65% 0px" });
    document.querySelector(".af-founding-page")?.classList.add("af-motion-ready");
    sections.forEach((section) => observer.observe(section));
    return () => {
      observer.disconnect();
      document.querySelector(".af-founding-page")?.classList.remove("af-motion-ready");
    };
  }, []);
  return null;
}
