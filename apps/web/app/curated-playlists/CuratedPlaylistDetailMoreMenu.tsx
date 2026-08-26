"use client";

import DropdownShell from "@/components/DropdownShell";
import Toast from "@/components/Toast";
import MoreIcon from "@/components/icons/MoreIcon";
import { usePlayer } from "@/context/PlayerContext";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function CuratedPlaylistDetailMoreMenu() {
  const pathname = usePathname();
  const { currentSong } = usePlayer();
  const playlistIdMatch = pathname.match(/^\/curated-playlists\/([^/]+)$/);
  const playlistId = playlistIdMatch?.[1] ?? null;
  const isCuratedPlaylistDetail = playlistId !== null;

  const [actionsTarget, setActionsTarget] = useState<HTMLElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isCuratedPlaylistDetail) {
      setActionsTarget(null);
      return;
    }

    const updateTargets = () => {
      const nextActionsTarget = document.querySelector<HTMLElement>(
        ".playlist-detail-page .playlist-detail-actions",
      );

      setActionsTarget((currentTarget) =>
        currentTarget === nextActionsTarget ? currentTarget : nextActionsTarget,
      );
    };

    updateTargets();
    const observer = new MutationObserver(updateTargets);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [isCuratedPlaylistDetail]);

  useEffect(() => {
    setMenuOpen(false);
    setToastMessage(null);
  }, [playlistId]);

  async function copyPlaylistLink() {
    setMenuOpen(false);

    try {
      await navigator.clipboard.writeText(window.location.href);
      setToastMessage("Playlist link copied");
    } catch {
      setToastMessage("Could not copy playlist link");
    }
  }

  if (!isCuratedPlaylistDetail) return null;

  const menu = actionsTarget
    ? createPortal(
        <div className="playlist-detail-more-menu">
          <DropdownShell
            open={menuOpen}
            onOpenChange={setMenuOpen}
            placement="bottom-end"
            className="playlist-detail-more-dropdown"
            offsetAmount={8}
            collisionPadding={{ top: 72, right: 16, bottom: 88, left: 16 }}
            trigger={({ open }) => (
              <button
                type="button"
                className={`playlist-detail-more-button${open ? " is-active" : ""}`}
                aria-label="More curated playlist actions"
                aria-expanded={open}
                title="More"
              >
                <MoreIcon />
              </button>
            )}
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => void copyPlaylistLink()}
            >
              Copy Link
            </button>
          </DropdownShell>
        </div>,
        actionsTarget,
      )
    : null;

  return (
    <>
      {menu}
      <Toast
        message={toastMessage}
        bottomOffset={currentSong ? "88px" : "24px"}
      />
    </>
  );
}
