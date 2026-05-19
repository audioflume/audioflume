"use client";

import { useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import Link from "next/link";

type AdminSongFormEditPointsLinkInjectorProps = {
  songId: string;
};

function EditPointsHeaderButton({ songId }: AdminSongFormEditPointsLinkInjectorProps) {
  return (
    <Link
      href={`/admin/songs/${songId}/edit-points?from=edit-details`}
      className="inline-flex h-7 items-center rounded-full border border-[var(--border)] px-3 text-[11px] font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
    >
      Open Editor
    </Link>
  );
}

export default function AdminSongFormEditPointsLinkInjector({
  songId,
}: AdminSongFormEditPointsLinkInjectorProps) {
  useEffect(() => {
    let root: Root | null = null;
    let mounted = true;

    const inject = () => {
      if (!mounted) return false;

      const headers = Array.from(
        document.querySelectorAll<HTMLElement>(".admin-song-form-card-header"),
      );
      const editPointsHeader = headers.find((header) =>
        header.textContent?.toLowerCase().includes("edit points"),
      );

      if (!editPointsHeader) return false;
      if (editPointsHeader.querySelector("[data-edit-points-editor-link]")) {
        return true;
      }

      const target = document.createElement("div");
      target.dataset.editPointsEditorLink = "true";
      target.className = "flex items-center";
      editPointsHeader.appendChild(target);

      root = createRoot(target);
      root.render(<EditPointsHeaderButton songId={songId} />);
      return true;
    };

    if (!inject()) {
      const interval = window.setInterval(() => {
        if (inject()) {
          window.clearInterval(interval);
        }
      }, 150);

      return () => {
        mounted = false;
        window.clearInterval(interval);
        root?.unmount();
      };
    }

    return () => {
      mounted = false;
      root?.unmount();
    };
  }, [songId]);

  return null;
}
