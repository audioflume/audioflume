"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import DashboardIcon from "@/components/icons/DashboardIcon";
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

  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase()
    : "";

  return (
    <header className="fixed left-0 right-0 top-0 z-[110] h-14 border-b border-[var(--border)] bg-[var(--bg-primary)]">
      <div className="flex h-full items-center justify-between px-6">
        <Link href="/music" className="flex items-center">
          <Logo className="h-[22px] w-auto text-[var(--text-primary)]" />
        </Link>

        <div className="relative flex h-full items-center gap-3" ref={menuRef}>
          <Link
            href="/dashboard"
            className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          >
            <DashboardIcon />
            Dashboard
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

            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent-2)] text-[10px] font-semibold leading-none text-[var(--accent-2-contrast)]">
              {initials}
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
