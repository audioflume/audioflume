"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import FooterBottom from "@/components/FooterBottom";
import Logo from "@/components/Logo";
import { usePlayer } from "@/context/PlayerContext";

const productLinks = ["Music", "SFX", "VFX", "Colour", "Curated"];
const companyLinks = ["Home", "Support", "About", "Partnerships", "Contact"];

const footerHeaderClass =
  "text-[9px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]";

const footerLinkClass =
  "cursor-pointer leading-none transition hover:text-[var(--text-primary)]";

type FooterProps = {
  className?: string;
  playerPadding?: boolean;
};

export default function Footer({
  className = "",
  playerPadding = true,
}: FooterProps) {
  const { currentSong } = usePlayer();
  const pathname = usePathname();
  const footerRef = useRef<HTMLElement | null>(null);
  const playerVisible = Boolean(currentSong);
  const isCuratedPlaylistsPage = pathname === "/curated-playlists";

  useEffect(() => {
    const parent = footerRef.current?.parentElement;
    if (!parent) return;

    const inlinePaddingBottom = parent.style.paddingBottom;

    if (inlinePaddingBottom === "72px" || inlinePaddingBottom === "8px") {
      parent.style.paddingBottom = "0px";
    }
  }, [playerVisible]);

  if (pathname === "/music") return null;

  return (
    <footer
      ref={footerRef}
      className={`box-border w-full pt-10 text-[11px] font-medium text-[var(--text-muted)] ${className}`}
      style={{
        marginLeft: isCuratedPlaylistsPage
          ? "calc(var(--sidebar-width) + 32px)"
          : undefined,
        width: isCuratedPlaylistsPage
          ? "calc(100% - var(--sidebar-width) - 64px)"
          : undefined,
        transition: isCuratedPlaylistsPage
          ? "margin-left 0.2s ease, width 0.2s ease"
          : undefined,
        paddingBottom: playerPadding
          ? playerVisible
            ? "calc(72px + 8px)"
            : "8px"
          : "8px",
      }}
    >
      <div className="grid gap-8 pb-6 md:grid-cols-[minmax(160px,1fr)_auto_auto_minmax(150px,auto)] md:gap-10">
        <div className="flex -translate-y-1 flex-col gap-3">
          <div className="w-[92px] text-[var(--text-muted)]">
            <Logo />
          </div>

          <span className="max-w-[180px] text-[11px] leading-4 text-[var(--text-muted)]">
            Music and creative assets for filmmakers.
          </span>
        </div>

        <div className="grid gap-2.5">
          <span className={footerHeaderClass}>Library</span>

          <div className="grid gap-2.5">
            {productLinks.map((link) => (
              <span key={link} className={footerLinkClass}>
                {link}
              </span>
            ))}
          </div>
        </div>

        <div className="grid gap-2.5">
          <span className={footerHeaderClass}>Company</span>

          <div className="grid gap-2.5">
            {companyLinks.map((link) => (
              <span key={link} className={footerLinkClass}>
                {link}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-rows-[auto_1fr] gap-2.5">
          <span className={footerHeaderClass}>Contact</span>

          <div className="grid content-end gap-2.5">
            <span className="leading-none">+1 (250) 667-0766</span>
            <span className="leading-none">hello@filmwave.io</span>
            <span className="leading-none">Made in Canada</span>
          </div>
        </div>
      </div>

      <FooterBottom />
    </footer>
  );
}
