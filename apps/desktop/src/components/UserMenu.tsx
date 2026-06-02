import { HeaderChevron } from "@filmwave/shared";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import DarkMode from "./icons/DarkMode";
import LightMode from "./icons/LightMode";
import type { DesktopAccount } from "../lib/mockFilmwaveApi";

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

function ThemeButton({
  active,
  children,
  className,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  className: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${className} ${active ? "is-active" : ""}`}
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
    account?.name ?? (accountLoading ? "Loading account..." : "Filmwave user");
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
          <div className="desktop-user-menu">
            <div className="desktop-user-menu-head">
              <div className="desktop-user-menu-name">
                {isSignedIn ? accountName : "Filmwave Desktop"}
              </div>
              <div className="desktop-user-menu-plan">{accountEmail}</div>
            </div>

            <div className="desktop-user-menu-actions">
              <button
                type="button"
                className="desktop-user-menu-action"
                onClick={() => {
                  setOpen(false);
                  onOpenSyncSettings();
                }}
              >
                <span>Desktop Sync</span>
              </button>

              <button
                type="button"
                className="desktop-user-menu-action"
                onClick={() => {
                  setOpen(false);
                  void onOpenSignIn();
                }}
              >
                <span>{isSignedIn ? "Reconnect" : "Sign in"}</span>
              </button>

              {isSignedIn && (
                <button
                  type="button"
                  className="desktop-user-menu-action"
                  onClick={() => {
                    setOpen(false);
                    void onSignOut();
                  }}
                >
                  <span>Sign out</span>
                </button>
              )}
            </div>

            <div className="desktop-theme-menu">
              <div className="desktop-theme-toggle" aria-label="Theme setting">
                <ThemeButton
                  active={theme === "dark"}
                  className="is-dark"
                  onClick={() => onThemeChange("dark")}
                >
                  <DarkMode size={12} />
                  <span>Dark</span>
                </ThemeButton>

                <ThemeButton
                  active={theme === "light"}
                  className="is-light"
                  onClick={() => onThemeChange("light")}
                >
                  <LightMode size={13} />
                  <span>Light</span>
                </ThemeButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
