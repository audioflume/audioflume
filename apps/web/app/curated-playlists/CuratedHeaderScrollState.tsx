"use client";

import { useLayoutEffect } from "react";

export default function CuratedHeaderScrollState() {
  useLayoutEffect(() => {
    const header = document.querySelector<HTMLElement>(".filmwave-web-header");
    if (!header) return;

    function applySolidHeader() {
      if (
        header.classList.contains("is-solid") &&
        !header.classList.contains("is-transparent")
      ) {
        return;
      }

      header.classList.remove("is-transparent");
      header.classList.add("is-solid");
    }

    const observer = new MutationObserver(applySolidHeader);
    observer.observe(header, {
      attributes: true,
      attributeFilter: ["class"],
    });

    applySolidHeader();

    return () => observer.disconnect();
  }, []);

  return null;
}
