import { HeaderChevron } from "@filmwave/shared";
import { useEffect, useRef, useState } from "react";
import DarkMode from "./icons/DarkMode";
import LightMode from "./icons/LightMode";
import type { DesktopAccount } from "../lib/mockFilmwaveApi";
import {
  UserMenuAction,
  UserMenuActions,
  UserMenuExitAction,
  UserMenuHeader,
  UserMenuPanel,
  UserMenuThemeToggle,
} from "@filmwave/shared";

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
          <UserMenuPanel>
            <UserMenuHeader title={isSignedIn ? accountName : "Filmwave Desktop"} detail={accountEmail} />

            <UserMenuActions>
              <UserMenuAction
                label="Desktop Sync"
                helper="Local folders and project syncing"
                onClick={() => {
                  setOpen(false);
                  onOpenSyncSettings();
                }}
              />

              <UserMenuAction
                label={isSignedIn ? "Reconnect" : "Sign in"}
                helper={
                  isSignedIn
                    ? "Refresh your Filmwave connection"
                    : "Connect this desktop app"
                }
                onClick={() => {
                  setOpen(false);
                  void onOpenSignIn();
                }}
              />

              {isSignedIn && (
                <UserMenuExitAction
                  label="Sign out"
                  trailing="Exit"
                  onClick={() => {
                    setOpen(false);
                    void onSignOut();
                  }}
                />
              )}
            </UserMenuActions>

            <UserMenuThemeToggle
              theme={theme}
              onThemeChange={onThemeChange}
              darkIcon={<DarkMode size={12} />}
              lightIcon={<LightMode size={13} />}
            />
          </UserMenuPanel>
        </div>
      )}
    </div>
  );
}
