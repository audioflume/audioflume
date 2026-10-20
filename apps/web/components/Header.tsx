"use client";

import { HeaderShell } from "@filmwave/shared";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import CuratedPlaylistPlayButton from "@/components/curated/CuratedPlaylistPlayButton";
import cardStyles from "@/components/curated/CuratedPlaylistCard.module.css";
import UserMenu from "@/components/UserMenu";

type CuratedPlaylistPreview = {
  id: number;
  name: string;
  cover_image_url?: string | null;
  song_count?: number | null;
};

const TOP_NAV_LINKS = [
  { href: "/discover", label: "Discover" },
  { href: "/music", label: "Music" },
  { href: "/playlists", label: "Playlists" },
  { href: "/sound-fx", label: "Sound FX" },
];

const PLAYLIST_PAGE_LINKS = [
  {
    href: "/curated-playlists",
    label: "Curated Collections",
    detail: "Audioflume editor picks",
  },
  {
    href: "/playlists",
    label: "My Playlists",
    detail: "Your saved collections",
  },
  {
    href: "/playlists?tab=community-playlists",
    label: "Community Playlists",
    detail: "Collections from filmmakers",
  },
];

const PLAYLIST_QUICK_SECTIONS = [
  { title: "My Playlists", href: "/playlists" },
  { title: "Curated Playlists", href: "/curated-playlists" },
];

const HEADER_SCROLL_THRESHOLD = 18;

function formatTrackCount(count?: number | null) {
  const safeCount = Number(count || 0);
  return `${safeCount} track${safeCount === 1 ? "" : "s"}`;
}

function playlistNavIsActive(pathname: string | null, href: string) {
  if (!pathname) return false;

  if (href === "/playlists") {
    return (
      pathname === "/playlists" ||
      pathname.startsWith("/playlists/") ||
      pathname.startsWith("/curated-playlists")
    );
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Header() {
  const { user, isLoaded } = useUser();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileAccountOpen, setMobileAccountOpen] = useState(false);
  const [playlistsMenuOpen, setPlaylistsMenuOpen] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [avatarImageFailed, setAvatarImageFailed] = useState(false);
  const [scrolledPastThreshold, setScrolledPastThreshold] = useState(false);
  const [curatedPreview, setCuratedPreview] = useState<
    CuratedPlaylistPreview[]
  >([]);
  const menuRef = useRef<HTMLDivElement>(null);
  const transparentAtTop = pathname === "/";
  const headerIsSolid =
    !transparentAtTop || scrolledPastThreshold || playlistsMenuOpen;
  const headerClassName = [
    "filmwave-web-header",
    transparentAtTop ? "supports-transparent-header" : "",
    headerIsSolid ? "is-solid" : "is-transparent",
  ]
    .filter(Boolean)
    .join(" ");

  useLayoutEffect(() => {
    let frame = 0;

    function syncScrollState() {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        setScrolledPastThreshold(window.scrollY > HEADER_SCROLL_THRESHOLD);
      });
    }

    if (!transparentAtTop) {
      setScrolledPastThreshold(false);
      return;
    }

    syncScrollState();
    window.addEventListener("scroll", syncScrollState, { passive: true });

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", syncScrollState);
    };
  }, [transparentAtTop]);

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
    setPlaylistsMenuOpen(false);
    setMobileNavOpen(false);
    setMobileAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;

    const previousOverflow = document.body.style.overflow;

    function handleMobileNavEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileNavOpen(false);
    }

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleMobileNavEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleMobileNavEscape);
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    if (mobileNavOpen || !mobileAccountOpen) return;

    const timeout = window.setTimeout(() => {
      setMobileAccountOpen(false);
    }, 180);

    return () => window.clearTimeout(timeout);
  }, [mobileNavOpen, mobileAccountOpen]);

  useEffect(() => {
    let cancelled = false;

    async function loadCuratedPreview() {
      try {
        const res = await fetch("/api/curated-playlists");
        if (!res.ok) return;

        const data = await res.json();
        if (cancelled || !Array.isArray(data)) return;

        setCuratedPreview(
          data
            .filter((playlist) => Boolean(playlist?.cover_image_url))
            .slice(0, 2),
        );
      } catch {
        if (!cancelled) setCuratedPreview([]);
      }
    }

    void loadCuratedPreview();

    return () => {
      cancelled = true;
    };
  }, []);

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

  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase()
    : "";
  const avatarImage = profileImage || user?.imageUrl || null;

  useEffect(() => {
    setAvatarImageFailed(false);
  }, [avatarImage]);

  useLayoutEffect(() => {
    const headerElement = document.querySelector<HTMLElement>(".filmwave-web-header");
    if (!headerElement) return;

    let frame = 0;

    function syncHeaderBottom() {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const bottom = headerElement.getBoundingClientRect().bottom;
        document.documentElement.style.setProperty(
          "--filmwave-web-header-bottom",
          `${Math.max(0, Math.round(bottom))}px`,
        );
      });
    }

    const resizeObserver = new ResizeObserver(syncHeaderBottom);

    syncHeaderBottom();
    resizeObserver.observe(headerElement);
    window.addEventListener("scroll", syncHeaderBottom, { passive: true });
    window.addEventListener("resize", syncHeaderBottom);

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("scroll", syncHeaderBottom);
      window.removeEventListener("resize", syncHeaderBottom);
      document.documentElement.style.removeProperty("--filmwave-web-header-bottom");
    };
  }, []);

  function openPlaylistsMenu() {
    setPlaylistsMenuOpen(true);
  }

  function closePlaylistsMenu() {
    setPlaylistsMenuOpen(false);
  }

  return (
    <>
      <style>{`
        .audioflume-artist-cta-bar {
          position: fixed;
          top: 0;
          right: 0;
          left: 0;
          z-index: var(--filmwave-z-header);
          display: flex;
          box-sizing: border-box;
          width: 100%;
          height: 28px;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          background: #111111;
          padding: 0 24px;
          color: #ffffff;
          font-family: var(--font-aktiv-grotesk), ui-sans-serif, system-ui, sans-serif;
        }

        .audioflume-artist-cta-spacer {
          height: 28px;
          flex: 0 0 28px;
        }

        .audioflume-artist-cta-copy {
          display: inline-flex;
          min-width: 0;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          font-weight: 400;
          letter-spacing: 0.01em;
          line-height: 1;
          white-space: nowrap;
        }

        .audioflume-artist-cta-copy strong {
          font-weight: 500;
        }

        .audioflume-artist-cta-link {
          display: inline-flex;
          flex: 0 0 auto;
          align-items: center;
          gap: 6px;
          color: inherit;
          font-family: var(--font-roboto-mono-filmwave), ui-monospace, monospace;
          font-size: 9px;
          font-weight: 400;
          letter-spacing: 0.06em;
          line-height: 1;
          text-decoration: none;
          text-transform: uppercase;
          white-space: nowrap;
          transition: opacity 150ms ease;
        }

        .audioflume-artist-cta-arrow {
          display: inline-block;
          font-family: var(--font-aktiv-grotesk), ui-sans-serif, system-ui, sans-serif;
          font-size: 1em;
          line-height: 1;
        }

        .audioflume-artist-cta-link:hover,
        .audioflume-artist-cta-link:focus-visible {
          opacity: 0.65;
        }

        :where(html.dark, html[data-theme="dark"]) .audioflume-artist-cta-bar {
          background: #e5e5dd;
          color: #111111;
        }

        @media (max-width: 640px) {
          .audioflume-artist-cta-link {
            font-size: 8px;
          }
        }

        .filmwave-header.filmwave-web-header {
          top: 28px;
        }

        .filmwave-header-tonal-wordmark {
          display: inline-flex !important;
          align-items: center !important;
          color: var(--text-primary) !important;
          font-family: var(--font-aktiv-grotesk), ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
          font-size: 22px !important;
          font-weight: 500 !important;
          letter-spacing: -0.045em !important;
          line-height: 1 !important;
          text-transform: lowercase !important;
          transform: translateY(-1px) !important;
        }

        .filmwave-web-header,
        .filmwave-web-header .filmwave-header-tonal-wordmark,
        .filmwave-web-header .filmwave-header-logo-action,
        .filmwave-web-header .filmwave-header-nav-link,
        .filmwave-web-header .filmwave-header-actions {
          transition:
            background-color 180ms ease,
            border-color 180ms ease,
            color 180ms ease !important;
        }

        .filmwave-web-header .filmwave-header-inner {
          justify-content: flex-start !important;
        }

        .filmwave-web-header .filmwave-header-drag-surface {
          min-width: 38px !important;
          flex: 0 0 38px !important;
        }

        .filmwave-web-header .filmwave-header-actions {
          position: static !important;
          min-width: 0 !important;
          flex: 1 1 auto !important;
          gap: 0 !important;
        }

        .filmwave-web-header .filmwave-header-nav {
          gap: 18px !important;
        }

        .filmwave-web-header .filmwave-header-nav-link {
          padding-right: 8px !important;
          padding-left: 8px !important;
        }
        .filmwave-header-right-actions {
          display: inline-flex;
          height: 100%;
          flex: 0 0 auto;
          align-items: center;
          gap: 34px;
          margin-left: auto;
        }

        .filmwave-header-utility-link {
          display: inline-flex;
          height: var(--filmwave-header-nav-height);
          align-items: center;
          color: inherit;
          font-family: inherit;
          font-size: 12px;
          font-weight: 500;
          line-height: 1;
          text-decoration: none;
          white-space: nowrap;
          transition: opacity 150ms ease;
        }

        .filmwave-header-utility-link:hover,
        .filmwave-header-utility-link:focus-visible {
          opacity: 0.65;
        }

        .filmwave-header-create-account {
          display: inline-flex;
          height: 36px;
          align-items: center;
          justify-content: center;
          background: var(--text-primary);
          color: var(--bg-primary);
          padding: 0 18px;
          font-family: inherit;
          font-size: 11px;
          font-weight: 500;
          line-height: 1;
          text-decoration: none;
          white-space: nowrap;
          transition: opacity 150ms ease;
        }

        .filmwave-header-create-account:hover,
        .filmwave-header-create-account:focus-visible {
          opacity: 0.82;
        }

        .filmwave-header-account-wrap {
          display: inline-flex;
          align-items: center;
        }

        .filmwave-web-header ~ * .filmwave-user-menu-action-icon,
        .filmwave-web-header ~ * .filmwave-user-menu-theme-icon,
        .filmwave-header-menu-wrap .filmwave-user-menu-action-icon,
        .filmwave-header-menu-wrap .filmwave-user-menu-theme-icon {
          color: #777777;
        }

        :where(html.light, html[data-theme="light"])
          .filmwave-web-header ~ *
          .filmwave-user-menu-action-icon,
        :where(html.light, html[data-theme="light"])
          .filmwave-web-header ~ *
          .filmwave-user-menu-theme-icon,
        :where(html.light, html[data-theme="light"])
          .filmwave-header-menu-wrap
          .filmwave-user-menu-action-icon,
        :where(html.light, html[data-theme="light"])
          .filmwave-header-menu-wrap
          .filmwave-user-menu-theme-icon {
          color: #8d8d8d;
        }

        .filmwave-user-menu-action:hover .filmwave-user-menu-action-icon,
        .filmwave-user-menu-action:focus-visible .filmwave-user-menu-action-icon,
        .filmwave-user-menu-theme-action:hover .filmwave-user-menu-theme-icon,
        .filmwave-user-menu-theme-action:focus-visible .filmwave-user-menu-theme-icon,
        .filmwave-user-menu-exit:hover .filmwave-user-menu-action-icon,
        .filmwave-user-menu-exit:focus-visible .filmwave-user-menu-action-icon {
          color: var(--text-primary);
        }

        .filmwave-user-menu-action[href="/account/settings"]
          .filmwave-user-menu-action-icon
          svg {
          width: 14px;
          height: 14px;
        }

        .filmwave-user-menu-action[href="/account/support"]
          .filmwave-user-menu-action-icon
          svg {
          width: 16px;
          height: 16px;
        }

        .filmwave-user-menu-exit .filmwave-user-menu-action-icon svg {
          width: 16px;
          height: 16px;
        }

        .filmwave-web-header.is-transparent {
          --filmwave-chrome-surface: transparent;
          border-bottom-color: rgba(255, 255, 255, 0.12) !important;
          background: transparent !important;
          background-color: transparent !important;
          color: #fff !important;
        }

        .filmwave-web-header.is-transparent .filmwave-header-tonal-wordmark,
        .filmwave-web-header.is-transparent .filmwave-header-logo-action,
        .filmwave-web-header.is-transparent .filmwave-header-actions {
          color: #fff !important;
        }

        .filmwave-web-header.is-transparent .filmwave-header-nav-link {
          color: #fff !important;
        }

        .filmwave-web-header.is-transparent .filmwave-header-create-account {
          background: #fff;
          color: #111;
        }

        .filmwave-web-header.is-transparent:hover
          .filmwave-header-nav-link:not(.is-active):not(:hover) {
          color: var(--text-secondary) !important;
        }

        .filmwave-web-header.is-transparent .filmwave-header-nav-link:hover,
        .filmwave-web-header.is-transparent .filmwave-header-nav-link.is-active {
          background: transparent !important;
          background-color: transparent !important;
          color: var(--text-primary) !important;
        }

        .filmwave-web-header.is-solid,
        :where(html.light, html[data-theme="light"])
          .filmwave-web-header.is-discover-route.is-transparent {
          --filmwave-chrome-surface: var(--bg-primary);
          border-bottom-color: var(--border) !important;
          background: var(--bg-primary) !important;
          background-color: var(--bg-primary) !important;
          color: var(--text-primary) !important;
        }

        .filmwave-web-header.is-solid .filmwave-header-tonal-wordmark,
        .filmwave-web-header.is-solid .filmwave-header-logo-action,
        .filmwave-web-header.is-solid .filmwave-header-actions,
        :where(html.light, html[data-theme="light"])
          .filmwave-web-header.is-discover-route.is-transparent
          .filmwave-header-tonal-wordmark,
        :where(html.light, html[data-theme="light"])
          .filmwave-web-header.is-discover-route.is-transparent
          .filmwave-header-logo-action,
        :where(html.light, html[data-theme="light"])
          .filmwave-web-header.is-discover-route.is-transparent
          .filmwave-header-actions {
          color: var(--text-primary) !important;
        }

        .filmwave-web-header.is-solid .filmwave-header-nav-link,
        :where(html.light, html[data-theme="light"])
          .filmwave-web-header.is-discover-route.is-transparent
          .filmwave-header-nav-link {
          color: var(--text-primary) !important;
        }

        .filmwave-web-header.is-solid:hover
          .filmwave-header-nav-link:not(.is-active):not(:hover),
        :where(html.light, html[data-theme="light"])
          .filmwave-web-header.is-discover-route.is-transparent:hover
          .filmwave-header-nav-link:not(.is-active):not(:hover) {
          color: var(--text-secondary) !important;
        }

        .filmwave-web-header.is-solid .filmwave-header-nav-link:hover,
        .filmwave-web-header.is-solid .filmwave-header-nav-link.is-active,
        :where(html.light, html[data-theme="light"])
          .filmwave-web-header.is-discover-route.is-transparent
          .filmwave-header-nav-link:hover,
        :where(html.light, html[data-theme="light"])
          .filmwave-web-header.is-discover-route.is-transparent
          .filmwave-header-nav-link.is-active {
          background: transparent !important;
          background-color: transparent !important;
          color: var(--text-primary) !important;
        }

        .filmwave-header-nav-item-playlists:hover .filmwave-playlists-mega-menu,
        .filmwave-header-nav-item-playlists:focus-within .filmwave-playlists-mega-menu {
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
          transform: translateY(-4px) !important;
        }

        .filmwave-header-nav-item-playlists.is-open .filmwave-playlists-mega-menu {
          visibility: visible !important;
          opacity: 1 !important;
          pointer-events: auto !important;
          transform: translateY(0) !important;
        }

        .filmwave-web-header .filmwave-header-nav-item-playlists {
          position: static !important;
        }

        .filmwave-playlists-mega-menu {
          position: absolute !important;
          top: 100% !important;
          right: 0 !important;
          left: 0 !important;
          z-index: 2147483000 !important;
          overflow: visible !important;
          border-top: 0 !important;
          border-bottom: 0 !important;
          background: var(--bg-primary) !important;
          padding: 0 !important;
          box-shadow: none !important;
          isolation: isolate !important;
        }

        :where(html.light, html[data-theme="light"]) .filmwave-playlists-mega-menu {
          box-shadow: none !important;
        }

        .filmwave-playlists-mega-menu::after {
          content: "" !important;
          position: absolute !important;
          top: calc(100% - 1px) !important;
          right: 0 !important;
          left: 0 !important;
          z-index: 0 !important;
          display: block !important;
          height: 100vh !important;
          background: rgba(0, 0, 0, 0.48) !important;
          pointer-events: none !important;
        }

        .filmwave-playlists-mega-inner {
          position: relative !important;
          z-index: 1 !important;
          box-sizing: border-box !important;
          width: 100% !important;
          grid-template-columns: minmax(280px, 1fr) max-content !important;
          justify-content: stretch !important;
          gap: 44px !important;
          background: var(--bg-primary) !important;
        }

        .filmwave-playlists-mega-feature-grid {
          --filmwave-playlists-mega-card-width: clamp(280px, 24vw, 390px);
          order: 2 !important;
          grid-template-columns: repeat(
            2,
            var(--filmwave-playlists-mega-card-width)
          ) !important;
          gap: 18px !important;
          align-items: start !important;
        }

        .filmwave-playlists-mega-feature {
          position: relative !important;
          display: block !important;
          min-height: 0 !important;
          overflow: visible !important;
          border: 0 !important;
          background: transparent !important;
          color: inherit !important;
        }

        .filmwave-playlists-mega-feature:hover {
          border-color: transparent !important;
        }

        .filmwave-playlists-mega-feature-image {
          position: relative !important;
          inset: auto !important;
          display: block !important;
          width: 100% !important;
          height: auto !important;
          aspect-ratio: 16 / 9 !important;
          overflow: hidden !important;
          background: var(--bg-secondary) !important;
        }

        .filmwave-playlists-mega-feature-image::after {
          content: none !important;
          display: none !important;
        }

        .filmwave-playlists-mega-feature-copy {
          position: static !important;
          display: flex !important;
          margin-top: 10px !important;
          gap: 0 !important;
          color: inherit !important;
        }

        .filmwave-playlists-mega-feature-title {
          color: var(--text-primary) !important;
          font-size: 13.5px !important;
          font-weight: 500 !important;
          letter-spacing: 0 !important;
          line-height: 1.25 !important;
        }

        .filmwave-playlists-mega-feature-detail {
          margin-top: 4px !important;
          color: var(--text-muted) !important;
          font-size: 11.5px !important;
          font-weight: 400 !important;
          line-height: 1.45 !important;
        }

        .filmwave-playlists-mega-content {
          display: flex !important;
          width: 100% !important;
          order: 1 !important;
          align-self: stretch !important;
          align-items: center !important;
          transform: translateY(-24px) !important;
        }

        .filmwave-playlists-mega-link-column,
        .filmwave-playlists-mega-links {
          width: 100% !important;
        }

        .filmwave-playlists-mega-links {
          margin-top: 0 !important;
        }

        .filmwave-playlists-mega-page-link {
          position: relative !important;
          width: 100% !important;
          padding-right: 30px !important;
          text-decoration: none !important;
        }

        .filmwave-playlists-mega-page-link::after {
          content: "↗";
          position: absolute;
          top: 50%;
          right: 0;
          color: var(--text-primary);
          font-size: 12px;
          font-weight: 500;
          line-height: 1;
          transform: translateY(-50%);
          transition: transform 150ms ease;
        }

        .filmwave-playlists-mega-page-link:hover,
        .filmwave-playlists-mega-page-link:focus-visible,
        .filmwave-playlists-mega-page-link:hover span,
        .filmwave-playlists-mega-page-link:focus-visible span {
          text-decoration: none !important;
        }

        .filmwave-playlists-mega-page-link:hover::after,
        .filmwave-playlists-mega-page-link:focus-visible::after {
          transform: translate(2px, calc(-50% - 2px));
        }

        @media (max-width: 1000px) {
          .filmwave-playlists-mega-inner {
            grid-template-columns: max-content !important;
            gap: 24px !important;
          }

          .filmwave-playlists-mega-content {
            align-self: start !important;
            transform: none !important;
          }

          .filmwave-web-header .filmwave-header-drag-surface {
            min-width: 20px !important;
            flex-basis: 20px !important;
          }

          .filmwave-web-header .filmwave-header-nav {
            gap: 8px !important;
          }

          .filmwave-header-right-actions {
            gap: 18px;
          }
        }

        .filmwave-mobile-nav-toggle,
        .filmwave-mobile-nav-panel {
          display: none;
        }

        @media (max-width: 690px) {
          .filmwave-web-header .filmwave-header-inner {
            padding-right: var(--filmwave-header-padding-x) !important;
          }

          .filmwave-web-header .filmwave-header-nav {
            display: none !important;
          }

          .filmwave-web-header .filmwave-header-right-actions {
            display: inline-flex !important;
            gap: 0;
            margin-left: 6px;
          }

          .filmwave-web-header
            .filmwave-header-right-actions
            > :not(.filmwave-header-account-wrap) {
            display: none !important;
          }

          .filmwave-web-header .filmwave-header-drag-surface {
            min-width: 16px !important;
            flex-basis: 16px !important;
          }

          .filmwave-mobile-nav-toggle {
            display: inline-flex;
            width: 44px;
            height: 44px;
            flex: 0 0 44px;
            align-items: center;
            justify-content: center;
            margin-left: auto;
            border: 0;
            background: transparent;
            padding: 0;
            color: inherit;
            cursor: pointer;
          }

          .filmwave-mobile-nav-toggle svg {
            width: 22px;
            height: 22px;
            fill: none;
            stroke: currentColor;
            stroke-width: 1.5;
            stroke-linecap: round;
          }

          .filmwave-mobile-nav-panel {
            position: fixed;
            top: var(
              --filmwave-web-header-bottom,
              calc(28px + var(--filmwave-header-height, 75px))
            );
            right: 0;
            bottom: 0;
            left: 0;
            z-index: calc(var(--filmwave-z-header) - 1);
            display: flex;
            flex-direction: column;
            overflow-y: auto;
            background: var(--bg-primary);
            color: var(--text-primary);
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
            transform: translateX(-100%);
            transition:
              transform 180ms ease,
              opacity 140ms ease,
              visibility 0s linear 180ms;
          }

          .filmwave-mobile-nav-panel.is-open {
            opacity: 1;
            visibility: visible;
            pointer-events: auto;
            transform: translateX(0);
            transition:
              transform 180ms ease,
              opacity 140ms ease,
              visibility 0s linear 0s;
          }

          .filmwave-mobile-nav-panel a {
            display: flex;
            min-height: 60px;
            align-items: center;
            border-bottom: var(--filmwave-border-width) solid var(--border);
            padding: 0 20px;
            color: inherit;
            font-size: 18px;
            font-weight: 400;
            text-decoration: none;
          }

          .filmwave-mobile-nav-panel .filmwave-mobile-nav-secondary {
            font-size: 18px;
          }

          .filmwave-mobile-nav-account-trigger,
          .filmwave-mobile-nav-account-back {
            display: flex;
            width: 100%;
            min-height: 60px;
            flex: 0 0 auto;
            align-items: center;
            border: 0;
            border-bottom: var(--filmwave-border-width) solid var(--border);
            background: transparent;
            padding: 0 20px;
            color: inherit;
            font-family: inherit;
            font-size: 18px;
            font-weight: 400;
            text-align: left;
            cursor: pointer;
          }

          .filmwave-mobile-nav-account-trigger {
            gap: 12px;
          }

          .filmwave-mobile-nav-account-avatar {
            display: inline-flex;
            width: 32px;
            height: 32px;
            flex: 0 0 32px;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            border-radius: 999px;
            background: #808080;
            color: #ffffff;
            font-size: 11px;
            font-weight: 500;
          }

          .filmwave-mobile-nav-account-avatar img {
            display: block;
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .filmwave-mobile-account-menu {
            min-height: 0;
            overflow-y: auto;
          }

          .filmwave-mobile-account-menu
            .filmwave-dropdown-shell.filmwave-user-menu.filmwave-web-user-menu {
            width: 100%;
            border: 0;
            background: var(--bg-primary);
            padding: 0;
            box-shadow: none;
          }

          .filmwave-mobile-account-menu
            .filmwave-web-user-menu
            > .filmwave-user-menu-profile-link {
            min-height: 0;
            border-bottom: 1.25px solid var(--filmwave-menu-sep);
            padding: 0;
            font-size: inherit;
          }

          .filmwave-mobile-account-menu
            .filmwave-web-user-menu
            .filmwave-user-menu-profile {
            min-height: 84px;
            gap: 14px;
            padding: 16px 20px;
          }

          .filmwave-mobile-account-menu
            .filmwave-web-user-menu
            .filmwave-user-menu-avatar {
            width: 44px;
            height: 44px;
            flex-basis: 44px;
          }

          .filmwave-mobile-account-menu
            .filmwave-web-user-menu
            .filmwave-user-menu-name {
            font-size: 18px;
          }

          .filmwave-mobile-account-menu
            .filmwave-web-user-menu
            .filmwave-user-menu-email {
            font-size: 14px;
          }

          .filmwave-mobile-account-menu
            .filmwave-web-user-menu
            .filmwave-user-menu-actions {
            padding: 0;
          }

          .filmwave-mobile-account-menu
            .filmwave-web-user-menu
            .filmwave-dropdown-item {
            height: 60px;
            min-height: 60px;
            border-bottom: 0;
            padding-right: 20px;
            padding-left: 20px;
            font-size: 18px;
            font-weight: 400;
            line-height: normal;
          }

          .filmwave-mobile-account-menu
            .filmwave-web-user-menu-new-project {
            border-bottom: 1.25px solid var(--filmwave-menu-sep);
          }

          .filmwave-mobile-account-menu
            .filmwave-web-user-menu
            .filmwave-web-user-menu-new-project-button {
            min-height: 72px;
            padding: 0 20px;
          }

          .filmwave-mobile-account-menu
            .filmwave-web-user-menu
            .filmwave-user-menu-library-section,
          .filmwave-mobile-account-menu
            .filmwave-web-user-menu
            .filmwave-web-user-menu-account-section,
          .filmwave-mobile-account-menu
            .filmwave-web-user-menu
            .filmwave-user-menu-signout {
            border-top: 0;
            border-bottom: 1.25px solid var(--filmwave-menu-sep);
          }

          .filmwave-mobile-account-menu
            .filmwave-web-user-menu
            .filmwave-user-menu-signout {
            border-bottom: 0;
          }

          .filmwave-mobile-account-menu
            .filmwave-web-user-menu
            .filmwave-user-menu-theme-value {
            font-size: 14px;
          }

          .filmwave-mobile-nav-panel .filmwave-mobile-nav-create {
            margin: 20px;
            min-height: 48px;
            justify-content: center;
            border: 0;
            background: var(--text-primary);
            color: var(--bg-primary);
            font-size: 13px;
            font-weight: 500;
          }
        }
      `}</style>

      <div className="audioflume-artist-cta-spacer" aria-hidden="true" />
      <div className="audioflume-artist-cta-bar">
        <div className="audioflume-artist-cta-copy">
          <span>Join Audioflume as a founding artist — Apply today</span>
        </div>
        <Link href="/artists/apply" className="audioflume-artist-cta-link">
          <span>ARTIST APPLICATIONS</span>
          <span className="audioflume-artist-cta-arrow" aria-hidden="true">↗</span>
        </Link>
      </div>

      <HeaderShell
        className={headerClassName}
        logo={
          <Link
            href="/"
            className="filmwave-header-logo-action"
            aria-label="audioflume Home"
          >
            <span className="filmwave-header-tonal-wordmark">audioflume</span>
          </Link>
        }
        actions={
          <>
            <nav className="filmwave-header-nav" aria-label="Primary navigation">
              {TOP_NAV_LINKS.map((link) => {
                const isActive = playlistNavIsActive(pathname, link.href);

                if (link.href === "/playlists") {
                  return (
                    <div
                      key={link.href}
                      className={`filmwave-header-nav-item filmwave-header-nav-item-playlists${playlistsMenuOpen ? " is-open" : ""}`}
                      onMouseEnter={openPlaylistsMenu}
                      onMouseLeave={closePlaylistsMenu}
                      onFocus={openPlaylistsMenu}
                      onBlur={(event) => {
                        if (
                          !event.currentTarget.contains(event.relatedTarget)
                        ) {
                          closePlaylistsMenu();
                        }
                      }}
                    >
                      <Link
                        href="/curated-playlists"
                        className={`filmwave-header-nav-link${isActive ? " is-active" : ""}`}
                        aria-current={isActive ? "page" : undefined}
                        aria-haspopup="menu"
                        aria-expanded={playlistsMenuOpen}
                        onClick={closePlaylistsMenu}
                      >
                        {link.label}
                      </Link>

                      <div
                        className="filmwave-playlists-mega-menu"
                        role="menu"
                        aria-label="Playlist navigation"
                        onMouseEnter={openPlaylistsMenu}
                        onMouseLeave={closePlaylistsMenu}
                      >
                        <div className="filmwave-playlists-mega-inner">
                          <div
                            className="filmwave-playlists-mega-feature-grid"
                            aria-label="Featured curated playlists"
                          >
                            {curatedPreview.length > 0 ? (
                              curatedPreview.map((playlist) => {
                                const href = `/curated-playlists/${playlist.id}`;

                                return (
                                  <div
                                    key={playlist.id}
                                    className="filmwave-playlists-mega-feature"
                                  >
                                    <div className={cardStyles.card}>
                                      <Link
                                        href={href}
                                        className={cardStyles.imageLink}
                                        role="menuitem"
                                        onClick={closePlaylistsMenu}
                                      >
                                        <div
                                          className={`${cardStyles.image} filmwave-playlists-mega-feature-image`}
                                        >
                                          {playlist.cover_image_url && (
                                            <img
                                              src={playlist.cover_image_url}
                                              alt={playlist.name}
                                              className={cardStyles.media}
                                            />
                                          )}
                                        </div>
                                      </Link>

                                      <CuratedPlaylistPlayButton
                                        playlistId={playlist.id}
                                        playlistName={playlist.name}
                                        className={cardStyles.playButton}
                                      />
                                    </div>

                                    <Link
                                      href={href}
                                      className="filmwave-playlists-mega-feature-copy"
                                      onClick={closePlaylistsMenu}
                                    >
                                      <span className="filmwave-playlists-mega-feature-title">
                                        {playlist.name}
                                      </span>
                                      <span className="filmwave-playlists-mega-feature-detail">
                                        {formatTrackCount(playlist.song_count)}
                                      </span>
                                    </Link>
                                  </div>
                                );
                              })
                            ) : (
                              PLAYLIST_QUICK_SECTIONS.map((section) => (
                                <Link
                                  key={section.href}
                                  href={section.href}
                                  className="filmwave-playlists-mega-feature is-placeholder"
                                  role="menuitem"
                                  onClick={closePlaylistsMenu}
                                >
                                  <span className="filmwave-playlists-mega-feature-image" />
                                  <span className="filmwave-playlists-mega-feature-copy">
                                    <span className="filmwave-playlists-mega-feature-title">
                                      {section.title}
                                    </span>
                                    <span className="filmwave-playlists-mega-feature-detail">
                                      0 tracks
                                    </span>
                                  </span>
                                </Link>
                              ))
                            )}
                          </div>

                          <div className="filmwave-playlists-mega-content">
                            <div className="filmwave-playlists-mega-link-column">
                              <div className="filmwave-playlists-mega-links">
                                {PLAYLIST_PAGE_LINKS.map((pageLink) => (
                                  <Link
                                    key={pageLink.href}
                                    href={pageLink.href}
                                    className="filmwave-playlists-mega-page-link"
                                    role="menuitem"
                                    onClick={closePlaylistsMenu}
                                  >
                                    <span>{pageLink.label}</span>
                                    <small>{pageLink.detail}</small>
                                  </Link>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`filmwave-header-nav-link${isActive ? " is-active" : ""}`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            <button
              type="button"
              className="filmwave-mobile-nav-toggle"
              aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={mobileNavOpen}
              onClick={() => {
                setMobileNavOpen((open) => !open);
              }}
            >
              {mobileNavOpen ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6L18 18M18 6L6 18" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 7H20M4 12H20M4 17H20" />
                </svg>
              )}
            </button>

            {isLoaded && (
              <div className="filmwave-header-right-actions">
                <Link href="/pricing" className="filmwave-header-utility-link">
                  Pricing
                </Link>

                <a
                  href="mailto:hello@filmwave.io"
                  className="filmwave-header-utility-link"
                >
                  Need Enterprise?
                </a>

                {user ? (
                  <>
                    <div className="filmwave-header-account-wrap" ref={menuRef}>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.matchMedia("(max-width: 690px)").matches) {
                            setMenuOpen(false);
                            setMobileNavOpen(true);
                            setMobileAccountOpen(true);
                            return;
                          }

                          setMenuOpen((prev) => !prev);
                        }}
                        className={`filmwave-header-account-trigger${menuOpen ? " is-open" : ""}`}
                        aria-label="Open user menu"
                        aria-expanded={menuOpen || mobileAccountOpen}
                      >
                        <span
                          className="filmwave-header-avatar"
                          style={{
                            backgroundColor:
                              avatarImage && !avatarImageFailed
                                ? "transparent"
                                : "#808080",
                          }}
                        >
                          {avatarImage && !avatarImageFailed ? (
                            <img
                              src={avatarImage}
                              alt="Profile"
                              onError={() => setAvatarImageFailed(true)}
                            />
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
                  </>
                ) : (
                  <>
                    <Link href="/sign-in" className="filmwave-header-utility-link">
                      Login
                    </Link>
                    <Link href="/sign-up" className="filmwave-header-create-account">
                      Create Free Account
                    </Link>
                  </>
                )}
              </div>
            )}
          </>
        }
      />

      <nav
        className={`filmwave-mobile-nav-panel${mobileNavOpen ? " is-open" : ""}`}
        aria-label="Mobile navigation"
        aria-hidden={!mobileNavOpen}
      >
          {mobileAccountOpen && user ? (
            <>
              <div className="filmwave-mobile-account-menu">
                <UserMenu
                  onClose={() => {
                    setMobileNavOpen(false);
                  }}
                />
              </div>
            </>
          ) : (
            <>
              {TOP_NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href === "/playlists" ? "/curated-playlists" : link.href}
                  onClick={() => setMobileNavOpen(false)}
                >
                  {link.label}
                </Link>
              ))}

              <Link
                href="/pricing"
                className="filmwave-mobile-nav-secondary"
                onClick={() => setMobileNavOpen(false)}
              >
                Pricing
              </Link>

              <a
                href="mailto:hello@filmwave.io"
                className="filmwave-mobile-nav-secondary"
                onClick={() => setMobileNavOpen(false)}
              >
                Need Enterprise?
              </a>

              {isLoaded && !user ? (
                <>
                  <Link
                    href="/sign-in"
                    className="filmwave-mobile-nav-secondary"
                    onClick={() => setMobileNavOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    href="/sign-up"
                    className="filmwave-mobile-nav-create"
                    onClick={() => setMobileNavOpen(false)}
                  >
                    Create Free Account
                  </Link>
                </>
              ) : null}
            </>
          )}
        </nav>
    </>
  );
}
