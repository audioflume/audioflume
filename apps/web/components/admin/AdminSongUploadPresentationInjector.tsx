"use client";

import { useEffect } from "react";

function getSectionByTitle(page: Element, title: string) {
  return Array.from(
    page.querySelectorAll<HTMLElement>(".admin-song-form-card"),
  ).find((section) => {
    const kicker = section.querySelector<HTMLElement>(".admin-song-form-kicker");
    return kicker?.textContent?.trim().toLowerCase() === title;
  });
}

function isStemInput(input: HTMLInputElement) {
  if (input.type !== "file" || !input.multiple) return false;

  const row = input.closest(".admin-song-file-row");
  const label = row?.querySelector<HTMLElement>(":scope > div:first-child > div:first-child");

  return label?.textContent?.trim().toLowerCase() === "stems";
}

export default function AdminSongUploadPresentationInjector() {
  useEffect(() => {
    let frameId: number | null = null;
    let accumulatedStemFiles: File[] = [];

    const applyPresentationHooks = () => {
      frameId = null;

      const page = document.querySelector(".admin-song-upload-content-page");
      if (!page) return;

      const filesSection =
        getSectionByTitle(page, "files") || getSectionByTitle(page, "upload files");
      const filesTitle = filesSection?.querySelector<HTMLElement>(
        ".admin-song-form-kicker",
      );

      if (filesTitle && filesTitle.textContent?.trim() !== "Upload Files") {
        filesTitle.textContent = "Upload Files";
      }

      const songInfoSection = getSectionByTitle(page, "song info");
      if (songInfoSection) {
        songInfoSection.classList.add("admin-song-upload-song-info");

        const body = songInfoSection.querySelector<HTMLElement>(
          ".admin-song-form-card-header + div",
        );
        const fields = body ? Array.from(body.children) : [];
        const titleInput = fields[0]?.querySelector<HTMLInputElement>("input");
        const artistInput = fields[1]?.querySelector<HTMLInputElement>("input");

        if (titleInput) titleInput.placeholder = "Song Title";
        if (artistInput) artistInput.placeholder = "Artist";
      }

      const tagsSection = getSectionByTitle(page, "tags");
      tagsSection?.classList.add("admin-song-upload-tags-card");
    };

    const scheduleApply = () => {
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(applyPresentationHooks);
    };

    const handleStemSelection = (event: Event) => {
      const input = event.target;

      if (!(input instanceof HTMLInputElement) || !isStemInput(input)) return;
      if (!input.closest(".admin-song-upload-content-page")) return;

      const incomingFiles = Array.from(input.files ?? []);
      if (incomingFiles.length === 0) return;

      const row = input.closest(".admin-song-file-row");
      if (row?.textContent?.includes("No file chosen")) {
        accumulatedStemFiles = [];
      }

      const seen = new Set<string>();
      const mergedFiles = [...accumulatedStemFiles, ...incomingFiles].filter(
        (file) => {
          const key = `${file.name}:${file.size}:${file.lastModified}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        },
      );

      const transfer = new DataTransfer();
      mergedFiles.forEach((file) => transfer.items.add(file));
      input.files = transfer.files;
      accumulatedStemFiles = mergedFiles;
    };

    const observer = new MutationObserver(scheduleApply);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    document.addEventListener("change", handleStemSelection, true);
    scheduleApply();

    return () => {
      observer.disconnect();
      document.removeEventListener("change", handleStemSelection, true);
      if (frameId !== null) window.cancelAnimationFrame(frameId);
    };
  }, []);

  return null;
}
