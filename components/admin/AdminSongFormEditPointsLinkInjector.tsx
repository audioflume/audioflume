"use client";

import { useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import AdminSongEditPointsSection from "@/components/admin/AdminSongEditPointsSection";

type AdminSongFormEditPointsLinkInjectorProps = {
  songId?: string;
};

function EmbeddedEditPointsManager({ songId }: AdminSongFormEditPointsLinkInjectorProps) {
  return <AdminSongEditPointsSection songId={songId} />;
}

export default function AdminSongFormEditPointsLinkInjector({
  songId,
}: AdminSongFormEditPointsLinkInjectorProps) {
  useEffect(() => {
    let root: Root | null = null;
    let target: HTMLDivElement | null = null;
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

      if (body.querySelector("[data-edit-points-embedded-manager]")) {
        return true;
      }

      body.innerHTML = "";
      body.className = "p-4";

      target = document.createElement("div");
      target.dataset.editPointsEmbeddedManager = "true";
      body.appendChild(target);

      root = createRoot(target);
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

      const rootToUnmount = root;
      const targetToRemove = target;

      window.setTimeout(() => {
        rootToUnmount?.unmount();
        targetToRemove?.remove();
      }, 0);
    };
  }, [songId]);

  return null;
}
