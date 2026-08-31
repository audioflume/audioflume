"use client";

import Image, { getImageProps } from "next/image";
import { useEffect, useRef, useState } from "react";

type HomeEditorialR2ImageProps = {
  images: string[];
  startIndex: number;
  sizes: string;
  className?: string;
};

export default function HomeEditorialR2Image({
  images,
  startIndex,
  sizes,
  className = "object-cover",
}: HomeEditorialR2ImageProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [offset, setOffset] = useState(0);
  const [hasUsableImage, setHasUsableImage] = useState(true);

  useEffect(() => {
    setOffset(0);
    setHasUsableImage(true);
  }, [images, startIndex]);

  const source =
    hasUsableImage && images.length > 0
      ? images[(startIndex + offset) % images.length]
      : null;

  useEffect(() => {
    const image = imageRef.current;
    if (!image || !source || typeof IntersectionObserver === "undefined") return;

    let preloader: HTMLImageElement | null = null;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;

        const { props } = getImageProps({
          src: source,
          alt: "",
          fill: true,
          sizes,
        });
        preloader = new window.Image();

        if (props.sizes) preloader.sizes = props.sizes;
        if (props.srcSet) preloader.srcset = props.srcSet;
        preloader.src = props.src;

        observer.disconnect();
      },
      { rootMargin: "125% 0px" },
    );

    observer.observe(image);

    return () => {
      observer.disconnect();
      if (preloader) {
        preloader.onload = null;
        preloader.onerror = null;
      }
    };
  }, [sizes, source]);

  if (!source) return null;

  return (
    <Image
      ref={imageRef}
      src={source}
      alt=""
      fill
      loading="lazy"
      decoding="async"
      sizes={sizes}
      className={className}
      onError={() => {
        if (offset + 1 >= images.length) {
          setHasUsableImage(false);
          return;
        }

        setOffset((current) => current + 1);
      }}
    />
  );
}
