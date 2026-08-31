"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

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
  const [offset, setOffset] = useState(0);
  const [hasUsableImage, setHasUsableImage] = useState(true);

  useEffect(() => {
    setOffset(0);
    setHasUsableImage(true);
  }, [images, startIndex]);

  if (!hasUsableImage || images.length === 0) return null;

  const source = images[(startIndex + offset) % images.length];

  return (
    <Image
      src={source}
      alt=""
      fill
      unoptimized
      loading="eager"
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
