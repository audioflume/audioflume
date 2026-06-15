import { useEffect, useRef, useState } from "react";
import DarkMode from "./icons/DarkMode";
import LightMode from "./icons/LightMode";
import type { DesktopAccount } from "../lib/mockFilmwaveApi";
import {
  UserMenuAction,
  UserMenuActions,
  UserMenuExitAction,
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

  const accountLabel = isSignedIn
    ? account?.name ?? (accountLoading ? "Loading account" : "Filmwave account")
    : "Account";

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [open]);

  return (
    <div ref={menuRef} className="filmwave-header-actions desktop-user-menu-wrap">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`filmwave-header-account-trigger desktop-header-avatar-trigger${open ? " is-open" : ""}`}
        aria-label={`Open user menu for ${accountLabel}`}
        aria-expanded={open}
      >
        <span className="filmwave-header-avatar">
          {account?.imageUrl ? (
            <img src={account.imageUrl} alt="" />
          ) : (
            getAccountInitial(account)
          )}
        </span>
      </button>

      {open && (
        <div className="filmwave-header-menu-wrap">
          <UserMenuPanel>
            <UserMenuActions>
              <UserMenuAction
                label="Desktop Sync"
                helper=""
                onClick={() => {
                  setOpen(false);
                  onOpenSyncSettings();
                }}
              />

              <UserMenuAction
                label={isSignedIn ? "Reconnect" : "Sign in"}
                helper=""
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
