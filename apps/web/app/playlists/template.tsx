"use client";

import Toast from "@/components/Toast";
import { usePlayer } from "@/context/PlayerContext";
import { usePlaylists } from "@/hooks/usePlaylists";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

function parseResponse(text: string) {
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function createPublicIcon() {
  const icon = document.createElement("span");
  icon.className = "playlist-public-status-icon";
  icon.dataset.playlistPublicStatus = "true";
  icon.title = "Public playlist";
  icon.setAttribute("aria-label", "Public playlist");
  icon.innerHTML = `
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" stroke-width="1.7" />
      <path d="M3.9 12h16.2M12 3.75c2.05 2.25 3.1 5 3.1 8.25S14.05 18 12 20.25C9.95 18 8.9 15.25 8.9 12S9.95 6 12 3.75Z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  `;
  return icon;
}

export default function PlaylistsTemplate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { currentSong } = usePlayer();
  const { playlists, setPlaylists } = usePlaylists();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!pathname.startsWith("/playlists")) return;

    function syncPublicIcons() {
      document
        .querySelectorAll<HTMLElement>("[data-playlist-public-status]")
        .forEach((icon) => icon.remove());

      if (pathname === "/playlists") {
        document
          .querySelectorAll<HTMLAnchorElement>('a[href^="/playlists/"]')
          .forEach((link) => {
            const idMatch = link.getAttribute("href")?.match(/^\/playlists\/(\d+)$/);
            const playlist = playlists.find((item) => item.id === Number(idMatch?.[1]));
            if (!playlist?.is_public) return;

            const name = link.querySelector<HTMLElement>(
              ".playlist-gallery-content h3, .playlist-row-main > span",
            );
            if (!name) return;

            name.classList.add("playlist-name-with-status");
            name.appendChild(createPublicIcon());
          });
        return;
      }

      const detailId = pathname.match(/^\/playlists\/(\d+)$/)?.[1];
      const playlist = playlists.find((item) => String(item.id) === detailId);
      if (!playlist?.is_public) return;

      const title = document.querySelector<HTMLElement>(
        ".playlist-detail-page .playlist-detail-title",
      );
      if (!title) return;

      title.classList.add("playlist-name-with-status");
      title.appendChild(createPublicIcon());
    }

    const frame = window.requestAnimationFrame(syncPublicIcons);
    const retry = window.setTimeout(syncPublicIcons, 250);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(retry);
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
        .playlist-name-with-status {
          display: inline-flex !important;
          max-width: 100%;
          align-items: center;
          gap: 6px;
        }

        .playlist-public-status-icon {
          display: inline-flex;
          flex: 0 0 auto;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          line-height: 0;
        }

        .playlist-gallery-content .playlist-public-status-icon {
          color: rgba(255, 255, 255, 0.62);
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
