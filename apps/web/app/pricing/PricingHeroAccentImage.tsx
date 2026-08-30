"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type PricingHeroAccentImageProps = {
  images: string[];
  startIndex: number;
  sizes: string;
};

export default function PricingHeroAccentImage({
  images,
  startIndex,
  sizes,
}: PricingHeroAccentImageProps) {
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
      sizes={sizes}
      className="object-cover"
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
