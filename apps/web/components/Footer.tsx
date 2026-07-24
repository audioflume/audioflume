"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { usePlayer } from "@/context/PlayerContext";

const companyLinks = [
  { href: "#", label: "Our story" },
  { href: "#", label: "Artist applications" },
  { href: "mailto:hello@filmwave.io", label: "Contact" },
  { href: "/account/membership", label: "Pricing" },
  { href: "#", label: "Affiliate partnerships" },
];

const listenLinks = [
  { href: "/discover", label: "What’s new" },
  { href: "/curated-playlists", label: "Playlists" },
  { href: "/music", label: "Browse music" },
  { href: "/sound-fx", label: "Browse sound effects" },
];

const quickLinks = [
  { href: "/music", label: "Cinematic" },
  { href: "/music", label: "Documentary" },
  { href: "/music", label: "Pop" },
  { href: "/music", label: "Ambient" },
];

const footerLinkClass =
  "inline-flex w-fit text-[11px] font-normal leading-[1.75] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] focus-visible:text-[var(--text-primary)] focus-visible:outline-none";

const footerHeadingClass =
  "m-0 text-[11px] font-medium leading-none text-[var(--text-primary)]";

type FooterProps = {
  className?: string;
  playerPadding?: boolean;
};

function InstagramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="17.4" cy="6.7" r="1" fill="currentColor" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 12c0-2.5-.25-4.2-.6-5.15-.3-.8-.95-1.45-1.75-1.75C17.7 4.75 15.5 4.5 12 4.5s-5.7.25-6.65.6c-.8.3-1.45.95-1.75 1.75C3.25 7.8 3 9.5 3 12s.25 4.2.6 5.15c.3.8.95 1.45 1.75 1.75.95.35 3.15.6 6.65.6s5.7-.25 6.65-.6c.8-.3 1.45-.95 1.75-1.75.35-.95.6-2.65.6-5.15Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path d="m10 8.8 5.2 3.2-5.2 3.2V8.8Z" fill="currentColor" />
    </svg>
  );
}

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
        main > section:has(.fw-music-content-column .fw-filter-panel-wrap)
          > .fw-music-content-column {
          display: flex !important;
          min-height: calc(100vh - var(--filmwave-header-height, 56px)) !important;
          flex-direction: column !important;
        }

        .music-page-footer-wrap {
          box-sizing: border-box;
          width: auto;
          margin-top: auto;
          margin-left: calc(var(--filmwave-side-filter-rail-width) + 8px);
        }

        .fw-toolbar-sticky:has(> .fw-filter-panel-wrap.has-selected-filter-section)
          ~ .music-page-footer-wrap {
          margin-left: calc(
            var(--filmwave-side-filter-rail-width) +
              var(--filmwave-side-filter-detail-width) + 8px
          );
        }
      `}</style>

      <footer
        ref={footerRef}
        className={`box-border w-full text-[10px] font-normal text-[var(--text-muted)] ${className}`}
        style={{
          paddingBottom: playerPadding
            ? playerVisible
              ? "calc(72px + 8px)"
              : "8px"
            : "8px",
        }}
      >
        <div className="border-t border-[var(--border-subtle)] px-0 pb-14 pt-14">
          <div className="grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-[0.9fr_0.8fr_0.8fr_1.45fr_0.9fr] lg:gap-x-14">
            <div className="flex flex-col gap-5">
              <h2 className={footerHeadingClass}>Company</h2>
              <nav aria-label="Company footer links" className="flex flex-col gap-0">
                {companyLinks.map((link) =>
                  link.href.startsWith("mailto:") ? (
                    <a key={link.label} href={link.href} className={footerLinkClass}>
                      {link.label}
                    </a>
                  ) : (
                    <Link key={link.label} href={link.href} className={footerLinkClass}>
                      {link.label}
                    </Link>
                  ),
                )}
              </nav>
            </div>

            <div className="flex flex-col gap-5">
              <h2 className={footerHeadingClass}>Listen</h2>
              <nav aria-label="Listen footer links" className="flex flex-col gap-0">
                {listenLinks.map((link) => (
                  <Link key={link.label} href={link.href} className={footerLinkClass}>
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="flex flex-col gap-5">
              <h2 className={footerHeadingClass}>Quick Links</h2>
              <nav aria-label="Quick footer links" className="flex flex-col gap-0">
                {quickLinks.map((link) => (
                  <Link key={link.label} href={link.href} className={footerLinkClass}>
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="flex max-w-[370px] flex-col gap-5">
              <h2 className={footerHeadingClass}>Who is Audioflume?</h2>
              <div className="flex flex-col gap-2 text-[11px] font-normal leading-[1.75] text-[var(--text-muted)]">
                <p className="m-0">
                  We are filmmakers, musicians and creative technologists building a more thoughtful way to find, organize and license music for moving images.
                </p>
                <p className="m-0">© 2026 Audioflume</p>
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <h2 className={footerHeadingClass}>Built for Story</h2>
              <nav aria-label="Legal footer links" className="flex flex-col gap-0">
                <Link href="#" className={footerLinkClass}>
                  Licensing terms
                </Link>
                <Link href="#" className={footerLinkClass}>
                  Privacy
                </Link>
              </nav>

              <div className="mt-4 flex items-center gap-5 text-[var(--text-muted)]" aria-label="Social links">
                <a
                  href="#"
                  className="transition-colors hover:text-[var(--text-primary)] focus-visible:text-[var(--text-primary)] focus-visible:outline-none"
                  aria-label="Audioflume on Instagram"
                >
                  <InstagramIcon />
                </a>
                <a
                  href="#"
                  className="transition-colors hover:text-[var(--text-primary)] focus-visible:text-[var(--text-primary)] focus-visible:outline-none"
                  aria-label="Audioflume on YouTube"
                >
                  <YouTubeIcon />
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );

  if (isMusicPage) {
    return musicTarget
      ? createPortal(
          <div className="music-page-footer-wrap">{footer}</div>,
          musicTarget,
        )
      : null;
  }

  return footer;
}
