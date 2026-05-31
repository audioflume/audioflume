import { HeaderShell } from "@filmwave/shared";
import { useEffect, useState } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import FilmwaveLogoIcon from "./icons/FilmwaveLogoIcon";
import DashboardIcon from "./icons/DashboardIcon";
import PlaylistIcon from "./icons/PlaylistIcon";
import UserMenu from "./UserMenu";
import type { DesktopAccount } from "../lib/mockFilmwaveApi";
import type { DesktopAppView } from "./desktop-app/DesktopAppShell";
import "./Header.css";
import "./HeaderOverrides.css";

const THEME_STORAGE_KEY = "filmwave-theme";

const THEME_WINDOW_BACKGROUNDS = {
  dark: "#111111",
  light: "#ffffff",
} as const;

type ThemeMode = "dark" | "light";

type HeaderProps = {
  account: DesktopAccount | null;
  accountLoading: boolean;
  activeView: DesktopAppView;
  isSignedIn: boolean;
  onActiveViewChange: (view: DesktopAppView) => void;
  onOpenSignIn: () => void | Promise<void>;
  onOpenSyncSettings?: () => void;
  onSignOut: () => void | Promise<void>;
};

function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") return "dark";

  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  return savedTheme === "light" ? "light" : "dark";
}

function blurActiveElementFromHeaderClick(event: React.PointerEvent<HTMLElement>) {
  const target = event.target as HTMLElement | null;

  if (target?.closest("button, a, input, textarea, select, [role='button'], [data-header-interactive]")) {
    return;
  }

  const activeElement = document.activeElement;
  if (activeElement instanceof HTMLElement) activeElement.blur();
}

export default function Header({
  account,
  accountLoading,
  activeView,
  isSignedIn,
  onActiveViewChange,
  onOpenSignIn,
  onOpenSyncSettings,
  onSignOut,
}: HeaderProps) {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const openSyncSettings = onOpenSyncSettings ?? (() => onActiveViewChange("settings"));

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_STORAGE_KEY, theme);

    const appWindow = getCurrentWebviewWindow();

    appWindow.setTheme(theme).catch((error) => {
      console.warn("Could not update native window theme.", error);
    });

    appWindow
      .setBackgroundColor(THEME_WINDOW_BACKGROUNDS[theme])
      .catch((error) => {
        console.warn("Could not update native window background.", error);
      });
  }, [theme]);

  return (
    <HeaderShell
      className="desktop-header"
      innerClassName="desktop-header-inner"
      onPointerDownCapture={blurActiveElementFromHeaderClick}
      dragSurfaceProps={{ "data-tauri-drag-region": true }}
      logo={
        <button
          type="button"
          className="filmwave-header-logo-action desktop-header-logo-button"
          aria-label="Filmwave Desktop home"
          onClick={() => onActiveViewChange("projects")}
        >
          <FilmwaveLogoIcon
            className="filmwave-header-logo-mark desktop-header-logo-mark"
            width={115}
            height={22}
          />
        </button>
      }
      actions={
        <>
          <button
            type="button"
            className={`filmwave-header-nav-link desktop-nav-link${activeView === "discover" ? " is-active" : ""}`}
            onClick={() => onActiveViewChange("discover")}
          >
            <DashboardIcon />
            Discover
          </button>

          <button
            type="button"
            className={`filmwave-header-nav-link desktop-nav-link${activeView === "playlists" ? " is-active" : ""}`}
            onClick={() => onActiveViewChange("playlists")}
          >
            <PlaylistIcon size={13} />
            Playlists
          </button>

          <UserMenu
            account={account}
            accountLoading={accountLoading}
            isSignedIn={isSignedIn}
            onOpenSignIn={onOpenSignIn}
            onOpenSyncSettings={openSyncSettings}
            onSignOut={onSignOut}
            theme={theme}
            onThemeChange={setTheme}
          />
        </>
      }
    />
  );
}
