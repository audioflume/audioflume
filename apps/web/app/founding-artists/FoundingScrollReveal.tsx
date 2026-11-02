"use client";

import { useEffect } from "react";

export default function FoundingScrollReveal() {
  useEffect(() => {
    const page = document.querySelector<HTMLElement>(".af-founding-page");
    if (!page) return;

    const selectors = [
      ".af-founding-intro .af-founding-kicker",
      ".af-founding-intro h2",
      ".af-founding-intro-grid p",
      ".af-founding-benefits .af-founding-section-head",
      ".af-founding-benefit",
      ".af-founding-terms-note",
      ".af-founding-statement .af-founding-width > span",
      ".af-founding-statement .af-founding-width > p",
      ".af-founding-process .af-founding-section-head",
      ".af-founding-steps article",
      ".af-founding-process > .af-founding-cta",
      ".af-founding-faq h2",
      ".af-founding-faq-item",
      ".af-founding-final .af-founding-width > span",
      ".af-founding-final h2",
      ".af-founding-final p",
      ".af-founding-final .af-founding-cta",
    ];

    const sections = Array.from(page.querySelectorAll<HTMLElement>(".af-reveal"));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      return;
    }

    const items = sections.flatMap((section) => {
      const sectionItems = Array.from(section.querySelectorAll<HTMLElement>(selectors.join(", ")));
      sectionItems.forEach((item, index) => {
        item.classList.add("af-reveal-item");
        item.style.transitionDelay = `${index * 140}ms`;
      });
      return sectionItems;
    });
    page.classList.add("af-motion-ready");

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.querySelectorAll<HTMLElement>(".af-reveal-item").forEach((item) => {
          item.classList.add("is-visible");
        });
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.01, rootMargin: "0px 0px -55% 0px" });

    sections.forEach((section) => observer.observe(section));

    return () => {
      observer.disconnect();
      page.classList.remove("af-motion-ready");
      items.forEach((item) => {
        item.classList.remove("af-reveal-item", "is-visible");
        item.style.removeProperty("transition-delay");
      });
    };
  }, []);

  return null;
}
