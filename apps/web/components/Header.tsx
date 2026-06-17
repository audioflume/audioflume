"use client";

import {
  CollapsibleSearchPill,
  HeaderChevron,
  HeaderShell,
  MUSIC_FILTER_STORAGE_KEY_PREFIX,
} from "@filmwave/shared";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect, type FormEvent } from "react";
import { useUser } from "@clerk/nextjs";
import FilmwaveLogoIcon from "@/components/icons/FilmwaveLogoIcon";
import PlaylistIcon from "@/components/icons/PlaylistIcon";
import SearchIcon from "@/components/icons/SearchIcon";
import MusicHeaderSearch from "@/components/MusicHeaderSearch";
import UserMenu from "@/components/UserMenu";

const HEADER_SEARCH_ACCOUNT_STYLE = `
  .filmwave-header-account-trigger:hover,
  .filmwave-header-account-trigger.is-open,
  .filmwave-header-account-trigger:hover .filmwave-header-account-label,
  .filmwave-header-account-trigger.is-open .filmwave-header-account-label {
    background: transparent !important;
    background-color: transparent !important;
  }

  .filmwave-header-account-trigger:hover .filmwave-header-avatar,
  .filmwave-header-account-trigger.is-open .filmwave-header-avatar {
    box-shadow:
      0 1px 3px rgba(0, 0, 0, 0.18),
      0 0 0 4px rgba(255, 255, 255, 0.08) !important;
    transform: scale(1.05) !important;
  }

  html.light .filmwave-header-account-trigger:hover .filmwave-header-avatar,
  html.light .filmwave-header-account-trigger.is-open .filmwave-header-avatar,
  html[data-theme="light"] .filmwave-header-account-trigger:hover .filmwave-header-avatar,
  html[data-theme="light"] .filmwave-header-account-trigger.is-open .filmwave-header-avatar {
    box-shadow:
      0 1px 3px rgba(0, 0, 0, 0.12),
      0 0 0 4px rgba(0, 0, 0, 0.08) !important;
  }
`;

export default function Header() {
  const { user } = useUser();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [headerSearch, setHeaderSearch] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
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

  function handleHeaderSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextSearch = headerSearch.trim();
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
  const isMusicPage = pathname === "/music";
  const showHeaderSearch = !isMusicPage;

  return (
    <>
      <HeaderShell
        logo={
          <Link href="/music" className="filmwave-header-logo-action" aria-label="Filmwave Home">
            <FilmwaveLogoIcon className="filmwave-header-logo-mark" />
          </Link>
        }
        actions={
          <div className="filmwave-header-actions" ref={menuRef}>
            {isMusicPage && <MusicHeaderSearch />}

            {showHeaderSearch && (
              <form
                className="filmwave-music-header-search-form filmwave-header-search-form"
                onSubmit={handleHeaderSearchSubmit}
              >
                <CollapsibleSearchPill
                  searchIcon={<SearchIcon />}
                  value={headerSearch}
                  placeholder="Search music library"
                  style={{ width: "100%", maxWidth: "100%" }}
                  onChange={setHeaderSearch}
                />
              </form>
            )}

            <Link href="/curated-playlists" className="filmwave-header-nav-link">
              <PlaylistIcon size={16} />
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

      <style>{HEADER_SEARCH_ACCOUNT_STYLE}</style>
    </>
  );
}
