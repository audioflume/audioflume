"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const FLASH_INTERVAL_MS = 220;

type PricingHeroImageFlashProps = {
  images: string[];
};

export default function PricingHeroImageFlash({
  images,
}: PricingHeroImageFlashProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
    if (images.length <= 1) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion) return;

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % images.length);
    }, FLASH_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [images.length]);

  return (
    <div className="audioflume-pricing-hero-media" aria-hidden="true">
      {images.map((src, index) => (
        <Image
          key={src}
          src={src}
          alt=""
          fill
          sizes="(max-width: 760px) 76vw, (max-width: 980px) 67vw, (max-width: 1968px) 61vw, 1200px"
          priority={index === 0}
          className={`audioflume-pricing-hero-frame${
            index === activeIndex ? " is-active" : ""
          }`}
          style={{ objectFit: "cover", objectPosition: "center center" }}
        />
      ))}
    </div>
  );
}
