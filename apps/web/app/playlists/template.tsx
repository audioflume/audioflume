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
      {children}
      <Toast
        message={toastMessage}
        bottomOffset={currentSong ? "88px" : "24px"}
      />
    </>
  );
}
