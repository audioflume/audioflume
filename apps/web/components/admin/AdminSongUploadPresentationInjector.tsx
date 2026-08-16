"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import UploadIcon from "@/components/icons/UploadIcon";

function getSectionByTitle(page: Element, title: string) {
  return Array.from(
    page.querySelectorAll<HTMLElement>(".admin-song-form-card"),
  ).find((section) => {
    const kicker = section.querySelector<HTMLElement>(".admin-song-form-kicker");
    return kicker?.textContent?.trim().toLowerCase() === title;
  });
}

function getFileRows(filesSection: Element) {
  return Array.from(
    filesSection.querySelectorAll<HTMLElement>(".admin-song-file-row"),
  );
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

function getCoverRow(page: Element) {
  return Array.from(
    page.querySelectorAll<HTMLElement>(".admin-song-file-row"),
  ).find((row) => {
    const label = row.querySelector<HTMLElement>(
      ":scope > div:first-child > div:first-child",
    );
    const text = label?.textContent?.trim().toLowerCase();

    return text === "cover" || text === "cover art" || text === "cover image";
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

  const rows = getFileRows(filesSection);
  const labels = ["Audio", "Cover Art", "Stems"];
  const rowClasses = [
    "admin-song-upload-audio-row",
    "admin-song-upload-cover-source",
    "admin-song-upload-stems-row",
  ];

  rows.forEach((row, index) => {
    row.classList.add("admin-song-upload-bin-row");
    if (rowClasses[index]) row.classList.add(rowClasses[index]);

    const label = row.querySelector<HTMLElement>(
      ":scope > div:first-child > div:first-child",
    );
    if (label && labels[index] && label.textContent?.trim() !== labels[index]) {
      label.textContent = labels[index];
    }

    const input = getFileInput(row);
    const hasFile = Boolean(input?.files?.length);
    row.classList.toggle("has-file", hasFile);

    if (index === 2) {
      row.classList.toggle("admin-song-upload-extra-padding", hasFile);
    }
  });

  const coverRow = rows[1];
  if (coverRow) {
    coverRow.hidden = true;
  }

  let actions = filesSection.querySelector<HTMLElement>(
    ":scope > .admin-song-upload-file-actions",
  );

  if (!actions) {
    actions = document.createElement("div");
    actions.className = "admin-song-upload-file-actions";
    filesSection.prepend(actions);
  }

  const actionDefinitions = [
    { label: "Choose Audio", rowIndex: 0 },
    { label: "Choose Cover Art", rowIndex: 1 },
    { label: "Choose Stems", rowIndex: 2 },
  ];

  actionDefinitions.forEach(({ label, rowIndex }) => {
    let action = actions?.querySelector<HTMLButtonElement>(
      `[data-admin-song-file-action="${rowIndex}"]`,
    );

    if (!action) {
      action = document.createElement("button");
      action.type = "button";
      action.dataset.adminSongFileAction = String(rowIndex);
      action.className = "admin-song-upload-file-action";
      action.textContent = label;
      actions?.appendChild(action);
    }

    const input = getFileInput(rows[rowIndex]);
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

      const currentRows = getFileRows(currentSection);
      const currentRow = currentRows[rowIndex];

      if (rowIndex === 1) {
        getFileInput(currentRow)?.click();
        return;
      }

      getChooseButton(currentRow)?.click();
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

function SongCoverUploadCard() {
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);
  const [input, setInput] = useState<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let frameId: number | null = null;
    let createdMount: HTMLElement | null = null;

    const sync = () => {
      frameId = null;

      const page = document.querySelector(".admin-song-upload-content-page");
      if (!page) return;

      const filesSection =
        getSectionByTitle(page, "files") ||
        getSectionByTitle(page, "upload files") ||
        getSectionByTitle(page, "uploaded files");
      const coverRow = getCoverRow(page);

      if (!filesSection || !coverRow) return;

      coverRow.classList.add("admin-song-upload-cover-source");
      coverRow.hidden = true;

      const nextInput = coverRow.querySelector<HTMLInputElement>(
        'input[type="file"][accept*="image"]',
      );
      if (nextInput) setInput(nextInput);

      let nextMount = filesSection.parentElement?.querySelector<HTMLElement>(
        ":scope > .admin-song-upload-cover-mount",
      );

      if (!nextMount) {
        nextMount = document.createElement("div");
        nextMount.className = "admin-song-upload-cover-mount";
        filesSection.insertAdjacentElement("afterend", nextMount);
        createdMount = nextMount;
      }

      setMountNode(nextMount);
    };

    const scheduleSync = () => {
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(sync);
    };

    const observer = new MutationObserver(scheduleSync);
    observer.observe(document.body, { childList: true, subtree: true });
    scheduleSync();

    return () => {
      observer.disconnect();
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      createdMount?.remove();
    };
  }, []);

  useEffect(() => {
    if (!input) return;

    const syncPreview = () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }

      const file = input.files?.[0];
      if (!file) {
        setPreview(null);
        setFileName("");
        return;
      }

      const nextUrl = URL.createObjectURL(file);
      objectUrlRef.current = nextUrl;
      setPreview(nextUrl);
      setFileName(file.name);
    };

    input.addEventListener("change", syncPreview);
    syncPreview();

    return () => {
      input.removeEventListener("change", syncPreview);
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [input]);

  const chooseImage = () => {
    input?.click();
  };

  const removeImage = () => {
    const page = document.querySelector(".admin-song-upload-content-page");
    const coverRow = page ? getCoverRow(page) : null;
    const removeButton = coverRow
      ? Array.from(coverRow.querySelectorAll<HTMLButtonElement>("button")).find(
          (button) => button.textContent?.trim().toLowerCase() === "remove",
        )
      : null;

    removeButton?.click();
    setPreview(null);
    setFileName("");
  };

  const handleDrop = (event: React.DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!input) return;

    const file = Array.from(event.dataTransfer.files).find((item) =>
      item.type.startsWith("image/"),
    );
    if (!file) return;

    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  };

  if (!mountNode) return null;

  return createPortal(
    <section className="admin-song-upload-cover-card">
      <h2>Cover image</h2>

      {preview ? (
        <div className="admin-song-upload-cover-selected">
          <button
            type="button"
            onClick={chooseImage}
            className="admin-song-upload-cover-preview group"
            aria-label="Change cover image"
          >
            <img src={preview} alt="Cover preview" />
            <span>Change image</span>
          </button>

          <div className="admin-song-upload-cover-details">
            <div>
              <div className="admin-song-upload-cover-file-name">
                {fileName || "Cover image selected"}
              </div>
              <div className="admin-song-upload-cover-help">
                Click the preview or choose a new image to replace it.
              </div>
            </div>

            <div className="admin-song-upload-cover-controls">
              <button type="button" onClick={chooseImage}>
                Change image
              </button>
              <button type="button" onClick={removeImage}>
                Remove image
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={chooseImage}
          onDrop={handleDrop}
          onDragOver={(event) => event.preventDefault()}
          className="admin-song-upload-cover-dropzone"
        >
          <span className="admin-song-upload-cover-icon" aria-hidden="true">
            <UploadIcon size={18} />
          </span>
          <span className="text-left">
            <span className="block text-[12px] font-medium text-[var(--text-primary)]">
              Drop image here
            </span>
            <span className="mt-1 block text-[11px] leading-4 text-[var(--text-secondary)]">
              Click to upload a song cover.
            </span>
          </span>
        </button>
      )}
    </section>,
    mountNode,
  );
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
      const needsFullList =
        renderedItems.length !== accumulatedStemFiles.length ||
        renderedItems.some((item) => item.textContent?.trim().startsWith("+"));

      if (needsFullList) {
        const fragment = document.createDocumentFragment();

        accumulatedStemFiles.forEach((file) => {
          const item = document.createElement("div");
          item.className = "admin-song-stem-file-item truncate";
          item.textContent = file.name;
          fragment.appendChild(item);
        });

        fileList.replaceChildren(fragment);
      }

      const visibleItems = Array.from(fileList.children).filter(
        (child): child is HTMLElement => child instanceof HTMLElement,
      );

      for (let index = 0; index < accumulatedStemFiles.length; index++) {
        const item = visibleItems[index];
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

        const audioRow = filesSection.querySelector<HTMLElement>(
          ".admin-song-upload-audio-row",
        );
        const audioStatus = audioRow?.querySelector<HTMLElement>(
          ":scope > div:nth-child(2) > div.mt-2.flex.items-start.gap-2",
        );
        const audioStatusText = audioStatus?.textContent?.trim().toLowerCase() || "";

        audioRow?.classList.toggle(
          "admin-song-upload-extra-padding",
          Boolean(audioRow.querySelector(".animate-spin")),
        );

        if (audioStatus) {
          audioStatus.hidden =
            audioStatusText.startsWith("generated ") ||
            audioStatusText.startsWith("re-generated ");
        }
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
      row?.classList.toggle(
        "admin-song-upload-extra-padding",
        accumulatedStemFiles.length > 0,
      );
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
    <>
      <SongCoverUploadCard />

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
          overflow: visible !important;
          margin-top: 56px;
        }

        .admin-song-upload-content-page .admin-song-upload-cover-source {
          display: none !important;
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
          min-height: 0;
          border-bottom: 1px solid var(--border-subtle);
          border-radius: 9px 9px 0 0;
          padding: 18px 20px 14px;
        }

        .admin-song-upload-content-page
          .admin-song-upload-files-bin
          .admin-song-file-row:not(.admin-song-upload-cover-source) {
          display: grid !important;
          min-height: 58px;
          grid-template-columns: 92px minmax(0, 1fr) auto !important;
          align-items: center !important;
          gap: 16px !important;
          border-top: 1px solid var(--border-subtle) !important;
          padding: 10px 20px !important;
        }

        .admin-song-upload-content-page
          .admin-song-upload-files-bin
          .admin-song-file-row.admin-song-upload-extra-padding:not(.admin-song-upload-cover-source) {
          padding-top: 16px !important;
          padding-bottom: 16px !important;
        }

        .admin-song-upload-content-page
          .admin-song-upload-files-bin
          .admin-song-upload-audio-row {
          border-top: 0 !important;
        }

        .admin-song-upload-content-page
          .admin-song-upload-files-bin
          .admin-song-file-row:not(.admin-song-upload-cover-source)
          > div:first-child {
          grid-column: 1 !important;
          grid-row: 1 !important;
          align-self: center !important;
          padding: 0 !important;
        }

        .admin-song-upload-content-page
          .admin-song-upload-files-bin
          .admin-song-file-row:not(.admin-song-upload-cover-source)
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
          .admin-song-file-row:not(.admin-song-upload-cover-source)
          > div:nth-child(2) {
          grid-column: 2 !important;
          grid-row: 1 !important;
          min-width: 0;
          margin-right: 0 !important;
        }

        .admin-song-upload-content-page
          .admin-song-upload-files-bin
          .admin-song-file-row:not(.admin-song-upload-cover-source)
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
          .admin-song-file-row:not(.admin-song-upload-cover-source)
          > div:nth-child(2)
          > div[class~="h-9"]
          > button {
          display: none !important;
        }

        .admin-song-upload-content-page
          .admin-song-upload-files-bin
          .admin-song-file-row:not(.admin-song-upload-cover-source)
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
          .admin-song-upload-audio-row
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
          .admin-song-upload-audio-row:has(> div:last-child > button)
          > div:nth-child(2)
          > div[class~="h-9"] {
          padding-right: 0 !important;
        }

        .admin-song-upload-content-page
          .admin-song-upload-files-bin
          .admin-song-upload-stems-row
          > div:last-child {
          display: none !important;
        }

        .admin-song-upload-content-page .admin-song-upload-cover-mount {
          width: 100%;
        }

        .admin-song-upload-content-page .admin-song-upload-cover-card {
          width: 100%;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: var(--bg-primary);
          padding: 20px;
        }

        .admin-song-upload-content-page .admin-song-upload-cover-card > h2 {
          margin: 0 0 12px;
          color: var(--text-primary);
          font-family: var(--font-aktiv-grotesk), sans-serif;
          font-size: 16px;
          font-weight: 500;
          line-height: 24px;
          letter-spacing: -0.03em;
        }

        .admin-song-upload-content-page .admin-song-upload-cover-dropzone {
          display: flex;
          width: 100%;
          min-height: 180px;
          cursor: pointer;
          align-items: center;
          justify-content: center;
          gap: 16px;
          border: 1px dashed var(--border);
          border-radius: 10px;
          background: var(--bg-secondary);
          padding: 20px;
          text-align: left;
          transition: border-color 150ms ease, background 150ms ease;
        }

        .admin-song-upload-content-page .admin-song-upload-cover-dropzone:hover {
          border-color: var(--text-secondary);
          background: var(--bg-hover);
        }

        .admin-song-upload-content-page .admin-song-upload-cover-icon {
          display: flex;
          width: 48px;
          height: 48px;
          flex: 0 0 48px;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: var(--bg-tertiary);
          color: var(--text-muted);
        }

        .admin-song-upload-content-page .admin-song-upload-cover-selected {
          display: flex;
          align-items: flex-start;
          gap: 18px;
        }

        .admin-song-upload-content-page .admin-song-upload-cover-preview {
          position: relative;
          width: 180px;
          height: 180px;
          flex: 0 0 180px;
          cursor: pointer;
          overflow: hidden;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: var(--bg-secondary);
        }

        .admin-song-upload-content-page .admin-song-upload-cover-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .admin-song-upload-content-page .admin-song-upload-cover-preview > span {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          background: var(--media-overlay-preview);
          color: var(--media-overlay-contrast);
          font-size: 10px;
          font-weight: 500;
          transition: opacity 150ms ease;
        }

        .admin-song-upload-content-page .admin-song-upload-cover-preview:hover > span {
          opacity: 1;
        }

        .admin-song-upload-content-page .admin-song-upload-cover-details {
          display: flex;
          min-height: 180px;
          min-width: 0;
          flex: 1;
          flex-direction: column;
          justify-content: space-between;
          gap: 20px;
          padding: 4px 0;
        }

        .admin-song-upload-content-page .admin-song-upload-cover-file-name {
          overflow: hidden;
          color: var(--text-primary);
          font-size: 12px;
          font-weight: 500;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .admin-song-upload-content-page .admin-song-upload-cover-help {
          margin-top: 5px;
          color: var(--text-secondary);
          font-size: 11px;
          line-height: 16px;
        }

        .admin-song-upload-content-page .admin-song-upload-cover-controls {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .admin-song-upload-content-page .admin-song-upload-cover-controls > button {
          height: 36px;
          cursor: pointer;
          border: 1px solid var(--border);
          border-radius: 7px;
          background: var(--bg-secondary);
          padding: 0 14px;
          color: var(--text-secondary);
          font-size: 11px;
          font-weight: 400;
          transition: color 150ms ease, background 150ms ease;
        }

        .admin-song-upload-content-page .admin-song-upload-cover-controls > button:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .admin-song-upload-content-page .admin-song-upload-cover-controls > button:last-child:hover {
          color: var(--danger);
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
          padding: 8px 10px !important;
        }

        .admin-song-upload-content-page .admin-song-upload-stem-list > *:first-child {
          border-top: 0;
        }

        .admin-song-upload-content-page .admin-song-upload-stem-list .admin-song-stem-file-item {
          display: flex;
          min-height: 34px;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 8px 10px !important;
          color: var(--text-primary);
        }

        .admin-song-upload-content-page .admin-song-upload-stem-list .admin-song-stem-file-remove {
          flex: 0 0 auto;
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
            .admin-song-file-row:not(.admin-song-upload-cover-source) {
            grid-template-columns: 72px minmax(0, 1fr) auto !important;
            gap: 10px !important;
            padding: 10px 14px !important;
          }

          .admin-song-upload-content-page
            .admin-song-upload-files-bin
            .admin-song-file-row.admin-song-upload-extra-padding:not(.admin-song-upload-cover-source) {
            padding-top: 16px !important;
            padding-bottom: 16px !important;
          }

          .admin-song-upload-content-page .admin-song-upload-cover-selected {
            flex-direction: column;
          }

          .admin-song-upload-content-page .admin-song-upload-cover-details {
            min-height: 0;
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}
