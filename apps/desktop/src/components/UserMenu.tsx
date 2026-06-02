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
      className={`desktop-user-dock-theme-option${active ? " is-active" : ""}`}
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
          <div className="desktop-user-dock-menu">

            {/* Identity */}
            <div className="desktop-user-dock-identity">
              <span className="desktop-user-dock-avatar">
                {account?.imageUrl ? (
                  <img src={account.imageUrl} alt="" />
                ) : (
                  getAccountInitial(account)
                )}
              </span>
              <div className="desktop-user-dock-copy">
                <strong>{isSignedIn ? accountName : "Filmwave Desktop"}</strong>
                <span>{accountEmail}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="desktop-user-dock-actions" aria-label="Account actions">
              <button
                type="button"
                className="desktop-user-dock-action"
                onClick={() => { setOpen(false); onOpenSyncSettings(); }}
              >
                <div className="desktop-user-dock-action-icon">⇄</div>
                <div className="desktop-user-dock-action-copy">
                  <span>Desktop Sync</span>
                  <small>Manage local folders</small>
                </div>
              </button>

              <button
                type="button"
                className="desktop-user-dock-action"
                onClick={() => { setOpen(false); void onOpenSignIn(); }}
              >
                <div className="desktop-user-dock-action-icon">↻</div>
                <div className="desktop-user-dock-action-copy">
                  <span>{isSignedIn ? "Reconnect" : "Sign in"}</span>
                  <small>{isSignedIn ? "Refresh session" : "Connect account"}</small>
                </div>
              </button>

              {isSignedIn && (
                <button
                  type="button"
                  className="desktop-user-dock-action"
                  onClick={() => { setOpen(false); void onSignOut(); }}
                >
                  <div className="desktop-user-dock-action-icon">→</div>
                  <div className="desktop-user-dock-action-copy">
                    <span>Sign out</span>
                    <small>Disconnect this app</small>
                  </div>
                </button>
              )}
            </div>

            {/* Footer: theme */}
            <div className="desktop-user-dock-footer">
              <div className="desktop-user-dock-theme" aria-label="Theme">
                <ThemeOption active={theme === "dark"} onClick={() => onThemeChange("dark")}>
                  <DarkMode size={12} />
                  Dark
                </ThemeOption>
                <ThemeOption active={theme === "light"} onClick={() => onThemeChange("light")}>
                  <LightMode size={13} />
                  Light
                </ThemeOption>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
