"use client";

import Image, { getImageProps } from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

const FLASH_INTERVAL_MS = 140;
const HERO_IMAGE_SIZES =
  "(max-width: 760px) 76vw, (max-width: 980px) 67vw, (max-width: 1968px) 61vw, 1200px";

type PricingHeroImageFlashProps = {
  images: string[];
  mediaClassName?: string;
};

type FrameState = {
  activeFrame: 0 | 1;
  sources: [string | null, string | null];
  nextIndex: number;
};

function createFrameState(images: string[]): FrameState {
  if (images.length === 0) {
    return {
      activeFrame: 0,
      sources: [null, null],
      nextIndex: 0,
    };
  }

  if (images.length === 1) {
    return {
      activeFrame: 0,
      sources: [images[0], images[0]],
      nextIndex: 0,
    };
  }

  return {
    activeFrame: 0,
    sources: [images[0], images[1]],
    nextIndex: 2 % images.length,
  };
}

export default function PricingHeroImageFlash({
  images,
  mediaClassName = "audioflume-home-flash-hero-media",
}: PricingHeroImageFlashProps) {
  const mediaRef = useRef<HTMLDivElement>(null);
  const [isInViewport, setIsInViewport] = useState(true);
  const [settledSources, setSettledSources] = useState<Set<string>>(
    () => new Set(),
  );
  const [failedSources, setFailedSources] = useState<Set<string>>(
    () => new Set(),
  );

  const usableImages = useMemo(
    () => images.filter((src) => !failedSources.has(src)),
    [failedSources, images],
  );
  const [frameState, setFrameState] = useState<FrameState>(() =>
    createFrameState(images),
  );
  const allImagesSettled = images.every((src) => settledSources.has(src));

  useEffect(() => {
    setSettledSources(new Set());
    setFailedSources(new Set());
    setFrameState(createFrameState(images));
  }, [images]);

  useEffect(() => {
    if (images.length === 0) return;

    const preloaders = images.map((src) => {
      const { props } = getImageProps({
        src,
        alt: "",
        fill: true,
        sizes: HERO_IMAGE_SIZES,
      });
      const preloader = new window.Image();

      if (props.sizes) preloader.sizes = props.sizes;
      if (props.srcSet) preloader.srcset = props.srcSet;

      preloader.onload = () => markSettled(src);
      preloader.onerror = () => {
        markFailed(src);
        markSettled(src);
      };
      preloader.src = props.src;

      return preloader;
    });

    return () => {
      preloaders.forEach((preloader) => {
        preloader.onload = null;
        preloader.onerror = null;
      });
    };
  }, [images]);

  useEffect(() => {
    setFrameState(createFrameState(usableImages));
  }, [usableImages]);

  useEffect(() => {
    const media = mediaRef.current;
    if (!media || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInViewport(entry.isIntersecting);
      },
      { threshold: 0.01 },
    );

    observer.observe(media);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!allImagesSettled || usableImages.length <= 1 || !isInViewport) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion) return;

    const interval = window.setInterval(() => {
      setFrameState((current) => {
        const nextActiveFrame: 0 | 1 = current.activeFrame === 0 ? 1 : 0;
        const nextSources: [string | null, string | null] = [
          current.sources[0],
          current.sources[1],
        ];
        const frameBecomingHidden = current.activeFrame;

        nextSources[frameBecomingHidden] =
          usableImages[current.nextIndex] ?? usableImages[0];

        return {
          activeFrame: nextActiveFrame,
          sources: nextSources,
          nextIndex: (current.nextIndex + 1) % usableImages.length,
        };
      });
    }, FLASH_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [allImagesSettled, isInViewport, usableImages]);

  function markSettled(src: string) {
    setSettledSources((current) => {
      if (current.has(src)) return current;
      const next = new Set(current);
      next.add(src);
      return next;
    });
  }

  function markFailed(src: string) {
    setFailedSources((current) => {
      if (current.has(src)) return current;
      const next = new Set(current);
      next.add(src);
      return next;
    });
  }

  return (
    <div ref={mediaRef} className={mediaClassName} aria-hidden="true">
      {frameState.sources.map((src, index) =>
        src ? (
          <Image
            key={`hero-frame-${index}`}
            src={src}
            alt=""
            fill
            sizes={HERO_IMAGE_SIZES}
            loading="eager"
            className={`audioflume-pricing-hero-frame${
              frameState.activeFrame === index ? " is-active" : ""
            }`}
            style={{ objectFit: "cover", objectPosition: "center center" }}
          />
        ) : null,
      )}
    </div>
  );
}
