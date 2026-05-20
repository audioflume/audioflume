"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import DashboardIcon from "@/components/icons/DashboardIcon";
import PlaylistIcon from "@/components/icons/PlaylistIcon";
import Logo from "@/components/Logo";
import UserMenu from "@/components/UserMenu";

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
          <Link
            href="/discover"
            className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          >
            <DashboardIcon />
            Discover
          </Link>

          <Link
            href="/curated-playlists"
            className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          >
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
              {" "}
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
