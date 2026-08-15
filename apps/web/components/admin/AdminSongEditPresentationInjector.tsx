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

function getChooseButton(row: HTMLElement | undefined) {
  if (!row) return null;

  return Array.from(row.querySelectorAll<HTMLButtonElement>("button")).find(
    (button) => button.textContent?.trim().toLowerCase() === "choose",
  );
}

function getFileInput(row: HTMLElement | undefined) {
  return row?.querySelector<HTMLInputElement>('input[type="file"]') ?? null;
}

function rowHasFile(row: HTMLElement | undefined) {
  if (!row) return false;

  const input = getFileInput(row);
  if (input?.files?.length) return true;

  const status = row.querySelector<HTMLElement>(
    ':scope > div:nth-child(2) > div[class~="h-9"] > span',
  );
  const statusText = status?.textContent?.trim().toLowerCase() ?? "";

  return Boolean(statusText && statusText !== "no file chosen");
}

function syncFileBinPresentation(filesSection: HTMLElement, page: Element) {
  filesSection.classList.add("admin-song-edit-files-bin");

  const rows = Array.from(
    filesSection.querySelectorAll<HTMLElement>(".admin-song-file-row"),
  );

  const labels = ["Audio", "Cover", "Stems"];
  const actionLabels = ["Choose Audio", "Choose Cover", "Choose Stems"];

  rows.forEach((row, index) => {
    row.classList.add("admin-song-edit-bin-row");

    const label = row.querySelector<HTMLElement>(
      ":scope > div:first-child > div:first-child",
    );
    if (label && labels[index] && label.textContent?.trim() !== labels[index]) {
      label.textContent = labels[index];
    }

    row.classList.toggle("has-file", rowHasFile(row));
  });

  let actions = filesSection.querySelector<HTMLElement>(
    ":scope > .admin-song-edit-file-actions",
  );

  if (!actions) {
    actions = document.createElement("div");
    actions.className = "admin-song-edit-file-actions";
    filesSection.prepend(actions);
  }

  actionLabels.forEach((label, index) => {
    let action = actions?.querySelector<HTMLButtonElement>(
      `[data-admin-song-edit-file-action="${index}"]`,
    );

    if (!action) {
      action = document.createElement("button");
      action.type = "button";
      action.dataset.adminSongEditFileAction = String(index);
      action.className = "admin-song-edit-file-action";
      action.textContent = label;
      actions?.appendChild(action);
    }

    action.classList.toggle("has-file", rowHasFile(rows[index]));
    action.onclick = () => {
      const currentPage = document.querySelector(
        ".admin-song-edit-content-page",
      );
      if (!currentPage) return;

      const currentSection = getSectionByTitle(currentPage, "files");
      if (!currentSection) return;

      const currentRows = Array.from(
        currentSection.querySelectorAll<HTMLElement>(".admin-song-file-row"),
      );
      getChooseButton(currentRows[index])?.click();
    };
  });

  const stemContent = rows[2]?.children.item(1);
  if (stemContent instanceof HTMLElement) {
    const stemList = Array.from(stemContent.children).find(
      (child): child is HTMLElement =>
        child instanceof HTMLElement &&
        child.classList.contains("mt-2") &&
        child.classList.contains("grid"),
    );
    stemList?.classList.add("admin-song-edit-stem-list");
  }
}

export default function AdminSongEditPresentationInjector() {
  useEffect(() => {
    let frameId: number | null = null;

    const applyPresentationHooks = () => {
      frameId = null;

      const page = document.querySelector(".admin-song-edit-content-page");
      if (!page) return;

      const filesSection = getSectionByTitle(page, "files");
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
        songInfoSection.classList.add("admin-song-edit-song-info");

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
      tagsSection?.classList.add("admin-song-edit-tags-card");
    };

    const scheduleApply = () => {
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(applyPresentationHooks);
    };

    const observer = new MutationObserver(scheduleApply);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    document.addEventListener("change", scheduleApply, true);
    scheduleApply();

    return () => {
      observer.disconnect();
      document.removeEventListener("change", scheduleApply, true);
      if (frameId !== null) window.cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <style>{`
      .admin-song-edit-content-page form {
        gap: 12px;
      }

      .admin-song-edit-content-page form > div:first-child,
      .admin-song-edit-content-page form > aside {
        gap: 12px;
      }

      .admin-song-edit-content-page .admin-song-edit-files-bin {
        position: relative;
        overflow: visible !important;
        margin-top: 56px;
      }

      .admin-song-edit-content-page .admin-song-edit-file-actions {
        position: absolute;
        top: -56px;
        left: 0;
        z-index: 3;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .admin-song-edit-content-page .admin-song-edit-file-action {
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
        font-size: 14px;
        font-weight: 500;
        line-height: 1;
        transition: color 150ms ease, background 150ms ease;
      }

      .admin-song-edit-content-page .admin-song-edit-file-action:hover,
      .admin-song-edit-content-page .admin-song-edit-file-action.has-file {
        color: var(--text-primary);
      }

      .admin-song-edit-content-page .admin-song-edit-file-action.has-file::after {
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

      .admin-song-edit-content-page
        .admin-song-edit-files-bin
        > .admin-song-form-card-header {
        min-height: 0;
        border-bottom: 1px solid var(--border-subtle);
        border-radius: 9px 9px 0 0;
        padding: 18px 20px 14px;
      }

      .admin-song-edit-content-page
        .admin-song-edit-files-bin
        .admin-song-file-row {
        display: grid !important;
        min-height: 58px;
        grid-template-columns: 92px minmax(0, 1fr) auto !important;
        align-items: center !important;
        gap: 16px !important;
        border-top: 1px solid var(--border-subtle) !important;
        padding: 10px 20px !important;
      }

      .admin-song-edit-content-page
        .admin-song-edit-files-bin
        .admin-song-file-row:first-child {
        border-top: 0 !important;
      }

      .admin-song-edit-content-page
        .admin-song-edit-files-bin
        .admin-song-file-row
        > div:first-child {
        grid-column: 1 !important;
        grid-row: 1 !important;
        align-self: center !important;
        padding: 0 !important;
      }

      .admin-song-edit-content-page
        .admin-song-edit-files-bin
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

      .admin-song-edit-content-page
        .admin-song-edit-files-bin
        .admin-song-file-row
        > div:first-child
        > div:nth-child(2) {
        display: none !important;
      }

      .admin-song-edit-content-page
        .admin-song-edit-files-bin
        .admin-song-file-row
        > div:nth-child(2) {
        grid-column: 2 !important;
        grid-row: 1 !important;
        min-width: 0;
        margin-right: 0 !important;
      }

      .admin-song-edit-content-page
        .admin-song-edit-files-bin
        .admin-song-file-row
        > div:nth-child(2)
        > div[class~="h-9"] {
        height: auto !important;
        min-height: 0 !important;
        gap: 0 !important;
        border: 0 !important;
        border-radius: 0 !important;
        background: transparent !important;
        padding: 0 !important;
      }

      .admin-song-edit-content-page
        .admin-song-edit-files-bin
        .admin-song-file-row
        > div:nth-child(2)
        > div[class~="h-9"]
        > button {
        display: none !important;
      }

      .admin-song-edit-content-page
        .admin-song-edit-files-bin
        .admin-song-file-row
        > div:nth-child(2)
        > div[class~="h-9"]
        > span {
        font-size: 12px;
        line-height: 18px;
      }

      .admin-song-edit-content-page
        .admin-song-edit-files-bin
        .admin-song-file-row.has-file
        > div:nth-child(2)
        > div[class~="h-9"]
        > span {
        color: var(--text-primary);
      }

      .admin-song-edit-content-page
        .admin-song-edit-files-bin
        .admin-song-file-row:first-child
        > div:last-child,
      .admin-song-edit-content-page
        .admin-song-edit-files-bin
        .admin-song-file-row:nth-child(3)
        > div:last-child {
        grid-column: 3 !important;
        grid-row: 1 !important;
        z-index: 2;
        height: auto !important;
        align-items: center !important;
        align-self: center !important;
        justify-self: end !important;
        margin: 0 !important;
      }

      .admin-song-edit-content-page
        .admin-song-edit-files-bin
        .admin-song-file-row:nth-child(2):has(img)
        > div:nth-child(2) {
        margin-right: 0 !important;
      }

      .admin-song-edit-content-page
        .admin-song-edit-files-bin
        .admin-song-file-row:nth-child(2)
        > div:last-child {
        grid-column: 3 !important;
        grid-row: 1 !important;
        align-self: center !important;
        justify-self: end !important;
      }

      .admin-song-edit-content-page .admin-song-edit-stem-list {
        overflow: hidden;
        gap: 0 !important;
        border: 1px solid var(--border-subtle);
        border-radius: 7px;
        background: var(--bg-secondary);
      }

      .admin-song-edit-content-page .admin-song-edit-stem-list > * {
        min-height: 34px;
        border-top: 1px solid var(--border-subtle);
        padding: 8px 10px;
      }

      .admin-song-edit-content-page .admin-song-edit-stem-list > *:first-child {
        border-top: 0;
      }

      @media (min-width: 1280px) {
        .admin-song-edit-content-page form > aside {
          margin-top: 56px;
        }
      }

      @media (max-width: 720px) {
        .admin-song-edit-content-page .admin-song-edit-files-bin {
          margin-top: 104px;
        }

        .admin-song-edit-content-page .admin-song-edit-file-actions {
          top: -104px;
          flex-wrap: wrap;
        }

        .admin-song-edit-content-page
          .admin-song-edit-files-bin
          .admin-song-file-row {
          grid-template-columns: 72px minmax(0, 1fr) auto !important;
          gap: 10px !important;
          padding: 10px 14px !important;
        }
      }
    `}</style>
  );
}
