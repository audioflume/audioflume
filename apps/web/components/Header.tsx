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
  kicker?: string | null;
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
  { href: "/playlists", label: "My Playlists", detail: "Your saved collections" },
  { href: "/curated-playlists", label: "Curated Collections", detail: "Filmwave editor picks" },
  {
    href: "/playlists?tab=community-playlists",
    label: "Community Playlists",
    detail: "Collections from filmmakers",
  },
];

const PLAYLIST_QUICK_SECTIONS = [
  {
    title: "My Playlists",
    eyebrow: "Your library",
    description: "Open your saved playlists, organize tracks, and keep project-specific collections close.",
    href: "/playlists",
  },
  {
    title: "Curated Playlists",
    eyebrow: "Made by Filmwave",
    description: "Browse hand-built collections for scenes, moods, pacing, and production styles.",
    href: "/curated-playlists",
  },
];

function formatTrackCount(count?: number | null) {
  const safeCount = Number(count || 0);
  return `${safeCount} track${safeCount === 1 ? "" : "s"}`;
}

function playlistNavIsActive(pathname: string | null, href: string) {
  if (!pathname) return false;

  if (href === "/playlists") {
    return pathname === "/playlists" || pathname.startsWith("/playlists/") || pathname.startsWith("/curated-playlists");
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Header() {
  const { user } = useUser();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [playlistsMenuOpen, setPlaylistsMenuOpen] = useState(false);
  const [playlistOverlayTop, setPlaylistOverlayTop] = useState<number | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [curatedPreview, setCuratedPreview] = useState<CuratedPlaylistPreview[]>([]);
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

    function syncPlaylistOverlayTop() {
      const rect = playlistsMenuRef.current?.getBoundingClientRect();
      setPlaylistOverlayTop(rect ? Math.max(rect.bottom, 0) : null);
    }

    const frame = window.requestAnimationFrame(syncPlaylistOverlayTop);
    window.addEventListener("resize", syncPlaylistOverlayTop);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", syncPlaylistOverlayTop);
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
          background: var(--bg-primary) !important;
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
      `}</style>

      <HeaderShell
        logo={
          <Link href="/discover" className="filmwave-header-logo-action" aria-label="spliceshack Home">
            <span className="filmwave-header-tonal-wordmark">spliceshack</span>
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
                        if (!event.currentTarget.contains(event.relatedTarget)) {
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
                          <div className="filmwave-playlists-mega-feature-grid" aria-label="Featured curated playlists">
                            {curatedPreview.length > 0 ? (
                              curatedPreview.map((playlist, index) => (
                                <Link
                                  key={playlist.id}
                                  href={`/curated-playlists/${playlist.id}`}
                                  className="filmwave-playlists-mega-feature"
                                  role="menuitem"
                                  onClick={closePlaylistsMenu}
                                >
                                  <span className="filmwave-playlists-mega-feature-image">
                                    {playlist.cover_image_url && (
                                      <img src={playlist.cover_image_url} alt="" />
                                    )}
                                  </span>
                                  <span className="filmwave-playlists-mega-feature-copy">
                                    <span className="filmwave-playlists-mega-feature-kicker">
                                      {playlist.kicker || (index === 0 ? "Curated" : "Collection")}
                                    </span>
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
                                    <span className="filmwave-playlists-mega-feature-kicker">
                                      {section.eyebrow}
                                    </span>
                                    <span className="filmwave-playlists-mega-feature-title">
                                      {section.title}
                                    </span>
                                    <span className="filmwave-playlists-mega-feature-detail">
                                      Explore collections
                                    </span>
                                  </span>
                                </Link>
                              ))
                            )}
                          </div>

                          <div className="filmwave-playlists-mega-content">
                            <div className="filmwave-playlists-mega-link-column">
                              <span className="filmwave-playlists-mega-label">Playlist pages</span>
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

                            <div className="filmwave-playlists-mega-quick-grid">
                              {PLAYLIST_QUICK_SECTIONS.map((section) => (
                                <div key={section.href} className="filmwave-playlists-mega-quick-card">
                                  <span className="filmwave-playlists-mega-label">{section.eyebrow}</span>
                                  <h3>{section.title}</h3>
                                  <p>{section.description}</p>
                                  <Link
                                    href={section.href}
                                    className="filmwave-playlists-mega-button"
                                    role="menuitem"
                                    onClick={closePlaylistsMenu}
                                  >
                                    Explore all
                                  </Link>
                                </div>
                              ))}
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
