"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import FooterBottom from "@/components/FooterBottom";
import { usePlayer } from "@/context/PlayerContext";

const footerGroups = [
  {
    title: "Explore",
    links: [
      { href: "/discover", label: "Discover" },
      { href: "/music", label: "Browse music" },
      { href: "/sound-fx", label: "Sound effects" },
      { href: "/curated-playlists", label: "Curated playlists" },
    ],
  },
  {
    title: "Create",
    links: [
      { href: "/playlists", label: "My playlists" },
      { href: "/projects", label: "Projects" },
      { href: "/favorites", label: "Favorites" },
      { href: "#", label: "Desktop app" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "#", label: "About Audioflume" },
      { href: "#", label: "Artist submissions" },
      { href: "#", label: "Licensing" },
      { href: "mailto:hello@filmwave.io", label: "Contact" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "/account/support", label: "Help centre" },
      { href: "/account/membership", label: "Membership" },
      { href: "/account/settings", label: "Account settings" },
      { href: "#", label: "Privacy" },
    ],
  },
];

const footerLinkClass =
  "inline-flex w-fit text-[11px] font-normal leading-[1.45] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] focus-visible:text-[var(--text-primary)] focus-visible:outline-none";

const footerHeadingClass =
  "text-[11px] font-medium leading-none text-[var(--text-primary)]";

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
          color: var(--text-primary) !important;
          font-size: 18px !important;
          transform: none !important;
        }

        .filmwave-footer-bottom {
          border-top: 0 !important;
        }

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
        <div className="border-t border-[var(--border-subtle)] pt-12">
          <div className="grid gap-x-10 gap-y-11 pb-12 sm:grid-cols-2 lg:grid-cols-[minmax(190px,1.35fr)_repeat(4,minmax(110px,0.72fr))] lg:gap-x-12">
            <div className="flex max-w-[250px] flex-col items-start gap-5">
              <span className="filmwave-header-tonal-wordmark filmwave-footer-tonal-wordmark">
                audioflume
              </span>

              <p className="m-0 text-[11px] font-normal leading-[1.65] text-[var(--text-muted)]">
                Human-curated music, sound effects and creative tools built for filmmakers.
              </p>

              <p className="m-0 text-[10px] font-normal leading-[1.55] text-[var(--text-muted)]">
                Practical licensing. Thoughtful discovery. A faster path from search to edit.
              </p>
            </div>

            {footerGroups.map((group) => (
              <div key={group.title} className="flex flex-col gap-5">
                <h2 className={`m-0 ${footerHeadingClass}`}>{group.title}</h2>

                <nav aria-label={`${group.title} footer links`} className="flex flex-col gap-3">
                  {group.links.map((link) => (
                    <Link key={`${group.title}-${link.label}`} href={link.href} className={footerLinkClass}>
                      {link.label}
                    </Link>
                  ))}
                </nav>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-5 border-t border-[var(--border-subtle)] py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <a href="mailto:hello@filmwave.io" className={footerLinkClass}>
                hello@filmwave.io
              </a>
              <span className="text-[10px] text-[var(--text-muted)]">Made in Canada</span>
              <Link href="#" className={footerLinkClass}>
                Terms
              </Link>
              <Link href="#" className={footerLinkClass}>
                Privacy
              </Link>
            </div>

            <div className="flex items-center gap-5" aria-label="Social links">
              <a href="#" className={footerLinkClass} aria-label="Audioflume on Instagram">
                Instagram ↗
              </a>
              <a href="#" className={footerLinkClass} aria-label="Audioflume on YouTube">
                YouTube ↗
              </a>
            </div>
          </div>
        </div>

        <FooterBottom className="filmwave-footer-bottom" />
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
