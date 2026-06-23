"use client";

import {
  HeaderChevron,
  HeaderShell,
  MUSIC_FILTER_STORAGE_KEY_PREFIX,
} from "@filmwave/shared";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import CuratedPlaylistsIcon from "@/components/icons/CuratedPlaylistsIcon";
import FilmwaveLogoIcon from "@/components/icons/FilmwaveLogoIcon";
import MusicHeaderSearch from "@/components/MusicHeaderSearch";
import UserMenu from "@/components/UserMenu";

export default function Header() {
  const { user } = useUser();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [headerSearch, setHeaderSearch] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    if (menuOpen) document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  useEffect(() => {
    function syncProfileImage() {
      setProfileImage(localStorage.getItem("filmwave-profile-image"));
    }

    syncProfileImage();

    window.addEventListener("storage", syncProfileImage);
    window.addEventListener("filmwave-profile-image-change", syncProfileImage);
    window.addEventListener("focus", syncProfileImage);

    return () => {
      window.removeEventListener("storage", syncProfileImage);
      window.removeEventListener(
        "filmwave-profile-image-change",
        syncProfileImage,
      );
      window.removeEventListener("focus", syncProfileImage);
    };
  }, []);

  function handleHeaderSearchSubmit(nextSearchValue: string) {
    const nextSearch = nextSearchValue.trim();
    const storageKey = user?.id
      ? `${MUSIC_FILTER_STORAGE_KEY_PREFIX}:${user.id}`
      : null;

    if (storageKey) {
      try {
        const stored = sessionStorage.getItem(storageKey);
        const parsed = stored ? JSON.parse(stored) : {};
        const current =
          typeof parsed === "object" && parsed !== null ? parsed : {};

        sessionStorage.setItem(
          storageKey,
          JSON.stringify({
            ...current,
            search: nextSearch,
          }),
        );
      } catch {
        sessionStorage.setItem(storageKey, JSON.stringify({ search: nextSearch }));
      }
    }

    router.push(nextSearch ? `/music?search=${encodeURIComponent(nextSearch)}` : "/music");
  }

  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase()
    : "";
  const syncHeaderSearchWithMusicPage = pathname === "/music";

  return (
    <HeaderShell
      logo={
        <Link href="/music" className="filmwave-header-logo-action" aria-label="Filmwave Home">
          <FilmwaveLogoIcon className="filmwave-header-logo-mark" />
        </Link>
      }
      actions={
        <div className="filmwave-header-actions" ref={menuRef}>
          <MusicHeaderSearch
            value={headerSearch}
            placeholder="Search music library"
            syncWithToolbar={syncHeaderSearchWithMusicPage}
            onChange={setHeaderSearch}
            onSubmitSearch={handleHeaderSearchSubmit}
          />

          <Link href="/curated-playlists" className="filmwave-header-nav-link">
            <CuratedPlaylistsIcon size={16} />
            Playlists
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className={`filmwave-header-account-trigger${menuOpen ? " is-open" : ""}`}
            aria-label="Open user menu"
            aria-expanded={menuOpen}
          >
            <span className="filmwave-header-account-label">
              <span className="filmwave-header-account-name">
                {user?.fullName || "Account"}
              </span>

              <HeaderChevron open={menuOpen} />
            </span>

            <span className="filmwave-header-avatar">
              {profileImage ? (
                <img src={profileImage} alt="Profile" />
              ) : (
                initials
              )}
            </span>
          </button>

          {menuOpen && (
            <div className="filmwave-header-menu-wrap">
              <UserMenu onClose={() => setMenuOpen(false)} />
            </div>
          )}
        </div>
      }
    />
  );
}
