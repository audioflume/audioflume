"use client";

import { HeaderShell } from "@filmwave/shared";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
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
  { href: "/projects", label: "Projects" },
  { href: "/sound-fx", label: "Sound FX" },
];

const PLAYLIST_PAGE_LINKS = [
  {
    href: "/playlists",
    label: "My Playlists",
    detail: "Your saved collections",
  },
  {
    href: "/curated-playlists",
    label: "Curated Collections",
    detail: "Filmwave editor picks",
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
  {
    title: "Community Playlists",
    href: "/playlists?tab=community-playlists",
  },
];

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
  const { user } = useUser();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [playlistsMenuOpen, setPlaylistsMenuOpen] = useState(false);
  const [playlistOverlayTop, setPlaylistOverlayTop] = useState<number | null>(
    null,
  );
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [curatedPreview, setCuratedPreview] = useState<
    CuratedPlaylistPreview[]
  >([]);
  const menuRef = useRef<HTMLDivElement>(null);
  const playlistsMenuRef = useRef<HTMLDivElement>(null);

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
  }, [pathname]);

  useEffect(() => {
    if (!playlistsMenuOpen) {
      setPlaylistOverlayTop(null);
      return;
    }

    const menu = playlistsMenuRef.current;

    function syncPlaylistOverlayTop() {
      const rect = menu?.getBoundingClientRect();
      setPlaylistOverlayTop(
        rect ? Math.max(Math.floor(rect.bottom) - 1, 0) : null,
      );
    }

    const frame = window.requestAnimationFrame(syncPlaylistOverlayTop);
    const resizeObserver =
      menu && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(syncPlaylistOverlayTop)
        : null;

    resizeObserver?.observe(menu);
    window.addEventListener("resize", syncPlaylistOverlayTop);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", syncPlaylistOverlayTop);
      resizeObserver?.disconnect();
    };
  }, [playlistsMenuOpen, curatedPreview.length]);

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
            .slice(0, 3),
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

  function closePlaylistsMenu() {
    setPlaylistsMenuOpen(false);
    setPlaylistOverlayTop(null);
  }

  return (
    <>
      <style>{`
        .filmwave-header-tonal-wordmark {
          display: inline-flex !important;
          align-items: center !important;
          color: var(--text-primary) !important;
          font-family: var(--font-satoshi), "aktiv-grotesk", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
          font-size: 19px !important;
          font-weight: 600 !important;
          letter-spacing: -0.045em !important;
          line-height: 1 !important;
          text-transform: lowercase !important;
          transform: translateY(-1px) !important;
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

        .filmwave-playlists-mega-menu {
          z-index: 2147483000 !important;
          overflow: visible !important;
          border-top: 0 !important;
          border-bottom: 0 !important;
          background: var(--bg-primary) !important;
          padding: 0 !important;
          box-shadow: none !important;
        }

        :where(html.light, html[data-theme="light"]) .filmwave-playlists-mega-menu {
          box-shadow: none !important;
        }

        .filmwave-playlists-mega-menu::after {
          content: none !important;
          display: none !important;
        }

        .filmwave-playlists-mega-inner {
          position: relative !important;
          z-index: 1 !important;
          box-sizing: border-box !important;
          grid-template-columns: minmax(0, 1fr) minmax(220px, 0.32fr) !important;
          gap: 44px !important;
          background: var(--bg-primary) !important;
        }

        .filmwave-playlists-mega-feature-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
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
          aspect-ratio: 1 !important;
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
          display: block !important;
          align-self: start !important;
        }

        .filmwave-playlists-mega-links {
          margin-top: 0 !important;
        }

        .filmwave-playlists-page-overlay {
          position: fixed !important;
          right: 0 !important;
          bottom: 0 !important;
          left: 0 !important;
          z-index: 2147482999 !important;
          background: rgba(0, 0, 0, 0.48) !important;
          pointer-events: none !important;
        }

        @media (max-width: 980px) {
          .filmwave-playlists-mega-inner {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
        }
      `}</style>

      <HeaderShell
        logo={
          <Link
            href="/discover"
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
                      onMouseEnter={() => setPlaylistsMenuOpen(true)}
                      onMouseLeave={() => setPlaylistsMenuOpen(false)}
                      onFocus={() => setPlaylistsMenuOpen(true)}
                      onBlur={(event) => {
                        if (
                          !event.currentTarget.contains(event.relatedTarget)
                        ) {
                          setPlaylistsMenuOpen(false);
                          setPlaylistOverlayTop(null);
                        }
                      }}
                    >
                      <Link
                        href={link.href}
                        className={`filmwave-header-nav-link${isActive ? " is-active" : ""}`}
                        aria-current={isActive ? "page" : undefined}
                        aria-haspopup="menu"
                        aria-expanded={playlistsMenuOpen}
                        onClick={closePlaylistsMenu}
                      >
                        {link.label}
                      </Link>

                      <div
                        ref={playlistsMenuRef}
                        className="filmwave-playlists-mega-menu"
                        role="menu"
                        aria-label="Playlist navigation"
                      >
                        <div className="filmwave-playlists-mega-inner">
                          <div
                            className="filmwave-playlists-mega-feature-grid"
                            aria-label="Featured curated playlists"
                          >
                            {curatedPreview.length > 0 ? (
                              curatedPreview.map((playlist) => (
                                <Link
                                  key={playlist.id}
                                  href={`/curated-playlists/${playlist.id}`}
                                  className="filmwave-playlists-mega-feature"
                                  role="menuitem"
                                  onClick={closePlaylistsMenu}
                                >
                                  <span className="filmwave-playlists-mega-feature-image">
                                    {playlist.cover_image_url && (
                                      <img
                                        src={playlist.cover_image_url}
                                        alt={playlist.name}
                                      />
                                    )}
                                  </span>
                                  <span className="filmwave-playlists-mega-feature-copy">
                                    <span className="filmwave-playlists-mega-feature-title">
                                      {playlist.name}
                                    </span>
                                    <span className="filmwave-playlists-mega-feature-detail">
                                      {formatTrackCount(playlist.song_count)}
                                    </span>
                                  </span>
                                </Link>
                              ))
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

            <div className="filmwave-header-account-wrap" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                className={`filmwave-header-account-trigger${menuOpen ? " is-open" : ""}`}
                aria-label="Open user menu"
                aria-expanded={menuOpen}
              >
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
          </>
        }
      />

      {playlistsMenuOpen && playlistOverlayTop !== null && (
        <div
          className="filmwave-playlists-page-overlay"
          aria-hidden="true"
          style={{ top: `${playlistOverlayTop}px` }}
        />
      )}
    </>
  );
}
