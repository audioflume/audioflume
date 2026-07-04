import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { PlayerProvider } from "@/context/PlayerContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { UserPreferencesProvider } from "@/context/UserPreferencesContext";
import { PlaylistsProvider } from "@/context/PlaylistsContext";
import { ProjectsProvider } from "@/context/ProjectsContext";
import { FavoritesProvider } from "@/context/FavoritesContext";
import PlayerRenderer from "@/components/PlayerRenderer";
import SidebarRenderer from "@/components/SidebarRenderer";
import Header from "@/components/Header";
import IconButtonTitleSync from "@/components/IconButtonTitleSync";
import DiscoverDescriptorPills from "@/components/DiscoverDescriptorPills";
import MusicFilterToolbarBehavior from "@/components/MusicFilterToolbarBehavior";
import SideFilterPanelBehavior from "@/components/SideFilterPanelBehavior";
import AdminPageHeaderMount from "@/components/admin/AdminPageHeaderMount";
import "./globals.css";
import "./music-library-web-refinements.css";
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
  title: "Filmwave",
  description: "Royalty-free music for filmmakers",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const themeCookie =
    cookieStore.get("filmwave-theme-mode")?.value ??
    cookieStore.get("filmwave-theme")?.value;
  const sidebarCollapsedCookie = cookieStore.get(
    "filmwave-sidebar-collapsed",
  )?.value;
  const initialTheme = themeCookie === "light" ? "light" : "dark";
  const initialSidebarCollapsed = sidebarCollapsedCookie === "true";

  return (
    <ClerkProvider>
      <html lang="en" data-theme={initialTheme} suppressHydrationWarning>
        <head>
          <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
          <link rel="stylesheet" href={TYPEKIT_STYLESHEET} />
          <link rel="preconnect" href={R2_CDN_ORIGIN} />
          <link rel="dns-prefetch" href={R2_CDN_ORIGIN} />
        </head>
        <body>
          <UserPreferencesProvider>
            <ThemeProvider>
              <PlaylistsProvider>
                <ProjectsProvider>
                  <PlayerProvider>
                    <FavoritesProvider>
                      <Header />
                      <SidebarRenderer initialCollapsed={initialSidebarCollapsed} />
                      {children}
                      <PlayerRenderer />
                      <IconButtonTitleSync />
                      <DiscoverDescriptorPills />
                      <MusicFilterToolbarBehavior />
                      <SideFilterPanelBehavior />
                      <AdminPageHeaderMount />
                    </FavoritesProvider>
                  </PlayerProvider>
                </ProjectsProvider>
              </PlaylistsProvider>
            </ThemeProvider>
          </UserPreferencesProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
