"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import ChevronDownIcon from "./icons/ChevronDownIcon";
import DarkMode from "./icons/DarkMode";
import LightMode from "./icons/LightMode";
import type { DesktopAccount } from "../lib/mockFilmwaveApi";

function ArrowIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M9 6L15 12L9 18"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MenuLink({
  href,
  label,
  helper,
  onClose,
}: {
  href: string;
  label: string;
  helper: string;
  onClose?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className="group flex h-11 items-center justify-between gap-3 rounded-lg px-3 text-left transition hover:bg-[var(--bg-hover-strong)]"
    >
      <div className="min-w-0">
        <div className="text-xs font-medium text-[var(--text-primary)]">
          {label}
        </div>

        <div className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">
          {helper}
        </div>
      </div>

      <div className={`${iconButtonClass} h-6 w-6 flex-shrink-0`}>
        <ArrowIcon />
      </div>
    </Link>
  );
}

export default function UserMenu({ onClose }: { onClose?: () => void }) {
  const { signOut } = useClerk();
  const { user } = useUser();
  const { theme, setTheme } = useTheme();

  const isDark = theme === "dark";
  const isLight = theme === "light";
  const displayName =
    user?.fullName || user?.primaryEmailAddress?.emailAddress || "Account";

  return (
    <div className="w-[300px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] shadow-[var(--shadow-ui)]">
      <div className="border-b border-[var(--border)] px-3 py-3">
        <div className="truncate text-sm font-medium text-[var(--text-primary)]">
          {displayName}
        </div>

        <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">
          Lifetime Membership
        </div>
      </div>

      <div className="grid gap-1 p-1.5">
        <MenuLink
          href="/account/profile"
          label="Profile"
          helper="Personal info and account details"
          onClose={onClose}
        />

        <MenuLink
          href="/account/settings"
          label="Settings"
          helper="Site preferences and display"
          onClose={onClose}
        />

        <MenuLink
          href="/account/membership"
          label="Membership"
          helper="Plan, license, and usage"
          onClose={onClose}
        />

        <MenuLink
          href="/account/payment"
          label="Payment"
          helper="Billing and invoices"
          onClose={onClose}
        />

        <MenuLink
          href="/account/security"
          label="Security"
          helper="Password and account access"
          onClose={onClose}
        />

        <MenuLink
          href="/account/support"
          label="Support & FAQ"
          helper="Help center and contact options"
          onClose={onClose}
        />

        <button
          type="button"
          onClick={() => signOut()}
          className="flex h-9 cursor-pointer items-center justify-between rounded-lg px-3 text-left text-xs font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-hover-strong)] hover:text-[var(--text-primary)]"
        >
          <span>Log Out</span>

          <span className="text-[11px] text-[var(--text-muted)]">Exit</span>
        </button>
      </div>

      <div className="border-t border-[var(--border)] p-1.5">
        <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-[var(--bg-primary)] p-1">
          <button
            type="button"
            onClick={() => theme !== "dark" && setTheme("dark")}
            className={`flex h-8 cursor-pointer items-center justify-center gap-2 rounded-md text-[11px] font-medium transition ${
              isDark
                ? "bg-[var(--accent-2)] text-[var(--accent-2-contrast)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--accent-2)] hover:text-[var(--accent-2-contrast)]"
            }`}
            aria-label="Dark mode"
            aria-pressed={isDark}
          >
            <DarkMode />
            <span>Dark</span>
          </button>

          <button
            type="button"
            onClick={() => theme !== "light" && setTheme("light")}
            className={`flex h-8 cursor-pointer items-center justify-center gap-2 rounded-md text-[11px] font-medium transition ${
              isLight
                ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--accent)] hover:text-[var(--accent-contrast)]"
            }`}
            aria-label="Light mode"
            aria-pressed={isLight}
          >
            <LightMode />
            <span>Light</span>
          </button>
        </div>
      </div>
    </div>
  );
}
