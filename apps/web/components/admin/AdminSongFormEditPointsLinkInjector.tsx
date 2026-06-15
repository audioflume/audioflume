"use client";

import { useEffect, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import AdminSongEditPointsSection from "@/components/admin/AdminSongEditPointsSection";

type AdminSongFormEditPointsLinkInjectorProps = {
  songId?: string;
};

type EmbeddedEditPointRoot = {
  root: Root;
  target: HTMLDivElement;
  ownerId: string;
};

declare global {
  interface Window {
    __filmwaveEmbeddedEditPointRoot?: EmbeddedEditPointRoot | null;
  }
}

function setNativeTextareaValue(textarea: HTMLTextAreaElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(textarea, "value")?.set;
  const prototype = Object.getPrototypeOf(textarea);
  const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;

  if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
    prototypeValueSetter.call(textarea, value);
  } else if (valueSetter) {
    valueSetter.call(textarea, value);
  } else {
    textarea.value = value;
  }

  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  textarea.dispatchEvent(new Event("change", { bubbles: true }));
}

function stopAudioInside(target: HTMLElement) {
  const audioElements = Array.from(target.querySelectorAll("audio"));

  audioElements.forEach((audio) => {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  });
}

function cleanupExistingEmbeddedEditPointRoot(ownerId?: string) {
  const existing = window.__filmwaveEmbeddedEditPointRoot;

  if (!existing) return;
  if (ownerId && existing.ownerId !== ownerId) return;

  window.__filmwaveEmbeddedEditPointRoot = null;
  stopAudioInside(existing.target);

  window.setTimeout(() => {
    existing.root.unmount();
    existing.target.remove();
  }, 0);
}

function EmbeddedEditPointsManager({
  songId,
  onEditPointsJsonChange,
  onDirtyChange,
}: AdminSongFormEditPointsLinkInjectorProps & {
  onEditPointsJsonChange: (value: string) => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  return (
    <AdminSongEditPointsSection
      songId={songId}
      showSaveButton={false}
      onEditPointsJsonChange={onEditPointsJsonChange}
      onDirtyChange={onDirtyChange}
    />
  );
}

export default function AdminSongFormEditPointsLinkInjector({
  songId,
}: AdminSongFormEditPointsLinkInjectorProps) {
  const editPointsJsonRef = useRef('{"markers":[],"ranges":[]}');
  const dirtyRef = useRef(false);

  useEffect(() => {
    const ownerId = `edit-points-${songId || "new"}`;
    let mounted = true;
    const originalFetch = window.fetch.bind(window);

    const findEditPointsSection = () => {
      const headers = Array.from(
        document.querySelectorAll<HTMLElement>(".admin-song-form-card-header"),
      );

      const header = headers.find((item) =>
        item.textContent?.trim().toLowerCase().includes("edit points"),
      );

      return header?.closest("section") ?? null;
    };

    const syncHiddenTextarea = (value = editPointsJsonRef.current) => {
      const editPointsSection = findEditPointsSection();
      const textarea = editPointsSection?.querySelector<HTMLTextAreaElement>("textarea");

      if (textarea) setNativeTextareaValue(textarea, value);
    };

    const patchedFetch: typeof window.fetch = async (input, init) => {
      const requestUrl =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      const requestMethod = (
        init?.method || (input instanceof Request ? input.method : "GET")
      ).toUpperCase();
      const isSongUpdateRequest =
        Boolean(songId) &&
        requestMethod === "PATCH" &&
        requestUrl.includes(`/api/admin/songs/${songId}`) &&
        !requestUrl.includes("/edit-points");

      if (isSongUpdateRequest && typeof init?.body === "string") {
        try {
          const body = JSON.parse(init.body) as Record<string, unknown>;
          return originalFetch(input, {
            ...init,
            body: JSON.stringify({
              ...body,
              editPoints: editPointsJsonRef.current,
            }),
          });
        } catch {
          return originalFetch(input, init);
        }
      }

      return originalFetch(input, init);
    };

    window.fetch = patchedFetch;

    const setOriginalBodyContentVisibility = (body: HTMLElement, visible: boolean) => {
      Array.from(body.children).forEach((child) => {
        if (!(child instanceof HTMLElement)) return;
        if (child.dataset.editPointsEmbeddedManager === "true") return;

        child.style.display = visible ? "" : "none";
      });
    };

    const inject = () => {
      if (!mounted) return false;

      const editPointsSection = findEditPointsSection();

      if (!editPointsSection) return false;

      const header = editPointsSection.querySelector<HTMLElement>(
        ".admin-song-form-card-header",
      );
      const body = editPointsSection.querySelector<HTMLElement>(
        ".admin-song-form-card-header + div",
      );

      if (!body) return false;

      if (header) {
        const kicker = header.querySelector<HTMLElement>(".admin-song-form-kicker");
        if (kicker) kicker.textContent = "Cue Points";
      }

      body.className = "p-4";
      setOriginalBodyContentVisibility(body, false);

      const existing = window.__filmwaveEmbeddedEditPointRoot;
      let target = body.querySelector<HTMLDivElement>(
        "[data-edit-points-embedded-manager]",
      );

      if (existing?.ownerId === ownerId && target === existing.target) {
        syncHiddenTextarea();
        return true;
      }

      cleanupExistingEmbeddedEditPointRoot();

      target = document.createElement("div");
      target.dataset.editPointsEmbeddedManager = "true";
      body.prepend(target);

      const root = createRoot(target);
      window.__filmwaveEmbeddedEditPointRoot = {
        root,
        target,
        ownerId,
      };
      root.render(
        <EmbeddedEditPointsManager
          songId={songId}
          onEditPointsJsonChange={(value) => {
            editPointsJsonRef.current = value;
            syncHiddenTextarea(value);
          }}
          onDirtyChange={(dirty) => {
            dirtyRef.current = dirty;
            if (!dirty) syncHiddenTextarea();
          }}
        />,
      );

      syncHiddenTextarea();
      return true;
    };

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(() => inject());
    });

    const submitListener = () => {
      if (!dirtyRef.current) return;
      syncHiddenTextarea();
    };

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    document.addEventListener("submit", submitListener, true);
    inject();

    return () => {
      mounted = false;
      observer.disconnect();
      document.removeEventListener("submit", submitListener, true);
      if (window.fetch === patchedFetch) window.fetch = originalFetch;
      cleanupExistingEmbeddedEditPointRoot(ownerId);
    };
  }, [songId]);

  return null;
}
