"use client";

import { useEffect, useState } from "react";

const DEFAULT_AVERAGE_COLOR = "rgb(210, 210, 210)";

export default function useAverageImageColor(
  imageUrl: string | null | undefined,
  fallbackColor = DEFAULT_AVERAGE_COLOR,
) {
  const [averageColor, setAverageColor] = useState(fallbackColor);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(false);

    if (!imageUrl) {
      setAverageColor(fallbackColor);
      return;
    }

    let cancelled = false;
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";

    image.onload = () => {
      if (cancelled) return;

      try {
        const canvas = document.createElement("canvas");
        canvas.width = 32;
        canvas.height = 32;
        const context = canvas.getContext("2d", { willReadFrequently: true });

        if (!context) {
          setAverageColor(fallbackColor);
          setIsReady(true);
          return;
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;

        let red = 0;
        let green = 0;
        let blue = 0;
        let weight = 0;

        for (let index = 0; index < pixels.length; index += 4) {
          const alpha = pixels[index + 3] / 255;
          if (alpha <= 0.05) continue;

          red += pixels[index] * alpha;
          green += pixels[index + 1] * alpha;
          blue += pixels[index + 2] * alpha;
          weight += alpha;
        }

        if (weight <= 0) {
          setAverageColor(fallbackColor);
          setIsReady(true);
          return;
        }

        setAverageColor(
          `rgb(${Math.round(red / weight)}, ${Math.round(green / weight)}, ${Math.round(
            blue / weight,
          )})`,
        );
        setIsReady(true);
      } catch {
        setAverageColor(fallbackColor);
        setIsReady(true);
      }
    };

    image.onerror = () => {
      if (!cancelled) {
        setAverageColor(fallbackColor);
        setIsReady(true);
      }
    };

    image.src = imageUrl;

    return () => {
      cancelled = true;
    };
  }, [fallbackColor, imageUrl]);

  return { averageColor, isReady };
}
