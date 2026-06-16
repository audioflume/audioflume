import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
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
import "../../../packages/shared/styles/music-sort-button-width.css";
import "../../../packages/shared/styles/playlist-library.css";
import "../../../packages/shared/styles/shell-chrome.css";
import "../../../packages/shared/styles/music-side-filter.css";
import "../../../packages/shared/styles/header-search-toolbar.css";

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
  const themeCookie = cookieStore.get("filmwave-theme")?.value;
  const initialTheme = themeCookie === "light" ? "light" : "dark";
  const htmlClassName = `${geistSans.variable} ${geistMono.variable}`;

  return (
    <ClerkProvider>
      <html lang="en" className={htmlClassName} data-theme={initialTheme}>
        <head>
          <link rel="preconnect" href={R2_CDN_ORIGIN} />
          <link rel="dns-prefetch" href={R2_CDN_ORIGIN} />
        </head>
        <body>
          <Script id="filmwave-theme-init" strategy="beforeInteractive">
            {`(function(){try{var t=localStorage.getItem('filmwave-theme')||'${initialTheme}';document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t;}catch(e){document.documentElement.dataset.theme='${initialTheme}';document.documentElement.style.colorScheme='${initialTheme}';}})();`}
          </Script>
          <UserPreferencesProvider>
            <ThemeProvider>
              <PlaylistsProvider>
                <ProjectsProvider>
                  <FavoritesProvider>
                    <PlayerProvider>
                      <Header />
                      <SidebarRenderer />
                      {children}
                      <PlayerRenderer />
                      <IconButtonTitleSync />
                      <MusicFilterToolbarBehavior />
                      <SideFilterPanelBehavior />
                      <AdminPageHeaderMount />
                    </PlayerProvider>
                  </FavoritesProvider>
                </ProjectsProvider>
              </PlaylistsProvider>
            </ThemeProvider>
          </UserPreferencesProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
