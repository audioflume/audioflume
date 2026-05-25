"use client";

import { useEffect } from "react";

export default function MusicBannerCoverFix() {
  useEffect(() => {
    const applyCover = () => {
      const cards = document.querySelectorAll("main div");

      cards.forEach((card) => {
        const element = card as HTMLElement;
        const className = element.className.toString();

        if (
          className.includes("min-h-[320px]") &&
          className.includes("rounded-[18px]") &&
          element.style.backgroundImage.includes("url(")
        ) {
          element.style.setProperty(
            "background-size",
            "100% 100%, 100% 100%, cover",
            "important",
          );
        }
      });
    };

    applyCover();
    window.addEventListener("resize", applyCover);

    return () => window.removeEventListener("resize", applyCover);
  }, []);

  return null;
}
