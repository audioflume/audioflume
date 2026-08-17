"use client";

import { useEffect, useLayoutEffect } from "react";

function getSectionByTitle(page: Element, title: string) {
  return Array.from(
    page.querySelectorAll<HTMLElement>(".admin-song-form-card"),
  ).find((section) => {
    const kicker = section.querySelector<HTMLElement>(".admin-song-form-kicker");
    return kicker?.textContent?.trim().toLowerCase() === title;
  });
}

function getFileRows(page: Element) {
  const filesSection =
    getSectionByTitle(page, "files") ||
    getSectionByTitle(page, "upload files") ||
    getSectionByTitle(page, "uploaded files");

  return filesSection
    ? Array.from(
        filesSection.querySelectorAll<HTMLElement>(".admin-song-file-row"),
      )
    : [];
}

function rowHasFile(row: HTMLElement | undefined) {
  if (!row) return false;

  const input = row.querySelector<HTMLInputElement>('input[type="file"]');
  if (input?.files?.length) return true;
  if (row.querySelector("img")) return true;

  const status = row.querySelector<HTMLElement>(
    ':scope > div:nth-child(2) > div[class~="h-9"] > span',
  );
  const text = status?.textContent?.trim().toLowerCase() || "";

  return Boolean(text && text !== "no file chosen");
}

function getRemoveButton(row: HTMLElement) {
  return Array.from(row.querySelectorAll<HTMLButtonElement>("button")).find(
    (button) => button.textContent?.trim().toLowerCase() === "remove",
  );
}

function getFileList(row: HTMLElement) {
  const content = row.children.item(1);
  if (!(content instanceof HTMLElement)) return null;

  return (
    Array.from(content.children).find(
      (child): child is HTMLElement =>
        child instanceof HTMLElement &&
        child.classList.contains("mt-2") &&
        child.classList.contains("grid"),
    ) ?? null
  );
}

function syncExistingAudioStatus(audioRow: HTMLElement | undefined) {
  if (!audioRow) return;

  const status = audioRow.querySelector<HTMLElement>(
    ':scope > div:nth-child(2) > div[class~="h-9"] > span',
  );
  const text = status?.textContent?.trim() || "";

  if (status) {
    status.hidden = text === "Current audio file will be kept";
  }
}

function syncExistingCover(page: Element, coverRow: HTMLElement | undefined) {
  if (!coverRow) return;

  const card = page.querySelector<HTMLElement>(".admin-song-upload-cover-card");
  if (!card) return;

  const input = coverRow.querySelector<HTMLInputElement>(
    'input[type="file"][accept*="image"]',
  );
  const existingImage = coverRow.querySelector<HTMLImageElement>("img");
  const hasSelectedReplacement = Boolean(input?.files?.length);
  const nativeSelected = card.querySelector(
    ".admin-song-upload-cover-selected:not([data-admin-song-edit-existing-cover])",
  );
  const existingPresentation = card.querySelector<HTMLElement>(
    "[data-admin-song-edit-existing-cover]",
  );
  const dropzone = card.querySelector<HTMLElement>(
    ".admin-song-upload-cover-dropzone",
  );

  if (hasSelectedReplacement || nativeSelected || !existingImage) {
    existingPresentation?.remove();
    if (dropzone) dropzone.hidden = false;
    return;
  }

  if (existingPresentation) {
    const previewImage = existingPresentation.querySelector<HTMLImageElement>("img");
    if (previewImage && previewImage.src !== existingImage.src) {
      previewImage.src = existingImage.src;
    }
    if (dropzone) dropzone.hidden = true;
    return;
  }

  const selected = document.createElement("div");
  selected.className = "admin-song-upload-cover-selected";
  selected.dataset.adminSongEditExistingCover = "true";

  const preview = document.createElement("button");
  preview.type = "button";
  preview.className = "admin-song-upload-cover-preview group";
  preview.setAttribute("aria-label", "Change cover image");
  preview.onclick = () => input?.click();

  const image = document.createElement("img");
  image.src = existingImage.src;
  image.alt = "Cover preview";

  const overlay = document.createElement("span");
  overlay.textContent = "Change image";

  preview.append(image, overlay);

  const details = document.createElement("div");
  details.className = "admin-song-upload-cover-details";

  const copy = document.createElement("div");
  const fileName = document.createElement("div");
  fileName.className = "admin-song-upload-cover-file-name";
  fileName.textContent = "Current cover image";

  const help = document.createElement("div");
  help.className = "admin-song-upload-cover-help";
  help.textContent = "Click the preview or choose a new image to replace it.";

  copy.append(fileName, help);

  const controls = document.createElement("div");
  controls.className = "admin-song-upload-cover-controls";

  const change = document.createElement("button");
  change.type = "button";
  change.textContent = "Change image";
  change.onclick = () => input?.click();

  const remove = document.createElement("button");
  remove.type = "button";
  remove.textContent = "Remove image";
  remove.onclick = () => getRemoveButton(coverRow)?.click();

  controls.append(change, remove);
  details.append(copy, controls);
  selected.append(preview, details);

  if (dropzone) {
    dropzone.hidden = true;
    dropzone.insertAdjacentElement("afterend", selected);
  } else {
    card.appendChild(selected);
  }
}

function syncExistingStemRemoval(stemRow: HTMLElement | undefined) {
  if (!stemRow) return;

  const input = stemRow.querySelector<HTMLInputElement>(
    'input[type="file"][multiple]',
  );
  const fileList = getFileList(stemRow);
  const nativeRemove = getRemoveButton(stemRow);
  const existingControl = fileList?.querySelector<HTMLElement>(
    "[data-admin-song-edit-existing-stem-control]",
  );
  const hasSelectedReplacement = Boolean(input?.files?.length);

  if (
    !fileList ||
    !nativeRemove ||
    hasSelectedReplacement ||
    !rowHasFile(stemRow)
  ) {
    existingControl?.remove();
    return;
  }

  if (existingControl) return;

  const control = document.createElement("div");
  control.className = "admin-song-stem-file-item";
  control.dataset.adminSongEditExistingStemControl = "true";

  const label = document.createElement("span");
  label.textContent = "Existing stems";

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "admin-song-stem-file-remove";
  remove.textContent = "Remove stems";
  remove.onclick = () => nativeRemove.click();

  control.append(label, remove);
  fileList.appendChild(control);
}

export default function AdminSongEditUploadStateAdapter() {
  useLayoutEffect(() => {
    const page = document.querySelector<HTMLElement>(
      ".admin-song-edit-content-page",
    );
    if (!page) return;

    page.classList.add("admin-song-upload-content-page");

    return () => {
      page.classList.remove("admin-song-upload-content-page");
    };
  }, []);

  useEffect(() => {
    let frameId: number | null = null;

    const sync = () => {
      frameId = null;

      const page = document.querySelector<HTMLElement>(
        ".admin-song-edit-content-page.admin-song-upload-content-page",
      );
      if (!page) return;

      const rows = getFileRows(page);

      rows.forEach((row, index) => {
        const hasFile = rowHasFile(row);
        row.classList.toggle("has-file", hasFile);

        const action = page.querySelector<HTMLElement>(
          `[data-admin-song-file-action="${index}"]`,
        );
        action?.classList.toggle("has-file", hasFile);
      });

      syncExistingAudioStatus(rows[0]);
      syncExistingCover(page, rows[1]);
      syncExistingStemRemoval(rows[2]);
    };

    const scheduleSync = () => {
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(sync);
    };

    const observer = new MutationObserver(scheduleSync);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "src"],
    });

    document.addEventListener("change", scheduleSync, true);
    scheduleSync();

    return () => {
      observer.disconnect();
      document.removeEventListener("change", scheduleSync, true);
      if (frameId !== null) window.cancelAnimationFrame(frameId);
    };
  }, []);

  return null;
}
