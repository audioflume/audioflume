"use client";

import Link from "next/link";
import { useClerk, useUser } from "@clerk/nextjs";
import { useTheme } from "@/context/ThemeContext";
import { iconButtonClass } from "@/components/uiClasses";

function MoonIcon() {
  return (
    <svg width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
      <path d="M6 .278a.77.77 0 0 1 .08.858 7.2 7.2 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277q.792-.001 1.533-.16a.79.79 0 0 1 .81.316.73.73 0 0 1-.031.893A8.35 8.35 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.75.75 0 0 1 6 .278M4.858 1.311A7.27 7.27 0 0 0 1.025 7.71c0 4.02 3.279 7.276 7.319 7.276a7.32 7.32 0 0 0 5.205-2.162q-.506.063-1.029.063c-4.61 0-8.343-3.714-8.343-8.29 0-1.167.242-2.278.681-3.286" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="13" height="13" fill="currentColor" viewBox="0 0 16 16">
      <path d="M8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6m0 1a4 4 0 1 0 0-8 4 4 0 0 0 0 8M8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0m0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13m8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5M3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8m10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0m-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0m9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707M4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708" />
    </svg>
  );
}

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
          href="/account"
          label="Profile"
          helper="Profile and settings"
          onClose={onClose}
        />

        <MenuLink
          href="/account"
          label="Account"
          helper="Membership, payment, security"
          onClose={onClose}
        />

        <MenuLink
          href="/support"
          label="Support"
          helper="Support and FAQs"
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
            <MoonIcon />
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
            <SunIcon />
            <span>Light</span>
          </button>
        </div>
      </div>
    </div>
  );
}
