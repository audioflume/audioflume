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

function getStemRow(page: Element) {
  return Array.from(
    page.querySelectorAll<HTMLElement>(".admin-song-file-row"),
  ).find((row) => {
    const label = row.querySelector<HTMLElement>(
      ":scope > div:first-child > div:first-child",
    );

    return label?.textContent?.trim().toLowerCase() === "stems";
  });
}

function isStemInput(input: HTMLInputElement) {
  if (input.type !== "file" || !input.multiple) return false;

  const row = input.closest(".admin-song-file-row");
  const label = row?.querySelector<HTMLElement>(
    ":scope > div:first-child > div:first-child",
  );

  return label?.textContent?.trim().toLowerCase() === "stems";
}

function fileKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

export default function AdminSongUploadPresentationInjector() {
  useEffect(() => {
    let frameId: number | null = null;
    let accumulatedStemFiles: File[] = [];

    const syncStemInput = (input: HTMLInputElement, files: File[]) => {
      const transfer = new DataTransfer();
      files.forEach((file) => transfer.items.add(file));
      input.files = transfer.files;
    };

    const renderStemFileActions = (page: Element) => {
      const row = getStemRow(page);
      const input = row?.querySelector<HTMLInputElement>('input[type="file"][multiple]');
      const content = row?.children.item(1);

      if (!row || !input || !(content instanceof HTMLElement)) return;

      const fileList = Array.from(content.children).find(
        (child): child is HTMLElement =>
          child instanceof HTMLElement &&
          child.classList.contains("mt-2") &&
          child.classList.contains("grid"),
      );

      if (!fileList || accumulatedStemFiles.length === 0) return;

      const signature = accumulatedStemFiles.map(fileKey).join("|");
      if (fileList.dataset.adminStemSignature === signature) return;

      fileList.dataset.adminStemSignature = signature;
      fileList.replaceChildren(
        ...accumulatedStemFiles.map((file, index) => {
          const item = document.createElement("div");
          item.className = "admin-song-stem-file-item";

          const name = document.createElement("span");
          name.className = "admin-song-stem-file-name";
          name.textContent = file.name;

          const remove = document.createElement("button");
          remove.type = "button";
          remove.className = "admin-song-stem-file-remove";
          remove.textContent = "Remove";
          remove.setAttribute("aria-label", `Remove ${file.name}`);
          remove.addEventListener("click", () => {
            accumulatedStemFiles = accumulatedStemFiles.filter(
              (_, fileIndex) => fileIndex !== index,
            );

            input.dataset.adminStemReplaceSelection = "true";
            syncStemInput(input, accumulatedStemFiles);
            input.dispatchEvent(new Event("change", { bubbles: true }));
            delete input.dataset.adminStemReplaceSelection;
          });

          item.append(name, remove);
          return item;
        }),
      );
    };

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

      renderStemFileActions(page);
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

      if (input.dataset.adminStemReplaceSelection === "true") {
        accumulatedStemFiles = incomingFiles;
        return;
      }

      if (incomingFiles.length === 0) return;

      const row = input.closest(".admin-song-file-row");
      if (row?.textContent?.includes("No file chosen")) {
        accumulatedStemFiles = [];
      }

      const seen = new Set<string>();
      accumulatedStemFiles = [...accumulatedStemFiles, ...incomingFiles].filter(
        (file) => {
          const key = fileKey(file);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        },
      );

      syncStemInput(input, accumulatedStemFiles);
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
