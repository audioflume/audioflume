"use client";

import { HeaderShell } from "@filmwave/shared";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import FilmwaveLogoIcon from "@/components/icons/FilmwaveLogoIcon";
import UserMenu from "@/components/UserMenu";

const TOP_NAV_LINKS = [
  { href: "/discover", label: "Discover" },
  { href: "/music", label: "Music" },
  { href: "/playlists", label: "Playlists" },
  { href: "/projects", label: "Projects" },
  { href: "/sound-fx", label: "Sound FX" },
];

export default function Header() {
  const { user } = useUser();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
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
              const isActive =
                pathname === link.href || pathname?.startsWith(`${link.href}/`);

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
