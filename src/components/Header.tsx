import { useEffect, useState } from "react";
import FilmwaveLogoIcon from "./icons/FilmwaveLogoIcon";
import DashboardIcon from "./icons/DashboardIcon";
import PlaylistIcon from "./icons/PlaylistIcon";
import UserMenu from "./UserMenu";
import type { DesktopAccount } from "../lib/mockFilmwaveApi";
import "./Header.css";

const THEME_STORAGE_KEY = "filmwave-theme";

type ThemeMode = "dark" | "light";

type HeaderProps = {
  account: DesktopAccount | null;
  accountLoading: boolean;
  isSignedIn: boolean;
  onOpenSignIn: () => void | Promise<void>;
  onSignOut: () => void | Promise<void>;
};

function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") return "dark";

  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  return savedTheme === "light" ? "light" : "dark";
}

export default function Header({
  account,
  accountLoading,
  isSignedIn,
  onOpenSignIn,
  onSignOut,
}: HeaderProps) {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  return (
    <header className="desktop-header">
      <div className="desktop-header-inner">
        <button
          type="button"
          className="desktop-header-logo-button"
          aria-label="Filmwave Desktop home"
        >
          <FilmwaveLogoIcon className="desktop-header-logo-mark" width={132} height={26} />
        </button>

        <div className="desktop-header-actions">
          <button type="button" className="desktop-nav-link">
            <DashboardIcon size={14} />
            Discover
          </button>

          <button type="button" className="desktop-nav-link">
            <PlaylistIcon size={14} />
            Projects
          </button>

          <UserMenu
            account={account}
            accountLoading={accountLoading}
            isSignedIn={isSignedIn}
            onOpenSignIn={onOpenSignIn}
            onSignOut={onSignOut}
            theme={theme}
            onThemeChange={setTheme}
          />
        </div>
      </div>
    </header>
  );
}
