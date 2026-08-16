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

function getChooseButton(row: HTMLElement | undefined) {
  if (!row) return null;

  return Array.from(row.querySelectorAll<HTMLButtonElement>("button")).find(
    (button) => button.textContent?.trim().toLowerCase() === "choose",
  );
}

function getFileInput(row: HTMLElement | undefined) {
  return row?.querySelector<HTMLInputElement>('input[type="file"]') ?? null;
}

function syncFileBinPresentation(filesSection: HTMLElement, page: Element) {
  filesSection.classList.add("admin-song-upload-files-bin");

  const rows = Array.from(
    filesSection.querySelectorAll<HTMLElement>(".admin-song-file-row"),
  );

  const labels = ["Audio", "Cover Art", "Stems"];
  const actionLabels = ["Choose Audio", "Choose Cover", "Choose Stems"];

  rows.forEach((row, index) => {
    row.classList.add("admin-song-upload-bin-row");

    const label = row.querySelector<HTMLElement>(
      ":scope > div:first-child > div:first-child",
    );
    if (label && labels[index] && label.textContent?.trim() !== labels[index]) {
      label.textContent = labels[index];
    }

    const input = getFileInput(row);
    row.classList.toggle("has-file", Boolean(input?.files?.length));
  });

  let actions = filesSection.querySelector<HTMLElement>(
    ":scope > .admin-song-upload-file-actions",
  );

  if (!actions) {
    actions = document.createElement("div");
    actions.className = "admin-song-upload-file-actions";
    filesSection.prepend(actions);
  }

  actionLabels.forEach((label, index) => {
    let action = actions?.querySelector<HTMLButtonElement>(
      `[data-admin-song-file-action="${index}"]`,
    );

    if (!action) {
      action = document.createElement("button");
      action.type = "button";
      action.dataset.adminSongFileAction = String(index);
      action.className = "admin-song-upload-file-action";
      action.textContent = label;
      actions?.appendChild(action);
    }

    const input = getFileInput(rows[index]);
    action.classList.toggle("has-file", Boolean(input?.files?.length));
    action.onclick = () => {
      const currentPage = document.querySelector(
        ".admin-song-upload-content-page",
      );
      if (!currentPage) return;

      const currentSection =
        getSectionByTitle(currentPage, "files") ||
        getSectionByTitle(currentPage, "upload files") ||
        getSectionByTitle(currentPage, "uploaded files");
      if (!currentSection) return;

      const currentRows = Array.from(
        currentSection.querySelectorAll<HTMLElement>(".admin-song-file-row"),
      );
      getChooseButton(currentRows[index])?.click();
    };
  });

  const stems = getStemRow(page);
  const stemContent = stems?.children.item(1);
  if (stemContent instanceof HTMLElement) {
    const stemList = Array.from(stemContent.children).find(
      (child): child is HTMLElement =>
        child instanceof HTMLElement &&
        child.classList.contains("mt-2") &&
        child.classList.contains("grid"),
    );
    stemList?.classList.add("admin-song-upload-stem-list");
  }
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
      const input = row?.querySelector<HTMLInputElement>(
        'input[type="file"][multiple]',
      );
      const content = row?.children.item(1);

      if (!row || !input || !(content instanceof HTMLElement)) return;

      const fileList = Array.from(content.children).find(
        (child): child is HTMLElement =>
          child instanceof HTMLElement &&
          child.classList.contains("mt-2") &&
          child.classList.contains("grid"),
      );

      if (!fileList || accumulatedStemFiles.length === 0) return;

      fileList.classList.add("admin-song-upload-stem-list");

      const renderedItems = Array.from(fileList.children).filter(
        (child): child is HTMLElement => child instanceof HTMLElement,
      );
      const visibleCount = Math.min(accumulatedStemFiles.length, 3);

      for (let index = 0; index < visibleCount; index++) {
        const item = renderedItems[index];
        const file = accumulatedStemFiles[index];

        if (!item || !file) continue;

        item.classList.add("admin-song-stem-file-item");

        let remove = item.querySelector<HTMLButtonElement>(
          ":scope > .admin-song-stem-file-remove",
        );

        if (!remove) {
          remove = document.createElement("button");
          remove.type = "button";
          remove.className = "admin-song-stem-file-remove";
          remove.textContent = "Remove";
          item.appendChild(remove);
        }

        remove.setAttribute("aria-label", `Remove ${file.name}`);
        remove.onclick = () => {
          accumulatedStemFiles = accumulatedStemFiles.filter(
            (_, fileIndex) => fileIndex !== index,
          );

          input.dataset.adminStemReplaceSelection = "true";
          syncStemInput(input, accumulatedStemFiles);
          input.dispatchEvent(new Event("change", { bubbles: true }));
          delete input.dataset.adminStemReplaceSelection;
        };
      }
    };

    const applyPresentationHooks = () => {
      frameId = null;

      const page = document.querySelector(".admin-song-upload-content-page");
      if (!page) return;

      const filesSection =
        getSectionByTitle(page, "files") ||
        getSectionByTitle(page, "upload files") ||
        getSectionByTitle(page, "uploaded files");
      const filesTitle = filesSection?.querySelector<HTMLElement>(
        ".admin-song-form-kicker",
      );

      if (filesTitle && filesTitle.textContent?.trim() !== "Files") {
        filesTitle.textContent = "Files";
      }

      if (filesSection) {
        syncFileBinPresentation(filesSection, page);
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

      const waveformSection = getSectionByTitle(page, "waveform peaks");
      waveformSection?.classList.add("admin-song-upload-waveform");

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

  return (
    <style>{`
      .admin-song-upload-content-page form {
        gap: 12px;
      }

      .admin-song-upload-content-page form > div:first-child,
      .admin-song-upload-content-page form > aside {
        gap: 12px;
      }

      .admin-song-upload-content-page .admin-song-upload-song-info {
        --admin-song-content-gap: 8px;
      }

      .admin-song-upload-content-page
        .admin-song-upload-waveform
        > .admin-song-form-card-header
        + div
        > p {
        display: none;
      }

      .admin-song-upload-content-page .admin-song-upload-files-bin {
        position: relative;
        display: grid;
        overflow: visible !important;
        margin-top: 56px;
        border: 0;
        background: transparent;
      }

      .admin-song-upload-content-page
        .admin-song-upload-files-bin
        > .admin-song-form-card-header
        + div {
        display: contents;
      }

      .admin-song-upload-content-page .admin-song-upload-file-actions {
        position: absolute;
        top: -56px;
        left: 0;
        z-index: 3;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .admin-song-upload-content-page .admin-song-upload-file-action {
        display: inline-flex;
        height: 40px;
        min-width: 104px;
        cursor: pointer;
        align-items: center;
        justify-content: center;
        gap: 7px;
        border: 1px solid var(--border);
        border-radius: 7px;
        background: var(--bg-secondary);
        padding: 0 20px;
        color: var(--text-secondary);
        font-family: inherit;
        font-size: 12px;
        font-weight: 400;
        line-height: 1;
        transition: color 150ms ease, background 150ms ease;
      }

      .admin-song-upload-content-page
        .admin-song-upload-file-action[data-admin-song-file-action="1"] {
        display: none;
      }

      .admin-song-upload-content-page .admin-song-upload-file-action:hover,
      .admin-song-upload-content-page .admin-song-upload-file-action.has-file {
        color: var(--text-primary);
      }

      .admin-song-upload-content-page .admin-song-upload-file-action.has-file::after {
        content: "";
        display: inline-flex;
        width: 18px;
        height: 18px;
        flex: 0 0 18px;
        border-radius: 999px;
        background-color: var(--status-success-soft, rgba(72, 181, 113, 0.12));
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='13' height='13' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='M5 12.5L9.5 17L19 7' stroke='%2348b571' stroke-width='2.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
        background-position: center;
        background-repeat: no-repeat;
      }

      .admin-song-upload-content-page
        .admin-song-upload-files-bin
        > .admin-song-form-card-header {
        order: 1;
        min-height: 0;
        border: 1px solid var(--border);
        border-bottom: 0;
        border-radius: 10px 10px 0 0;
        background: var(--bg-primary);
        padding: 18px 20px 14px;
      }

      .admin-song-upload-content-page
        .admin-song-upload-files-bin
        .admin-song-file-row {
        display: grid !important;
        min-height: 58px;
        grid-template-columns: 92px minmax(0, 1fr) auto !important;
        align-items: center !important;
        gap: 16px !important;
        background: var(--bg-primary);
        padding: 10px 20px !important;
      }

      .admin-song-upload-content-page
        .admin-song-upload-files-bin
        .admin-song-file-row:first-child {
        order: 2;
        border: 1px solid var(--border) !important;
        border-bottom: 0 !important;
        border-radius: 0;
      }

      .admin-song-upload-content-page
        .admin-song-upload-files-bin
        .admin-song-file-row:nth-child(3) {
        order: 3;
        border: 1px solid var(--border) !important;
        border-radius: 0 0 10px 10px;
      }

      .admin-song-upload-content-page
        .admin-song-upload-files-bin
        .admin-song-file-row
        > div:first-child {
        grid-column: 1 !important;
        grid-row: 1 !important;
        align-self: center !important;
        padding: 0 !important;
      }

      .admin-song-upload-content-page
        .admin-song-upload-files-bin
        .admin-song-file-row
        > div:first-child
        > div:first-child {
        color: var(--text-primary);
        font-family: var(--font-aktiv-grotesk), sans-serif;
        font-size: 11px;
        font-weight: 500;
        letter-spacing: 0.02em;
        line-height: 1;
        text-transform: uppercase;
      }

      .admin-song-upload-content-page
        .admin-song-upload-files-bin
        .admin-song-file-row
        > div:nth-child(2) {
        grid-column: 2 !important;
        grid-row: 1 !important;
        min-width: 0;
        margin-right: 0 !important;
      }

      .admin-song-upload-content-page
        .admin-song-upload-files-bin
        .admin-song-file-row
        > div:nth-child(2)
        > div[class~="h-9"] {
        height: auto !important;
        min-height: 0;
        gap: 0;
        border: 0 !important;
        border-radius: 0 !important;
        background: transparent !important;
        padding: 0 !important;
      }

      .admin-song-upload-content-page
        .admin-song-upload-files-bin
        .admin-song-file-row
        > div:nth-child(2)
        > div[class~="h-9"]
        > button {
        display: none !important;
      }

      .admin-song-upload-content-page
        .admin-song-upload-files-bin
        .admin-song-file-row
        > div:nth-child(2)
        > div[class~="h-9"]
        > span {
        font-size: 12px;
        line-height: 18px;
      }

      .admin-song-upload-content-page
        .admin-song-upload-files-bin
        .admin-song-file-row.has-file
        > div:nth-child(2)
        > div[class~="h-9"]
        > span {
        color: var(--text-primary);
      }

      .admin-song-upload-content-page
        .admin-song-upload-files-bin
        .admin-song-file-row:first-child
        > div:last-child {
        grid-column: 3 !important;
        grid-row: 1 !important;
        height: auto !important;
        align-self: center !important;
        justify-self: end !important;
        margin: 0 !important;
      }

      .admin-song-upload-content-page
        .admin-song-upload-files-bin
        .admin-song-file-row:first-child:has(> div:last-child > button)
        > div:nth-child(2)
        > div[class~="h-9"] {
        padding-right: 0 !important;
      }

      .admin-song-upload-content-page
        .admin-song-upload-files-bin
        .admin-song-file-row:nth-child(3)
        > div:last-child {
        display: none !important;
      }

      .admin-song-upload-content-page
        .admin-song-upload-files-bin
        .admin-song-file-row:nth-child(2) {
        order: 4;
        min-height: 0;
        grid-template-columns: minmax(0, 1fr) !important;
        align-items: start !important;
        gap: 14px !important;
        margin-top: 12px;
        border: 1px solid var(--border) !important;
        border-radius: 10px;
        background: var(--bg-primary);
        padding: 20px !important;
      }

      .admin-song-upload-content-page
        .admin-song-upload-files-bin
        .admin-song-file-row:nth-child(2):has(img) {
        grid-template-columns: 160px minmax(0, 1fr) !important;
      }

      .admin-song-upload-content-page
        .admin-song-upload-files-bin
        .admin-song-file-row:nth-child(2)
        > div:first-child {
        grid-column: 1 / -1 !important;
        grid-row: 1 !important;
        align-self: start !important;
      }

      .admin-song-upload-content-page
        .admin-song-upload-files-bin
        .admin-song-file-row:nth-child(2)
        > div:first-child
        > div:first-child {
        font-size: 16px;
        font-weight: 500;
        line-height: 24px;
        letter-spacing: -0.03em;
        text-transform: none;
      }

      .admin-song-upload-content-page
        .admin-song-upload-files-bin
        .admin-song-file-row:nth-child(2)
        > div:nth-child(2) {
        grid-column: 1 / -1 !important;
        grid-row: 2 !important;
        min-width: 0;
      }

      .admin-song-upload-content-page
        .admin-song-upload-files-bin
        .admin-song-file-row:nth-child(2):has(img)
        > div:nth-child(2) {
        grid-column: 2 !important;
        grid-row: 2 !important;
      }

      .admin-song-upload-content-page
        .admin-song-upload-files-bin
        .admin-song-file-row:nth-child(2)
        > div:nth-child(2)
        > div[class~="h-9"] {
        box-sizing: border-box;
        display: flex !important;
        height: 160px !important;
        min-height: 160px !important;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 10px !important;
        border: 1px dashed var(--border) !important;
        border-radius: 10px !important;
        background: var(--bg-secondary) !important;
        padding: 18px !important;
        text-align: center;
        transition: border-color 150ms ease, background 150ms ease;
      }

      .admin-song-upload-content-page
        .admin-song-upload-files-bin
        .admin-song-file-row:nth-child(2)
        > div:nth-child(2)
        > div[class~="h-9"]:hover {
        border-color: var(--text-secondary) !important;
        background: var(--bg-hover) !important;
      }

      .admin-song-upload-content-page
        .admin-song-upload-files-bin
        .admin-song-file-row:nth-child(2)
        > div:nth-child(2)
        > div[class~="h-9"]
        > button {
        display: inline-flex !important;
        height: 32px;
        min-height: 32px;
        cursor: pointer;
        align-items: center;
        justify-content: center;
        border-radius: 7px;
        padding: 0 14px;
      }

      .admin-song-upload-content-page
        .admin-song-upload-files-bin
        .admin-song-file-row:nth-child(2)
        > div:nth-child(2)
        > div[class~="h-9"]
        > span {
        max-width: 100%;
        color: var(--text-secondary);
        font-size: 11px;
        line-height: 16px;
        text-align: center;
      }

      .admin-song-upload-content-page
        .admin-song-upload-files-bin
        .admin-song-file-row:nth-child(2)
        > div:last-child {
        grid-column: 1 !important;
        grid-row: 2 !important;
        position: relative !important;
        display: block;
        width: 160px !important;
        height: 160px !important;
        align-self: start !important;
        justify-self: start !important;
        margin: 0 !important;
      }

      .admin-song-upload-content-page
        .admin-song-upload-files-bin
        .admin-song-file-row:nth-child(2)
        > div:last-child
        > div {
        width: 160px !important;
        height: 160px !important;
        overflow: hidden;
        border-radius: 10px !important;
        background: var(--bg-secondary);
      }

      .admin-song-upload-content-page
        .admin-song-upload-files-bin
        .admin-song-file-row:nth-child(2)
        > div:last-child
        > button {
        position: absolute !important;
        top: 8px !important;
        right: 8px !important;
        z-index: 10;
        display: flex;
        width: 28px !important;
        height: 28px !important;
        align-items: center;
        justify-content: center;
        border: 0;
        border-radius: 7px !important;
        background: var(--media-overlay-control);
        color: var(--media-overlay-contrast);
      }

      .admin-song-upload-content-page
        .admin-song-upload-files-bin
        .admin-song-file-row:nth-child(2)
        > div:last-child
        > button:hover {
        background: var(--media-overlay-control-hover);
        color: var(--media-overlay-contrast);
      }

      .admin-song-upload-content-page .admin-song-upload-stem-list {
        overflow: hidden;
        gap: 0 !important;
        border: 1px solid var(--border-subtle);
        border-radius: 7px;
        background: var(--bg-secondary);
      }

      .admin-song-upload-content-page .admin-song-upload-stem-list > * {
        min-height: 34px;
        border-top: 1px solid var(--border-subtle);
        padding: 8px 10px;
      }

      .admin-song-upload-content-page .admin-song-upload-stem-list > *:first-child {
        border-top: 0;
      }

      .admin-song-upload-content-page .admin-song-upload-stem-list .admin-song-stem-file-item {
        gap: 12px;
        color: var(--text-primary);
      }

      .admin-song-upload-content-page .admin-song-upload-stem-list .admin-song-stem-file-remove {
        padding: 0;
      }

      @media (min-width: 1280px) {
        .admin-song-upload-content-page form > aside {
          margin-top: 56px;
        }
      }

      @media (max-width: 720px) {
        .admin-song-upload-content-page .admin-song-upload-files-bin {
          margin-top: 104px;
        }

        .admin-song-upload-content-page .admin-song-upload-file-actions {
          top: -104px;
          flex-wrap: wrap;
        }

        .admin-song-upload-content-page
          .admin-song-upload-files-bin
          .admin-song-file-row:not(:nth-child(2)) {
          grid-template-columns: 72px minmax(0, 1fr) auto !important;
          gap: 10px !important;
          padding: 10px 14px !important;
        }

        .admin-song-upload-content-page
          .admin-song-upload-files-bin
          .admin-song-file-row:nth-child(2),
        .admin-song-upload-content-page
          .admin-song-upload-files-bin
          .admin-song-file-row:nth-child(2):has(img) {
          grid-template-columns: minmax(0, 1fr) !important;
          padding: 16px !important;
        }

        .admin-song-upload-content-page
          .admin-song-upload-files-bin
          .admin-song-file-row:nth-child(2):has(img)
          > div:last-child {
          grid-column: 1 !important;
          grid-row: 2 !important;
        }

        .admin-song-upload-content-page
          .admin-song-upload-files-bin
          .admin-song-file-row:nth-child(2):has(img)
          > div:nth-child(2) {
          grid-column: 1 !important;
          grid-row: 3 !important;
        }
      }
    `}</style>
  );
}
