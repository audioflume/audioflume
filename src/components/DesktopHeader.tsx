import { useEffect, useRef, useState } from "react";

const THEME_STORAGE_KEY = "filmwave-theme";

type ThemeMode = "dark" | "light";

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={`desktop-header-chevron ${open ? "is-open" : ""}`}
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

function DashboardIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 5.5h6.5v6.5H4V5.5Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M13.5 5.5H20v6.5h-6.5V5.5Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 15h6.5v3.5H4V15Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M13.5 15H20v3.5h-6.5V15Z" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function PlaylistIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 7h14" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M5 12h14" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M5 17h9" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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

function DarkModeIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 15.6A8.5 8.5 0 0 1 8.4 4a7.2 7.2 0 1 0 11.6 11.6Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LightModeIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 7.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 2.8v2M12 19.2v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.8 12h2M19.2 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function FilmwaveLogo() {
  return (
    <div className="desktop-header-logo" aria-label="Filmwave">
      <span className="desktop-header-logo-mark">♪</span>
      <span>Filmwave</span>
    </div>
  );
}

function MenuLink({ label, helper }: { label: string; helper: string }) {
  return (
    <button type="button" className="desktop-user-menu-link">
      <span className="desktop-user-menu-link-copy">
        <span className="desktop-user-menu-link-label">{label}</span>
        <span className="desktop-user-menu-link-helper">{helper}</span>
      </span>
      <span className="desktop-user-menu-icon-button">
        <ArrowIcon />
      </span>
    </button>
  );
}

function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") return "dark";

  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  return savedTheme === "light" ? "light" : "dark";
}

export default function DesktopHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setThemeState] = useState<ThemeMode>(getInitialTheme);
  const menuRef = useRef<HTMLDivElement>(null);

  const isDark = theme === "dark";
  const isLight = theme === "light";

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  function setTheme(nextTheme: ThemeMode) {
    setThemeState(nextTheme);
  }

  return (
    <header className="desktop-header">
      <div className="desktop-header-inner">
        <button type="button" className="desktop-header-logo-button" aria-label="Filmwave Desktop home">
          <FilmwaveLogo />
        </button>

        <div className="desktop-header-actions" ref={menuRef}>
          <button type="button" className="desktop-nav-link">
            <DashboardIcon />
            Discover
          </button>

          <button type="button" className="desktop-nav-link">
            <PlaylistIcon />
            Playlists
          </button>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className={`desktop-account-trigger ${menuOpen ? "is-open" : ""}`}
            aria-label="Open user menu"
            aria-expanded={menuOpen}
          >
            <span className="desktop-account-trigger-label">
              <span className="desktop-account-name">Account</span>
              <ChevronIcon open={menuOpen} />
            </span>
            <span className="desktop-account-avatar">F</span>
          </button>

          {menuOpen && (
            <div className="desktop-user-menu-wrap">
              <div className="desktop-user-menu">
                <div className="desktop-user-menu-head">
                  <div className="desktop-user-menu-name">Filmwave Desktop</div>
                  <div className="desktop-user-menu-plan">Project sync companion</div>
                </div>

                <div className="desktop-user-menu-links">
                  <MenuLink label="Profile" helper="Personal info and account details" />
                  <MenuLink label="Settings" helper="Site preferences and display" />
                  <MenuLink label="Membership" helper="Plan, license, and usage" />
                  <MenuLink label="Payment" helper="Billing and invoices" />
                  <MenuLink label="Security" helper="Password and account access" />
                  <MenuLink label="Support & FAQ" helper="Help center and contact options" />
                </div>

                <div className="desktop-theme-menu">
                  <div className="desktop-theme-toggle">
                    <button
                      type="button"
                      onClick={() => !isDark && setTheme("dark")}
                      className={isDark ? "is-active is-dark" : "is-dark"}
                      aria-label="Dark mode"
                      aria-pressed={isDark}
                    >
                      <DarkModeIcon />
                      <span>Dark</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => !isLight && setTheme("light")}
                      className={isLight ? "is-active is-light" : "is-light"}
                      aria-label="Light mode"
                      aria-pressed={isLight}
                    >
                      <LightModeIcon />
                      <span>Light</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
