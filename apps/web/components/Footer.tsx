"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import FooterBottom from "@/components/FooterBottom";
import { usePlayer } from "@/context/PlayerContext";

const utilityLinks = [
  {
    href: "/music",
    label: "Browse music",
    detail: "Search the full catalogue",
  },
  {
    href: "/curated-playlists",
    label: "Curated playlists",
    detail: "Browse editor selections",
  },
  {
    href: "/account/support",
    label: "Support",
    detail: "Help, account and licensing",
  },
];

const sitemapLinks = [
  { href: "/discover", label: "Discover" },
  { href: "/sound-fx", label: "Sound FX" },
  { href: "/playlists", label: "Playlists" },
  { href: "/favorites", label: "Favorites" },
  { href: "/projects", label: "Projects" },
  { href: "/account/profile", label: "Profile" },
  { href: "/account/membership", label: "Membership" },
  { href: "/account/settings", label: "Settings" },
];

const footerHeaderClass =
  "text-[8px] font-normal uppercase tracking-[0.08em] text-[var(--text-muted)]";

const footerLinkClass =
  "inline-flex w-fit font-normal leading-none text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] focus-visible:text-[var(--text-primary)] focus-visible:outline-none";

type FooterProps = {
  className?: string;
  playerPadding?: boolean;
};

export default function Footer({
  className = "",
  playerPadding = true,
}: FooterProps) {
  const pathname = usePathname();
  const { currentSong } = usePlayer();
  const footerRef = useRef<HTMLElement | null>(null);
  const [musicTarget, setMusicTarget] = useState<HTMLElement | null>(null);
  const playerVisible = Boolean(currentSong);
  const isMusicPage = pathname === "/music";

  useEffect(() => {
    if (!isMusicPage) {
      setMusicTarget(null);
      return;
    }

    setMusicTarget(document.querySelector<HTMLElement>(".fw-music-content-column"));
  }, [isMusicPage]);

  useEffect(() => {
    const parent = footerRef.current?.parentElement;
    if (!parent) return;

    const inlinePaddingBottom = parent.style.paddingBottom;

    if (inlinePaddingBottom === "72px" || inlinePaddingBottom === "8px") {
      parent.style.paddingBottom = "0px";
    }
  }, [playerVisible, musicTarget]);

  const footer = (
    <>
      <style>{`
        .filmwave-footer-tonal-wordmark.filmwave-header-tonal-wordmark {
          color: var(--text-muted) !important;
          font-size: 17px !important;
          transform: none !important;
        }

        .filmwave-footer-bottom {
          border-top: 0 !important;
        }

        .music-page-footer {
          box-sizing: border-box;
          width: auto !important;
          margin-left: var(--filmwave-side-filter-rail-width);
        }

        .fw-toolbar-sticky:has(> .fw-filter-panel-wrap.has-selected-filter-section)
          ~ .music-page-footer {
          margin-left: calc(
            var(--filmwave-side-filter-rail-width) +
              var(--filmwave-side-filter-detail-width)
          );
        }
      `}</style>

      <footer
        ref={footerRef}
        className={`box-border w-full pt-10 text-[10px] font-normal text-[var(--text-muted)] ${isMusicPage ? "music-page-footer " : ""}${className}`}
        style={{
          paddingBottom: playerPadding
            ? playerVisible
              ? "calc(72px + 8px)"
              : "8px"
            : "8px",
        }}
      >
        <div className="grid gap-8 pb-6 md:grid-cols-[minmax(160px,1fr)_minmax(480px,620px)] md:items-start md:gap-12">
          <div className="flex -translate-y-1 flex-col gap-3">
            <div className="w-[92px]">
              <span className="filmwave-header-tonal-wordmark filmwave-footer-tonal-wordmark">
                audioflume
              </span>
            </div>

            <span className="max-w-[180px] text-[10px] font-normal leading-4 text-[var(--text-muted)]">
              Music and creative assets for filmmakers.
            </span>
          </div>

          <div className="grid gap-7 md:justify-self-end">
            <div className="grid gap-5 sm:grid-cols-3 sm:gap-8">
              {utilityLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group grid content-start gap-2 focus-visible:outline-none"
                >
                  <span className="inline-flex items-center gap-1.5 text-[10px] leading-none text-[var(--text-muted)] transition-colors group-hover:text-[var(--text-primary)] group-focus-visible:text-[var(--text-primary)]">
                    {link.label}
                    <span aria-hidden="true">↗</span>
                  </span>

                  <span className="max-w-[150px] text-[9px] font-normal leading-4 text-[var(--text-muted)]">
                    {link.detail}
                  </span>
                </Link>
              ))}
            </div>

            <div className="grid gap-4">
              <div className="grid gap-3">
                <span className={footerHeaderClass}>Site map</span>

                <nav
                  aria-label="Footer sitemap"
                  className="flex flex-wrap gap-x-5 gap-y-2.5"
                >
                  {sitemapLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={footerLinkClass}
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>
              </div>

              <div className="flex flex-wrap gap-x-5 gap-y-2 text-[9px] leading-none text-[var(--text-muted)]">
                <a href="mailto:hello@filmwave.io" className={footerLinkClass}>
                  hello@filmwave.io
                </a>
                <span>Made in Canada</span>
              </div>
            </div>
          </div>
        </div>

        <FooterBottom className="filmwave-footer-bottom" />
      </footer>
    </>
  );

  if (isMusicPage) return musicTarget ? createPortal(footer, musicTarget) : null;

  return footer;
}
