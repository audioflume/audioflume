"use client";

import { useEffect } from "react";
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

function EmbeddedEditPointsManager({ songId }: AdminSongFormEditPointsLinkInjectorProps) {
  return <AdminSongEditPointsSection songId={songId} />;
}

function cleanupExistingEmbeddedEditPointRoot(ownerId?: string) {
  const existing = window.__filmwaveEmbeddedEditPointRoot;

  if (!existing) return;
  if (ownerId && existing.ownerId !== ownerId) return;

  existing.root.unmount();
  existing.target.remove();
  window.__filmwaveEmbeddedEditPointRoot = null;
}

export default function AdminSongFormEditPointsLinkInjector({
  songId,
}: AdminSongFormEditPointsLinkInjectorProps) {
  useEffect(() => {
    const ownerId = `edit-points-${songId || "new"}`;
    let mounted = true;

    const findEditPointsSection = () => {
      const headers = Array.from(
        document.querySelectorAll<HTMLElement>(".admin-song-form-card-header"),
      );

      const header = headers.find((item) =>
        item.textContent?.trim().toLowerCase().includes("edit points"),
      );

      return header?.closest("section") ?? null;
    };

    const inject = () => {
      if (!mounted) return false;

      const editPointsSection = findEditPointsSection();

      if (!editPointsSection) return false;

      const body = editPointsSection.querySelector<HTMLElement>(".admin-song-form-card-header + div");

      if (!body) return false;

      const existing = window.__filmwaveEmbeddedEditPointRoot;
      const currentTarget = body.querySelector<HTMLDivElement>(
        "[data-edit-points-embedded-manager]",
      );

      if (existing?.ownerId === ownerId && currentTarget === existing.target) {
        return true;
      }

      cleanupExistingEmbeddedEditPointRoot();

      body.innerHTML = "";
      body.className = "p-4";

      const target = document.createElement("div");
      target.dataset.editPointsEmbeddedManager = "true";
      body.appendChild(target);

      const root = createRoot(target);
      window.__filmwaveEmbeddedEditPointRoot = {
        root,
        target,
        ownerId,
      };
      root.render(<EmbeddedEditPointsManager songId={songId} />);

      return true;
    };

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(() => inject());
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    inject();

    return () => {
      mounted = false;
      observer.disconnect();
      cleanupExistingEmbeddedEditPointRoot(ownerId);
    };
  }, [songId]);

  return null;
}
