import { HeaderChevron } from "@filmwave/shared";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import DarkMode from "./icons/DarkMode";
import LightMode from "./icons/LightMode";
import type { DesktopAccount } from "../lib/mockFilmwaveApi";
import "./UserMenu.css";

type ThemeMode = "dark" | "light";

type UserMenuProps = {
  account: DesktopAccount | null;
  accountLoading: boolean;
  isSignedIn: boolean;
  onOpenSignIn: () => void | Promise<void>;
  onOpenSyncSettings: () => void;
  onSignOut: () => void | Promise<void>;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
};

function getAccountInitial(account: DesktopAccount | null) {
  const value = account?.name || account?.email || "F";
  return value.trim().charAt(0).toUpperCase() || "F";
}

function ThemeOption({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`desktop-command-theme-option${active ? " is-active" : ""}`}
      onClick={onClick}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

export default function UserMenu({
  account,
  accountLoading,
  isSignedIn,
  onOpenSignIn,
  onOpenSyncSettings,
  onSignOut,
  theme,
  onThemeChange,
}: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const accountName =
    account?.name ?? (accountLoading ? "Loading account..." : "Filmwave Desktop");
  const accountEmail =
    account?.email ?? (isSignedIn ? "Connected to Filmwave" : "Not connected");

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  return (
    <div ref={menuRef} className="desktop-user-menu-root">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`filmwave-header-account-trigger desktop-account-trigger${open ? " is-open" : ""}`}
        aria-label="Open user menu"
        aria-expanded={open}
      >
        <span className="filmwave-header-account-label desktop-account-trigger-label">
          <span className="filmwave-header-account-name desktop-account-name">
            {isSignedIn ? accountName : "Account"}
          </span>
          <HeaderChevron open={open} />
        </span>

        <span className="filmwave-header-avatar desktop-account-avatar">
          {account?.imageUrl ? (
            <img src={account.imageUrl} alt="" />
          ) : (
            getAccountInitial(account)
          )}
        </span>
      </button>

      {open && (
        <div className="filmwave-header-menu-wrap desktop-user-menu-wrap">
          <div className="desktop-command-menu">
            <div className="desktop-command-menu-topline">
              <span className="desktop-command-menu-label">Filmwave Desktop</span>
              <span className={`desktop-command-menu-state${isSignedIn ? " is-online" : ""}`}>
                {isSignedIn ? "Online" : "Offline"}
              </span>
            </div>

            <div className="desktop-command-account">
              <div className="desktop-command-account-copy">
                <strong>{isSignedIn ? accountName : "Account required"}</strong>
                <span>{accountEmail}</span>
              </div>
              <span className="desktop-command-avatar">
                {account?.imageUrl ? (
                  <img src={account.imageUrl} alt="" />
                ) : (
                  getAccountInitial(account)
                )}
              </span>
            </div>

            <div className="desktop-command-actions" aria-label="Account actions">
              <button
                type="button"
                className="desktop-command-action"
                onClick={() => {
                  setOpen(false);
                  onOpenSyncSettings();
                }}
              >
                <span className="desktop-command-action-index">01</span>
                <span className="desktop-command-action-main">
                  <strong>Desktop Sync</strong>
                  <small>Folder, source, and project sync settings</small>
                </span>
                <span className="desktop-command-action-arrow">→</span>
              </button>

              <button
                type="button"
                className="desktop-command-action"
                onClick={() => {
                  setOpen(false);
                  void onOpenSignIn();
                }}
              >
                <span className="desktop-command-action-index">02</span>
                <span className="desktop-command-action-main">
                  <strong>{isSignedIn ? "Reconnect" : "Sign in"}</strong>
                  <small>{isSignedIn ? "Refresh the active Filmwave session" : "Connect this app to your account"}</small>
                </span>
                <span className="desktop-command-action-arrow">→</span>
              </button>

              {isSignedIn && (
                <button
                  type="button"
                  className="desktop-command-action is-muted"
                  onClick={() => {
                    setOpen(false);
                    void onSignOut();
                  }}
                >
                  <span className="desktop-command-action-index">03</span>
                  <span className="desktop-command-action-main">
                    <strong>Sign out</strong>
                    <small>End this desktop session</small>
                  </span>
                  <span className="desktop-command-action-arrow">→</span>
                </button>
              )}
            </div>

            <div className="desktop-command-footer">
              <span className="desktop-command-footer-label">Mode</span>
              <div className="desktop-command-theme" aria-label="Theme setting">
                <ThemeOption active={theme === "dark"} onClick={() => onThemeChange("dark")}>
                  <DarkMode size={12} />
                  <span>Dark</span>
                </ThemeOption>
                <ThemeOption active={theme === "light"} onClick={() => onThemeChange("light")}>
                  <LightMode size={13} />
                  <span>Light</span>
                </ThemeOption>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
