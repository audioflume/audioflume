import { ClerkProvider } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { Roboto_Mono } from "next/font/google";
import type { CSSProperties } from "react";
import { cookies } from "next/headers";
import { PlayerProvider } from "@/context/PlayerContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { UserPreferencesProvider } from "@/context/UserPreferencesContext";
import { PlaylistsProvider } from "@/context/PlaylistsContext";
import { ProjectsProvider } from "@/context/ProjectsContext";
import { FavoritesProvider } from "@/context/FavoritesContext";
import { ArtistInvitesProvider } from "@/context/ArtistInvitesContext";
import PlayerRenderer from "@/components/PlayerRenderer";
import SidebarRenderer from "@/components/SidebarRenderer";
import Header from "@/components/Header";
import ArtistInviteBanner from "@/components/ArtistInviteBanner";
import IconButtonTitleSync from "@/components/IconButtonTitleSync";
import MusicFilterToolbarBehavior from "@/components/MusicFilterToolbarBehavior";
import SideFilterPanelBehavior from "@/components/SideFilterPanelBehavior";
import { getPendingArtistInviteCount } from "@/lib/pendingArtistInvites";
import "./globals.css";
import "./public-action-buttons.css";
import "./interaction-defaults.css";
import "./music-library-web-refinements.css";
import "./discover/discover-page.css";
import "../components/backend/BackendUI.css";
import "../components/admin/AdminPageLayout.css";
import "../../../packages/shared/styles/music-sort-button-width.css";
import "../../../packages/shared/styles/playlist-library.css";
import "../../../packages/shared/styles/shell-chrome.css";
import "../../../packages/shared/styles/header-search-bar.css";
import "../../../packages/shared/styles/header-search-toolbar.css";
import "../../../packages/shared/styles/music-side-filter.css";
import "./music-library-web-layout.css";
import "../../../packages/shared/styles/header-search-shell.css";
import "./music-filter-rail-order.css";
import "../../../packages/shared/styles/music-shared-controls.css";
import "./music-library-search-theme.css";
import "./song-player-typography.css";
import "./typography-normalization.css";

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-roboto-mono-filmwave",
});

const TYPEKIT_STYLESHEET = "https://use.typekit.net/tjk0kys.css";
const R2_CDN_ORIGIN = "https://pub-56e6a9dcaf364dd4bcde4a5fe65a5b9a.r2.dev";
const THEME_BOOT_SCRIPT = `
(function () {
  try {
    var theme = window.localStorage.getItem("filmwave-theme-mode") || window.localStorage.getItem("filmwave-theme");
    if (theme !== "light" && theme !== "dark") {
      var cookieMatch = document.cookie.match(/(?:^|; )filmwave-theme-mode=(light|dark)/) || document.cookie.match(/(?:^|; )filmwave-theme=(light|dark)/);
      theme = cookieMatch ? cookieMatch[1] : "dark";
    }

    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("light", theme === "light");
  } catch (_) {}
})();
`;

export const metadata: Metadata = {
  title: "Audioflume",
  description: "Royalty-free music for filmmakers",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const user = await currentUser();
  const themeCookie =
    cookieStore.get("filmwave-theme-mode")?.value ??
    cookieStore.get("filmwave-theme")?.value;
  const sidebarCollapsedCookie = cookieStore.get(
    "filmwave-sidebar-collapsed",
  )?.value;
  const initialTheme = themeCookie === "light" ? "light" : "dark";
  const initialSidebarCollapsed = sidebarCollapsedCookie === "true";
  let initialPendingArtistInviteCount = 0;

  if (user?.id) {
    try {
      initialPendingArtistInviteCount = await getPendingArtistInviteCount(user);
    } catch (error) {
      console.error("Failed to preload artist invitation count:", error);
    }
  }

  const hasPendingArtistInvites = initialPendingArtistInviteCount > 0;
  const initialInviteBadgeCount =
    initialPendingArtistInviteCount > 99
      ? "99+"
      : String(initialPendingArtistInviteCount);
  const htmlClassName = [
    robotoMono.variable,
    hasPendingArtistInvites ? "filmwave-artist-invite-banner-active" : "",
    hasPendingArtistInvites ? "filmwave-artist-invite-pending" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const htmlStyle = hasPendingArtistInvites
    ? ({
        "--filmwave-artist-invite-count": `"${initialInviteBadgeCount}"`,
      } as CSSProperties)
    : undefined;

  return (
    <ClerkProvider>
      <html
        lang="en"
        className={htmlClassName}
        style={htmlStyle}
        data-theme={initialTheme}
        suppressHydrationWarning
      >
        <head>
          <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
          <link rel="stylesheet" href={TYPEKIT_STYLESHEET} />
          <link rel="preconnect" href={R2_CDN_ORIGIN} />
          <link rel="dns-prefetch" href={R2_CDN_ORIGIN} />
          <style>{`
            html body .filmwave-header .filmwave-header-actions .filmwave-header-nav .filmwave-header-nav-link {
              gap: 12px !important;
              font-family: var(--font-aktiv-grotesk), sans-serif !important;
              font-size: 13px !important;
              text-transform: none !important;
            }
          `}</style>
        </head>
        <body>
          <ArtistInvitesProvider
            initialPendingCount={initialPendingArtistInviteCount}
          >
            <UserPreferencesProvider>
              <ThemeProvider>
                <PlaylistsProvider>
                  <ProjectsProvider>
                    <PlayerProvider>
                      <FavoritesProvider>
                        <ArtistInviteBanner />
                        <Header />
                        <SidebarRenderer initialCollapsed={initialSidebarCollapsed} />
                        {children}
                        <PlayerRenderer />
                        <IconButtonTitleSync />
                        <MusicFilterToolbarBehavior />
                        <SideFilterPanelBehavior />
                      </FavoritesProvider>
                    </PlayerProvider>
                  </ProjectsProvider>
                </PlaylistsProvider>
              </ThemeProvider>
            </UserPreferencesProvider>
          </ArtistInvitesProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
