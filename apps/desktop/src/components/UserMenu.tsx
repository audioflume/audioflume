import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

type MenuPosition = {
  top: number;
  right: number;
};

function getAccountInitial(account: DesktopAccount | null) {
  const value = account?.name || account?.email || "A";
  return value.trim().charAt(0).toUpperCase() || "A";
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
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const accountLabel = isSignedIn
    ? account?.name ?? (accountLoading ? "Loading account" : "Audioflume account")
    : "Account";

  function updateMenuPosition() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    setMenuPosition({
      top: rect.bottom - 4,
      right: Math.max(12, window.innerWidth - rect.right),
    });
  }

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;

      if (
        menuRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }

      setOpen(false);
    }

    if (open) document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open]);

  const menuPanel =
    open && menuPosition && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={panelRef}
            className="filmwave-header-menu-wrap desktop-user-menu-portal"
            style={{
              top: `${menuPosition.top}px`,
              right: `${menuPosition.right}px`,
            }}
          >
            <UserMenuPanel>
              {isSignedIn && (
                <UserMenuHeader
                  title={accountLabel}
                  detail={account?.email ?? "Connected account"}
                  imageSrc={account?.imageUrl}
                />
              )}

              <UserMenuActions>
                <UserMenuAction
                  label="Desktop Sync"
                  icon="sync"
                  helper=""
                  onClick={() => {
                    setOpen(false);
                    onOpenSyncSettings();
                  }}
                />

                <UserMenuAction
                  label={isSignedIn ? "Reconnect" : "Sign in"}
                  icon="sign-in"
                  helper=""
                  onClick={() => {
                    setOpen(false);
                    void onOpenSignIn();
                  }}
                />

                <UserMenuThemeToggle
                  theme={theme}
                  onThemeChange={onThemeChange}
                />
              </UserMenuActions>

              {isSignedIn && (
                <UserMenuActions className="filmwave-user-menu-signout">
                  <UserMenuExitAction
                    label="Sign Out"
                    icon="sign-out"
                    onClick={() => {
                      setOpen(false);
                      void onSignOut();
                    }}
                  />
                </UserMenuActions>
              )}
            </UserMenuPanel>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={menuRef} className="filmwave-header-actions desktop-user-menu-wrap">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          updateMenuPosition();
          setOpen((current) => !current);
        }}
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

      {menuPanel}
    </div>
  );
}
