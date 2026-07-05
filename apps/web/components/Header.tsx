"use client";

import { HeaderShell } from "@filmwave/shared";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import FilmwaveLogoIcon from "@/components/icons/FilmwaveLogoIcon";
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
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [curatedPreview, setCuratedPreview] = useState<CuratedPlaylistPreview[]>([]);
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

  return (
    <HeaderShell
      logo={
        <Link href="/discover" className="filmwave-header-logo-action" aria-label="Filmwave Home">
          <FilmwaveLogoIcon className="filmwave-header-logo-mark" />
        </Link>
      }
      actions={
        <>
          <nav className="filmwave-header-nav" aria-label="Primary navigation">
            {TOP_NAV_LINKS.map((link) => {
              const isActive = playlistNavIsActive(pathname, link.href);

              if (link.href === "/playlists") {
                return (
                  <div key={link.href} className="filmwave-header-nav-item filmwave-header-nav-item-playlists">
                    <Link
                      href={link.href}
                      className={`filmwave-header-nav-link${isActive ? " is-active" : ""}`}
                      aria-current={isActive ? "page" : undefined}
                    >
                      {link.label}
                    </Link>

                    <div className="filmwave-playlists-mega-menu" role="menu" aria-label="Playlist navigation">
                      <div className="filmwave-playlists-mega-inner">
                        <div className="filmwave-playlists-mega-feature-grid" aria-label="Featured curated playlists">
                          {curatedPreview.length > 0 ? (
                            curatedPreview.map((playlist, index) => (
                              <Link
                                key={playlist.id}
                                href={`/curated-playlists/${playlist.id}`}
                                className="filmwave-playlists-mega-feature"
                                role="menuitem"
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
                                <Link href={section.href} className="filmwave-playlists-mega-button" role="menuitem">
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
  );
}
