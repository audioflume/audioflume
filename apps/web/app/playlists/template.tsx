"use client";

import PublicPlaylistIcon from "@/components/icons/PublicPlaylistIcon";
import Toast from "@/components/Toast";
import { usePlayer } from "@/context/PlayerContext";
import { usePlaylists } from "@/hooks/usePlaylists";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

function parseResponse(text: string) {
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

type PublicIconTarget = {
  key: string;
  element: HTMLElement;
  detail: boolean;
};

export default function PlaylistsTemplate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { currentSong } = usePlayer();
  const { playlists, setPlaylists } = usePlaylists();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [publicIconTargets, setPublicIconTargets] = useState<PublicIconTarget[]>([]);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!pathname.startsWith("/playlists")) {
      setPublicIconTargets([]);
      return;
    }

    function syncPublicIconTargets() {
      const nextTargets: PublicIconTarget[] = [];

      if (pathname === "/playlists") {
        document
          .querySelectorAll<HTMLAnchorElement>(
            '.playlist-gallery-card a[href^="/playlists/"], .playlist-index-row-shell a[href^="/playlists/"]',
          )
          .forEach((link) => {
            const idMatch = link
              .getAttribute("href")
              ?.match(/^\/playlists\/(\d+)$/);
            const playlistId = Number(idMatch?.[1]);
            const playlist = playlists.find((item) => item.id === playlistId);

            if (!playlist?.is_public) return;

            const name = link.querySelector<HTMLElement>(
              ".playlist-gallery-content h3, .playlist-row-main > span",
            );
            if (!name) return;

            nextTargets.push({
              key: `playlist-${playlist.id}`,
              element: name,
              detail: false,
            });
          });
      } else {
        const detailId = pathname.match(/^\/playlists\/(\d+)$/)?.[1];
        const playlist = playlists.find((item) => String(item.id) === detailId);
        const title = document.querySelector<HTMLElement>(
          ".playlist-detail-page .playlist-detail-title",
        );

        if (playlist?.is_public && title) {
          nextTargets.push({
            key: `playlist-detail-${playlist.id}`,
            element: title,
            detail: true,
          });
        }
      }

      setPublicIconTargets((current) => {
        const unchanged =
          current.length === nextTargets.length &&
          current.every(
            (target, index) =>
              target.key === nextTargets[index]?.key &&
              target.element === nextTargets[index]?.element &&
              target.detail === nextTargets[index]?.detail,
          );

        return unchanged ? current : nextTargets;
      });
    }

    syncPublicIconTargets();
    const observer = new MutationObserver(syncPublicIconTargets);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [pathname, playlists]);

  useEffect(() => {
    if (pathname !== "/playlists") return;

    function showToast(message: string) {
      setToastMessage(message);

      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }

      toastTimerRef.current = window.setTimeout(() => {
        setToastMessage(null);
        toastTimerRef.current = null;
      }, 1800);
    }

    function findPlaylistMenu() {
      return Array.from(
        document.querySelectorAll<HTMLElement>(".filmwave-dropdown-shell"),
      ).find((shell) => {
        const labels = Array.from(
          shell.querySelectorAll<HTMLButtonElement>(":scope > button"),
        ).map((button) => button.textContent?.trim());

        return (
          labels.includes("Edit") &&
          labels.includes("Rename") &&
          labels.includes("Delete")
        );
      });
    }

    function addPublicAction(menu: HTMLElement, playlistId: number) {
      if (menu.querySelector("[data-playlist-public-action]")) return;

      const playlist = playlists.find((item) => item.id === playlistId);
      if (!playlist) return;

      const renameButton = Array.from(
        menu.querySelectorAll<HTMLButtonElement>(":scope > button"),
      ).find((button) => button.textContent?.trim() === "Rename");

      if (!renameButton) return;

      const publicButton = document.createElement("button");
      publicButton.type = "button";
      publicButton.dataset.playlistPublicAction = "true";
      publicButton.textContent = playlist.is_public
        ? "Make Private"
        : "Make Public";

      publicButton.addEventListener("click", async () => {
        const nextPublic = !playlist.is_public;
        publicButton.disabled = true;

        try {
          const response = await fetch(`/api/playlists/${playlist.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_public: nextPublic }),
          });
          const data = parseResponse(await response.text());

          if (!response.ok) {
            throw new Error(
              data?.error || "Couldn't update playlist visibility",
            );
          }

          setPlaylists((current) =>
            current.map((item) =>
              item.id === playlist.id ? { ...item, ...data } : item,
            ),
          );
          showToast(
            nextPublic
              ? "Playlist is now public"
              : "Playlist is now private",
          );
          document.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
          );
        } catch (error) {
          showToast(
            error instanceof Error
              ? error.message
              : "Couldn't update playlist visibility",
          );
          publicButton.disabled = false;
        }
      });

      renameButton.insertAdjacentElement("afterend", publicButton);
    }

    function handleClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const menuWrap = target.closest<HTMLElement>("[data-playlist-menu]");
      if (!menuWrap) return;

      const card = menuWrap.closest<HTMLElement>(
        ".playlist-gallery-card, .playlist-index-row-shell",
      );
      const playlistLink = card?.querySelector<HTMLAnchorElement>(
        'a[href^="/playlists/"]',
      );
      const idMatch = playlistLink
        ?.getAttribute("href")
        ?.match(/^\/playlists\/(\d+)$/);
      const playlistId = Number(idMatch?.[1]);

      if (!Number.isFinite(playlistId)) return;

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          const menu = findPlaylistMenu();
          if (menu) addPublicAction(menu, playlistId);
        });
      });
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [pathname, playlists, setPlaylists]);

  return (
    <>
      <style>{`
        .playlist-public-name-icon {
          display: inline-flex;
          margin-left: 6px;
          flex: 0 0 auto;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          line-height: 0;
          vertical-align: baseline;
        }

        .playlist-gallery-content .playlist-public-name-icon {
          color: rgba(255, 255, 255, 0.62);
        }

        .playlist-detail-title .playlist-public-name-icon {
          position: relative;
          top: 5px;
        }
      `}</style>
      {children}
      {publicIconTargets.map((target) =>
        createPortal(
          <PublicPlaylistIcon
            className={`playlist-public-name-icon${target.detail ? " is-detail" : ""}`}
          />,
          target.element,
          target.key,
        ),
      )}
      <Toast
        message={toastMessage}
        bottomOffset={currentSong ? "88px" : "24px"}
      />
    </>
  );
}
