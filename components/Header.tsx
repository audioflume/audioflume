"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import DashboardIcon from "@/components/icons/DashboardIcon";
import PlaylistIcon from "@/components/icons/PlaylistIcon";
import Logo from "@/components/Logo";
import UserMenu from "@/components/UserMenu";
import { navLinkClass } from "@/components/uiClasses";

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={`transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path
        d="M7 10L12 15L17 10"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Header() {
  const { user } = useUser();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
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

  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase()
    : "";

  return (
    <header className="fixed left-0 right-0 top-0 z-[110] h-14 border-b border-[var(--border)] bg-[var(--bg-primary)]">
      <div className="flex h-full items-center justify-between px-6">
        <Link href="/music" className="flex items-center">
          <Logo className="h-[22px] w-auto text-[var(--text-primary)]" />
        </Link>

        <div className="relative flex h-full items-center gap-1" ref={menuRef}>
          <Link href="/discover" className={navLinkClass}>
            <DashboardIcon />
            Discover
          </Link>

          <Link href="/curated-playlists" className={navLinkClass}>
            <PlaylistIcon size={13} />
            Playlists
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className={`group flex h-8 cursor-pointer items-center gap-2 text-xs font-medium transition ${
              menuOpen
                ? "text-[var(--text-primary)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
            aria-label="Open user menu"
            aria-expanded={menuOpen}
          >
            <span
              className={`flex h-8 items-center gap-1.5 rounded-md px-2.5 transition ${
                menuOpen
                  ? "bg-[var(--bg-hover)]"
                  : "group-hover:bg-[var(--bg-hover)]"
              }`}
            >
              <span className="hidden max-w-[150px] truncate leading-none sm:block">
                {user?.fullName || "Account"}
              </span>

              <ChevronIcon open={menuOpen} />
            </span>

            <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--bg-secondary)] text-[10px] font-semibold leading-none text-[var(--text-primary)]">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                initials
              )}
            </div>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-[120] mt-2">
              <UserMenu onClose={() => setMenuOpen(false)} />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
