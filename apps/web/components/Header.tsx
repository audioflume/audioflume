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

  useEffect(() => {
    if (!pathname?.startsWith("/projects/")) return;

    const styleId = "filmwave-project-responsive-actions-style";
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      .project-tabs-row {
        height: 49px !important;
        min-height: 49px !important;
        flex-wrap: nowrap !important;
        row-gap: 0 !important;
        overflow-x: auto !important;
        overflow-y: hidden !important;
        scrollbar-width: none !important;
      }

      .project-tabs-row::-webkit-scrollbar {
        display: none !important;
      }

      .project-tabs-row > button {
        flex: 0 0 auto !important;
        height: 49px !important;
        white-space: nowrap !important;
      }

      .project-detail-page .project-detail-shell {
        padding-left: 32px !important;
        padding-right: 32px !important;
      }

      .project-detail-page .project-detail-hero {
        position: relative !important;
        margin-left: -32px !important;
        margin-right: -32px !important;
        margin-top: 49px !important;
        padding-left: 32px !important;
        padding-right: 32px !important;
      }

      .project-detail-page .project-file-browser {
        padding-left: 32px !important;
        padding-right: 32px !important;
      }

      .project-detail-page .project-file-browser-top {
        margin-left: -32px !important;
        margin-right: -32px !important;
        padding-left: 32px !important;
        padding-right: 32px !important;
      }

      .project-detail-page .project-detail-hero > .project-tabs-row-actions.is-in-project-hero {
        position: absolute !important;
        top: 15px !important;
        right: 15px !important;
        z-index: 2 !important;
        display: flex !important;
        margin-left: 0 !important;
      }
    `;

    document.getElementById(styleId)?.remove();
    document.head.appendChild(style);

    let frame = 0;
    let resizeObserver: ResizeObserver | null = null;

    function syncProjectActions() {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const actions = document.querySelector<HTMLElement>(
          ".project-tabs-row-actions",
        );
        const tabsRow = document.querySelector<HTMLElement>(".project-tabs-row");
        const hero = document.querySelector<HTMLElement>(".project-detail-hero");

        if (!actions || !tabsRow || !hero) return;
        const shouldMoveToHero = tabsRow.getBoundingClientRect().width <= 560;

        if (shouldMoveToHero) {
          if (actions.parentElement !== hero) hero.appendChild(actions);
          actions.classList.add("is-in-project-hero");
          return;
        }

        if (actions.parentElement !== tabsRow) tabsRow.appendChild(actions);
        actions.classList.remove("is-in-project-hero");
      });
    }

    function attachResizeObserver() {
      const tabsRow = document.querySelector<HTMLElement>(".project-tabs-row");
      if (!tabsRow || resizeObserver) return;

      resizeObserver = new ResizeObserver(syncProjectActions);
      resizeObserver.observe(tabsRow);
    }

    const observer = new MutationObserver(() => {
      attachResizeObserver();
      syncProjectActions();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    attachResizeObserver();
    syncProjectActions();
    window.addEventListener("resize", syncProjectActions);

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      observer.disconnect();
      window.removeEventListener("resize", syncProjectActions);
      style.remove();

      const actions = document.querySelector<HTMLElement>(
        ".project-tabs-row-actions.is-in-project-hero",
      );
      const tabsRow = document.querySelector<HTMLElement>(".project-tabs-row");

      if (actions && tabsRow) {
        tabsRow.appendChild(actions);
        actions.classList.remove("is-in-project-hero");
      }
    };
  }, [pathname]);

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
  const showHeaderSearch = pathname !== "/music";

  return (
    <HeaderShell
      logo={
        <Link href="/music" className="filmwave-header-logo-action" aria-label="Filmwave Home">
          <FilmwaveLogoIcon className="filmwave-header-logo-mark" />
        </Link>
      }
      actions={
        <div className="filmwave-header-actions" ref={menuRef}>
          {showHeaderSearch && (
            <form onSubmit={handleHeaderSearchSubmit}>
              <CollapsibleSearchPill
                searchIcon={<SearchIcon />}
                value={headerSearch}
                placeholder="Search music library"
                onChange={setHeaderSearch}
              />
            </form>
          )}

          <Link href="/curated-playlists" className="filmwave-header-nav-link">
            <PlaylistIcon size={13} />
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
