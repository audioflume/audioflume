"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

function BackIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M15 5L8 12L15 19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function PlaylistDetailBackButton() {
  const pathname = usePathname();
  const router = useRouter();
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const isPlaylistDetail = /^\/playlists\/[^/]+$/.test(pathname);

  useEffect(() => {
    if (!isPlaylistDetail) {
      setTarget(null);
      return;
    }

    const updateTarget = () => {
      const nextTarget = document.querySelector<HTMLElement>(
        ".playlist-detail-page .playlist-detail-shell",
      );
      setTarget((currentTarget) =>
        currentTarget === nextTarget ? currentTarget : nextTarget,
      );
    };

    updateTarget();

    const observer = new MutationObserver(updateTarget);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [isPlaylistDetail]);

  if (!isPlaylistDetail || !target) return null;

  return createPortal(
    <button
      type="button"
      className="playlist-detail-browser-back"
      onClick={() => router.back()}
      aria-label="Go back to the previous page"
    >
      <BackIcon />
      <span>Back</span>
    </button>,
    target,
  );
}
