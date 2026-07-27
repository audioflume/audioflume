"use client";

import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import AudioflumeOutroSection from "@/components/AudioflumeOutroSection";

export default function DiscoverOutroMount() {
  const [mount, setMount] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const footer = document.querySelector<HTMLElement>(".discover-footer-wrap");
    if (!footer) return;

    const outroMount = document.createElement("div");
    outroMount.className = "discover-reference-outro-mount";
    footer.insertAdjacentElement("beforebegin", outroMount);
    setMount(outroMount);

    return () => outroMount.remove();
  }, []);

  return mount ? createPortal(<AudioflumeOutroSection />, mount) : null;
}
