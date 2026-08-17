"use client";

import { useEffect } from "react";

export default function AdminSongUploadResetSync() {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const button = target.closest<HTMLButtonElement>("button");
      if (button?.textContent?.trim() !== "Upload New Song") return;

      window.requestAnimationFrame(() => {
        const page = document.querySelector(".admin-song-upload-content-page");
        const coverInput = page?.querySelector<HTMLInputElement>(
          'input[type="file"][accept*="image"]',
        );

        coverInput?.dispatchEvent(new Event("change", { bubbles: true }));
      });
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return null;
}
