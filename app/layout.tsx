import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Sans } from "next/font/google";
import { PlayerProvider } from "@/context/PlayerContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { UserPreferencesProvider } from "@/context/UserPreferencesContext";
import { PlaylistsProvider } from "@/context/PlaylistsContext";
import { FavoritesProvider } from "@/context/FavoritesContext";
import PlayerRenderer from "@/components/PlayerRenderer";
import SidebarRenderer from "@/components/SidebarRenderer";
import Header from "@/components/Header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Filmwave",
  description: "Royalty-free music for filmmakers",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} ${instrumentSans.variable} antialiased`}
        >
          <UserPreferencesProvider>
            <ThemeProvider>
              <PlayerProvider>
                <FavoritesProvider>
                  <PlaylistsProvider>
                    <Header />
                    <SidebarRenderer />
                    {children}
                    <PlayerRenderer />
                  </PlaylistsProvider>
                </FavoritesProvider>
              </PlayerProvider>
            </ThemeProvider>
          </UserPreferencesProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
