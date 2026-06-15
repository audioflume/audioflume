import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
import MusicFilterToolbarBehavior from "@/components/MusicFilterToolbarBehavior";
import SideFilterPanelBehavior from "@/components/SideFilterPanelBehavior";
import AdminPageHeaderMount from "@/components/admin/AdminPageHeaderMount";
import "./globals.css";
import "./admin-polish.css";
import "./icon-button-overrides.css";
import "./player-action-overrides.css";
import "./music-action-button-shape-overrides.css";
import "./search-filter-backdrop-overrides.css";
import "./playlist-grid-overrides.css";
import "./side-filter-overrides.css";
import "./side-filter-clear-all-overrides.css";
import "./music-hero-overrides.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// R2 public CDN hostname — used for preconnect and dns-prefetch hints.
// Keeps a single source of truth if the bucket URL ever changes.
const R2_CDN_ORIGIN = "https://pub-56e6a9dcaf364dd4bcde4a5fe65a5b9a.r2.dev";

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

  const sidebarCollapsed =
    cookieStore.get("filmwave-sidebar-collapsed")?.value === "true";

  const themeMode = cookieStore.get("filmwave-theme-mode")?.value;
  const normalizedThemeMode = themeMode === "light" ? "light" : "dark";
  const htmlClassName = normalizedThemeMode === "light" ? "light" : undefined;
  const bodyClassName = [htmlClassName, sidebarCollapsed ? "sidebar-collapsed" : null]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <ClerkProvider>
      <html
        lang="en"
        className={htmlClassName}
        data-theme={normalizedThemeMode}
        suppressHydrationWarning
      >
        <head>
          <script
            dangerouslySetInnerHTML={{
              __html: `
(function () {
  try {
    var hidden = window.localStorage.getItem("filmwave-show-edit-point-markers") === "false";
    document.documentElement.dataset.editPointMarkers = hidden ? "hidden" : "visible";
  } catch (error) {}
})();
              `.trim(),
            }}
          />
          <style
            dangerouslySetInnerHTML={{
              __html: `
html[data-edit-point-markers="hidden"] .filmwave-song-cue-marker,
html[data-edit-point-markers="hidden"] .filmwave-song-cue-range,
html[data-edit-point-markers="hidden"] .group\/player-cue-point {
  display: none !important;
}
              `.trim(),
            }}
          />
          {/**
           * Preconnect to the R2 CDN so the TCP + TLS handshake is already
           * complete by the time the user clicks any song. Without this, every
           * new song play pays a 100–300 ms connection setup cost before the
           * first byte of audio arrives.
           *
           * preconnect   → full connection (DNS + TCP + TLS), kept warm
           * dns-prefetch → DNS-only fallback for browsers that drop preconnect
           */}
          <link rel="preconnect" href={R2_CDN_ORIGIN} crossOrigin="anonymous" />
          <link rel="dns-prefetch" href={R2_CDN_ORIGIN} />
        </head>
        <body className={bodyClassName}>
          <UserPreferencesProvider>
            <ThemeProvider>
              <PlayerProvider>
                <PlaylistsProvider>
                  <ProjectsProvider>
                    <FavoritesProvider>
                      <Header />
                      <SidebarRenderer initialCollapsed={sidebarCollapsed} />
                      <PlayerRenderer />
                      <MusicFilterToolbarBehavior />
                      <SideFilterPanelBehavior />
                      <IconButtonTitleSync />
                      <AdminPageHeaderMount />
                      {children}
                    </FavoritesProvider>
                  </ProjectsProvider>
                </PlaylistsProvider>
              </PlayerProvider>
            </ThemeProvider>
          </UserPreferencesProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
