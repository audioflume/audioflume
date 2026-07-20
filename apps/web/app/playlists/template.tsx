"use client";

import PublicPlaylistIcon from "@/components/icons/PublicPlaylistIcon";
import Toast from "@/components/Toast";
import { usePlayer } from "@/context/PlayerContext";
import { usePlaylists } from "@/hooks/usePlaylists";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";

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
  list: boolean;
};

type MountedPublicIcon = {
  root: Root;
  host: HTMLSpanElement;
  title: HTMLElement;
  detail: boolean;
  list: boolean;
};

export default function PlaylistsTemplate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { currentSong } = usePlayer();
  const { playlists, setPlaylists } = usePlaylists();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const publicIconRootsRef = useRef<Map<string, MountedPublicIcon>>(new Map());

  function disposeMountedIcon(mounted: MountedPublicIcon) {
    mounted.title.classList.remove("playlist-name-has-public-icon");
    mounted.title.parentElement?.classList.remove("playlist-detail-public-title-parent");

    window.setTimeout(() => {
      mounted.root.unmount();
      mounted.host.remove();
    }, 0);
  }

  function positionDetailIcon(mounted: MountedPublicIcon) {
    if (!mounted.detail) return;

    const parent = mounted.title.parentElement;
    if (!parent) return;

    parent.classList.add("playlist-detail-public-title-parent");

    const titleRect = mounted.title.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    const left = titleRect.right - parentRect.left + 6;
    const top = titleRect.top - parentRect.top + titleRect.height - 14.5;

    mounted.host.style.left = `${left}px`;
    mounted.host.style.top = `${top}px`;
  }

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }

      publicIconRootsRef.current.forEach(disposeMountedIcon);
      publicIconRootsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (!pathname.startsWith("/playlists")) return;

    function collectTargets() {
      const targets: PublicIconTarget[] = [];

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

            const listCount = link.querySelector<HTMLElement>(".playlist-row-count");
            const gridName = link.querySelector<HTMLElement>(
              ".playlist-gallery-content h3",
            );
            const target = listCount ?? gridName;
            if (!target) return;

            targets.push({
              key: `playlist-${playlist.id}`,
              element: target,
              detail: false,
              list: Boolean(listCount),
            });
          });
      } else {
        const detailId = pathname.match(/^\/playlists\/(\d+)$/)?.[1];
        const playlist = playlists.find((item) => String(item.id) === detailId);
        const title = document.querySelector<HTMLElement>(
          ".playlist-detail-page .playlist-detail-title",
        );

        if (playlist?.is_public && title) {
          targets.push({
            key: `playlist-detail-${playlist.id}`,
            element: title,
            detail: true,
            list: false,
          });
        }
      }

      return targets;
    }

    function syncPublicIcons() {
      const targets = collectTargets();
      const targetKeys = new Set(targets.map((target) => target.key));

      publicIconRootsRef.current.forEach((mounted, key) => {
        const matchingTarget = targets.find((target) => target.key === key);
        const targetChanged =
          !matchingTarget ||
          matchingTarget.element !== mounted.title ||
          matchingTarget.list !== mounted.list;

        if (!targetKeys.has(key) || targetChanged || !mounted.host.isConnected) {
          disposeMountedIcon(mounted);
          publicIconRootsRef.current.delete(key);
        }
      });

      targets.forEach((target) => {
        const existing = publicIconRootsRef.current.get(target.key);
        if (existing) {
          positionDetailIcon(existing);
          return;
        }

        const host = document.createElement("span");
        host.className = `playlist-public-icon-host${
          target.detail ? " is-detail" : target.list ? " is-list" : ""
        }`;
        host.dataset.playlistPublicIconHost = target.key;
        host.title = "Public playlist";
        host.setAttribute("aria-label", "Public playlist");

        if (target.list) {
          target.element.appendChild(host);
        } else {
          target.element.classList.add("playlist-name-has-public-icon");
          target.element.insertAdjacentElement("afterend", host);
        }

        const root = createRoot(host);
        root.render(<PublicPlaylistIcon className="playlist-public-name-icon" />);

        const mounted = {
          root,
          host,
          title: target.element,
          detail: target.detail,
          list: target.list,
        };

        publicIconRootsRef.current.set(target.key, mounted);
        positionDetailIcon(mounted);
      });
    }

    syncPublicIcons();
    const observer = new MutationObserver(syncPublicIcons);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", syncPublicIcons);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncPublicIcons);
      publicIconRootsRef.current.forEach(disposeMountedIcon);
      publicIconRootsRef.current.clear();
    };
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
        .playlist-name-has-public-icon {
          display: inline !important;
        }

        .playlist-public-icon-host {
          position: relative;
          top: 2px;
          display: inline-flex;
          margin-left: 6px;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          line-height: 0;
          vertical-align: baseline;
        }

        .playlist-public-icon-host.is-list {
          color: var(--text-muted) !important;
        }

        .playlist-detail-public-title-parent {
          position: relative !important;
        }

        .playlist-public-icon-host.is-detail {
          position: absolute;
          top: 0;
          margin-left: 0;
        }
      `}</style>
      {children}
      <Toast
        message={toastMessage}
        bottomOffset={currentSong ? "88px" : "24px"}
      />
    </>
  );
}
