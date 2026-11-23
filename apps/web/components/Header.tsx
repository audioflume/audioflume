"use client";

import { HeaderShell } from "@filmwave/shared";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useAccountSession } from "@/context/AccountSessionContext";
import CuratedPlaylistPlayButton from "@/components/curated/CuratedPlaylistPlayButton";
import CuratedPlaylistBookmarkButton from "@/components/curated/CuratedPlaylistBookmarkButton";
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
  const { user, isLoaded, provider } = useAccountSession();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileAccountOpen, setMobileAccountOpen] = useState(false);
  const [playlistsMenuOpen, setPlaylistsMenuOpen] = useState(false);
  const [playlistsMenuMounted, setPlaylistsMenuMounted] = useState(false);
  const playlistsMenuCloseTimeoutRef = useRef<number | null>(null);
  const playlistsMenuOpenFrameRef = useRef<number | null>(null);
  const playlistsTriggerRef = useRef<HTMLAnchorElement>(null);
  const playlistsMenuEscapeDismissedRef = useRef(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [avatarImageFailed, setAvatarImageFailed] = useState(false);
  const [scrolledPastThreshold, setScrolledPastThreshold] = useState(false);
  const [curatedPreview, setCuratedPreview] = useState<
    CuratedPlaylistPreview[]
  >([]);
  const menuRef = useRef<HTMLDivElement>(null);
  const accountTriggerRef = useRef<HTMLButtonElement>(null);
  const isBackendPage = pathname === "/admin" || pathname?.startsWith("/admin/") || pathname === "/artists/dashboard" || pathname?.startsWith("/artists/dashboard/") || pathname === "/account" || pathname?.startsWith("/account/");
  const useCombinedHeaderHeight = isBackendPage || (
    pathname === "/" ||
    pathname === "/discover" ||
    pathname === "/discover2" ||
    pathname === "/artist2" ||
    pathname === "/music" ||
    pathname === "/artists" ||
    pathname?.startsWith("/artists/") ||
    pathname === "/curated-playlists" ||
    pathname?.startsWith("/curated-playlists/") ||
    pathname === "/community-playlists" ||
    pathname === "/pricing" ||
    pathname === "/sound-fx" ||
    pathname === "/playlists" ||
    pathname?.startsWith("/playlists/")
  );
  const homeChromeRoute = pathname === "/" || pathname === "/discover" || pathname === "/curated-playlists" || pathname === "/community-playlists" || pathname === "/artists" || pathname === "/pricing";
  const transparentAtTop = pathname === "/founding-artists";
  const headerIsSolid =
    !transparentAtTop || scrolledPastThreshold || playlistsMenuOpen || mobileNavOpen || mobileAccountOpen;
  const headerClassName = [
    "filmwave-web-header",
    useCombinedHeaderHeight ? "is-editorial-header" : "",
    pathname === "/founding-artists" ? "is-founding-route" : "",
    transparentAtTop ? "supports-transparent-header" : "",
    headerIsSolid ? "is-solid" : "is-transparent",
    mobileNavOpen ? "has-open-mobile-nav" : "",
    homeChromeRoute && scrolledPastThreshold ? "is-home-scrolled" : "",
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

    if (!transparentAtTop && !homeChromeRoute) {
      setScrolledPastThreshold(false);
      return;
    }

    syncScrollState();
    window.addEventListener("scroll", syncScrollState, { passive: true });

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", syncScrollState);
    };
  }, [transparentAtTop, homeChromeRoute, pathname]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleMenuEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setMenuOpen(false);
      window.requestAnimationFrame(() => accountTriggerRef.current?.focus());
    }

    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleMenuEscape, true);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleMenuEscape, true);
    };
  }, [menuOpen]);

  useEffect(() => {
    setPlaylistsMenuOpen(false);
    setPlaylistsMenuMounted(false);
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
  const avatarImage = provider === "supabase"
    ? (user?.imageUrl || profileImage || null)
    : (profileImage || user?.imageUrl || null);

  useEffect(() => {
    setAvatarImageFailed(false);
  }, [avatarImage]);

  useLayoutEffect(() => {
    const headerElement = document.querySelector<HTMLElement>(".filmwave-web-header");
    if (!headerElement) return;

    let frame = 0;

    function updateHeaderBottom() {
      if (!headerElement) return;
      const bottom = headerElement.getBoundingClientRect().bottom;
      document.documentElement.style.setProperty(
        "--filmwave-web-header-bottom",
        `${Math.max(0, Math.round(bottom))}px`,
      );
    }

    function syncHeaderBottom() {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(updateHeaderBottom);
    }

    const resizeObserver = new ResizeObserver(syncHeaderBottom);

    // Set the offset before paint so backend sidebars do not jump on hydration.
    updateHeaderBottom();
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

  useEffect(() => {
    return () => {
      if (playlistsMenuOpenFrameRef.current != null) {
        window.cancelAnimationFrame(playlistsMenuOpenFrameRef.current);
      }
      if (playlistsMenuCloseTimeoutRef.current != null) {
        window.clearTimeout(playlistsMenuCloseTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!playlistsMenuOpen) return;

    function handlePlaylistsEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      playlistsMenuEscapeDismissedRef.current = true;
      closePlaylistsMenu();
      window.requestAnimationFrame(() => playlistsTriggerRef.current?.focus());
    }

    document.addEventListener("keydown", handlePlaylistsEscape, true);
    return () =>
      document.removeEventListener("keydown", handlePlaylistsEscape, true);
  }, [playlistsMenuOpen]);

  function openPlaylistsMenu() {
    if (playlistsMenuEscapeDismissedRef.current) {
      playlistsMenuEscapeDismissedRef.current = false;
      return;
    }

    if (playlistsMenuCloseTimeoutRef.current != null) {
      window.clearTimeout(playlistsMenuCloseTimeoutRef.current);
      playlistsMenuCloseTimeoutRef.current = null;
    }

    setPlaylistsMenuMounted(true);

    if (playlistsMenuOpenFrameRef.current != null) {
      window.cancelAnimationFrame(playlistsMenuOpenFrameRef.current);
    }

    playlistsMenuOpenFrameRef.current = window.requestAnimationFrame(() => {
      playlistsMenuOpenFrameRef.current = window.requestAnimationFrame(() => {
        playlistsMenuOpenFrameRef.current = null;
        setPlaylistsMenuOpen(true);
      });
    });
  }

  function closePlaylistsMenu() {
    if (playlistsMenuOpenFrameRef.current != null) {
      window.cancelAnimationFrame(playlistsMenuOpenFrameRef.current);
      playlistsMenuOpenFrameRef.current = null;
    }

    setPlaylistsMenuOpen(false);

    if (playlistsMenuCloseTimeoutRef.current != null) {
      window.clearTimeout(playlistsMenuCloseTimeoutRef.current);
    }

    playlistsMenuCloseTimeoutRef.current = window.setTimeout(() => {
      playlistsMenuCloseTimeoutRef.current = null;
      setPlaylistsMenuMounted(false);
    }, 150);
  }

  function schedulePlaylistsMenuClose() {
    if (playlistsMenuOpenFrameRef.current != null) {
      window.cancelAnimationFrame(playlistsMenuOpenFrameRef.current);
      playlistsMenuOpenFrameRef.current = null;
    }

    if (playlistsMenuCloseTimeoutRef.current != null) {
      window.clearTimeout(playlistsMenuCloseTimeoutRef.current);
    }

    playlistsMenuCloseTimeoutRef.current = window.setTimeout(() => {
      setPlaylistsMenuOpen(false);

      playlistsMenuCloseTimeoutRef.current = window.setTimeout(() => {
        playlistsMenuCloseTimeoutRef.current = null;
        setPlaylistsMenuMounted(false);
      }, 150);
    }, 120);
  }

  if (pathname === "/lab/dual-sidebar") return null;

  return (
    <>
      <style>{`
        .audioflume-artist-cta-bar {
          position: relative;
          z-index: var(--filmwave-z-header);
          display: flex;
          box-sizing: border-box;
          width: 100%;
          height: var(--audioflume-cta-bar-height, 37px);
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          background: var(--audioflume-home-cta-background, #111111);
          transition: background-color 180ms ease;
          padding: 0 24px;
          color: #e5e5df;
          font-family: var(--font-aktiv-grotesk), ui-sans-serif, system-ui, sans-serif;
        }

        .audioflume-artist-cta-copy {
          display: inline-flex;
          min-width: 0;
          align-items: center;
          gap: 8px;
          font-size: var(--audioflume-cta-copy-size, 11px);
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
          font-size: var(--audioflume-cta-link-size, 9px);
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

        @media (max-width: 640px) {
          .audioflume-artist-cta-link {
            font-size: 8px;
          }
        }

        .filmwave-header-audioflume-logo {
          display: block;
          width: auto;
          height: 24px;
          flex: 0 0 auto;
          fill: currentColor;
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
          padding-left: var(--audioflume-reference-header-logo-inset, var(--filmwave-header-padding-x));
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
          position: static;
          left: auto;
          right: auto;
          top: auto;
          height: auto;
          justify-content: flex-start;
          gap: var(--audioflume-reference-nav-gap, 18px) !important;
          pointer-events: auto;
          transform: none;
        }

        .filmwave-web-header .filmwave-header-nav > * {
          pointer-events: auto;
        }

        .filmwave-web-header .filmwave-header-nav-link {
          gap: var(--audioflume-reference-nav-link-gap, 12px) !important;
          padding-right: var(--audioflume-reference-nav-link-padding, 8px) !important;
          padding-left: var(--audioflume-reference-nav-link-padding, 8px) !important;
          font-family: var(--font-aktiv-grotesk), sans-serif !important;
          font-size: var(--audioflume-reference-nav-font-size, 13px) !important;
          font-weight: var(--audioflume-reference-nav-font-weight, 500) !important;
          text-transform: none !important;
          transition: opacity 150ms ease !important;
        }

        .filmwave-web-header .filmwave-header-nav-link:hover,
        .filmwave-web-header .filmwave-header-nav-link:focus-visible {
          opacity: 0.65;
        }

        .filmwave-header-playlists-chevron {
          display: block;
          width: 14px;
          height: 14px;
          flex: 0 0 14px;
          fill: none;
          stroke: currentColor;
          stroke-width: 2;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .filmwave-header-new-badge {
          display: inline-flex;
          height: 21px;
          align-items: center;
          border-radius: 999px;
          background: var(--text-primary);
          padding: 0 11px;
          color: var(--bg-primary);
          font-size: 10px;
          font-weight: 400;
          line-height: 1;
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
          font-size: var(--audioflume-reference-nav-font-size, 12px);
          font-weight: var(--audioflume-reference-nav-font-weight, 500);
          line-height: 1;
          text-decoration: none;
          white-space: nowrap;
          transition: opacity 150ms ease;
        }

        .filmwave-web-header:not(.is-transparent) .filmwave-header-utility-link:hover,
        .filmwave-web-header:not(.is-transparent) .filmwave-header-utility-link:focus-visible {
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
          position: relative;
          display: inline-flex;
          align-items: center;
        }

        .filmwave-web-header .filmwave-header-menu-wrap {
          top: calc(100% + 8px);
          right: 0;
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
          --filmwave-transparent-header-text: #fff;
          --filmwave-transparent-header-hover-text: var(--text-primary);
          --filmwave-transparent-header-muted-text: var(--text-secondary);
        }

        .filmwave-web-header.is-founding-route.is-transparent {
          --filmwave-transparent-header-text: #e5e5df;
          --filmwave-transparent-header-hover-text: #e5e5df;
          --filmwave-transparent-header-muted-text: #e5e5df;
        }

        .filmwave-web-header.is-transparent {
          border-bottom-color: transparent !important;
          background: transparent !important;
          background-color: transparent !important;
          color: var(--filmwave-transparent-header-text) !important;
        }

        .filmwave-web-header.is-transparent .filmwave-header-tonal-wordmark,
        .filmwave-web-header.is-transparent .filmwave-header-logo-action,
        .filmwave-web-header.is-transparent .filmwave-header-actions {
          color: var(--filmwave-transparent-header-text) !important;
        }

        .filmwave-web-header.is-transparent .filmwave-header-nav-link {
          color: var(--filmwave-transparent-header-text) !important;
        }

        .filmwave-web-header.is-transparent .filmwave-header-create-account {
          background: #fff;
          color: #111;
        }

        .filmwave-web-header.is-transparent .filmwave-header-nav-link:hover,
        .filmwave-web-header.is-transparent .filmwave-header-nav-link.is-active {
          background: transparent !important;
          background-color: transparent !important;
          color: var(--filmwave-transparent-header-hover-text) !important;
        }

        .filmwave-web-header.is-solid,
        :where(html.light, html[data-theme="light"])
          .filmwave-web-header.is-discover-route.is-transparent {
          --filmwave-chrome-surface: var(--audioflume-home-header-background, var(--bg-primary));
          border-bottom-color: var(--audioflume-home-header-border, var(--border)) !important;
          background: var(--audioflume-home-header-background, var(--bg-primary)) !important;
          background-color: var(--audioflume-home-header-background, var(--bg-primary)) !important;
          color: var(--audioflume-home-header-text, var(--text-primary)) !important;
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
          color: var(--audioflume-home-header-text, var(--text-primary)) !important;
        }

        .filmwave-web-header.is-solid .filmwave-header-nav-link,
        :where(html.light, html[data-theme="light"])
          .filmwave-web-header.is-discover-route.is-transparent
          .filmwave-header-nav-link {
          color: var(--audioflume-home-header-text, var(--text-primary)) !important;
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
          color: var(--audioflume-home-header-text, var(--text-primary)) !important;
        }

        .filmwave-header-nav-item-playlists.is-mounted .filmwave-playlists-mega-menu {
          display: block !important;
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
          display: none !important;
          overflow: visible !important;
          border-top: 0 !important;
          border-bottom: 0 !important;
          background: var(--bg-primary) !important;
          padding: 0 !important;
          box-shadow: none !important;
          isolation: isolate !important;
          transition:
            opacity 150ms ease,
            visibility 150ms ease,
            transform 150ms ease !important;
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

        .filmwave-playlists-mega-feature-card {
          position: relative;
          width: 100%;
          min-width: 0;
          overflow: hidden;
        }

        .filmwave-playlists-mega-feature-image-link {
          display: block;
          color: inherit;
          text-decoration: none;
        }

        .filmwave-playlists-mega-feature-shade {
          position: absolute;
          inset: 0;
          z-index: 1;
          background: linear-gradient(180deg, rgba(0, 0, 0, 0.02) 42%, rgba(0, 0, 0, 0.58) 100%);
          pointer-events: none;
        }

        .filmwave-playlists-mega-feature-name {
          position: absolute;
          right: 60px;
          bottom: 20px;
          left: 20px;
          z-index: 2;
          overflow: hidden;
          color: #ffffff;
          font-size: 18px;
          font-weight: 400;
          letter-spacing: -0.035em;
          line-height: 1.05;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .filmwave-playlists-mega-feature-bookmark {
          position: absolute;
          top: 18px;
          right: 18px;
          z-index: 3;
          display: inline-flex;
          width: 24px;
          height: 24px;
          align-items: center;
          justify-content: center;
          border: 0;
          background: transparent;
          padding: 0;
          color: #ffffff;
          cursor: pointer;
          opacity: 0;
          transition: opacity 150ms ease;
        }

        .filmwave-playlists-mega-feature-card:hover .filmwave-playlists-mega-feature-bookmark,
        .filmwave-playlists-mega-feature-card:focus-within .filmwave-playlists-mega-feature-bookmark,
        .filmwave-playlists-mega-feature-bookmark[aria-pressed="true"] {
          opacity: 1;
        }

        .filmwave-playlists-mega-feature-play {
          position: absolute !important;
          right: 16px !important;
          bottom: 16px !important;
          z-index: 3 !important;
          display: grid !important;
          width: 34px !important;
          min-width: 34px !important;
          height: 34px !important;
          place-items: center !important;
          margin: 0 !important;
          border: 0 !important;
          border-radius: 999px !important;
          background: rgba(255, 255, 255, 0.18) !important;
          color: #e5e5df !important;
          opacity: 1 !important;
          -webkit-backdrop-filter: blur(10px);
          backdrop-filter: blur(10px);
          transition: background-color 150ms ease, color 150ms ease, transform 150ms ease;
        }

        .filmwave-playlists-mega-feature-play:hover,
        .filmwave-playlists-mega-feature-play:focus-visible {
          background: #ffffff !important;
          color: #111111 !important;
          transform: scale(1.02);
        }

        .filmwave-playlists-mega-feature-play svg {
          width: 13px !important;
          height: 13px !important;
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
            gap: var(--audioflume-reference-nav-compact-gap, 8px) !important;
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
          .filmwave-web-header.has-open-mobile-nav {
            z-index: calc(var(--filmwave-z-header) + 3) !important;
          }

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
              var(--filmwave-top-chrome-initial-bottom)
            );
            right: 0;
            bottom: 0;
            left: 0;
            z-index: calc(var(--filmwave-z-header) + 2);
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

      {!isBackendPage && !useCombinedHeaderHeight && <div className={`audioflume-artist-cta-bar${transparentAtTop && !headerIsSolid ? " is-home-transparent" : ""}`}>
        <div className="audioflume-artist-cta-copy">
          <span>Join Audioflume as a founding artist — Apply today</span>
        </div>
        <Link href="/founding-artists" className="audioflume-artist-cta-link">
          <span>ARTIST APPLICATIONS</span>
          <span className="audioflume-artist-cta-arrow" aria-hidden="true">↗</span>
        </Link>
      </div>}

      <HeaderShell
        className={headerClassName}
        logo={
          <Link
            href="/"
            className="filmwave-header-logo-action"
            aria-label="audioflume Home"
          >
            <svg className="filmwave-header-audioflume-logo" viewBox="0 0 219.27 40.57" aria-hidden="true">
              <g>
                <path d="M11.9,24.5c0-1.28.27-2.32.81-3.15.54-.82,1.27-1.47,2.19-1.93.92-.47,1.96-.8,3.11-1.01,1.15-.21,2.34-.34,3.57-.39l3.17-.11v-.74c0-1.5-.32-2.57-.96-3.22-.64-.65-1.67-.98-3.09-.98s-2.39.23-3.05.7c-.66.47-1.09,1.12-1.29,1.95l-3.5-.37c.34-1.79,1.18-3.1,2.52-3.94,1.34-.83,3.16-1.25,5.47-1.25,2.77,0,4.74.64,5.91,1.93,1.16,1.29,1.75,3.11,1.75,5.47v12.29h-3.68v-2.47c-.71.81-1.58,1.5-2.61,2.06-1.03.56-2.29.85-3.79.85-1.94,0-3.51-.48-4.71-1.44-1.2-.96-1.8-2.38-1.8-4.27ZM15.73,24.35c0,.88.27,1.59.81,2.12.54.53,1.41.79,2.61.79,1.67,0,3.02-.42,4.05-1.25,1.03-.83,1.55-2.05,1.55-3.64v-1.91l-2.94.11c-1.57.05-2.8.23-3.68.53-.88.31-1.5.73-1.86,1.27-.36.54-.53,1.2-.53,1.99Z" />
                <path d="M20.5,39.76C9.77,39.76,1.03,31.02,1.03,20.29S9.77.82,20.5.82s19.47,8.73,19.47,19.47-8.73,19.47-19.47,19.47ZM20.5,4.02c-8.97,0-16.27,7.3-16.27,16.27s7.3,16.27,16.27,16.27,16.27-7.3,16.27-16.27S29.47,4.02,20.5,4.02Z" />
              </g>
              <path d="M48.98,24.36c0-1.28.27-2.33.81-3.15.54-.82,1.27-1.47,2.19-1.93.92-.47,1.96-.8,3.11-1.01,1.15-.21,2.34-.34,3.57-.39l3.17-.11v-.74c0-1.5-.32-2.57-.96-3.22-.64-.65-1.67-.97-3.09-.97s-2.39.23-3.05.7c-.66.47-1.09,1.12-1.29,1.95l-3.5-.37c.34-1.79,1.18-3.1,2.52-3.94,1.34-.83,3.16-1.25,5.47-1.25,2.77,0,4.74.64,5.91,1.93,1.17,1.29,1.75,3.11,1.75,5.46v12.29h-3.68v-2.47c-.71.81-1.58,1.5-2.61,2.06-1.03.56-2.29.85-3.79.85-1.94,0-3.51-.48-4.71-1.44-1.2-.96-1.8-2.38-1.8-4.27ZM52.81,24.21c0,.88.27,1.59.81,2.12.54.53,1.41.79,2.61.79,1.67,0,3.02-.42,4.05-1.25,1.03-.83,1.55-2.05,1.55-3.64v-1.91l-2.94.11c-1.57.05-2.8.23-3.68.53s-1.5.73-1.86,1.27c-.36.54-.53,1.2-.53,1.99Z" />
              <path d="M67.89,23.21v-12.7h3.86v12c0,1.6.27,2.73.81,3.4.54.68,1.4,1.01,2.58,1.01,1.35,0,2.54-.48,3.57-1.44.54-.49.95-1.01,1.23-1.56.28-.55.42-1.26.42-2.12v-11.3h3.86v19.1h-3.79v-2.83c-.91,1.18-1.89,2.04-2.94,2.59-1.06.55-2.2.83-3.42.83-2.13,0-3.7-.59-4.69-1.77s-1.49-2.92-1.49-5.23Z" />
              <path d="M86.15,20.2c0-3.17.75-5.67,2.25-7.51,1.5-1.84,3.54-2.76,6.15-2.76,1.01,0,2.01.2,3,.61.99.41,1.91,1.14,2.74,2.19V3.34h3.86v26.28h-3.75v-2.61c-.79,1.03-1.67,1.82-2.67,2.37-.99.55-2.18.83-3.55.83-1.82,0-3.32-.44-4.51-1.31-1.19-.87-2.07-2.06-2.65-3.57-.58-1.51-.86-3.22-.86-5.13ZM90.12,20.09c0,1.74.24,3.12.72,4.12s1.09,1.72,1.84,2.15c.75.43,1.53.64,2.34.64,1.62,0,2.92-.54,3.9-1.62.98-1.08,1.47-2.64,1.47-4.67v-1.18c0-2.23-.47-3.86-1.42-4.9-.94-1.03-2.19-1.54-3.74-1.54-1.45,0-2.66.53-3.64,1.6-.98,1.07-1.47,2.87-1.47,5.39Z" />
              <path d="M106.68,3.3h3.94v3.94h-3.94v-3.94ZM106.76,10.52h3.86v19.1h-3.86V10.52Z" />
              <path d="M112.61,20.12c0-2.09.39-3.89,1.16-5.41s1.86-2.7,3.28-3.53c1.41-.83,3.07-1.25,4.99-1.25,2.92,0,5.2.9,6.85,2.7,1.64,1.8,2.47,4.25,2.47,7.34s-.84,5.66-2.52,7.49c-1.68,1.83-3.98,2.74-6.9,2.74s-5.23-.9-6.86-2.69c-1.63-1.79-2.45-4.26-2.45-7.4ZM116.62,20.05c0,2.09.42,3.77,1.25,5.06.83,1.29,2.2,1.93,4.09,1.93s3.26-.65,4.1-1.95c.85-1.3,1.27-2.99,1.27-5.08s-.42-3.7-1.27-4.99c-.85-1.29-2.21-1.93-4.1-1.93s-3.22.64-4.07,1.93c-.85,1.29-1.27,2.96-1.27,5.02Z" />
              <path d="M134.51,13.72h-2.98v-3.05h2.98v-1.44c0-2.11.59-3.67,1.77-4.67,1.18-1.01,2.63-1.51,4.34-1.51.56,0,1.14.04,1.73.11.59.07,1.18.2,1.77.37l-.59,2.91c-.39-.12-.76-.2-1.1-.24-.34-.04-.69-.05-1.03-.05-.86,0-1.58.22-2.15.66-.58.44-.86,1.23-.86,2.36v1.51h4.71v3.05h-4.71v15.9h-3.86v-15.9ZM146.21,3.34h3.86v26.28h-3.86V3.34Z" />
              <path d="M152.58,23.21v-12.7h3.86v12c0,1.6.27,2.73.81,3.4.54.68,1.4,1.01,2.58,1.01,1.35,0,2.54-.48,3.57-1.44.54-.49.95-1.01,1.23-1.56.28-.55.42-1.26.42-2.12v-11.3h3.86v19.1h-3.79v-2.83c-.91,1.18-1.89,2.04-2.94,2.59-1.06.55-2.2.83-3.42.83-2.13,0-3.7-.59-4.69-1.77s-1.49-2.92-1.49-5.23Z" />
              <path d="M171.46,10.52h3.79v2.8c.83-1.13,1.75-1.97,2.76-2.54,1.01-.56,2.04-.85,3.09-.85,1.37,0,2.5.3,3.39.9.88.6,1.53,1.45,1.95,2.56,1.72-2.31,3.84-3.46,6.37-3.46,1.89,0,3.34.53,4.36,1.58,1.02,1.06,1.53,2.7,1.53,4.93v13.18h-3.83v-12.37c0-1.57-.26-2.64-.77-3.2-.52-.56-1.28-.85-2.28-.85-.54,0-1.09.09-1.66.28-.57.18-1.12.51-1.66.98-.44.39-.8.85-1.07,1.38-.27.53-.41,1.14-.41,1.82v11.96h-3.86v-12.37c0-1.5-.26-2.54-.79-3.15-.53-.6-1.28-.9-2.26-.9-1.15,0-2.23.48-3.24,1.43-.39.34-.75.79-1.09,1.34-.33.55-.5,1.29-.5,2.23v11.41h-3.83V10.52Z" />
              <path d="M200.53,20.23c0-2.21.39-4.08,1.16-5.61.77-1.53,1.85-2.7,3.22-3.5,1.37-.8,2.96-1.2,4.75-1.2,1.96,0,3.58.4,4.84,1.2,1.26.8,2.2,1.9,2.82,3.31.61,1.41.92,3.04.92,4.88v1.69h-13.84c.1,1.96.58,3.49,1.45,4.58s2.14,1.64,3.81,1.64c1.45,0,2.52-.28,3.22-.83.7-.55,1.17-1.31,1.42-2.26h3.64c-.32,1.89-1.16,3.37-2.52,4.45-1.36,1.08-3.28,1.62-5.76,1.62-2.92,0-5.17-.88-6.75-2.65-1.58-1.77-2.37-4.21-2.37-7.32ZM205.13,15.52c-.37.83-.6,1.79-.7,2.87h10.01c-.1-1.82-.48-3.2-1.16-4.16s-1.9-1.44-3.66-1.44c-1.18,0-2.13.25-2.85.74-.72.49-1.27,1.15-1.64,1.99Z" />
            </svg>
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
                      className={`filmwave-header-nav-item filmwave-header-nav-item-playlists${playlistsMenuMounted ? " is-mounted" : ""}${playlistsMenuOpen ? " is-open" : ""}`}
                      onMouseEnter={openPlaylistsMenu}
                      onMouseLeave={schedulePlaylistsMenuClose}
                      onFocus={openPlaylistsMenu}
                      onBlur={(event) => {
                        if (
                          !event.currentTarget.contains(event.relatedTarget)
                        ) {
                          closePlaylistsMenu();
                        }
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== "Escape") return;
                        event.preventDefault();
                        event.stopPropagation();
                        playlistsMenuEscapeDismissedRef.current = true;
                        closePlaylistsMenu();
                        playlistsTriggerRef.current?.focus();
                      }}
                    >
                      <Link
                        ref={playlistsTriggerRef}
                        href="/curated-playlists"
                        className={`filmwave-header-nav-link${isActive ? " is-active" : ""}`}
                        aria-current={isActive ? "page" : undefined}
                        aria-haspopup="menu"
                        aria-expanded={playlistsMenuOpen}
                        onClick={closePlaylistsMenu}
                      >
                        {link.label}
                        <svg className="filmwave-header-playlists-chevron" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </Link>

                      <div
                        className="filmwave-playlists-mega-menu"
                        role="menu"
                        aria-label="Playlist navigation"
                        onMouseEnter={openPlaylistsMenu}
                        onMouseLeave={schedulePlaylistsMenuClose}
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
                                    <div className="filmwave-playlists-mega-feature-card">
                                      <Link
                                        href={href}
                                        className="filmwave-playlists-mega-feature-image-link"
                                        role="menuitem"
                                        onClick={closePlaylistsMenu}
                                      >
                                        <div className="filmwave-playlists-mega-feature-image">
                                          {playlist.cover_image_url && (
                                            <img
                                              src={playlist.cover_image_url}
                                              alt=""
                                              className={cardStyles.media}
                                            />
                                          )}
                                          <span className="filmwave-playlists-mega-feature-shade" />
                                          <strong className="filmwave-playlists-mega-feature-name">
                                            {playlist.name}
                                          </strong>
                                        </div>
                                      </Link>
                                      <CuratedPlaylistBookmarkButton
                                        playlist={{ ...playlist, kicker: "", cover_image_url: playlist.cover_image_url ?? null, song_count: playlist.song_count ?? undefined }}
                                        className="filmwave-playlists-mega-feature-bookmark"
                                      />
                                      <CuratedPlaylistPlayButton
                                        playlistId={playlist.id}
                                        playlistName={playlist.name}
                                        className="filmwave-playlists-mega-feature-play"
                                      />
                                    </div>
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
                    {useCombinedHeaderHeight && link.href === "/sound-fx" ? <span className="filmwave-header-new-badge">New</span> : null}
                  </Link>
                );
              })}
            </nav>

            <button
              type="button"
              className="filmwave-mobile-nav-toggle"
              aria-label={
                mobileNavOpen && !mobileAccountOpen
                  ? "Close navigation"
                  : "Open navigation"
              }
              aria-expanded={mobileNavOpen && !mobileAccountOpen}
              onClick={() => {
                if (mobileAccountOpen) {
                  setMobileAccountOpen(false);
                  setMobileNavOpen(true);
                  return;
                }

                setMobileNavOpen((open) => !open);
              }}
            >
              {mobileNavOpen && !mobileAccountOpen ? (
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
                <>
                  <Link href="/pricing" className="filmwave-header-utility-link">
                    Pricing
                  </Link>

                  <a
                    href="mailto:hello@filmwave.io"
                    className="filmwave-header-utility-link"
                  >
                    {useCombinedHeaderHeight ? "Enterprise" : "Need Enterprise?"}
                  </a>
                </>

                {user ? (
                  <>
                    <div className="filmwave-header-account-wrap" ref={menuRef}>
                      <button
                        ref={accountTriggerRef}
                        type="button"
                        onClick={() => {
                          if (window.matchMedia("(max-width: 690px)").matches) {
                            setMenuOpen(false);

                            if (mobileNavOpen && mobileAccountOpen) {
                              setMobileNavOpen(false);
                              return;
                            }

                            setMobileAccountOpen(true);
                            setMobileNavOpen(true);
                            return;
                          }

                          setMenuOpen((prev) => !prev);
                        }}
                        className={`filmwave-header-account-trigger${menuOpen ? " is-open" : ""}`}
                        aria-label="Open user menu"
                        aria-haspopup="menu"
                        aria-expanded={menuOpen || (mobileNavOpen && mobileAccountOpen)}
                      >
                        <span
                          className="filmwave-header-avatar"
                          style={{
                            backgroundColor:
                              avatarImage && !avatarImageFailed
                                ? "transparent"
                                : useCombinedHeaderHeight
                                  ? "var(--audioflume-reference-avatar-background, #808080)"
                                  : "#808080",
                          }}
                        >
                          {avatarImage && !avatarImageFailed ? (
                            <img
                              src={avatarImage}
                              alt="Profile"
                              onError={(event) => {
                                if (user?.imageUrl && event.currentTarget.src !== user.imageUrl) {
                                  event.currentTarget.src = user.imageUrl;
                                } else {
                                  setAvatarImageFailed(true);
                                }
                              }}
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
              {TOP_NAV_LINKS.map((link) =>
                link.href === "/playlists" ? (
                  <div key={link.href} className="filmwave-mobile-playlists">
                    <Link href="/curated-playlists" onClick={() => setMobileNavOpen(false)}>
                      Playlists
                    </Link>
                    <div className="filmwave-mobile-playlists-links">
                      {PLAYLIST_PAGE_LINKS.map((pageLink) => (
                        <Link key={pageLink.href} href={pageLink.href} onClick={() => setMobileNavOpen(false)}>
                          {pageLink.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Link key={link.href} href={link.href} onClick={() => setMobileNavOpen(false)}>
                    {link.label}
                  </Link>
                )
              )}

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
