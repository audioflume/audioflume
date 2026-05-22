"use client";

import { useEffect } from "react";

function getNativeTitle(label: string) {
  if (label === "Switch to index view") return "List view";
  if (label === "Switch to gallery view") return "Grid view";
  if (label === "Shuffle songs") return "Shuffle";
  return label;
}

export default function IconButtonTitleSync() {
  useEffect(() => {
    const selector = [
      ".filmwave-icon-button[aria-label]",
      ".playlist-icon-btn[aria-label]",
      ".project-new-folder-button[aria-label]",
      ".project-view-toggle-button[aria-label]",
    ].join(",");

    function syncTitles() {
      document.querySelectorAll<HTMLElement>(selector).forEach((button) => {
        if (button.getAttribute("title")) return;

        const label = button.getAttribute("aria-label")?.trim();
        if (!label) return;

        button.setAttribute("title", getNativeTitle(label));
      });
    }

    syncTitles();

    const observer = new MutationObserver(syncTitles);
    observer.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ["aria-label", "class", "title"],
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
